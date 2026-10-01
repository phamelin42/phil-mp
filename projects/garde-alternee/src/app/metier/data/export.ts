import { Planning } from './planning';

/**
 * Exports du calendrier. PDF et impression passent par l'impression du
 * navigateur sur la mise en page dédiée (`print.css`) ; iCal produit un
 * fichier .ics à ajouter à un agenda.
 */
export const FORMATS_EXPORT = ['pdf', 'ical', 'impression'] as const;
export type FormatExport = (typeof FORMATS_EXPORT)[number];

export const CONSIGNES: Record<FormatExport, string> = {
  pdf: 'Dans la fenêtre qui s’ouvre, choisissez « Enregistrer au format PDF » comme imprimante.',
  ical: 'Le fichier .ics s’importe dans Google Agenda, Calendrier d’Apple ou Outlook.',
  impression:
    'Dans la fenêtre qui s’ouvre, choisissez votre imprimante : les douze mois tiennent sur une page.',
};

/** Nom de fichier sans extension : « Garde 2026-2027 Marie Julien ». */
export function nomDeFichier(planning: Planning): string {
  const noms = [planning.parentA, planning.parentB].map((n) => n.trim()).filter(Boolean);
  return [`Garde ${planning.annee}-${planning.annee + 1}`, ...noms]
    .join(' ')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 120);
}
