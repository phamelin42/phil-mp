import { CONSIGNES, FORMATS_EXPORT, nomDeFichier } from './export';
import { planningVide } from './planning';

describe('exports', () => {
  it('chaque format a sa consigne', () => {
    for (const format of FORMATS_EXPORT)
      expect(CONSIGNES[format].length, format).toBeGreaterThan(0);
  });

  it('nomme le fichier d’après l’année et les parents, sans caractère interdit', () => {
    expect(
      nomDeFichier({ ...planningVide(), annee: 2026, parentA: 'Marie', parentB: 'Julien/Paul' }),
    ).toBe('Garde 2026-2027 Marie Julien-Paul');
    expect(nomDeFichier({ ...planningVide(), annee: 2026 })).toBe('Garde 2026-2027');
  });
});
