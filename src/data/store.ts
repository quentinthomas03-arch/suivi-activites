import type { Agence, Client, EntreeJournal, Intervention, Metier, Utilisateur } from '../domain/types';

export type Unsub = () => void;

export interface Compte {
  email: string;
  nom: string;
}

/** Accès aux données : une implémentation Firebase (production) et une locale (démo). */
export interface Store {
  mode: 'demo' | 'firebase';
  onAuth(cb: (c: Compte | null) => void): Unsub;
  login(): Promise<void>;
  logout(): Promise<void>;
  profil(email: string): Promise<Utilisateur | null>;

  watchInterventions(agences: Agence[], archive: boolean, cb: (l: Intervention[]) => void): Unsub;
  /** Enregistre (création si id vide) et écrit le journal. Renvoie l'id. */
  saveIntervention(i: Intervention, par: string, avant: Intervention | null): Promise<string>;
  deleteIntervention(i: Intervention, par: string): Promise<void>;

  watchClients(agences: Agence[], cb: (l: Client[]) => void): Unsub;
  saveClient(c: Client): Promise<string>;
  deleteClient(c: Client): Promise<void>;

  watchUtilisateurs(cb: (l: Utilisateur[]) => void): Unsub;
  saveUtilisateur(u: Utilisateur): Promise<void>;

  watchMetiers(cb: (l: Metier[]) => void): Unsub;
  saveMetiers(l: Metier[]): Promise<void>;

  watchJournal(cb: (l: EntreeJournal[]) => void): Unsub;

  /** Copie complète des données (sauvegarde). */
  exporterTout(): Promise<Record<string, unknown[]>>;
}

export function libelle(i: Intervention): string {
  return `${i.client || 'Sans client'} — ${i.metier} (${i.agence})`;
}
