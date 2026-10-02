# Prix Fait Main

Semaine 4 du programme. Contexte commun : `CLAUDE.md` à la racine du
workspace. Ce fichier ne contient que ce qui est propre à ce produit.

- **Requête visée** : « calculer prix de vente création fait main »
- **Domaine** : `prix-fait-main.phamelin.fr` (provisoire tant qu'il n'est pas acheté)
- **Public** : créatrices et créateurs qui vendent sur Etsy, en marchés ou en boutique, et qui sous-évaluent leur temps
- **Promesse** : Le prix juste de votre création : matière, temps et charges comptés, marge comprise.
- **Module métier** : saisie des matières (quantité utilisée sur quantité achetée), du temps et du taux horaire, des charges et commissions de plateforme, prix conseillé gros et détail
- **Exports** : PDF, CSV
- **Offre envisagée** (pas construite) : catalogue de fiches produit et mise à jour des prix quand une matière augmente

## Ce qui est propre à ce produit

| Chemin            | Rôle                                                          |
| ----------------- | ------------------------------------------------------------- |
| `produit.json`    | configuration : nom, domaine, thème, logo, offre, mesure      |
| `contenu.json`    | contenu éditorial, rédigé pour ce produit seul                |
| `src/app/metier/` | le module métier                                              |
| `public/logo.svg` | logo, d'où `npm run icones -- prix-fait-main` tire les icônes |

Le reste (coquille, pages légales, mesure, SEO, stockage, PWA) vient de
`@mp/core` et `@mp/ui` : on ne le duplique pas ici.

## Fiches

- `prompts/prix-fait-main/01-module-metier.md`
- `prompts/prix-fait-main/02-contenu-editorial.md`
