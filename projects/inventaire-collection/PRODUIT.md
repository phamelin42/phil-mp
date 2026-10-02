# Inventaire Collection

Semaine 3 du programme. Contexte commun : `CLAUDE.md` à la racine du
workspace. Ce fichier ne contient que ce qui est propre à ce produit.

- **Requête visée** : « application inventaire collection »
- **Domaine** : `inventaire-collection.phamelin.fr` (provisoire tant qu'il n'est pas acheté)
- **Public** : collectionneurs (vinyles, timbres, Lego, cartes) qui veulent savoir ce qu'ils possèdent et ce que ça vaut
- **Promesse** : Toute votre collection dans votre poche, photos et valeurs comprises, prête pour l'assurance.
- **Module métier** : fiches d'objets par collection (photo réduite localement, état normalisé, valeur estimée, date d'achat), recherche, total par collection
- **Exports** : PDF, CSV
- **Offre envisagée** (pas construite) : synchronisation entre appareils et sauvegarde des photos

## Ce qui est propre à ce produit

| Chemin            | Rôle                                                                 |
| ----------------- | -------------------------------------------------------------------- |
| `produit.json`    | configuration : nom, domaine, thème, logo, offre, mesure             |
| `contenu.json`    | contenu éditorial, rédigé pour ce produit seul                       |
| `src/app/metier/` | le module métier                                                     |
| `public/logo.svg` | logo, d'où `npm run icones -- inventaire-collection` tire les icônes |

Le reste (coquille, pages légales, mesure, SEO, stockage, PWA) vient de
`@mp/core` et `@mp/ui` : on ne le duplique pas ici.

## Fiches

- `prompts/inventaire-collection/01-module-metier.md`
- `prompts/inventaire-collection/02-contenu-editorial.md`
