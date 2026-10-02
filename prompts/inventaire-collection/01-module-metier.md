# Inventaire Collection — fiche 01 : le module métier

**Étape servie : activation.** Sans lui, la visite venue de « application inventaire collection »
repart sans rien.

## À livrer

Remplacer `projects/inventaire-collection/src/app/metier/` par le module métier :
fiches d'objets par collection (photo réduite localement, état normalisé, valeur estimée, date d'achat), recherche, total par collection.

Exports attendus : PDF, CSV.

## Exigences

- Tout dans le navigateur. Calculs et mises en forme dans
  `src/app/metier/data/`, fonctions pures testées sans Angular.
- Le travail en cours est enregistré au fil de la saisie (`KvStoreService`
  de `@mp/core`) et retrouvé à la visite suivante (`donnees_reprises`).
- Événements : `outil_commence` à la première saisie, `outil_termine` quand
  le résultat est complet, `export_fait` avec `format` à chaque export.
  Aucune saisie dans les propriétés.
- Formulaire en Signal Forms, étiquettes visibles, erreurs annoncées, cibles
  de 48 px, utilisable à 320 px de large. Aucun style propre : les classes de
  `libs/ui/styles/base.css` ; une classe qui manque s'ajoute là.
- Un composant qui servirait à un autre produit va dans `libs/ui`, pas ici.
- PDF : impression du navigateur sur une mise en page dédiée
  (`libs/ui/styles/print.css`) avant toute bibliothèque ; une bibliothèque se
  charge par `import()` et se justifie dans la PR. iCal : RFC 5545 à la main,
  testé.

## Fichiers à lire

`CLAUDE.md`, `projects/inventaire-collection/PRODUIT.md`, `projects/inventaire-collection/src/app/metier/`,
`libs/core/src/index.ts`, `libs/ui/styles/base.css`.

## Vérification

Tests des fonctions de `data/` (chaque format d'export et chaque variante
énumérée, en boucle), un test e2e saisir → recharger → retrouver → exporter,
`npm run verify:ci` vert.
