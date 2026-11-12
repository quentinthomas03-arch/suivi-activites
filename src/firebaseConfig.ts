/**
 * Configuration Firebase (console Firebase › Paramètres du projet › Vos applications › Web).
 * Ces valeurs ne sont pas secrètes : la protection des données repose sur les règles
 * Firestore (fichier firestore.rules) et la liste des utilisateurs autorisés.
 *
 * Tant que `firebaseConfig` vaut null, l'appli tourne en MODE DÉMO
 * (données fictives, stockées uniquement dans le navigateur).
 */
export const firebaseConfig: Record<string, string> | null = null;
