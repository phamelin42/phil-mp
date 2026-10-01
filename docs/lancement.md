# Mise en ligne d'un produit

Chaque produit est servi sur un sous-domaine de `phamelin.fr`
(`<slug>.phamelin.fr`, champ `domaine` de son `produit.json`).
`npm run lancement -- <slug>` vérifie les points marqués (auto). Les autres se
font à la main, dans l'ordre.

## Une fois pour tout le workspace

- **Search Console** : ajouter la propriété « domaine » `phamelin.fr` et la
  vérifier par l'enregistrement DNS TXT proposé. Elle couvre tous les
  sous-domaines : aucune balise par produit. Y ajouter le compte de service du
  rapport mensuel en lecture seule.
- **Secrets du dépôt** : `UMAMI_URL`, `UMAMI_TOKEN`, `GSC_SERVICE_ACCOUNT`,
  `CLAUDE_CODE_OAUTH_TOKEN`. L'identifiant Umami de chaque produit se lit dans
  son `produit.json`.
- **Dépôt** : protection de `main` (check « Lint · format · tests · build »
  requis), « Allow auto-merge » coché, label `rapport` créé.
- **Éditeur** : compléter nom, statut et SIREN, adresse, contact dans
  `produits.json` → `editeur` et dans chaque `produit.json` déjà créé. (auto)

## Pour chaque produit

1. `npm run icones -- <slug>`, vérifier le rendu, commiter `public/icons/`.
   (auto)
2. Rédiger tout le contenu (`prompts/<slug>/02-contenu-editorial.md`). (auto)
3. Créer le site dans Umami pour `<slug>.phamelin.fr`, recopier son
   identifiant dans `produit.json` → `mesure.siteId`. (auto)
4. Créer le projet Vercel sur ce dépôt, **racine `projects/<slug>`**, avec
   l'option « inclure les fichiers hors de la racine » ; installation, build et
   sortie sont lus dans son `vercel.json`.
5. Dans Vercel, ajouter le domaine `<slug>.phamelin.fr` au projet ; chez le
   registrar de `phamelin.fr`, créer l'enregistrement DNS que Vercel indique
   (en général `CNAME <slug> → cname.vercel-dns.com`).
6. Dans la Search Console (propriété `phamelin.fr`), soumettre
   `https://<slug>.phamelin.fr/sitemap.xml`, inspecter
   `https://<slug>.phamelin.fr/` et demander l'indexation.

## Contrôle final, sur le site en ligne

- Lighthouse mobile : PWA installable, performance ≥ 90.
- L'invite d'installation apparaît (Chrome Android) ; le mode d'emploi iOS
  s'affiche sur Safari iPhone.
- Couper le réseau, recharger : l'accueil s'affiche.
- Umami reçoit une visite depuis `<slug>.phamelin.fr`.

## Passer un produit sur son propre domaine

Quand un produit a du trafic : changer `domaine` et
`proprieteSearchConsole` dans son `produit.json`, ajouter le domaine dans
Vercel, rediriger `<slug>.phamelin.fr` en 301 vers le nouveau domaine, et
déclarer le changement d'adresse dans la Search Console.
