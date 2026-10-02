import { contratExemple } from './exemple';
import { CONSIGNES, FORMATS_EXPORT, nomDeFichier } from './export';

describe('export', () => {
  it('a une consigne pour chaque format', () => {
    for (const format of FORMATS_EXPORT) expect(CONSIGNES[format]).toMatch(/\S/);
  });

  it('propose un nom de fichier lisible et sans caractère interdit', () => {
    expect(nomDeFichier(contratExemple())).toBe('Contrat de location Julien Dupont 2027-07-10');
    const c = contratExemple();
    c.locataire.nom = 'Dupont / Martin\n"Les cousins"';
    expect(nomDeFichier(c)).toBe('Contrat de location Dupont - Martin -Les cousins- 2027-07-10');
  });
});
