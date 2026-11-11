# Médiathèque — PWA liée à ta base Notion (via Google Apps Script)

Fonctionne seule (données locales, hors ligne) et se synchronise avec Notion via un script Google.

## 1. Brancher Notion
1. notion.so/my-integrations → nouvelle intégration → copie le token. Dans ta base « Culture » : ••• → Connexions → ajoute l'intégration.
2. L'ID de la base = les 32 caractères de son URL, avant « ?v= ».

## 2. Créer le script Google
1. script.google.com → Nouveau projet → remplace le contenu de `Code.gs` par celui de ce dossier.
2. Paramètres du projet (⚙️) → Propriétés du script → ajoute `NOTION_TOKEN`, `DATABASE_ID` et `APP_KEY` (mot de passe de ton choix).
3. Dans l'éditeur, choisis la fonction `autoriser` → Exécuter → accepte les autorisations (le journal doit afficher les propriétés détectées).
4. Déployer → Nouveau déploiement → type « Application Web » → Exécuter en tant que : **Moi** ; Accès : **Tout le monde** → copie l'URL se terminant par `/exec`.
   Après chaque modification du code : Déployer → Gérer les déploiements → ✏️ → Nouvelle version.

## 3. Héberger la PWA (HTTPS obligatoire)
Dépose le reste du dossier sur Cloudflare Pages, Netlify, Vercel ou GitHub Pages, ouvre l'URL sur ton téléphone → « Ajouter à l'écran d'accueil ». Dans l'app : ⚙️ → URL `/exec` + APP_KEY → Synchroniser.

Propriétés attendues (insensibles aux espaces/majuscules) : Nom, Type, Statut, Note sur 5, Auteur, Terminé le, Lien, Cover, Genre, Notes, Résumé. Les types Notion sont détectés automatiquement.

## Recherche de fiches
Livres : Google Books (sans clé). Films/séries : clé TMDB gratuite à coller dans ⚙️.
