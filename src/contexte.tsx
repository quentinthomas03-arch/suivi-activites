import { createContext, useContext } from 'react';
import type { Compte, Store } from './data/store';
import type { Agence, Metier, Utilisateur } from './domain/types';
import { AGENCES } from './domain/types';

export interface Ctx {
  store: Store;
  compte: Compte;
  profil: Utilisateur;
  metiers: Metier[];
  utilisateurs: Utilisateur[];
}

export const AppCtx = createContext<Ctx | null>(null);

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error('Contexte absent');
  return c;
}

/** Agences que la personne peut voir. */
export function agencesVisibles(p: Utilisateur): Agence[] {
  return p.agence === 'Toutes' ? [...AGENCES] : [p.agence];
}

export function peutModifier(p: Utilisateur, agence: Agence): boolean {
  return p.role !== 'technicien' || p.agence === 'Toutes' || p.agence === agence;
}

export const estManager = (p: Utilisateur) => p.role === 'manager' || p.role === 'admin';

/** L'intervenant d'une ligne correspond-il à la personne connectée ? (nom court, initiales ou prénom) */
export function estMoi(p: Utilisateur, intervenant: string): boolean {
  const x = intervenant.trim().toLowerCase();
  if (!x) return false;
  const prenom = p.nom.trim().split(/\s+/)[0]?.toLowerCase();
  return x === p.initiales.trim().toLowerCase() || x === prenom;
}
