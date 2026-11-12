import { useEffect, useMemo, useState } from 'react';
import { AppCtx, agencesVisibles, estManager, useApp as useContextSafe, type Ctx } from './contexte';
import type { Compte, Store } from './data/store';
import { useInterventions } from './data/hooks';
import { METIERS_DEFAUT, type Agence, type Metier, type Utilisateur } from './domain/types';
import { Admin } from './pages/Admin';
import { Clients } from './pages/Clients';
import { Journal } from './pages/Journal';
import { ListeInterventions } from './pages/ListeInterventions';
import { TableauDeBord } from './pages/TableauDeBord';
import { Toasts } from './ui/Toast';

type Onglet = 'bord' | Agence | 'archives' | 'clients' | 'journal' | 'admin';

function lireOnglet(): Onglet {
  const h = decodeURIComponent(location.hash.slice(1));
  return (['bord', 'Metz', 'Strasbourg', 'archives', 'clients', 'journal', 'admin'].includes(h) ? h : 'bord') as Onglet;
}

export function App({ store }: { store: Store }) {
  const [compte, setCompte] = useState<Compte | null | undefined>(undefined);
  const [profil, setProfil] = useState<Utilisateur | null | undefined>(undefined);
  const [metiers, setMetiers] = useState<Metier[]>(METIERS_DEFAUT);
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);

  useEffect(() => store.onAuth(setCompte), [store]);
  useEffect(() => {
    if (!compte) return setProfil(compte === null ? null : undefined);
    setProfil(undefined);
    let vivant = true;
    void store.profil(compte.email).then((p) => vivant && setProfil(p));
    return () => {
      vivant = false;
    };
  }, [store, compte]);
  useEffect(() => {
    if (!profil) return;
    const a = store.watchMetiers(setMetiers);
    const b = store.watchUtilisateurs(setUtilisateurs);
    return () => {
      a();
      b();
    };
  }, [store, profil]);

  if (compte === undefined || (compte && profil === undefined)) return <Ecran>Chargement…</Ecran>;
  if (!compte) return <Connexion store={store} />;
  if (!profil)
    return (
      <Ecran>
        <h1 className="text-[20px] font-semibold">Accès non autorisé</h1>
        <p className="mt-2 text-muted">
          Le compte <b>{compte.email}</b> n'est pas dans la liste des personnes autorisées. Demande à l'administrateur de t'ajouter.
        </p>
        <button className="btn-secondaire mt-5" onClick={() => store.logout()}>
          Changer de compte
        </button>
      </Ecran>
    );

  const ctx: Ctx = { store, compte, profil, metiers, utilisateurs };
  return (
    <AppCtx.Provider value={ctx}>
      <Principal />
      <Toasts />
    </AppCtx.Provider>
  );
}

function Ecran({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-md p-8 text-center">{children}</div>
    </div>
  );
}

function Connexion({ store }: { store: Store }) {
  const [erreur, setErreur] = useState('');
  return (
    <Ecran>
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="mx-auto mb-4 h-14 w-14" />
      <h1 className="text-[22px] font-semibold">Suivi Activités</h1>
      <p className="mt-1 text-muted">VLEP · Aération · Bruit — Metz &amp; Strasbourg</p>
      <button className="btn-primaire mt-6 w-full !py-2.5" onClick={() => store.login().catch((e: Error) => setErreur(e.message))}>
        {store.mode === 'demo' ? 'Entrer dans la démo' : 'Se connecter avec Google'}
      </button>
      {store.mode === 'demo' && <p className="mt-3 text-[13px] text-muted">Mode démo : données fictives, enregistrées seulement dans ce navigateur.</p>}
      {erreur && <p className="mt-3 text-[13px] text-danger">{erreur}</p>}
    </Ecran>
  );
}

function Principal() {
  const ctx = useContextSafe();
  const { profil, store, compte } = ctx;
  const [onglet, setOnglet] = useState<Onglet>(lireOnglet);
  useEffect(() => {
    const f = () => setOnglet(lireOnglet());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  const aller = (o: Onglet) => {
    location.hash = o;
    setOnglet(o);
  };
  const agences = agencesVisibles(profil);
  const onglets = useMemo(() => {
    const l: { id: Onglet; libelle: string }[] = [{ id: 'bord', libelle: 'Tableau de bord' }];
    agences.forEach((a) => l.push({ id: a, libelle: a }));
    l.push({ id: 'archives', libelle: 'Archives' }, { id: 'clients', libelle: 'Clients' });
    if (estManager(profil)) l.push({ id: 'journal', libelle: 'Journal' });
    if (profil.role === 'admin') l.push({ id: 'admin', libelle: 'Réglages' });
    return l;
  }, [agences, profil]);
  const actif = onglets.some((o) => o.id === onglet) ? onglet : 'bord';

  return (
    <div className="min-h-screen">
      {store.mode === 'demo' && (
        <div className="bg-warn-soft px-4 py-1.5 text-center text-[13px] text-warn">Mode démo — données fictives, rien n'est partagé.</div>
      )}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 pt-3 sm:px-6">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-7 w-7" />
          <span className="text-[16px] font-semibold">Suivi Activités</span>
          <span className="flex-1" />
          <span className="hidden text-right text-[12px] leading-tight text-muted sm:block">
            {profil.nom}
            <br />
            {compte.email}
          </span>
          <button className="btn-secondaire !py-1.5" onClick={() => store.logout()}>
            Déconnexion
          </button>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 sm:px-5">
          {onglets.map((o) => (
            <button
              key={o.id}
              onClick={() => aller(o.id)}
              className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-[14px] font-medium ${
                actif === o.id ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {o.libelle}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        {actif === 'bord' && <TableauDeBord />}
        {(actif === 'Metz' || actif === 'Strasbourg') && <VueAgence key={actif} agence={actif} />}
        {actif === 'archives' && <VueArchives />}
        {actif === 'clients' && <Clients />}
        {actif === 'journal' && <Journal />}
        {actif === 'admin' && <Admin />}
      </main>
    </div>
  );
}

function VueAgence({ agence }: { agence: Agence }) {
  const liste = useInterventions([agence], false);
  return <ListeInterventions agence={agence} liste={liste} />;
}

function VueArchives() {
  const { profil } = useContextSafe();
  const agences = agencesVisibles(profil);
  const [a, setA] = useState<Agence>(agences[0]);
  const liste = useInterventions([a], true);
  return (
    <div>
      {agences.length > 1 && (
        <div className="mb-4 inline-flex rounded-lg border border-line bg-surface p-0.5">
          {agences.map((x) => (
            <button key={x} onClick={() => setA(x)} className={`rounded-md px-3 py-1.5 text-[14px] ${a === x ? 'bg-accent text-accent-ink' : 'text-muted'}`}>
              {x}
            </button>
          ))}
        </div>
      )}
      <ListeInterventions key={a} liste={liste} archives />
    </div>
  );
}
