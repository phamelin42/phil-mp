# ADR 003 — Ionic pour les formulaires, prêt pour l'application mobile

**Statut : demandée par Phil le 2 octobre 2026, à relire après fusion.**

## Problème

Les formulaires étaient faits à la main (`.champ`, `.saisie`) : dans une
grille à deux colonnes, l'étiquette et l'aide passaient au-dessus du champ,
si bien qu'un champ dont l'aide tenait sur deux lignes descendait plus bas
que son voisin. Les listes et les boutons gardaient l'allure brute du
navigateur. Phil veut une bibliothèque graphique **prête pour l'application
mobile** à venir, et des formulaires au niveau des meilleurs exemples
publiés (Dribbble).

## Options comparées

| Option            | Pour                                                                                                                                                                        | Contre                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Ionic 9**       | Composants pensés pour le mobile (apparences iOS et Material, gestes), même code sur le web et dans l'app par Capacitor ; Angular 22 et composants autonomes pris en charge | Composants web à construire dans le navigateur (voir « Conséquences ») ; surcouches à éviter  |
| Angular Material  | Maintenu par l'équipe Angular, accessibilité éprouvée                                                                                                                       | Allure web plutôt qu'application ; essayé (PR #20), écarté par Phil pour l'application mobile |
| PrimeNG, Taiga UI | Catalogue très large                                                                                                                                                        | Plus lourds, pas d'histoire mobile                                                            |
| Spartan (shadcn)  | Composants sobres copiés dans le dépôt                                                                                                                                      | Impose Tailwind, contraire aux jetons et à `check-styles`                                     |

## Décision

**Ionic 9** (`@ionic/angular`, composants autonomes), limité à ce qu'un
formulaire emploie : `ion-input`, `ion-textarea`, `ion-segment`,
`ion-button`. L'application mobile viendra par Capacitor, qui emballe le
même code.

- Point d'entrée `@mp/ui/formulaires` : `FORMULAIRE` (composants à
  importer), `CHAMPS` (classes d'état pour l'affichage des erreurs),
  `initialiserIonic()` (apparence Material Design, dans le navigateur
  seulement) et `focaliser()` (focus sur un champ Ionic une fois construit).
- Thème : `libs/ui/styles/ionic.css` pose les variables `--ion-*` sur
  `mp-shell` à partir des jetons et du thème du produit ; aucune couleur
  brute. La coquille expose aussi `--color-primary-rgb`, dont Ionic a besoin
  pour ses survols.
- **Aucune surcouche Ionic** (`ion-select`, popover, action sheet) : elles
  s'ouvriraient hors de la coquille, donc hors du thème, et pèsent environ
  45 ko compressés. Une liste longue reste un `<select>` natif habillé
  (`.champ-liste`) : c'est aussi le sélecteur du téléphone. Un choix court
  est un `ion-segment`.
- La coquille garde ses boutons `.btn`, à la même forme : le premier
  affichage ne charge pas Ionic.
- Motifs de formulaire partagés dans `base.css`, inspirés des formulaires
  d'applications soignés : étapes numérotées (`.etape`), jauge de
  progression (`.jauge`), cartes de choix (`.cartes-choix`), résultat mis en
  avant (`.resume`, `.chiffre-cle`, `.postes`), barre collée en bas de
  l'écran (`.barre-collante`), zone de dépôt de photo (`.depot-photo`).
  Chaque produit les combine selon son métier.

## Conséquences

- **Hydratation** : les composants Ionic se construisent dans le navigateur.
  Un module métier porte `host: { ngSkipHydration: 'true' }` ; le texte
  éditorial (accueil, aide), qui fait le référencement, reste pré-rendu et
  hydraté. Avant sa construction, un composant Ionic est masqué (sans
  squelette brut) mais garde sa hauteur.
- **Poids** : bundle initial inchangé (environ 312 ko), budget d'origine
  conservé. Ionic vit dans la page de l'outil (environ 60 ko compressés).
- **Erreurs** : Ionic n'affiche l'erreur d'un champ que s'il porte
  `ion-invalid` et `ion-touched`, qu'il recopie des classes `ng-*` sur
  sortie de champ seulement ; `CHAMPS` fait poser les deux familles par
  Signal Forms, pour qu'une erreur révélée à l'envoi s'affiche aussi.
- **Formulaires** : `novalidate` (la validation est celle de Signal Forms ;
  le champ natif d'Ionic porte un `pattern` vide qui bloquerait l'envoi).
- **Tests** : un champ Ionic se teste par `ionInput` et `ionBlur` ; un
  `ion-button` de type submit, par l'envoi du formulaire ; un
  `ion-segment`, en e2e, par son hôte (c'est lui qui reçoit le pointeur).
- Dribbble n'était pas joignable depuis l'environnement de travail (proxy) :
  les motifs reprennent les conventions qui y reviennent le plus, sans copie
  d'une maquette.
