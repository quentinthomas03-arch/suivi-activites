/**
 * Règles métier : étape calculée, dates calculées et alertes.
 * Une date saisie à la main n'est jamais écrasée.
 */
import { addDays, addMonths, diffDays, today } from './dates';
import type { Etape, EvenementHistorique, Intervention, Metier } from './types';

export const DELAI_RELANCE_JOURS = 30;
export const DELAI_RAPPORT_JOURS = 42; // « Règle A » : fin + 6 semaines
export const HORIZON_A_VENIR_JOURS = 60;

/** Étape d'avancement, calculée (comme dans l'outil de suivi planning). */
export function etape(i: Intervention, auj = today()): Etape {
  if (i.statutCommercial === 'Perdu') return 'Perdu';
  if (i.archive) return 'Clôturé';
  if (i.statutCommercial !== 'Commandé') return i.statutCommercial;
  if (i.envoyeClient) return 'Envoyé au client';
  if (i.rapportTransmis) return 'Rapport transmis';
  if (i.enRelecture) return 'En relecture';
  if (i.dateFin && i.dateFin < auj) return 'Rapport attendu';
  if (i.dateDebut && i.dateDebut <= auj) return 'En cours';
  if (i.dateDebut || i.dateFin) return 'Planifié';
  return 'À planifier';
}

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

/** Échéance indicative du rapport : fin d'intervention + 6 semaines. */
export function rapportPrevu(i: Intervention): string {
  return i.dateFin ? addDays(i.dateFin, DELAI_RAPPORT_JOURS) : '';
}

/** Prochaine intervention : saisie à la main, sinon fin + périodicité. */
export function prochaine(i: Intervention, metiers: Metier[]): string {
  if (i.prochaineManuelle) return i.prochaineManuelle;
  const p = periodicite(metiers, i.metiers);
  return i.dateFin && p > 0 ? addMonths(i.dateFin, p) : '';
}

export type TypeAlerte = 'retard' | 'bientot' | 'relance' | 'rapport' | 'facture';

export interface Alerte {
  type: TypeAlerte;
  libelle: string;
  jours: number; // pour trier : plus c'est petit, plus c'est urgent
}

const AVANT_REALISATION: Etape[] = ['Devis à faire', 'Devis envoyé', 'À planifier'];

/** Toutes les alertes d'une ligne, la plus urgente en premier. */
export function alertes(i: Intervention, auj = today()): Alerte[] {
  if (i.archive) return [];
  const e = etape(i, auj);
  const out: Alerte[] = [];

  if (i.echeance && AVANT_REALISATION.includes(e)) {
    const j = diffDays(auj, i.echeance);
    if (j < 0) out.push({ type: 'retard', libelle: `Échéance dépassée de ${-j} j`, jours: j });
    else if (j <= HORIZON_A_VENIR_JOURS) out.push({ type: 'bientot', libelle: `Échéance dans ${j} j`, jours: j });
  }

  if (e === 'Devis envoyé' && !i.relanceFaite) {
    const r = relancePrevue(i);
    if (r && r <= auj) out.push({ type: 'relance', libelle: 'Devis à relancer', jours: diffDays(auj, r) });
  }

  if ((e === 'Rapport attendu' || e === 'En relecture') && !i.dateRapportEnvoye) {
    const r = rapportPrevu(i);
    if (r && r < auj) out.push({ type: 'rapport', libelle: `Rapport en retard de ${diffDays(r, auj)} j`, jours: diffDays(auj, r) });
  }

  if (e === 'Envoyé au client' && !i.facture) out.push({ type: 'facture', libelle: 'À facturer', jours: 500 });

  return out.sort((a, b) => a.jours - b.jours);
}

/** Ligne du prochain contrôle périodique, créée à la clôture. */
export function prochainControle(i: Intervention, metiers: Metier[]): Intervention | null {
  const date = prochaine(i, metiers);
  if (!date) return null;
  return {
    ...i,
    id: '',
    statutCommercial: 'Devis à faire',
    echeance: date,
    numAffaire: '',
    numOpportunite: '',
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
    origineId: i.id,
    creeLe: '',
    creePar: '',
    modifieLe: '',
    modifiePar: '',
  };
}

/** Champs comparés pour le journal et l'historique. */
const LIBELLES: Partial<Record<keyof Intervention, string>> = {
  client: 'Client',
  ville: 'Ville',
  dpt: 'Dpt',
  origine: 'Origine',
  numAffaire: 'N° affaire',
  numOpportunite: 'N° opportunité',
  metiers: 'Activités',
  reglementaire: 'Réglementaire',
  scola: 'Scola',
  intervenant: 'Intervenant',
  chefMission: 'Chef de mission',
  chargeAffaire: "Chargé d'affaire",
  statutCommercial: 'Statut commercial',
  echeance: 'Échéance',
  dateEnvoiDevis: 'Envoi devis',
  dateRelance: 'Relance',
  dateDebut: 'Début',
  dateFin: 'Fin',
  nbJoursPrevus: 'Jours prévus',
  nbJoursRealises: 'Jours réalisés',
  prixHT: 'Montant',
  dateRapportEnvoye: 'Sortie rapport',
  prochaineManuelle: 'Prochaine (manuelle)',
  lienDevis: 'Lien devis',
  commentaire: 'Commentaire',
  agence: 'Agence',
  archive: 'Archivé',
};

export const CASES: { champ: keyof Intervention; libelle: string }[] = [
  { champ: 'relanceFaite', libelle: 'Relance faite' },
  { champ: 'enRelecture', libelle: 'En relecture' },
  { champ: 'rapportTransmis', libelle: 'Rapport transmis' },
  { champ: 'envoyeClient', libelle: 'Envoyé au client' },
  { champ: 'facture', libelle: 'Facturé' },
  { champ: 'controlePeriodiquePropose', libelle: 'Contrôle périodique proposé' },
];

const aff = (v: unknown) => (Array.isArray(v) ? v.join(' + ') : v === null || v === undefined ? '' : String(v));

export function differences(avant: Intervention, apres: Intervention): string {
  const champs: string[] = [];
  for (const k of Object.keys(LIBELLES) as (keyof Intervention)[]) {
    if (JSON.stringify(avant[k] ?? '') !== JSON.stringify(apres[k] ?? '')) {
      champs.push(`${LIBELLES[k]} : « ${aff(avant[k])} » → « ${aff(apres[k])} »`);
    }
  }
  for (const c of CASES) if (avant[c.champ] !== apres[c.champ]) champs.push(`${c.libelle} ${apres[c.champ] ? 'coché' : 'décoché'}`);
  return champs.join(' ; ');
}

/** Événements d'historique à ajouter lors d'un enregistrement. */
export function evenements(avant: Intervention | null, apres: Intervention, par: string, date: string): EvenementHistorique[] {
  if (!avant) return [{ date, par, type: 'modification', texte: 'Demande créée' }];
  const ev: EvenementHistorique[] = [];
  for (const c of CASES) {
    if (avant[c.champ] !== apres[c.champ]) {
      ev.push({ date, par, type: 'case', texte: `${c.libelle} ${apres[c.champ] ? 'coché' : 'décoché'}`, champ: c.champ, valeurAvant: avant[c.champ] as boolean });
    }
  }
  const autres: string[] = [];
  for (const k of Object.keys(LIBELLES) as (keyof Intervention)[]) {
    if (k === 'commentaire') continue;
    if (JSON.stringify(avant[k] ?? '') !== JSON.stringify(apres[k] ?? '')) autres.push(`${LIBELLES[k]} : ${aff(apres[k]) || '—'}`);
  }
  if (autres.length) ev.push({ date, par, type: 'modification', texte: autres.join(' · ') });
  return ev;
}
