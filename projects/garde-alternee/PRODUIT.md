# Planning Garde Alternée

Semaine 2 du programme. Contexte commun : `CLAUDE.md` à la racine du
workspace. Ce fichier ne contient que ce qui est propre à ce produit.

- **Requête visée** : « calendrier garde alternée à imprimer »
- **Domaine** : `garde-alternee.phamelin.fr` (provisoire tant qu'il n'est pas acheté)
- **Public** : parents séparés, souvent en médiation ou en procédure, qui doivent produire un calendrier clair pour l'autre parent ou l'avocat
- **Promesse** : Le calendrier de garde de l'année en deux minutes, à imprimer ou à ajouter à votre agenda.
- **Module métier** : choix d'un modèle de rythme, date de départ, parent de la première période, vacances scolaires par zone, calendrier annuel coloré par parent
- **Exports** : PDF, iCal, impression
- **Offre envisagée** (pas construite) : partage synchronisé entre les deux parents et historique des échanges de jours

## Ce qui est propre à ce produit

| Chemin            | Rôle                                                          |
| ----------------- | ------------------------------------------------------------- |
| `produit.json`    | configuration : nom, domaine, thème, logo, offre, mesure      |
| `contenu.json`    | contenu éditorial, rédigé pour ce produit seul                |
| `src/app/metier/` | le module métier                                              |
| `public/logo.svg` | logo, d'où `npm run icones -- garde-alternee` tire les icônes |

Le reste (coquille, pages légales, mesure, SEO, stockage, PWA) vient de
`@mp/core` et `@mp/ui` : on ne le duplique pas ici.

## Fiches

- `prompts/garde-alternee/01-module-metier.md`
- `prompts/garde-alternee/02-contenu-editorial.md`
