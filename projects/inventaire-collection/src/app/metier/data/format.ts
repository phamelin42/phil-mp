/** Mises en forme françaises. */

const EUROS = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

export function euros(centimes: number): string {
  return EUROS.format(centimes / 100);
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

/** « 2026-10-01 » → « 1er octobre 2026 » ; vide ou invalide → chaîne vide. */
export function dateLongue(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return '';
  const j = Number(m[3]);
  return `${j === 1 ? '1er' : j}\u00a0${MOIS[Number(m[2]) - 1]} ${m[1]}`;
}

export function dateDuJour(maintenant: Date): string {
  const mois = String(maintenant.getMonth() + 1).padStart(2, '0');
  const jour = String(maintenant.getDate()).padStart(2, '0');
  return `${maintenant.getFullYear()}-${mois}-${jour}`;
}
