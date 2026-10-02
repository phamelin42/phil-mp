# Inventaire Collection — fiche 02 : le contenu éditorial

**Étape servie : acquisition.** Le référencement est le seul canal ; dix
sites aux textes génériques seraient traités comme du contenu dupliqué.

## À livrer

Remplacer chaque « À RÉDIGER » de `projects/inventaire-collection/contenu.json` par
un texte écrit pour ce produit seul, pour collectionneurs (vinyles, timbres, Lego, cartes) qui veulent savoir ce qu'ils possèdent et ce que ça vaut.

- **Accueil** : au moins 300 mots utiles à « application inventaire collection » — comment ça
  marche en trois étapes, deux exemples concrets et chiffrés du métier.
- **Aide** : description de 140 à 160 caractères, deux sections pas à pas,
  au moins quatre questions fréquentes formulées comme on les tape.
- **Offre** : ce que la version complète apportera, sans promesse de date.
- Aucune phrase reprise d'un autre produit, ni d'un modèle :
  `tools/check-contenu.mjs` fait échouer le build sinon.
- Français soigné : espaces insécables avant `: ; ? !` et dans « ».
- Exactitude : un point juridique ou fiscal se vérifie à la source officielle
  (service-public.fr, legifrance.gouv.fr), citée dans la PR.

## Vérification

`npm run lancement -- inventaire-collection` ne signale plus aucun texte à rédiger ;
`npm run verify:ci` vert. Relecture de Phil obligatoire (texte visible).
