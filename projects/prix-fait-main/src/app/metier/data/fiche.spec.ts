import {
  estEntamee,
  ficheSuivante,
  ficheVide,
  LIMITES,
  REGIMES_TVA,
  restaurerFiche,
} from './fiche';
import { ficheExemple } from './exemple';

describe('restaurerFiche', () => {
  it('relit une fiche enregistrée à l’identique', () => {
    expect(restaurerFiche(JSON.parse(JSON.stringify(ficheExemple())))).toEqual(ficheExemple());
  });

  it('relit chaque régime de TVA', () => {
    for (const regimeTva of REGIMES_TVA) {
      expect(restaurerFiche({ ...ficheExemple(), regimeTva })?.regimeTva).toBe(regimeTva);
    }
  });

  it('refuse autre chose qu’un objet', () => {
    for (const brut of [null, undefined, 'fiche', 42, []]) expect(restaurerFiche(brut)).toBeNull();
  });

  it('remplace les valeurs absurdes par des valeurs sûres', () => {
    const f = restaurerFiche({
      nom: 'x'.repeat(5000),
      matieres: [{ prixAchat: -3, quantiteAchetee: 'deux' }, 'perle'],
      minutes: Number.POSITIVE_INFINITY,
      cotisationsPct: 250,
      coefficientDetail: 0,
      regimeTva: 'autre',
    })!;
    expect(f.nom).toHaveLength(LIMITES.texte);
    expect(f.matieres).toHaveLength(1);
    expect(f.matieres[0].prixAchat).toBe(0);
    expect(f.matieres[0].quantiteAchetee).toBe(1);
    expect(f.minutes).toBe(0);
    expect(f.cotisationsPct).toBe(100);
    expect(f.coefficientDetail).toBe(1);
    expect(f.regimeTva).toBe('franchise');
  });

  it('borne le nombre de matières', () => {
    const matieres = Array.from({ length: 80 }, () => ficheExemple().matieres[0]);
    expect(restaurerFiche({ matieres })!.matieres).toHaveLength(LIMITES.matieres);
  });
});

describe('estEntamee', () => {
  it('distingue une fiche vide d’une fiche commencée', () => {
    expect(estEntamee(ficheVide())).toBe(false);
    expect(estEntamee({ ...ficheVide(), minutes: 30 })).toBe(true);
  });
});

describe('ficheSuivante', () => {
  it('garde les réglages de l’atelier et vide la création', () => {
    const s = ficheSuivante(ficheExemple());
    expect(s.nom).toBe('');
    expect(s.matieres).toEqual(ficheVide().matieres);
    expect(s.minutes).toBe(0);
    expect(s.fraisParPiece).toBe(0);
    expect(s.tauxHoraire).toBe(15);
    expect(s.cotisationsPct).toBe(12.3);
    expect(s.commissionPct).toBe(10.5);
    expect(s.fraisParVente).toBe(0.3);
  });
});
