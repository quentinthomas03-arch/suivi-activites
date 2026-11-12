/** Export CSV compatible Excel (séparateur « ; », BOM UTF-8). */
export function telechargerCsv(nom: string, entetes: string[], lignes: (string | number | boolean | null)[][]) {
  const esc = (v: string | number | boolean | null) => {
    const s = v === null ? '' : typeof v === 'boolean' ? (v ? 'oui' : '') : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const txt = '﻿' + [entetes, ...lignes].map((l) => l.map(esc).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' }));
  a.download = nom;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
