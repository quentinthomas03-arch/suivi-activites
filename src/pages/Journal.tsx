import { useMemo, useState } from 'react';
import { useJournal } from '../data/hooks';

export function Journal() {
  const l = useJournal();
  const [q, setQ] = useState('');
  const lignes = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (l ?? []).filter((e) => !t || `${e.par} ${e.libelle} ${e.details}`.toLowerCase().includes(t));
  }, [l, q]);
  return (
    <div>
      <input className="champ mb-4 max-w-sm" placeholder="Rechercher (personne, client…)" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="card divide-y divide-line/70">
        {lignes.map((e) => (
          <div key={e.id} className="px-4 py-3 text-[14px]">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-[12px] text-muted">{new Date(e.date).toLocaleString('fr-FR')}</span>
              <b className="font-medium">{e.par}</b>
              <span className="text-muted">{e.action}</span>
              <span>{e.libelle}</span>
            </div>
            {e.details && <div className="mt-0.5 text-[13px] text-muted">{e.details}</div>}
          </div>
        ))}
        {l && lignes.length === 0 && <p className="px-4 py-10 text-center text-muted">Aucune modification enregistrée.</p>}
      </div>
    </div>
  );
}
