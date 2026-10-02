/** Mises en forme françaises des montants, des dates et des heures. */

const EUROS = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const NOMBRE = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

/** 123456 centimes → « 1 234,56 € » (espaces insécables). */
export function euros(centimes: number): string {
  return EUROS.format(centimes / 100);
}

export function nombre(n: number): string {
  return NOMBRE.format(n);
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

/** « 2027-07-01 » → « 1er juillet 2027 » ; date invalide → chaîne vide. */
export function dateLongue(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return '';
  const [a, mo, j] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || j < 1 || j > 31) return '';
  return `${j === 1 ? '1er' : j}\u00a0${MOIS[mo - 1]} ${a}`;
}

/** « 16:00 » → « 16 h », « 10:30 » → « 10 h 30 » ; heure invalide → chaîne vide. */
export function heure(hhmm: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return '';
  const h = Number(m[1]);
  return m[2] === '00' ? `${h}\u00a0h` : `${h}\u00a0h\u00a0${m[2]}`;
}

/** 1 → « 1 nuit », 7 → « 7 nuits ». */
export function pluriel(n: number, mot: string): string {
  return `${nombre(n)}\u00a0${mot}${n > 1 ? 's' : ''}`;
}
