/** Données FICTIVES pour le mode démo (aucun vrai client). */
import { addDays, addMonths, today } from '../domain/dates';
import type { Agence, Client, Intervention, Statut, Utilisateur } from '../domain/types';
import { interventionVide } from '../domain/types';

export const DEMO_EMAIL = 'demo@exemple.fr';

export const demoUtilisateurs: Utilisateur[] = [
  { email: DEMO_EMAIL, nom: 'Compte démo', initiales: 'QT', agence: 'Toutes', role: 'admin', actif: true },
  { email: 'tech.metz@exemple.fr', nom: 'Benoît (exemple)', initiales: 'BM', agence: 'Metz', role: 'technicien', actif: true },
  { email: 'tech.stras@exemple.fr', nom: 'Solène (exemple)', initiales: 'SR', agence: 'Strasbourg', role: 'technicien', actif: true },
  { email: 'tech2.stras@exemple.fr', nom: 'Thomas (exemple)', initiales: 'TM', agence: 'Strasbourg', role: 'technicien', actif: true },
  { email: 'manager@exemple.fr', nom: 'Manager (exemple)', initiales: 'MG', agence: 'Toutes', role: 'manager', actif: true },
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

const METIERS = ['VLEP', 'VLEP', 'VLEP', 'Aération', 'Bruit Opé', 'Bruit Env'];
const INTERV: Record<Agence, string[]> = { Metz: ['QT', 'BM'], Strasbourg: ['SR', 'TM', 'QT'] };

export function genererDemo(): { interventions: Intervention[]; clients: Client[] } {
  const auj = today();
  const interventions: Intervention[] = [];
  let n = 0;
  const scenario: { statut: Statut; decal: number }[] = [
    { statut: 'Devis à faire', decal: -20 },
    { statut: 'Devis à faire', decal: 25 },
    { statut: 'Devis à faire', decal: 120 },
    { statut: 'Devis envoyé', decal: -45 },
    { statut: 'Devis envoyé', decal: -10 },
    { statut: 'Commandé', decal: 15 },
    { statut: 'Planifié', decal: 9 },
    { statut: 'Planifié', decal: -3 },
    { statut: 'Rapport en cours', decal: -20 },
    { statut: 'Rapport en cours', decal: -60 },
    { statut: 'Rapport envoyé', decal: -70 },
  ];
  CLIENTS.forEach(([client, ville, dpt, agence], ci) => {
    const nb = 1 + (ci % 3);
    for (let k = 0; k < nb; k++) {
      const s = scenario[(ci * 3 + k) % scenario.length];
      const i = interventionVide(agence);
      const metier = METIERS[(ci + k) % METIERS.length];
      n++;
      Object.assign(i, {
        id: `demo-${n}`,
        numAffaire: `26${String(1 + (n % 12)).padStart(2, '0')}EK2L0${String(1000 + n).padStart(7, '0')}`,
        client,
        ville,
        dpt,
        metier,
        reglementaire: n % 3 === 0,
        scola: client.includes('Lycée') || client.includes('Collège'),
        intervenant: INTERV[agence][n % INTERV[agence].length],
        statut: s.statut,
        creeLe: addDays(auj, -90),
        creePar: DEMO_EMAIL,
        modifieLe: auj,
        modifiePar: DEMO_EMAIL,
      } satisfies Partial<Intervention>);
      const d = addDays(auj, s.decal);
      if (s.statut === 'Devis à faire') i.echeance = d;
      if (s.statut === 'Devis envoyé') i.dateEnvoiDevis = d;
      if (['Commandé', 'Planifié', 'Rapport en cours', 'Rapport envoyé'].includes(s.statut)) {
        i.dateEnvoiDevis = addDays(d, -40);
        i.prixHT = 1200 + ((n * 370) % 3800);
        i.nbJours = 1 + (n % 3);
      }
      if (['Planifié', 'Rapport en cours', 'Rapport envoyé'].includes(s.statut)) {
        i.dateDebut = addDays(d, -((i.nbJours ?? 1) - 1));
        i.dateFin = d;
      }
      if (s.statut === 'Rapport envoyé') i.dateRapportEnvoye = addDays(d, 35);
      if (s.statut === 'Commandé') i.echeance = d;
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
      metier: 'VLEP',
      intervenant: INTERV[agence][0],
      statut: k === 5 ? 'Perdu' : 'Clôturé',
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
