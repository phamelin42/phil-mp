/**
 * Réduction des photos avant enregistrement : un cliché de téléphone de
 * 4 Mo devient une vignette de quelques dizaines de Ko, qui tient par
 * centaines dans IndexedDB. Le calcul est pur ; le dessin (canvas) reste dans
 * le composant.
 */

/** Côté le plus long d'une photo réduite, en pixels. */
export const COTE_MAX = 640;
/** Fichier accepté avant réduction : au-delà, le navigateur peine à le décoder sur téléphone. */
export const TAILLE_MAX_ORIGINAL = 25 * 1024 * 1024;
export const TYPES_PHOTO = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const;

/** Dimensions réduites, proportions gardées, jamais agrandies. */
export function dimensionsReduites(
  largeur: number,
  hauteur: number,
  coteMax = COTE_MAX,
): { largeur: number; hauteur: number } {
  if (largeur <= 0 || hauteur <= 0) return { largeur: 0, hauteur: 0 };
  const echelle = Math.min(1, coteMax / Math.max(largeur, hauteur));
  return {
    largeur: Math.max(1, Math.round(largeur * echelle)),
    hauteur: Math.max(1, Math.round(hauteur * echelle)),
  };
}

/** Message d'erreur pour un fichier refusé, ou `null` s'il convient. */
export function verifierPhoto(fichier: { type: string; size: number }): string | null {
  if (!fichier.type.startsWith('image/')) return 'Choisissez une photo (JPEG, PNG ou WebP).';
  if (fichier.size > TAILLE_MAX_ORIGINAL)
    return 'Cette photo dépasse 25 Mo : choisissez-en une plus légère.';
  return null;
}
