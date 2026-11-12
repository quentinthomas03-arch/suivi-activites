/** Store du MODE DÉMO : données fictives gardées dans le navigateur (localStorage). */
import { METIERS_DEFAUT, type Client, type EntreeJournal, type Intervention, type Metier, type Utilisateur } from '../domain/types';
import { differences } from '../domain/rules';
import { DEMO_EMAIL, demoUtilisateurs, genererDemo } from './demoData';
import { libelle, type Compte, type Store } from './store';

interface Etat {
  interventions: Intervention[];
  clients: Client[];
  utilisateurs: Utilisateur[];
  metiers: Metier[];
  journal: EntreeJournal[];
  connecte: boolean;
}

const CLE = 'suivi-activites-demo-v1';

function charger(): Etat {
  try {
    const brut = localStorage.getItem(CLE);
    if (brut) return JSON.parse(brut) as Etat;
  } catch {
    /* stockage indisponible : on repart des données de démo */
  }
  const { interventions, clients } = genererDemo();
  return { interventions, clients, utilisateurs: demoUtilisateurs, metiers: METIERS_DEFAUT, journal: [], connecte: false };
}

export function reinitialiserDemo() {
  try {
    localStorage.removeItem(CLE);
  } catch {
    /* rien */
  }
  location.reload();
}

export function creerLocalStore(): Store {
  let etat = charger();
  const ecouteurs = new Set<() => void>();
  const sauver = () => {
    try {
      localStorage.setItem(CLE, JSON.stringify(etat));
    } catch {
      /* rien */
    }
    ecouteurs.forEach((f) => f());
  };
  const ecouter = (f: () => void) => {
    ecouteurs.add(f);
    f();
    return () => void ecouteurs.delete(f);
  };
  const id = () => Math.random().toString(36).slice(2, 12);
  const journaliser = (e: Omit<EntreeJournal, 'id' | 'date'>) => {
    etat.journal = [{ ...e, id: id(), date: new Date().toISOString() }, ...etat.journal].slice(0, 500);
  };
  const authCbs = new Set<(c: Compte | null) => void>();
  const compte = (): Compte | null => (etat.connecte ? { email: DEMO_EMAIL, nom: 'Compte démo' } : null);

  return {
    mode: 'demo',
    onAuth(cb) {
      authCbs.add(cb);
      cb(compte());
      return () => void authCbs.delete(cb);
    },
    async login() {
      etat.connecte = true;
      sauver();
      authCbs.forEach((f) => f(compte()));
    },
    async logout() {
      etat.connecte = false;
      sauver();
      authCbs.forEach((f) => f(null));
    },
    async profil(email) {
      return etat.utilisateurs.find((u) => u.email === email && u.actif) ?? null;
    },
    watchInterventions(agences, archive, cb) {
      return ecouter(() => cb(etat.interventions.filter((i) => agences.includes(i.agence) && i.archive === archive)));
    },
    async saveIntervention(i, par, avant) {
      const maintenant = new Date().toISOString();
      if (!i.id) {
        const n = { ...i, id: id(), creeLe: maintenant, creePar: par, modifieLe: maintenant, modifiePar: par };
        etat.interventions = [...etat.interventions, n];
        journaliser({ par, action: 'création', cible: n.id, libelle: libelle(n), details: `Statut : ${n.statut}` });
        sauver();
        return n.id;
      }
      const n = { ...i, modifieLe: maintenant, modifiePar: par };
      etat.interventions = etat.interventions.map((x) => (x.id === i.id ? n : x));
      if (avant) journaliser({ par, action: 'modification', cible: n.id, libelle: libelle(n), details: differences(avant, n) });
      sauver();
      return n.id;
    },
    async deleteIntervention(i, par) {
      etat.interventions = etat.interventions.filter((x) => x.id !== i.id);
      journaliser({ par, action: 'suppression', cible: i.id, libelle: libelle(i), details: '' });
      sauver();
    },
    watchClients(agences, cb) {
      return ecouter(() => cb(etat.clients.filter((c) => agences.includes(c.agence))));
    },
    async saveClient(c) {
      const n = c.id ? c : { ...c, id: id() };
      etat.clients = c.id ? etat.clients.map((x) => (x.id === c.id ? n : x)) : [...etat.clients, n];
      sauver();
      return n.id;
    },
    async deleteClient(c) {
      etat.clients = etat.clients.filter((x) => x.id !== c.id);
      sauver();
    },
    watchUtilisateurs(cb) {
      return ecouter(() => cb(etat.utilisateurs));
    },
    async saveUtilisateur(u) {
      const existe = etat.utilisateurs.some((x) => x.email === u.email);
      etat.utilisateurs = existe ? etat.utilisateurs.map((x) => (x.email === u.email ? u : x)) : [...etat.utilisateurs, u];
      sauver();
    },
    watchMetiers(cb) {
      return ecouter(() => cb(etat.metiers));
    },
    async saveMetiers(l) {
      etat.metiers = l;
      sauver();
    },
    watchJournal(cb) {
      return ecouter(() => cb(etat.journal));
    },
    async exporterTout() {
      return { interventions: etat.interventions, clients: etat.clients, utilisateurs: etat.utilisateurs, metiers: etat.metiers, journal: etat.journal };
    },
  };
}
