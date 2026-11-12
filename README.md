# Biblibibi — PWA de suivi de médias

Un seul script Google (le tien) sert tout le monde : toi via Notion, tes amis via leur propre Google Sheet.

## Mise en place (administrateur)
L'aide « ? » de l'app contient le pas-à-pas (visible en mode admin : toucher 5 fois le titre « Réglages »). En résumé :
1. Colle `Code.gs` dans script.google.com. Propriétés du script : `APP_KEY` (partagée), `ADMIN_KEY` (perso), `NOTION_TOKEN`, `DATABASE_ID`.
2. Exécute `autoriser`, puis Déployer → Application Web (exécuter en tant que toi, accès Tout le monde). Copie l'URL `/exec`.
3. Dans `index.html`, remplis l'objet `CONFIG` (SCRIPT_URL, APP_KEY, SHARE_EMAIL, GBOOKS_KEY, TMDB_KEY), puis héberge le dossier (hors `Code.gs`) en HTTPS.
4. Toi : Réglages → mode admin → Source Notion + ADMIN_KEY. Tes amis : coller le lien de leur Sheet.

Après chaque changement de `Code.gs` : Déployer → Gérer les déploiements → Nouvelle version.
