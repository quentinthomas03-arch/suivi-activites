/** Modèle de données de l'appli. Les dates sont des chaînes « AAAA-MM-JJ ». */

export const AGENCES = ['Metz', 'Strasbourg'] as const;
export type Agence = (typeof AGENCES)[number];

/** Statut commercial : saisi à la main. */
export const STATUTS_COMMERCIAUX = ['Devis à faire', 'Devis envoyé', 'Commandé', 'Perdu'] as const;
export type StatutCommercial = (typeof STATUTS_COMMERCIAUX)[number];

/** Étape affichée : calculée à partir du statut commercial, des dates et des cases cochées. */
export const ETAPES = [
  'Devis à faire',
  'Devis envoyé',
  'À planifier',
  'Planifié',
  'En cours',
  'Rapport attendu',
  'En relecture',
  'Rapport transmis',
  'Envoyé au client',
  'Clôturé',
  'Perdu',
] as const;
export type Etape = (typeof ETAPES)[number];

/** Étapes de production (après commande), affichées dans la frise. */
export const ETAPES_PRODUCTION: Etape[] = ['À planifier', 'Planifié', 'En cours', 'Rapport attendu', 'En relecture', 'Rapport transmis', 'Envoyé au client'];

export const ORIGINES = ['Client direct', 'Hermès', 'SOCOTEC national', 'Service commercial', 'Équipement', 'Autre'] as const;

export type Role = 'technicien' | 'manager' | 'admin';

export interface Utilisateur {
  email: string; // identifiant (minuscules)
  nom: string;
  initiales: string; // nom court utilisé dans le suivi (prénom ou initiales)
  agence: Agence | 'Toutes';
  role: Role;
  actif: boolean;
}

export interface Metier {
  nom: string;
  periodiciteMois: number; // 0 = pas de contrôle périodique
}

export interface EvenementHistorique {
  date: string; // ISO complet
  par: string; // nom court ou e-mail
  texte: string;
  type: 'commentaire' | 'case' | 'modification';
  champ?: keyof Intervention; // pour « Annuler » une case cochée
  valeurAvant?: boolean;
}

export interface Intervention {
  id: string;
  agence: Agence;
  // Client & activité
  client: string;
  ville: string;
  dpt: string;
  origine: string;
  numAffaire: string;
  numOpportunite: string;
  metiers: string[]; // une mission peut couvrir plusieurs activités (ex. VLEP + Aération)
  reglementaire: string; // '', 'R', 'NR', 'CNR'
  scola: string; // '', 'À saisir', 'Saisi', 'Importé', 'Non importable'
  // Suivi
  intervenant: string; // nom court affiché (prénom ou initiales)
  chefMission: string; // rédacteur du rapport
  chargeAffaire: string; // suivi commercial du dossier
  statutCommercial: StatutCommercial;
  echeance: string; // date limite de réalisation (contrôles périodiques)
  // Dates & suivi
  dateEnvoiDevis: string;
  dateRelance: string; // vide = calculée (envoi + 30 j)
  relanceFaite: boolean;
  dateDebut: string;
  dateFin: string;
  nbJoursPrevus: number | null;
  nbJoursRealises: number | null;
  prixHT: number | null;
  dateRapportEnvoye: string; // sortie du rapport
  prochaineManuelle: string; // vide = calculée selon les activités
  // Cases à cocher
  enRelecture: boolean;
  rapportTransmis: boolean;
  envoyeClient: boolean;
  facture: boolean;
  controlePeriodiquePropose: boolean;
  lienDevis: string;
  commentaire: string;
  historique: EvenementHistorique[];
  archive: boolean; // clôturé ou perdu
  origineId: string; // intervention précédente (contrôle périodique)
  creeLe: string;
  creePar: string;
  modifieLe: string;
  modifiePar: string;
}

export interface Client {
  id: string;
  agence: Agence;
  nom: string;
  contact: string;
  mail: string;
  telephone: string;
  adresse: string;
  codePostal: string;
  commune: string;
  commentaire: string;
}

export interface EntreeJournal {
  id: string;
  date: string; // ISO complet
  par: string;
  action: 'création' | 'modification' | 'suppression';
  cible: string; // id
  libelle: string; // ex. « Client X — VLEP »
  details: string; // champs modifiés
}

export const METIERS_DEFAUT: Metier[] = [
  { nom: 'VLEP', periodiciteMois: 12 },
  { nom: 'Aération', periodiciteMois: 12 },
  { nom: 'Radon', periodiciteMois: 0 },
  { nom: 'QAI', periodiciteMois: 0 },
  { nom: 'Bruit Opé', periodiciteMois: 12 },
  { nom: 'Bruit Env', periodiciteMois: 60 },
  { nom: 'Rejets atmo', periodiciteMois: 12 },
  { nom: 'Eau', periodiciteMois: 0 },
  { nom: 'Vibrations', periodiciteMois: 0 },
  { nom: 'Cartographie', periodiciteMois: 0 },
  { nom: 'Éclairement', periodiciteMois: 0 },
];

export const REGLEMENTAIRE = ['', 'R', 'NR', 'CNR'] as const;
export const SCOLA = ['', 'À saisir', 'Saisi', 'Importé', 'Non importable'] as const;

export function interventionVide(agence: Agence): Intervention {
  return {
    id: '',
    agence,
    client: '',
    ville: '',
    dpt: '',
    origine: '',
    numAffaire: '',
    numOpportunite: '',
    metiers: [],
    reglementaire: '',
    scola: '',
    intervenant: '',
    chefMission: '',
    chargeAffaire: '',
    statutCommercial: 'Devis à faire',
    echeance: '',
    dateEnvoiDevis: '',
    dateRelance: '',
    relanceFaite: false,
    dateDebut: '',
    dateFin: '',
    nbJoursPrevus: null,
    nbJoursRealises: null,
    prixHT: null,
    dateRapportEnvoye: '',
    prochaineManuelle: '',
    enRelecture: false,
    rapportTransmis: false,
    envoyeClient: false,
    facture: false,
    controlePeriodiquePropose: false,
    lienDevis: '',
    commentaire: '',
    historique: [],
    archive: false,
    origineId: '',
    creeLe: '',
    creePar: '',
    modifieLe: '',
    modifiePar: '',
  };
}

/**
 * Complète une fiche lue en base (champs manquants) et convertit l'ancien format
 * (un seul « statut », un seul « metier », nbJours) vers le nouveau.
 */
export function normaliser(x: Record<string, unknown> & { agence?: Agence }): Intervention {
  const i = { ...interventionVide(x.agence ?? 'Strasbourg'), ...x } as Intervention & Record<string, unknown>;
  if (!Array.isArray(i.metiers) || i.metiers.length === 0) i.metiers = typeof x.metier === 'string' ? [x.metier] : i.metiers ?? [];
  if (x.nbJours != null && i.nbJoursPrevus == null) i.nbJoursPrevus = x.nbJours as number;
  const ancien = x.statut as string | undefined;
  if (ancien && !('statutCommercial' in x)) {
    if (ancien === 'Devis à faire' || ancien === 'Devis envoyé' || ancien === 'Perdu') i.statutCommercial = ancien;
    else i.statutCommercial = 'Commandé';
    if (ancien === 'Rapport envoyé' || ancien === 'Clôturé') i.rapportTransmis = i.envoyeClient = true;
  }
  if (typeof i.reglementaire !== 'string') i.reglementaire = i.reglementaire ? 'R' : '';
  if (typeof i.scola !== 'string') i.scola = '';
  if (!Array.isArray(i.historique)) i.historique = [];
  delete i.statut;
  delete i.metier;
  delete i.nbJours;
  return i;
}
