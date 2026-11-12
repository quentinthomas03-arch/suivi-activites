import type { Alerte } from '../domain/rules';
import type { Statut } from '../domain/types';

export const COULEUR_STATUT: Record<Statut, string> = {
  'Devis à faire': 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200',
  'Devis envoyé': 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200',
  Commandé: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200',
  Planifié: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200',
  'Rapport en cours': 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  'Rapport envoyé': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  Clôturé: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700/50 dark:text-zinc-200',
  Perdu: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200',
};

export const POINT_STATUT: Record<Statut, string> = {
  'Devis à faire': 'bg-slate-400',
  'Devis envoyé': 'bg-sky-500',
  Commandé: 'bg-violet-500',
  Planifié: 'bg-teal-500',
  'Rapport en cours': 'bg-amber-500',
  'Rapport envoyé': 'bg-emerald-500',
  Clôturé: 'bg-zinc-400',
  Perdu: 'bg-rose-500',
};

export function PuceStatut({ statut }: { statut: Statut }) {
  return (
    <span className={`puce ${COULEUR_STATUT[statut]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${POINT_STATUT[statut]}`} />
      {statut}
    </span>
  );
}

const STYLE_ALERTE: Record<Alerte['type'], { cls: string; icone: string }> = {
  retard: { cls: 'bg-danger-soft text-danger', icone: '●' },
  rapport: { cls: 'bg-danger-soft text-danger', icone: '◆' },
  planif: { cls: 'bg-warn-soft text-warn', icone: '◆' },
  relance: { cls: 'bg-warn-soft text-warn', icone: '↻' },
  bientot: { cls: 'bg-warn-soft text-warn', icone: '◷' },
};

export function PuceAlerte({ a, court = false }: { a: Alerte; court?: boolean }) {
  const s = STYLE_ALERTE[a.type];
  return (
    <span className={`puce ${s.cls}`} title={a.libelle}>
      <span aria-hidden>{s.icone}</span>
      {court ? libelleCourt(a) : a.libelle}
    </span>
  );
}

function libelleCourt(a: Alerte): string {
  switch (a.type) {
    case 'retard':
      return `Retard ${-a.jours} j`;
    case 'bientot':
      return `Dans ${a.jours} j`;
    case 'relance':
      return 'À relancer';
    case 'rapport':
      return 'Rapport en retard';
    case 'planif':
      return 'À mettre à jour';
  }
}
