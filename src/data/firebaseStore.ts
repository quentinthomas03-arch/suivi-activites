/** Store de PRODUCTION : Firebase Authentication (Google) + Firestore. */
import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  limit,
  onSnapshot,
  orderBy,
  persistentLocalCache,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { METIERS_DEFAUT, interventionVide, type Client, type EntreeJournal, type Intervention, type Metier, type Utilisateur } from '../domain/types';
import { differences } from '../domain/rules';
import { libelle, type Store } from './store';

export function creerFirebaseStore(config: Record<string, string>): Store {
  const app = initializeApp(config);
  const auth = getAuth(app);
  // Cache local : moins de lectures facturées, et l'appli reste consultable en cas de coupure réseau.
  const db = initializeFirestore(app, { localCache: persistentLocalCache() });

  const sansId = <T extends { id: string }>(o: T) => {
    const { id: _id, ...reste } = o;
    void _id;
    return reste;
  };

  return {
    mode: 'firebase',
    onAuth(cb) {
      return onAuthStateChanged(auth, (u) =>
        cb(u && u.email ? { email: u.email.toLowerCase(), nom: u.displayName ?? u.email } : null),
      );
    },
    async login() {
      const p = new GoogleAuthProvider();
      p.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, p);
    },
    async logout() {
      await signOut(auth);
    },
    async profil(email) {
      try {
        const s = await getDoc(doc(db, 'utilisateurs', email));
        if (!s.exists()) return null;
        const u = { ...(s.data() as Omit<Utilisateur, 'email'>), email };
        return u.actif ? u : null;
      } catch {
        return null; // règles : accès refusé = pas autorisé
      }
    },
    watchInterventions(agences, archive, cb) {
      const q = query(collection(db, 'interventions'), where('archive', '==', archive), where('agence', 'in', agences));
      return onSnapshot(q, (s) =>
        cb(s.docs.map((d) => {
          const x = d.data() as Partial<Intervention>;
          return { ...interventionVide(x.agence ?? 'Strasbourg'), ...x, id: d.id };
        })),
      );
    },
    async saveIntervention(i, par, avant) {
      const maintenant = new Date().toISOString();
      const batch = writeBatch(db);
      const journal = doc(collection(db, 'journal'));
      let id = i.id;
      if (!id) {
        const ref = doc(collection(db, 'interventions'));
        id = ref.id;
        const n = { ...i, creeLe: maintenant, creePar: par, modifieLe: maintenant, modifiePar: par };
        batch.set(ref, sansId(n));
        batch.set(journal, { date: maintenant, par, action: 'création', cible: id, libelle: libelle(n), details: `Statut : ${n.statut}` });
      } else {
        const n = { ...i, modifieLe: maintenant, modifiePar: par };
        batch.set(doc(db, 'interventions', id), sansId(n));
        if (avant) {
          batch.set(journal, { date: maintenant, par, action: 'modification', cible: id, libelle: libelle(n), details: differences(avant, n) });
        }
      }
      await batch.commit();
      return id;
    },
    async deleteIntervention(i, par) {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'interventions', i.id));
      batch.set(doc(collection(db, 'journal')), {
        date: new Date().toISOString(), par, action: 'suppression', cible: i.id, libelle: libelle(i), details: '',
      });
      await batch.commit();
    },
    watchClients(agences, cb) {
      const q = query(collection(db, 'clients'), where('agence', 'in', agences));
      return onSnapshot(q, (s) => cb(s.docs.map((d) => ({ ...(d.data() as Client), id: d.id }))));
    },
    async saveClient(c) {
      if (c.id) {
        await setDoc(doc(db, 'clients', c.id), sansId(c));
        return c.id;
      }
      return (await addDoc(collection(db, 'clients'), sansId(c))).id;
    },
    async deleteClient(c) {
      await deleteDoc(doc(db, 'clients', c.id));
    },
    watchUtilisateurs(cb) {
      return onSnapshot(collection(db, 'utilisateurs'), (s) =>
        cb(s.docs.map((d) => ({ ...(d.data() as Omit<Utilisateur, 'email'>), email: d.id }))),
      );
    },
    async saveUtilisateur(u) {
      const { email, ...reste } = u;
      await setDoc(doc(db, 'utilisateurs', email.toLowerCase().trim()), reste);
    },
    watchMetiers(cb) {
      return onSnapshot(doc(db, 'parametres', 'metiers'), (s) => cb((s.data()?.liste as Metier[] | undefined) ?? METIERS_DEFAUT));
    },
    async saveMetiers(l) {
      await setDoc(doc(db, 'parametres', 'metiers'), { liste: l });
    },
    watchJournal(cb) {
      const q = query(collection(db, 'journal'), orderBy('date', 'desc'), limit(300));
      return onSnapshot(q, (s) => cb(s.docs.map((d) => ({ ...(d.data() as EntreeJournal), id: d.id }))));
    },
    async importer(interventions, clients, par, progression) {
      const ops: [string, { id: string }][] = [
        ...interventions.map((i) => ['interventions', i] as [string, { id: string }]),
        ...clients.map((c) => ['clients', c] as [string, { id: string }]),
      ];
      const total = ops.length;
      for (let k = 0; k < total; k += 400) {
        const batch = writeBatch(db);
        for (const [col, o] of ops.slice(k, k + 400)) batch.set(doc(db, col, o.id), sansId(o));
        await batch.commit();
        progression(Math.min(k + 400, total), total);
      }
      await addDoc(collection(db, 'journal'), {
        date: new Date().toISOString(), par, action: 'création', cible: 'import', libelle: 'Import',
        details: `${interventions.length} interventions, ${clients.length} clients`,
      });
    },
    async exporterTout() {
      const out: Record<string, unknown[]> = {};
      for (const c of ['interventions', 'clients', 'utilisateurs', 'parametres', 'journal']) {
        out[c] = (await getDocs(collection(db, c))).docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      return out;
    },
  };
}
