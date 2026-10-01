/** Mises en forme françaises des dates du calendrier. */

export const MOIS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
] as const;

/** « 2026-10-01 » → « 1er octobre 2026 » ; date invalide → chaîne vide. */
export function dateLongue(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return '';
  const j = Number(m[3]);
  return `${j === 1 ? '1er' : j}\u00a0${MOIS[Number(m[2]) - 1]} ${m[1]}`;
}

/** Les douze mois de l'année scolaire, de septembre à août. */
export function moisDeLAnnee(annee: number): { annee: number; mois: number }[] {
  return Array.from({ length: 12 }, (_, i) => {
    const mois = ((8 + i) % 12) + 1;
    return { annee: mois >= 9 ? annee : annee + 1, mois };
  });
}
