import { useState } from 'react';
import { useApp } from '../contexte';
import { reinitialiserDemo } from '../data/localStore';
import { AGENCES, type Metier, type Role, type Utilisateur } from '../domain/types';
import { Tiroir } from '../ui/Tiroir';
import { Import } from './Import';
import { toast } from '../ui/Toast';

const ROLES: Record<Role, string> = { technicien: 'Technicien', manager: 'Manager', admin: 'Administrateur' };
const ROLE_AIDE: Record<Role, string> = {
  technicien: 'Voit et modifie les interventions de son agence',
  manager: 'Voit tout, exporte, consulte le journal',
  admin: 'Comme manager + gère les accès et les réglages',
};

export function Admin() {
  const { store, utilisateurs, metiers } = useApp();
  const [ouvert, setOuvert] = useState<Utilisateur | null>(null);
  const [m, setM] = useState<Metier[]>(metiers);

  async function sauvegarder() {
    const data = await store.exporterTout();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ date: new Date().toISOString(), ...data }, null, 1)], { type: 'application/json' }));
    a.download = `sauvegarde-suivi-activites-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Sauvegarde téléchargée.');
  }

  async function enregistrerMetiers() {
    const propres = m.filter((x) => x.nom.trim()).map((x) => ({ nom: x.nom.trim(), periodiciteMois: Number(x.periodiciteMois) || 0 }));
    await store.saveMetiers(propres);
    toast('Métiers enregistrés.');
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <section className="card p-5 lg:col-span-2">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold">Personnes autorisées</h2>
          <button className="btn-primaire" onClick={() => setOuvert({ email: '', nom: '', initiales: '', agence: 'Strasbourg', role: 'technicien', actif: true })}>
            + Ajouter
          </button>
        </div>
        <p className="mb-4 text-[13px] text-muted">Seules ces adresses Google peuvent ouvrir l'appli. Désactiver une personne lui retire l'accès immédiatement.</p>
        <table className="w-full text-[14px]">
          <thead className="text-left text-[12px] text-muted">
            <tr>
              <th className="py-2">Nom</th>
              <th className="py-2">Agence</th>
              <th className="py-2">Rôle</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {[...utilisateurs].sort((a, b) => Number(b.actif) - Number(a.actif) || a.nom.localeCompare(b.nom)).map((u) => (
              <tr key={u.email} className={`border-t border-line/70 ${u.actif ? '' : 'opacity-50'}`}>
                <td className="py-2.5">
                  <div className="font-medium">
                    {u.nom} <span className="font-semibold tracking-wide [font-variant-ligatures:none] text-[12px] text-muted">{u.initiales}</span>
                  </div>
                  <div className="text-[12px] text-muted">{u.email}</div>
                </td>
                <td>{u.agence}</td>
                <td>{u.actif ? ROLES[u.role] : 'Désactivé'}</td>
                <td className="text-right">
                  <button className="btn-secondaire !py-1" onClick={() => setOuvert(u)}>Modifier</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="space-y-5">
        <section className="card p-5">
          <h2 className="mb-1 text-[16px] font-semibold">Métiers et périodicité</h2>
          <p className="mb-3 text-[13px] text-muted">Sert à calculer la prochaine intervention (0 = pas de contrôle périodique).</p>
          <div className="space-y-2">
            {m.map((x, k) => (
              <div key={k} className="flex items-center gap-2">
                <input className="champ" value={x.nom} onChange={(e) => setM(m.map((y, j) => (j === k ? { ...y, nom: e.target.value } : y)))} />
                <input className="champ w-20" type="number" min={0} value={x.periodiciteMois} onChange={(e) => setM(m.map((y, j) => (j === k ? { ...y, periodiciteMois: Number(e.target.value) } : y)))} />
                <span className="text-[12px] text-muted">mois</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button className="btn-secondaire" onClick={() => setM([...m, { nom: '', periodiciteMois: 12 }])}>+ Métier</button>
            <button className="btn-primaire" onClick={enregistrerMetiers}>Enregistrer</button>
          </div>
        </section>
        <Import />
        <section className="card p-5">
          <h2 className="mb-1 text-[16px] font-semibold">Sauvegarde</h2>
          <p className="mb-3 text-[13px] text-muted">
            Télécharge une copie complète de la base (fichier JSON). À faire chaque semaine et à garder dans un dossier sûr.
          </p>
          <button className="btn-secondaire" onClick={sauvegarder}>Télécharger la sauvegarde</button>
        </section>
        {store.mode === 'demo' && (
          <section className="card p-5">
            <h2 className="mb-1 text-[16px] font-semibold">Mode démo</h2>
            <p className="mb-3 text-[13px] text-muted">Remet les données fictives à zéro.</p>
            <button className="btn-secondaire" onClick={reinitialiserDemo}>Réinitialiser la démo</button>
          </section>
        )}
      </div>

      {ouvert && <FicheUtilisateur u={ouvert} nouveau={!ouvert.email} onFermer={() => setOuvert(null)} />}
    </div>
  );
}

function FicheUtilisateur({ u: init, nouveau, onFermer }: { u: Utilisateur; nouveau: boolean; onFermer: () => void }) {
  const { store } = useApp();
  const [u, setU] = useState(init);
  async function enregistrer() {
    const email = u.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast('Adresse e-mail invalide.');
    if (!u.nom.trim() || !u.initiales.trim()) return toast('Nom et nom dans le suivi obligatoires.');
    await store.saveUtilisateur({ ...u, email, nom: u.nom.trim(), initiales: u.initiales.trim() });
    toast('Accès enregistré.');
    onFermer();
  }
  return (
    <Tiroir titre={nouveau ? 'Ajouter une personne' : u.nom} onFermer={onFermer} pied={<><button className="btn-primaire" onClick={enregistrer}>Enregistrer</button><button className="btn-secondaire" onClick={onFermer}>Annuler</button></>}>
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 block">
          <span className="label">Adresse Google (Gmail)</span>
          <input className="champ" type="email" value={u.email} disabled={!nouveau} onChange={(e) => setU({ ...u, email: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">Nom</span>
          <input className="champ" value={u.nom} onChange={(e) => setU({ ...u, nom: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">Nom dans le suivi</span>
          <input className="champ" maxLength={20} placeholder="Prénom ou initiales" value={u.initiales} onChange={(e) => setU({ ...u, initiales: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">Agence</span>
          <select className="champ" value={u.agence} onChange={(e) => setU({ ...u, agence: e.target.value as Utilisateur['agence'] })}>
            {[...AGENCES, 'Toutes'].map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label">Rôle</span>
          <select className="champ" value={u.role} onChange={(e) => setU({ ...u, role: e.target.value as Role })}>
            {(Object.keys(ROLES) as Role[]).map((r) => <option key={r} value={r}>{ROLES[r]}</option>)}
          </select>
        </label>
        <p className="col-span-2 text-[13px] text-muted">{ROLE_AIDE[u.role]}</p>
        <label className="col-span-2 flex items-center gap-2 text-[14px]">
          <input type="checkbox" checked={u.actif} onChange={(e) => setU({ ...u, actif: e.target.checked })} /> Accès actif
        </label>
      </div>
    </Tiroir>
  );
}
