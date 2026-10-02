# Contrat Location Saisonnière

Semaine 5 du programme. Contexte commun : `CLAUDE.md` à la racine du
workspace. Ce fichier ne contient que ce qui est propre à ce produit.

- **Requête visée** : « modèle contrat location saisonnière gratuit »
- **Domaine** : `contrat-saisonnier.phamelin.fr` (provisoire tant qu'il n'est pas acheté)
- **Public** : particuliers qui louent un meublé de tourisme en direct, hors plateforme, une à quelques fois par an
- **Promesse** : Un contrat de location saisonnière complet, état des lieux et inventaire compris, en PDF.
- **Module métier** : formulaire guidé (parties, logement, dates, prix, arrhes ou acompte, taxe de séjour, dépôt de garantie), état des lieux et inventaire pièce par pièce
- **Exports** : PDF, impression
- **Offre envisagée** (pas construite) : modèles enregistrés par logement et contrats successifs pré-remplis

## Ce qui est propre à ce produit

| Chemin            | Rôle                                                              |
| ----------------- | ----------------------------------------------------------------- |
| `produit.json`    | configuration : nom, domaine, thème, logo, offre, mesure          |
| `contenu.json`    | contenu éditorial, rédigé pour ce produit seul                    |
| `src/app/metier/` | le module métier                                                  |
| `public/logo.svg` | logo, d'où `npm run icones -- contrat-saisonnier` tire les icônes |

Le reste (coquille, pages légales, mesure, SEO, stockage, PWA) vient de
`@mp/core` et `@mp/ui` : on ne le duplique pas ici.

## Fiches

- `prompts/contrat-saisonnier/01-module-metier.md`
- `prompts/contrat-saisonnier/02-contenu-editorial.md`
