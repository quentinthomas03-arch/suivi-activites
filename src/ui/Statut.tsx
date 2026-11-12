import type { Alerte } from '../domain/rules';
import type { Etape } from '../domain/types';

export const COULEUR_ETAPE: Record<Etape, string> = {
  'Devis à faire': 'bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200',
  'Devis envoyé': 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200',
  'À planifier': 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200',
  Planifié: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200',
  'En cours': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  'Rapport attendu': 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  'En relecture': 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
  'Rapport transmis': 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200',
  'Envoyé au client': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  Clôturé: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700/50 dark:text-zinc-200',
  Perdu: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200',
};

export const POINT_ETAPE: Record<Etape, string> = {
  'Devis à faire': 'bg-slate-400',
  'Devis envoyé': 'bg-sky-500',
  'À planifier': 'bg-violet-500',
  Planifié: 'bg-indigo-500',
  'En cours': 'bg-blue-600',
  'Rapport attendu': 'bg-amber-500',
  'En relecture': 'bg-orange-500',
  'Rapport transmis': 'bg-teal-500',
  'Envoyé au client': 'bg-emerald-500',
  Clôturé: 'bg-zinc-400',
  Perdu: 'bg-rose-500',
};

export function PuceEtape({ etape }: { etape: Etape }) {
  return (
    <span className={`puce ${COULEUR_ETAPE[etape]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${POINT_ETAPE[etape]}`} />
      {etape}
    </span>
  );
}

const STYLE_ALERTE: Record<Alerte['type'], { cls: string; icone: string }> = {
  retard: { cls: 'bg-danger-soft text-danger', icone: '●' },
  rapport: { cls: 'bg-danger-soft text-danger', icone: '◆' },
  relance: { cls: 'bg-warn-soft text-warn', icone: '↻' },
  bientot: { cls: 'bg-warn-soft text-warn', icone: '◷' },
  facture: { cls: 'bg-accent-soft text-accent-soft-ink', icone: '€' },
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
      return `Rapport +${-a.jours} j`;
    case 'facture':
      return 'À facturer';
  }
}
