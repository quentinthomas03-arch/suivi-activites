/**
 * Règles métier : dates calculées et alertes.
 * Remplace les calculs et les couleurs de l'ancien script Apps Script,
 * sans jamais écraser une date saisie à la main.
 */
import { addDays, addMonths, diffDays, today } from './dates';
import type { Intervention, Metier, Statut } from './types';

export const DELAI_RELANCE_JOURS = 30;
export const DELAI_RAPPORT_JOURS = 42;
export const HORIZON_A_VENIR_JOURS = 60;

/** Périodicité d'une mission : la plus courte parmi ses activités (0 = pas de contrôle périodique). */
export function periodicite(metiers: Metier[], noms: string[]): number {
  const p = noms.map((n) => metiers.find((m) => m.nom === n)?.periodiciteMois ?? 0).filter((x) => x > 0);
  return p.length ? Math.min(...p) : 0;
}

export const libelleMetiers = (i: { metiers: string[] }) => i.metiers.join(' + ') || '—';

/** Date de relance : saisie à la main, sinon envoi du devis + 30 jours. */
export function relancePrevue(i: Intervention): string {
  if (i.dateRelance) return i.dateRelance;
  return i.dateEnvoiDevis ? addDays(i.dateEnvoiDevis, DELAI_RELANCE_JOURS) : '';
}

/** Date à laquelle le rapport doit sortir : fin d'intervention + 42 jours. */
export function rapportPrevu(i: Intervention): string {
  return i.dateFin ? addDays(i.dateFin, DELAI_RAPPORT_JOURS) : '';
}

/** Prochaine intervention : saisie à la main, sinon fin + périodicité du métier. */
export function prochaine(i: Intervention, metiers: Metier[]): string {
  if (i.prochaineManuelle) return i.prochaineManuelle;
  const p = periodicite(metiers, i.metiers);
  return i.dateFin && p > 0 ? addMonths(i.dateFin, p) : '';
}

export type TypeAlerte = 'retard' | 'bientot' | 'relance' | 'rapport' | 'planif';

export interface Alerte {
  type: TypeAlerte;
  libelle: string;
  jours: number; // pour trier : plus c'est petit, plus c'est urgent
}

const AVANT_REALISATION: Statut[] = ['Devis à faire', 'Devis envoyé', 'Commandé'];

/** Toutes les alertes d'une ligne, la plus urgente en premier. */
export function alertes(i: Intervention, auj = today()): Alerte[] {
  if (i.archive) return [];
  const out: Alerte[] = [];

  if (i.echeance && AVANT_REALISATION.includes(i.statut)) {
    const j = diffDays(auj, i.echeance);
    if (j < 0) out.push({ type: 'retard', libelle: `Échéance dépassée de ${-j} j`, jours: j });
    else if (j <= HORIZON_A_VENIR_JOURS) out.push({ type: 'bientot', libelle: `Échéance dans ${j} j`, jours: j });
  }

  if (i.statut === 'Devis envoyé' && !i.relanceFaite) {
    const r = relancePrevue(i);
    if (r && r <= auj) out.push({ type: 'relance', libelle: 'Devis à relancer', jours: diffDays(auj, r) });
  }

  if (i.statut === 'Planifié' && i.dateFin && i.dateFin < auj) {
    out.push({ type: 'planif', libelle: 'Intervention passée : statut à mettre à jour', jours: diffDays(auj, i.dateFin) });
  }

  if ((i.statut === 'Planifié' || i.statut === 'Rapport en cours') && !i.dateRapportEnvoye) {
    const r = rapportPrevu(i);
    if (r && r < auj) out.push({ type: 'rapport', libelle: `Rapport en retard de ${diffDays(r, auj)} j`, jours: diffDays(auj, r) });
  }

  return out.sort((a, b) => a.jours - b.jours);
}

/** Ligne du prochain contrôle périodique, créée à la clôture. */
export function prochainControle(i: Intervention, metiers: Metier[]): Intervention | null {
  const date = prochaine(i, metiers);
  if (!date) return null;
  return {
    ...i,
    id: '',
    statut: 'Devis à faire',
    echeance: date,
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
    origineId: i.id,
    creeLe: '',
    creePar: '',
    modifieLe: '',
    modifiePar: '',
  };
}

/** Champs comparés pour le journal des modifications. */
const LIBELLES: Partial<Record<keyof Intervention, string>> = {
  numAffaire: 'N° affaire',
  client: 'Client',
  ville: 'Ville',
  dpt: 'Dpt',
  metiers: 'Activités',
  reglementaire: 'Réglementaire',
  scola: 'Scola',
  intervenant: 'Intervenant',
  statut: 'Statut',
  echeance: 'Échéance',
  dateEnvoiDevis: 'Envoi devis',
  dateRelance: 'Relance',
  relanceFaite: 'Relance faite',
  dateDebut: 'Début',
  dateFin: 'Fin',
  nbJours: 'Nb jours',
  prixHT: 'Prix HT',
  dateRapportEnvoye: 'Rapport envoyé',
  prochaineManuelle: 'Prochaine (manuelle)',
  commentaire: 'Commentaire',
  agence: 'Agence',
};

export function differences(avant: Intervention, apres: Intervention): string {
  const champs: string[] = [];
  for (const k of Object.keys(LIBELLES) as (keyof Intervention)[]) {
    if (JSON.stringify(avant[k] ?? '') !== JSON.stringify(apres[k] ?? '')) {
      champs.push(`${LIBELLES[k]} : « ${avant[k] ?? ''} » → « ${apres[k] ?? ''} »`);
    }
  }
  return champs.join(' ; ');
}
