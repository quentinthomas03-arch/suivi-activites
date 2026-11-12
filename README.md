# Suivi Activités — EK2L0 Metz & Strasbourg

Suivi des interventions VLEP, Aération et Bruit : devis, planification, rapports, contrôles périodiques.
Remplace le Google Sheet « Suivi VLEP » et son script Apps Script.

- **Connexion avec un compte Google**, uniquement pour les adresses autorisées (onglet Réglages).
- **Rôles** : technicien (son agence), manager (tout + export + journal), administrateur (+ accès et réglages).
- **Onglets Metz et Strasbourg** = l'équipe qui intervient, quel que soit le département (BFC compris).
- **Alertes automatiques** : échéance dépassée ou < 2 mois, devis à relancer (envoi + 30 j),
  rapport en retard (fin + 42 j), intervention passée encore « Planifié ».
- **Clôture** : la ligne part dans les archives et le prochain contrôle périodique est créé
  (périodicité par métier, réglable : VLEP 12 mois, Bruit Env 60 mois…).
- **Journal** de toutes les modifications (qui, quand, quoi).
- **Export Excel** (CSV) pour les managers.

> Le code est public, les données ne le sont pas : elles sont dans Firestore, protégées par
> `firestore.rules` et la liste des personnes autorisées. Aucune donnée réelle dans ce dépôt.

## Mode démo

Tant que `src/firebaseConfig.ts` vaut `null`, l'appli tourne avec des **données fictives**
enregistrées uniquement dans le navigateur. Ajouter `?demo` à l'adresse force ce mode.

## Mise en service (une seule fois)

1. **Firebase** : sur https://console.firebase.google.com, créer un projet `suivi-activites`
   (Google Analytics inutile).
2. **Authentication** › Commencer › Fournisseur **Google** › Activer.
   Puis Paramètres › **Domaines autorisés** › ajouter `<compte>.github.io`.
3. **Firestore Database** › Créer › emplacement **europe-west9 (Paris)** › mode production.
   Onglet **Règles** : coller le contenu de `firestore.rules` › Publier.
4. **Premier administrateur** : Firestore › Démarrer une collection `utilisateurs`,
   ID du document = ton adresse Gmail en minuscules, champs :
   `nom` (texte), `initiales` (texte), `agence` = `Toutes`, `role` = `admin`, `actif` = true (booléen).
   Les autres personnes s'ajoutent ensuite depuis l'appli (Réglages).
5. **Paramètres du projet** › Vos applications › icône Web `</>` › copier l'objet `firebaseConfig`
   et le coller dans `src/firebaseConfig.ts`.
6. **GitHub** › Settings › Pages › Source : **GitHub Actions**.

## Développement

```bash
npm install
npm run dev     # http://localhost:5173/suivi-activites/
npm test        # règles métier
npm run build
```

Architecture : `src/domain` (modèle, règles, dates), `src/data` (accès aux données : Firebase ou démo),
`src/pages` (écrans), `src/ui` (composants).
