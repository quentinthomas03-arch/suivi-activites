/**
 * Configuration Firebase (console Firebase › Paramètres du projet › Vos applications › Web).
 * Ces valeurs ne sont pas secrètes : la protection des données repose sur les règles
 * Firestore (fichier firestore.rules) et la liste des personnes autorisées.
 *
 * Mettre `null` pour repasser en MODE DÉMO. Ajouter « ?demo » à l'adresse force aussi la démo.
 */
export const firebaseConfig: Record<string, string> | null = {
  apiKey: 'AIzaSyAyK6wHFuTYgg3S2P4K1Qtz7DU6vu6hoeY',
  authDomain: 'suivi-activites.firebaseapp.com',
  projectId: 'suivi-activites',
  storageBucket: 'suivi-activites.firebasestorage.app',
  messagingSenderId: '496556014837',
  appId: '1:496556014837:web:c7647bf0130971a46959bc',
};
