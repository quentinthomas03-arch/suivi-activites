import { useMemo, useState } from 'react';
import { agencesVisibles, peutModifier, useApp } from '../contexte';
import { useClients } from '../data/hooks';
import type { Agence, Client } from '../domain/types';
import { Tiroir } from '../ui/Tiroir';
import { toast } from '../ui/Toast';

const vide = (agence: Agence): Client => ({ id: '', agence, nom: '', contact: '', mail: '', telephone: '', adresse: '', codePostal: '', commune: '', commentaire: '' });

export function Clients() {
  const { profil, store } = useApp();
  const agences = agencesVisibles(profil);
  const liste = useClients(agences);
  const [q, setQ] = useState('');
  const [agence, setAgence] = useState<Agence | ''>('');
  const [ouvert, setOuvert] = useState<Client | null>(null);

  const lignes = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (liste ?? [])
      .filter((c) => (!agence || c.agence === agence) && (!t || `${c.nom} ${c.contact} ${c.commune} ${c.codePostal}`.toLowerCase().includes(t)))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [liste, q, agence]);

  async function enregistrer(c: Client) {
    if (!c.nom.trim()) return toast('Le nom est obligatoire.');
    await store.saveClient({ ...c, nom: c.nom.trim() });
    toast('Client enregistré.');
    setOuvert(null);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input className="champ max-w-xs flex-1" placeholder="Rechercher un client, un contact, une commune…" value={q} onChange={(e) => setQ(e.target.value)} />
        {agences.length > 1 && (
          <select className="champ w-auto" value={agence} onChange={(e) => setAgence(e.target.value as Agence | '')}>
            <option value="">Toutes les agences</option>
            {agences.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        )}
        <span className="flex-1" />
        <button className="btn-primaire" onClick={() => setOuvert(vide(agences[0]))}>
          + Nouveau client
        </button>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {lignes.map((c) => (
          <button key={c.id} className="card p-4 text-left hover:border-accent/50" onClick={() => setOuvert(c)}>
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium">{c.nom}</div>
              <span className="text-[12px] text-muted">{c.agence}</span>
            </div>
            <div className="mt-1 text-[13px] text-muted">
              {c.contact && <div>{c.contact}</div>}
              <div>{[c.codePostal, c.commune].filter(Boolean).join(' ')}</div>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-[13px]">
              {c.telephone && (
                <a className="text-accent" href={`tel:${c.telephone.replace(/\s/g, '')}`} onClick={(e) => e.stopPropagation()}>
                  {c.telephone}
                </a>
              )}
              {c.mail && (
                <a className="truncate text-accent" href={`mailto:${c.mail}`} onClick={(e) => e.stopPropagation()}>
                  {c.mail}
                </a>
              )}
            </div>
          </button>
        ))}
      </div>
      {liste && lignes.length === 0 && <p className="py-10 text-center text-muted">Aucun client.</p>}
      {ouvert && <FicheClient c={ouvert} agences={agences} lectureSeule={!peutModifier(profil, ouvert.agence)} onFermer={() => setOuvert(null)} onEnregistrer={enregistrer} onSupprimer={profil.role === 'admin' && ouvert.id ? async () => { if (confirm('Supprimer ce client ?')) { await store.deleteClient(ouvert); setOuvert(null); } } : undefined} />}
    </div>
  );
}

function FicheClient({ c: init, agences, lectureSeule, onFermer, onEnregistrer, onSupprimer }: { c: Client; agences: Agence[]; lectureSeule: boolean; onFermer: () => void; onEnregistrer: (c: Client) => void; onSupprimer?: () => void }) {
  const [c, setC] = useState(init);
  const champ = (k: keyof Client, label: string, type = 'text', large = false) => (
    <label className={large ? 'col-span-2 block' : 'block'}>
      <span className="label">{label}</span>
      <input className="champ" type={type} value={c[k]} disabled={lectureSeule} onChange={(e) => setC({ ...c, [k]: e.target.value })} />
    </label>
  );
  return (
    <Tiroir
      titre={init.id ? c.nom : 'Nouveau client'}
      onFermer={onFermer}
      pied={
        !lectureSeule && (
          <>
            <button className="btn-primaire" onClick={() => onEnregistrer(c)}>Enregistrer</button>
            <button className="btn-secondaire" onClick={onFermer}>Annuler</button>
            <span className="flex-1" />
            {onSupprimer && <button className="btn-danger" onClick={onSupprimer}>Supprimer</button>}
          </>
        )
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {champ('nom', 'Nom *', 'text', true)}
        <label className="block">
          <span className="label">Agence</span>
          <select className="champ" value={c.agence} disabled={lectureSeule} onChange={(e) => setC({ ...c, agence: e.target.value as Agence })}>
            {agences.map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
        {champ('contact', 'Contact')}
        {champ('telephone', 'Téléphone', 'tel')}
        {champ('mail', 'E-mail', 'email')}
        {champ('adresse', 'Adresse', 'text', true)}
        {champ('codePostal', 'Code postal')}
        {champ('commune', 'Commune')}
        <label className="col-span-2 block">
          <span className="label">Commentaire</span>
          <textarea className="champ min-h-[80px]" value={c.commentaire} disabled={lectureSeule} onChange={(e) => setC({ ...c, commentaire: e.target.value })} />
        </label>
      </div>
    </Tiroir>
  );
}
