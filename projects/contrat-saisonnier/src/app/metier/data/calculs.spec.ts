import { centimes, montants, nuits, partVersee } from './calculs';
import { contratVide } from './contrat';
import { contratExemple } from './exemple';

describe('nuits', () => {
  it('compte les nuits entre l’arrivée et le départ, mois et années franchis', () => {
    expect(nuits('2027-07-10', '2027-07-17')).toBe(7);
    expect(nuits('2027-02-27', '2027-03-02')).toBe(3);
    expect(nuits('2027-12-30', '2028-01-02')).toBe(3);
    // Passage à l'heure d'hiver : toujours une nuit.
    expect(nuits('2027-10-30', '2027-10-31')).toBe(1);
  });

  it('refuse un départ le jour même ou avant, une date absente ou impossible', () => {
    expect(nuits('2027-07-10', '2027-07-10')).toBeNull();
    expect(nuits('2027-07-17', '2027-07-10')).toBeNull();
    expect(nuits('', '2027-07-10')).toBeNull();
    expect(nuits('2027-02-30', '2027-03-05')).toBeNull();
  });
});

describe('montants', () => {
  it('donne le versement, le solde, la taxe de séjour des seuls adultes et le loyer par nuit', () => {
    const m = montants(contratExemple());
    expect(m).toEqual({
      nuits: 7,
      loyer: 84_000,
      versement: 21_000,
      solde: 63_000,
      // 1,50 € × 2 adultes × 7 nuits ; l'enfant ne paie pas.
      taxe: 2_100,
      total: 86_100,
      depot: 40_000,
      parNuit: 12_000,
    });
  });

  it('ne verse jamais plus que le loyer et ne compte pas de taxe sans dates', () => {
    const c = contratVide();
    c.prix.loyer = 300;
    c.prix.montantVersement = 500;
    c.prix.taxeSejour = 2;
    const m = montants(c);
    expect(m.versement).toBe(30_000);
    expect(m.solde).toBe(0);
    expect(m.taxe).toBe(0);
    expect(m.parNuit).toBeNull();
  });

  it('arrondit les montants saisis au centime', () => {
    expect(centimes(0.1 + 0.2)).toBe(30);
    expect(centimes(Number.NaN)).toBe(0);
  });
});

describe('partVersee', () => {
  it('donne la part du loyer versée à la réservation', () => {
    expect(partVersee(contratExemple())).toBe(25);
    expect(partVersee(contratVide())).toBe(0);
  });
});
