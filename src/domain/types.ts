/** Modèle de données de l'appli. Les dates sont des chaînes « AAAA-MM-JJ ». */

export const AGENCES = ['Metz', 'Strasbourg'] as const;
export type Agence = (typeof AGENCES)[number];

export const STATUTS = [
  'Devis à faire',
  'Devis envoyé',
  'Commandé',
  'Planifié',
  'Rapport en cours',
  'Rapport envoyé',
  'Clôturé',
  'Perdu',
] as const;
export type Statut = (typeof STATUTS)[number];

/** Statuts qui envoient la ligne dans les archives. */
export const STATUTS_FERMES: Statut[] = ['Clôturé', 'Perdu'];

export type Role = 'technicien' | 'manager' | 'admin';

export interface Utilisateur {
  email: string; // identifiant (minuscules)
  nom: string;
  initiales: string;
  agence: Agence | 'Toutes';
  role: Role;
  actif: boolean;
}

export interface Metier {
  nom: string;
  periodiciteMois: number; // 0 = pas de contrôle périodique
}

export interface Intervention {
  id: string;
  agence: Agence;
  numAffaire: string;
  client: string;
  ville: string;
  dpt: string;
  metiers: string[]; // une mission peut couvrir plusieurs activités (ex. VLEP + Aération)
  reglementaire: string; // '', 'R', 'NR', 'CNR'
  scola: string; // '', 'À saisir', 'Saisi', 'Importé', 'Non importable'
  intervenant: string; // nom court affiché (prénom ou initiales)
  statut: Statut;
  echeance: string; // date limite de réalisation (contrôles périodiques)
  dateEnvoiDevis: string;
  dateRelance: string; // vide = calculée (envoi + 30 j)
  relanceFaite: boolean;
  dateDebut: string;
  dateFin: string;
  nbJours: number | null;
  prixHT: number | null;
  dateRapportEnvoye: string;
  prochaineManuelle: string; // vide = calculée selon le métier
  commentaire: string;
  archive: boolean;
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
    numAffaire: '',
    client: '',
    ville: '',
    dpt: '',
    metiers: ['VLEP'],
    reglementaire: '',
    scola: '',
    intervenant: '',
    statut: 'Devis à faire',
    echeance: '',
    dateEnvoiDevis: '',
    dateRelance: '',
    relanceFaite: false,
    dateDebut: '',
    dateFin: '',
    nbJours: null,
    prixHT: null,
    dateRapportEnvoye: '',
    prochaineManuelle: '',
    commentaire: '',
    archive: false,
    origineId: '',
    creeLe: '',
    creePar: '',
    modifieLe: '',
    modifiePar: '',
  };
}
