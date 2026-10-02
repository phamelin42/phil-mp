/** Mises en forme françaises. */

const EUROS = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const NOMBRE = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 });

/** 123456 centimes → « 1 234,56 € » (espaces insécables). */
export function euros(centimes: number): string {
  return EUROS.format(centimes / 100);
}

export function nombre(n: number): string {
  return NOMBRE.format(Number.isFinite(n) ? n : 0);
}

/** 6.5 → « 6,5 % ». */
export function pourcentage(n: number): string {
  return `${nombre(n)}\u00a0%`;
}

/** 95 → « 1 h 35 » ; 40 → « 40 min ». */
export function duree(minutes: number): string {
  const m = Math.round(Number.isFinite(minutes) && minutes > 0 ? minutes : 0);
  const h = Math.floor(m / 60);
  const reste = m % 60;
  if (!h) return `${reste}\u00a0min`;
  return reste ? `${h}\u00a0h\u00a0${String(reste).padStart(2, '0')}` : `${h}\u00a0h`;
}
