# Planning Garde Alternée — fiche 02 : le contenu éditorial

**Étape servie : acquisition.** Le référencement est le seul canal ; dix
sites aux textes génériques seraient traités comme du contenu dupliqué.

## À livrer

Remplacer chaque « À RÉDIGER » de `projects/garde-alternee/contenu.json` par
un texte écrit pour ce produit seul, pour parents séparés, souvent en médiation ou en procédure, qui doivent produire un calendrier clair pour l'autre parent ou l'avocat.

- **Accueil** : au moins 300 mots utiles à « calendrier garde alternée à imprimer » — comment ça
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

`npm run lancement -- garde-alternee` ne signale plus aucun texte à rédiger ;
`npm run verify:ci` vert. Relecture de Phil obligatoire (texte visible).
