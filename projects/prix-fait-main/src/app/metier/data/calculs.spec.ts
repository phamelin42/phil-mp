import { calculer, centimes, coutMatiere, venteDirecte } from './calculs';
import { REGIMES_TVA, matiereVide } from './fiche';
import { ficheExemple } from './exemple';

describe('coutMatiere', () => {
  it('compte la part utilisée du lot acheté', () => {
    expect(
      coutMatiere({ ...matiereVide(), prixAchat: 12, quantiteAchetee: 100, quantiteUtilisee: 30 }),
    ).toBe(360);
  });

  it('vaut zéro sans quantité achetée ou avec une saisie vide', () => {
    expect(coutMatiere({ ...matiereVide(), prixAchat: 12, quantiteAchetee: 0 })).toBe(0);
    expect(coutMatiere({ ...matiereVide(), prixAchat: Number.NaN })).toBe(0);
    expect(coutMatiere({ ...matiereVide(), prixAchat: -4 })).toBe(0);
  });

  it('arrondit au centime sans erreur de virgule flottante', () => {
    expect(centimes(2.5 * 33.33)).toBe(8333);
  });
});

describe('calculer', () => {
  it('donne le coût de revient, le prix de gros et le prix de détail du collier', () => {
    const r = calculer(ficheExemple())!;
    expect(r.matieres).toEqual([360, 50, 10]);
    expect(r.totalMatieres).toBe(420);
    expect(r.mainOeuvre).toBe(1125);
    expect(r.frais).toBe(80);
    expect(r.coutRevient).toBe(1625);
    expect(r.benefice).toBe(163);
    // (16,25 + 1,63) ÷ (1 − 12,3 %) = 20,387… → 20,39 €
    expect(r.prixGrosHt).toBe(2039);
    expect(r.prixDetailHt).toBe(4078);
    expect(r.prixDetailTtc).toBe(4078);
    expect(r.prixEtiquette).toBe(4100);
    // (17,88 + 0,30) ÷ (1 − 12,3 % − 10,5 %) = 23,549… → 23,55 €
    expect(r.plancherDirectHt).toBe(2355);
    expect(r.detailReleve).toBe(false);
  });

  it('garde coût et bénéfice quand on vend au prix de gros à une boutique', () => {
    const r = calculer(ficheExemple())!;
    const cotisations = Math.round((r.prixGrosHt * 12.3) / 100);
    expect(r.prixGrosHt - cotisations).toBeGreaterThanOrEqual(r.coutRevient + r.benefice);
  });

  it('garde coût et bénéfice en vente directe au prix plancher, TVA comprise', () => {
    for (const regimeTva of REGIMES_TVA) {
      const fiche = { ...ficheExemple(), regimeTva, coefficientDetail: 1 };
      const r = calculer(fiche)!;
      const ttc =
        r.plancherDirectHt + (regimeTva === 'assujetti' ? Math.round(r.plancherDirectHt * 0.2) : 0);
      const v = venteDirecte(fiche, ttc, r.coutRevient);
      expect(v.benefice).toBeGreaterThanOrEqual(r.benefice - 1);
    }
  });

  it('relève le prix de détail quand la plateforme prend plus que la boutique', () => {
    const r = calculer({ ...ficheExemple(), coefficientDetail: 1 })!;
    expect(r.detailReleve).toBe(true);
    expect(r.prixDetailHt).toBe(r.plancherDirectHt);
  });

  it('ajoute 20 % de TVA au prix de détail d’une créatrice assujettie', () => {
    const r = calculer({ ...ficheExemple(), regimeTva: 'assujetti' })!;
    expect(r.prixDetailTtc).toBe(r.prixDetailHt + Math.round(r.prixDetailHt * 0.2));
    expect(r.prixEtiquette % 100).toBe(0);
    expect(r.prixEtiquette).toBeGreaterThanOrEqual(r.prixDetailTtc);
  });

  it('détaille une vente au prix d’étiquette : commission, cotisations, bénéfice', () => {
    const r = calculer(ficheExemple())!;
    expect(r.venteDirecte).toEqual({
      prixTtc: 4100,
      tva: 0,
      commission: 431 + 30,
      cotisations: 504,
      benefice: 4100 - 461 - 504 - 1625,
    });
  });

  it('refuse un calcul où cotisations et commission atteignent 100 %', () => {
    expect(calculer({ ...ficheExemple(), cotisationsPct: 100 })).toBeNull();
    expect(calculer({ ...ficheExemple(), cotisationsPct: 50, commissionPct: 50 })).toBeNull();
  });

  it('ignore les saisies vides plutôt que de produire NaN', () => {
    const r = calculer({ ...ficheExemple(), minutes: Number.NaN, fraisParPiece: Number.NaN })!;
    expect(r.mainOeuvre).toBe(0);
    expect(r.frais).toBe(0);
    expect(Number.isFinite(r.prixEtiquette)).toBe(true);
  });
});
