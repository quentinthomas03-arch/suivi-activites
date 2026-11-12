/** Petites fonctions de dates sur des chaînes « AAAA-MM-JJ » (sans fuseau horaire). */

export function today(): string {
  const d = new Date();
  return toIso(d);
}

export function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${j}`;
}

function parse(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, n: number): string {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return toIso(d);
}

/** Ajoute des mois en restant sur le dernier jour du mois si besoin (31/01 + 1 mois = 28 ou 29/02). */
export function addMonths(s: string, n: number): string {
  const d = parse(s);
  const jour = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const dernier = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(jour, dernier));
  return toIso(d);
}

/** Nombre de jours de a à b (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000);
}

export function fmt(s: string): string {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

/** Accepte « JJ/MM/AAAA », « AAAA-MM-JJ » ou une date Excel ; renvoie « AAAA-MM-JJ » ou ''. */
export function parseDateFr(v: string): string {
  const t = v.trim();
  let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return toIso(new Date(y, Number(m[2]) - 1, Number(m[1])));
  }
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return '';
}
