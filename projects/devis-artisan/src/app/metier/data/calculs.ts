import { Devis, Ligne, TAUX_TVA, TauxTva } from './devis';

/**
 * Montants en centimes entiers : aucune erreur d'arrondi ne s'accumule d'une
 * ligne à l'autre. La TVA s'arrondit une fois par taux, sur le total hors
 * taxes de ce taux.
 */

export interface TotalTaux {
  taux: TauxTva;
  baseHt: number;
  tva: number;
}

export interface Totaux {
  lignesHt: number[];
  parTaux: TotalTaux[];
  totalHt: number;
  totalTva: number;
  totalTtc: number;
  acompte: number;
}

/**
 * Euros → centimes. 2,5 × 33,33 vaut 8332,4999… en virgule flottante : on
 * ramène à 12 chiffres significatifs avant d'arrondir (8332,5 → 8333).
 */
export function centimes(montant: number): number {
  return Math.round(Number((montant * 100).toPrecision(12)));
}

export function montantLigneHt(ligne: Ligne): number {
  return centimes(ligne.quantite * ligne.prixUnitaire);
}

export function totaux(devis: Devis): Totaux {
  const lignesHt = devis.lignes.map(montantLigneHt);
  const franchise = devis.regimeTva === 'franchise';
  const parTaux: TotalTaux[] = [];
  if (!franchise) {
    for (const taux of TAUX_TVA) {
      const baseHt = devis.lignes.reduce(
        (somme, l, i) => (l.tauxTva === taux ? somme + lignesHt[i] : somme),
        0,
      );
      if (baseHt > 0)
        parTaux.push({ taux, baseHt, tva: Math.round((baseHt * Number(taux)) / 100) });
    }
  }
  const totalHt = lignesHt.reduce((a, b) => a + b, 0);
  const totalTva = parTaux.reduce((a, t) => a + t.tva, 0);
  const totalTtc = totalHt + totalTva;
  return {
    lignesHt,
    parTaux,
    totalHt,
    totalTva,
    totalTtc,
    acompte: Math.round((totalTtc * devis.acomptePct) / 100),
  };
}
