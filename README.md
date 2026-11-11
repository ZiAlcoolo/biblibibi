# Médiathèque — PWA de suivi de médias (Notion ou Google Sheet)

Fonctionne seule (données locales, hors ligne). Pour synchroniser, elle passe par un script Google (`Code.gs`) relié à Notion **ou** à un Google Sheet.

**Tout le pas-à-pas est dans l'app** : ⚙️ → bouton « ? ».

Fichiers : `index.html` (app), `sw.js` (hors ligne), `manifest.webmanifest`, `icons/`, `Code.gs` (à coller dans script.google.com).
Hébergement : dépose le dossier (hors `Code.gs`) sur Cloudflare Pages, Netlify, Vercel ou GitHub Pages (HTTPS obligatoire).
