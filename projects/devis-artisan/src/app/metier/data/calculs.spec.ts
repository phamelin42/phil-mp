import { montantLigneHt, totaux } from './calculs';
import { Devis, TAUX_TVA } from './devis';
import { devisExemple } from './exemple';

function avecLignes(regimeTva: Devis['regimeTva'], lignes: Devis['lignes']): Devis {
  return { ...devisExemple(), regimeTva, lignes };
}

describe('montants', () => {
  it('calcule une ligne en centimes sans erreur d’arrondi', () => {
    expect(
      montantLigneHt({
        designation: '',
        quantite: 3,
        unite: 'u',
        prixUnitaire: 19.99,
        tauxTva: '20',
      }),
    ).toBe(5997);
    expect(
      montantLigneHt({
        designation: '',
        quantite: 2.5,
        unite: 'm²',
        prixUnitaire: 33.33,
        tauxTva: '20',
      }),
    ).toBe(8333);
  });

  it('en franchise, ne compte aucune TVA quel que soit le taux des lignes', () => {
    for (const tauxTva of TAUX_TVA) {
      const t = totaux(
        avecLignes('franchise', [
          { designation: 'a', quantite: 1, unite: 'u', prixUnitaire: 100, tauxTva },
        ]),
      );
      expect(t).toMatchObject({ totalHt: 10000, totalTva: 0, totalTtc: 10000, parTaux: [] });
    }
  });

  it('assujetti, applique chaque taux sur sa base', () => {
    const attendu = { '20': 2000, '10': 1000, '5.5': 550 };
    for (const tauxTva of TAUX_TVA) {
      const t = totaux(
        avecLignes('assujetti', [
          { designation: 'a', quantite: 1, unite: 'u', prixUnitaire: 100, tauxTva },
        ]),
      );
      expect(t.parTaux).toEqual([{ taux: tauxTva, baseHt: 10000, tva: attendu[tauxTva] }]);
      expect(t.totalTtc).toBe(10000 + attendu[tauxTva]);
    }
  });

  it('regroupe les lignes par taux et arrondit la TVA une fois par taux', () => {
    const t = totaux(
      avecLignes('assujetti', [
        { designation: 'a', quantite: 1, unite: 'u', prixUnitaire: 0.05, tauxTva: '5.5' },
        { designation: 'b', quantite: 1, unite: 'u', prixUnitaire: 0.05, tauxTva: '5.5' },
        { designation: 'c', quantite: 2, unite: 'h', prixUnitaire: 45, tauxTva: '10' },
      ]),
    );
    expect(t.parTaux).toEqual([
      { taux: '10', baseHt: 9000, tva: 900 },
      { taux: '5.5', baseHt: 10, tva: 1 },
    ]);
    expect(t).toMatchObject({ totalHt: 9010, totalTva: 901, totalTtc: 9911 });
  });

  it('calcule l’acompte sur le total TTC', () => {
    const t = totaux({
      ...avecLignes('assujetti', [
        { designation: 'a', quantite: 1, unite: 'u', prixUnitaire: 1000, tauxTva: '20' },
      ]),
      acomptePct: 30,
    });
    expect(t.acompte).toBe(36000);
  });
});
