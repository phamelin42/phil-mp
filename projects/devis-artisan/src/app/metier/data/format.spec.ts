import { ajouterJours, dateLongue, euros, quantite, taux } from './format';

describe('mises en forme', () => {
  it('écrit les montants à la française', () => {
    expect(euros(123456)).toBe('1\u202f234,56\u00a0€');
    expect(euros(0)).toBe('0,00\u00a0€');
  });

  it('écrit quantités et taux avec une virgule', () => {
    expect(quantite(2.5)).toBe('2,5');
    expect(taux('5.5')).toBe('5,5\u00a0%');
  });

  it('écrit les dates en toutes lettres', () => {
    expect(dateLongue('2026-10-01')).toBe('1er\u00a0octobre 2026');
    expect(dateLongue('2026-02-14')).toBe('14\u00a0février 2026');
    expect(dateLongue('pas une date')).toBe('');
  });

  it('ajoute des jours en franchissant mois et années', () => {
    expect(ajouterJours('2026-10-01', 30)).toBe('2026-10-31');
    expect(ajouterJours('2026-12-15', 30)).toBe('2027-01-14');
    expect(ajouterJours('', 30)).toBe('');
  });
});
