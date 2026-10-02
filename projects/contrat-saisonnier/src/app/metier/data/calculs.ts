import { Contrat } from './contrat';

/** Montant saisi en euros → centimes entiers (les calculs ne manipulent que des entiers). */
export function centimes(euros: number): number {
  return Number.isFinite(euros) ? Math.round(euros * 100) : 0;
}

function jourUtc(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [a, mo, j] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = Date.UTC(a, mo - 1, j);
  const d = new Date(t);
  // 2026-02-30 n'existe pas : Date le reporterait au 2 mars.
  return d.getUTCMonth() === mo - 1 && d.getUTCDate() === j ? t / 86_400_000 : null;
}

/** Nuits entre l'arrivée et le départ ; `null` si une date manque ou si le départ ne suit pas l'arrivée. */
export function nuits(arrivee: string, depart: string): number | null {
  const a = jourUtc(arrivee);
  const d = jourUtc(depart);
  if (a === null || d === null || d <= a) return null;
  return d - a;
}

export interface Montants {
  nuits: number | null;
  loyer: number;
  versement: number;
  /** Loyer restant dû après le versement à la réservation. */
  solde: number;
  /** Taxe de séjour du séjour entier ; 0 si le tarif n'est pas saisi. */
  taxe: number;
  /** Loyer et taxe de séjour, hors dépôt de garantie (restitué). */
  total: number;
  depot: number;
  /** Loyer moyen d'une nuit ; `null` sans dates valides. */
  parNuit: number | null;
}

/** Tous les montants du contrat, en centimes. */
export function montants(c: Contrat): Montants {
  const n = nuits(c.sejour.arrivee, c.sejour.depart);
  const loyer = centimes(c.prix.loyer);
  const versement = Math.min(loyer, centimes(c.prix.montantVersement));
  // La taxe de séjour ne s'applique pas aux mineurs (CGCT, art. L2333-31).
  const taxe = n === null ? 0 : centimes(c.prix.taxeSejour) * c.sejour.adultes * n;
  return {
    nuits: n,
    loyer,
    versement,
    solde: loyer - versement,
    taxe,
    total: loyer + taxe,
    depot: centimes(c.prix.depotGarantie),
    parNuit: n === null ? null : Math.round(loyer / n),
  };
}

/** Part du loyer versée à la réservation, en pour cent arrondi ; 0 sans loyer. */
export function partVersee(c: Contrat): number {
  const m = montants(c);
  return m.loyer ? Math.round((m.versement / m.loyer) * 100) : 0;
}
