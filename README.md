# Médiathèque — PWA liée à ta base Notion

Fonctionne seule (données locales, hors ligne) et se synchronise avec Notion via un petit proxy.

## 1. Héberger la PWA (HTTPS obligatoire)
Dépose ce dossier tel quel sur Cloudflare Pages, Netlify, Vercel ou GitHub Pages. Ouvre l'URL sur ton téléphone → « Ajouter à l'écran d'accueil ».

## 2. Brancher Notion
1. notion.so/my-integrations → nouvelle intégration → copie le token. Dans ta base « Culture » : ••• → Connexions → ajoute l'intégration.
2. L'ID de la base = les 32 caractères de son URL, avant « ?v= ».
3. Cloudflare → Workers → nouveau Worker → colle `worker.js`. Dans Settings → Variables, ajoute en secrets :
   `NOTION_TOKEN`, `DATABASE_ID`, `APP_KEY` (mot de passe de ton choix) ; `ALLOWED_ORIGIN` = l'URL de ta PWA (optionnel).
4. Dans la PWA : ⚙️ → URL du Worker + APP_KEY → Synchroniser.

Propriétés attendues (noms insensibles aux espaces/majuscules) : Nom, Type, Statut, Note sur 5, Auteur, Terminé le, Lien, Cover, Genre, Notes, Résumé. Les types Notion sont détectés automatiquement.

## Recherche de fiches
Livres : Google Books (sans clé). Films/séries : clé TMDB gratuite à coller dans ⚙️.
