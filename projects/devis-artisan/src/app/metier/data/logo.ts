/** Logo chargé depuis l'appareil : il n'est envoyé nulle part. */

export const TYPES_LOGO = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] as const;
export const TAILLE_MAX_LOGO = 500 * 1024;

/** Message d'erreur pour un fichier refusé, ou `null` s'il convient. */
export function verifierLogo(fichier: { type: string; size: number }): string | null {
  if (!(TYPES_LOGO as readonly string[]).includes(fichier.type)) {
    return 'Choisissez une image PNG, JPEG, WebP ou SVG.';
  }
  if (fichier.size > TAILLE_MAX_LOGO)
    return 'Le logo dépasse 500 Ko : choisissez une image plus légère.';
  return null;
}
