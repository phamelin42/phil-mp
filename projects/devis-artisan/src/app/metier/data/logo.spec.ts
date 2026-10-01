import { TAILLE_MAX_LOGO, TYPES_LOGO, verifierLogo } from './logo';

describe('logo', () => {
  it('accepte chaque format d’image prévu jusqu’à 500 Ko', () => {
    for (const type of TYPES_LOGO) {
      expect(verifierLogo({ type, size: TAILLE_MAX_LOGO }), type).toBeNull();
      expect(verifierLogo({ type, size: TAILLE_MAX_LOGO + 1 }), type).toContain('500 Ko');
    }
  });

  it('refuse ce qui n’est pas une image prévue', () => {
    for (const type of ['application/pdf', 'image/gif', 'text/html', '']) {
      expect(verifierLogo({ type, size: 10 }), type).not.toBeNull();
    }
  });
});
