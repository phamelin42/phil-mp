import { Devis } from './devis';

/**
 * Exports du devis. Les deux passent par l'impression du navigateur sur la
 * mise en page dédiée (`print.css`) : pas de bibliothèque PDF à charger. Le
 * titre du document devient le nom de fichier proposé par « Enregistrer au
 * format PDF ».
 */
export const FORMATS_EXPORT = ['pdf', 'impression'] as const;
export type FormatExport = (typeof FORMATS_EXPORT)[number];

export interface PreparationExport {
  /** Titre posé sur le document le temps de l'impression. */
  titre: string;
  /** Consigne affichée avant d'ouvrir la fenêtre d'impression. */
  consigne: string;
}

const CONSIGNES: Record<FormatExport, string> = {
  pdf: 'Dans la fenêtre qui s’ouvre, choisissez « Enregistrer au format PDF » comme imprimante.',
  impression: 'Dans la fenêtre qui s’ouvre, choisissez votre imprimante.',
};

/** Caractères refusés dans un nom de fichier sous Windows, macOS ou Android. */
const INTERDITS = /[\\/:*?"<>|]/g;
/** Sauts de ligne, tabulations et autres caractères de contrôle. */
const CONTROLE = /\p{Cc}/gu;

export function preparerExport(devis: Devis, format: FormatExport): PreparationExport {
  const morceaux = ['Devis', devis.numero.trim(), devis.client.nom.trim()].filter(Boolean);
  const titre = morceaux
    .join(' ')
    .replace(CONTROLE, ' ')
    .replace(INTERDITS, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 120);
  return { titre, consigne: CONSIGNES[format] };
}
