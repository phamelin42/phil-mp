import { duree, euros, pourcentage } from './format';

describe('format', () => {
  it('écrit les montants et les taux à la française', () => {
    expect(euros(123456)).toBe('1\u202f234,56\u00a0€');
    expect(pourcentage(6.5)).toBe('6,5\u00a0%');
  });

  it('écrit une durée en heures et minutes', () => {
    expect(duree(40)).toBe('40\u00a0min');
    expect(duree(60)).toBe('1\u00a0h');
    expect(duree(95)).toBe('1\u00a0h\u00a035');
    expect(duree(Number.NaN)).toBe('0\u00a0min');
  });
});
