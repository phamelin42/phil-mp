import {
  COTE_MAX,
  TAILLE_MAX_ORIGINAL,
  TYPES_PHOTO,
  dimensionsReduites,
  verifierPhoto,
} from './photo';

describe('photo', () => {
  it('réduit le côté le plus long à 640 px en gardant les proportions', () => {
    expect(dimensionsReduites(4032, 3024)).toEqual({ largeur: COTE_MAX, hauteur: 480 });
    expect(dimensionsReduites(3024, 4032)).toEqual({ largeur: 480, hauteur: COTE_MAX });
  });

  it('n’agrandit jamais une petite photo, et refuse une image vide', () => {
    expect(dimensionsReduites(300, 200)).toEqual({ largeur: 300, hauteur: 200 });
    expect(dimensionsReduites(0, 200)).toEqual({ largeur: 0, hauteur: 0 });
  });

  it('accepte chaque format d’image prévu, refuse le reste et les fichiers trop lourds', () => {
    for (const type of TYPES_PHOTO) {
      expect(verifierPhoto({ type, size: 1000 }), type).toBeNull();
      expect(verifierPhoto({ type, size: TAILLE_MAX_ORIGINAL + 1 }), type).toContain('25 Mo');
    }
    expect(verifierPhoto({ type: 'application/pdf', size: 10 })).not.toBeNull();
  });
});
