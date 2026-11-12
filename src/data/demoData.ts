/** Données FICTIVES pour le mode démo (aucun vrai client). */
import { addDays, addMonths, today } from '../domain/dates';
import type { Agence, Client, Intervention, Utilisateur } from '../domain/types';
import { interventionVide } from '../domain/types';

export const DEMO_EMAIL = 'demo@exemple.fr';

export const demoUtilisateurs: Utilisateur[] = [
  { email: DEMO_EMAIL, nom: 'Compte démo', initiales: 'Quentin', agence: 'Toutes', role: 'admin', actif: true },
  { email: 'tech.metz@exemple.fr', nom: 'Benoît (exemple)', initiales: 'Benoît', agence: 'Metz', role: 'technicien', actif: true },
  { email: 'tech.stras@exemple.fr', nom: 'Solène (exemple)', initiales: 'Solène', agence: 'Strasbourg', role: 'technicien', actif: true },
  { email: 'tech2.stras@exemple.fr', nom: 'Thomas (exemple)', initiales: 'Thomas', agence: 'Strasbourg', role: 'technicien', actif: true },
  { email: 'manager@exemple.fr', nom: 'Manager (exemple)', initiales: 'Manager', agence: 'Toutes', role: 'manager', actif: true },
];

const CLIENTS: [string, string, string, Agence][] = [
  ['Fonderie du Rhin', 'Mulhouse', '68', 'Strasbourg'],
  ['Clinique des Tilleuls', 'Strasbourg', '67', 'Strasbourg'],
  ['Menuiserie Alsacienne', 'Haguenau', '67', 'Strasbourg'],
  ['Imprimerie Kléber', 'Colmar', '68', 'Strasbourg'],
  ['Chaudronnerie Vosgienne', 'Saint-Dié', '88', 'Strasbourg'],
  ['Laboratoire Rhénan', 'Illkirch', '67', 'Strasbourg'],
  ['Décolletage Comtois', 'Montbéliard', '25', 'Strasbourg'],
  ['Brico Exemple Ostwald', 'Ostwald', '67', 'Strasbourg'],
  ['Lycée Pasteur (exemple)', 'Strasbourg', '67', 'Strasbourg'],
  ['Tuilerie de Bourgogne', 'Dijon', '21', 'Strasbourg'],
  ['Aciéries Mosellanes', 'Hagondange', '57', 'Metz'],
  ['Verrerie de la Moder', 'Wingen', '67', 'Metz'],
  ['Hôpital Lorrain (exemple)', 'Nancy', '54', 'Metz'],
  ['Peintures Messines', 'Metz', '57', 'Metz'],
  ['Scierie des Vosges', 'Épinal', '88', 'Metz'],
  ['Plasturgie Thionville', 'Thionville', '57', 'Metz'],
  ['Collège Verlaine (exemple)', 'Metz', '57', 'Metz'],
  ['Traitement de Surface Est', 'Forbach', '57', 'Metz'],
];

const METIERS = [['VLEP'], ['VLEP', 'Aération'], ['VLEP'], ['Aération'], ['Bruit Opé'], ['Bruit Env'], ['Radon']];
const INTERV: Record<Agence, string[]> = { Metz: ['Quentin', 'Benoît'], Strasbourg: ['Solène', 'Thomas', 'Quentin'] };

export function genererDemo(): { interventions: Intervention[]; clients: Client[] } {
  const auj = today();
  const interventions: Intervention[] = [];
  let n = 0;
  type Scenario = 'devis' | 'envoye' | 'aplanifier' | 'planifie' | 'encours' | 'attendu' | 'relecture' | 'transmis' | 'client';
  const scenario: { s: Scenario; decal: number }[] = [
    { s: 'devis', decal: -20 },
    { s: 'devis', decal: 25 },
    { s: 'devis', decal: 120 },
    { s: 'envoye', decal: -45 },
    { s: 'envoye', decal: -10 },
    { s: 'aplanifier', decal: 15 },
    { s: 'planifie', decal: 9 },
    { s: 'encours', decal: 0 },
    { s: 'attendu', decal: -20 },
    { s: 'attendu', decal: -60 },
    { s: 'relecture', decal: -30 },
    { s: 'transmis', decal: -40 },
    { s: 'client', decal: -70 },
  ];
  const ORIG = ['Client direct', 'Hermès', 'SOCOTEC national', 'Service commercial'];
  CLIENTS.forEach(([client, ville, dpt, agence], ci) => {
    const nb = 1 + (ci % 3);
    for (let k = 0; k < nb; k++) {
      const sc = scenario[(ci * 3 + k) % scenario.length];
      const i = interventionVide(agence);
      const metier = METIERS[(ci + k) % METIERS.length];
      n++;
      Object.assign(i, {
        id: `demo-${n}`,
        numAffaire: `26${String(1 + (n % 12)).padStart(2, '0')}EK2L0${String(1000 + n).padStart(7, '0')}`,
        client,
        ville,
        dpt,
        origine: ORIG[n % ORIG.length],
        metiers: metier,
        reglementaire: ['R', '', 'NR'][n % 3],
        scola: metier.includes('VLEP') ? ['Saisi', 'À saisir', ''][n % 3] : '',
        intervenant: INTERV[agence][n % INTERV[agence].length],
        chefMission: INTERV[agence][(n + 1) % INTERV[agence].length],
        statutCommercial: sc.s === 'devis' ? 'Devis à faire' : sc.s === 'envoye' ? 'Devis envoyé' : 'Commandé',
        creeLe: addDays(auj, -90),
        creePar: DEMO_EMAIL,
        modifieLe: auj,
        modifiePar: DEMO_EMAIL,
      } satisfies Partial<Intervention>);
      const d = addDays(auj, sc.decal);
      if (sc.s === 'devis' || sc.s === 'aplanifier') i.echeance = d;
      if (sc.s === 'envoye') i.dateEnvoiDevis = d;
      if (i.statutCommercial === 'Commandé') {
        i.dateEnvoiDevis = addDays(d, -40);
        i.prixHT = 1200 + ((n * 370) % 3800);
        i.nbJoursPrevus = 1 + (n % 3);
      }
      if (!['devis', 'envoye', 'aplanifier'].includes(sc.s)) {
        i.dateFin = sc.s === 'encours' ? addDays(d, 1) : d;
        i.dateDebut = addDays(d, -((i.nbJoursPrevus ?? 1) - 1));
      }
      if (sc.s === 'relecture' || sc.s === 'transmis' || sc.s === 'client') i.enRelecture = true;
      if (sc.s === 'transmis' || sc.s === 'client') {
        i.rapportTransmis = true;
        i.dateRapportEnvoye = addDays(d, 35);
      }
      if (sc.s === 'client') i.envoyeClient = true;
      interventions.push(i);
    }
  });
  // Quelques lignes archivées
  for (let k = 0; k < 8; k++) {
    const [client, ville, dpt, agence] = CLIENTS[k * 2];
    const i = interventionVide(agence);
    const fin = addMonths(auj, -(3 + k));
    Object.assign(i, {
      id: `demo-arch-${k}`,
      client, ville, dpt,
      metiers: ['VLEP'],
      intervenant: INTERV[agence][0],
      statutCommercial: k === 5 ? 'Perdu' : 'Commandé',
      enRelecture: k !== 5,
      rapportTransmis: k !== 5,
      envoyeClient: k !== 5,
      facture: k !== 5,
      dateFin: k === 5 ? '' : fin,
      dateDebut: k === 5 ? '' : fin,
      dateRapportEnvoye: k === 5 ? '' : addDays(fin, 38),
      prixHT: k === 5 ? null : 1800 + k * 150,
      archive: true,
      creeLe: addMonths(auj, -8), creePar: DEMO_EMAIL, modifieLe: auj, modifiePar: DEMO_EMAIL,
    } satisfies Partial<Intervention>);
    interventions.push(i);
  }

  const clients: Client[] = CLIENTS.map(([nom, commune, dpt, agence], k) => ({
    id: `demo-cli-${k}`,
    agence,
    nom,
    contact: ['M. Exemple', 'Mme Modèle', 'M. Test'][k % 3],
    mail: `contact${k}@exemple.fr`,
    telephone: '03 00 00 00 ' + String(10 + k),
    adresse: `${k + 1} rue de l'Exemple`,
    codePostal: `${dpt}000`,
    commune,
    commentaire: '',
  }));
  return { interventions, clients };
}
