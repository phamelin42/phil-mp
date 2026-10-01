/** Mises en forme françaises des montants et des dates. */

const EUROS = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const NOMBRE = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 });

/** 123456 centimes → « 1 234,56 € » (espaces insécables). */
export function euros(centimes: number): string {
  return EUROS.format(centimes / 100);
}

export function quantite(q: number): string {
  return NOMBRE.format(q);
}

/** Taux stocké avec un point (« 5.5 ») → « 5,5 % ». */
export function taux(t: string): string {
  return `${t.replace('.', ',')}\u00a0%`;
}

const MOIS = [
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
];

function lireDate(iso: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [a, mo, j] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return mo >= 1 && mo <= 12 && j >= 1 && j <= 31 ? [a, mo, j] : null;
}

/** « 2026-10-01 » → « 1er octobre 2026 » ; date invalide → chaîne vide. */
export function dateLongue(iso: string): string {
  const d = lireDate(iso);
  if (!d) return '';
  const [a, mo, j] = d;
  return `${j === 1 ? '1er' : j}\u00a0${MOIS[mo - 1]} ${a}`;
}

/** Date AAAA-MM-JJ augmentée d'un nombre de jours, calcul civil (sans fuseau). */
export function ajouterJours(iso: string, jours: number): string {
  const d = lireDate(iso);
  if (!d) return '';
  const date = new Date(Date.UTC(d[0], d[1] - 1, d[2] + jours));
  return date.toISOString().slice(0, 10);
}
