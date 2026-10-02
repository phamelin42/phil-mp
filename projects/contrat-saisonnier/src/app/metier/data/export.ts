import { Contrat } from './contrat';

/**
 * Exports du contrat. Les deux passent par l'impression du navigateur sur la
 * mise en page dédiée (`print.css`) : pas de bibliothèque PDF à charger. Le
 * titre du document devient le nom de fichier proposé par « Enregistrer au
 * format PDF ».
 */
export const FORMATS_EXPORT = ['pdf', 'impression'] as const;
export type FormatExport = (typeof FORMATS_EXPORT)[number];

export const CONSIGNES: Record<FormatExport, string> = {
  pdf: 'Dans la fenêtre qui s’ouvre, choisissez «\u00a0Enregistrer au format PDF\u00a0» comme imprimante.',
  impression: 'Imprimez deux exemplaires\u00a0: un pour vous, un pour votre locataire.',
};

/** Caractères refusés dans un nom de fichier sous Windows, macOS ou Android. */
const INTERDITS = /[\\/:*?"<>|]/g;
/** Sauts de ligne, tabulations et autres caractères de contrôle. */
const CONTROLE = /\p{Cc}/gu;

/** Titre posé sur la page le temps de l'impression : « Contrat de location Dupont 2027-07-10 ». */
export function nomDeFichier(c: Contrat): string {
  return ['Contrat de location', c.locataire.nom.trim(), c.sejour.arrivee]
    .filter(Boolean)
    .join(' ')
    .replace(CONTROLE, ' ')
    .replace(INTERDITS, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 120);
}
