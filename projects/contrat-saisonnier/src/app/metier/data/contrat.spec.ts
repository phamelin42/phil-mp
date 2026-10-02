import {
  CHARGES,
  CLASSEMENTS,
  LIMITES,
  TYPES_LOGEMENT,
  VERSEMENTS,
  contratSuivant,
  contratVide,
  dateDuJour,
  estEntame,
  piecesProposees,
  restaurerContrat,
} from './contrat';
import { contratExemple } from './exemple';

describe('restaurerContrat', () => {
  it('relit à l’identique un contrat enregistré', () => {
    const c = contratExemple();
    expect(restaurerContrat(JSON.parse(JSON.stringify(c)))).toEqual(c);
  });

  it('refuse ce qui n’est pas un objet', () => {
    for (const brut of [null, undefined, 'contrat', 42, [contratExemple()]]) {
      expect(restaurerContrat(brut)).toBeNull();
    }
  });

  it('remplace par défaut un champ absent, d’un mauvais type ou hors bornes', () => {
    const c = restaurerContrat({
      logement: { type: 'yourte', capacite: 900, classement: '7', surface: -3 },
      sejour: { arrivee: '10/07/2027', heureArrivee: '25:00', adultes: 'deux' },
      prix: { loyer: 1e12, versement: 'caution', restitutionJours: 3.6 },
      lieu: 'x'.repeat(5000),
    })!;
    const d = contratVide();
    expect(c.logement.type).toBe(d.logement.type);
    expect(c.logement.capacite).toBe(LIMITES.personnes);
    expect(c.logement.classement).toBe('non-classe');
    expect(c.logement.surface).toBe(0);
    expect(c.sejour.arrivee).toBe('');
    expect(c.sejour.heureArrivee).toBe(d.sejour.heureArrivee);
    expect(c.sejour.adultes).toBe(d.sejour.adultes);
    expect(c.prix.loyer).toBe(LIMITES.montant);
    expect(c.prix.versement).toBe('arrhes');
    expect(c.prix.restitutionJours).toBe(4);
    expect(c.lieu).toHaveLength(LIMITES.texte);
  });

  it('accepte chaque valeur de chaque liste', () => {
    const listes = [
      [
        TYPES_LOGEMENT,
        (v: string) => ({ logement: { type: v } }),
        (c: ReturnType<typeof contratVide>) => c.logement.type,
      ],
      [
        CLASSEMENTS,
        (v: string) => ({ logement: { classement: v } }),
        (c: ReturnType<typeof contratVide>) => c.logement.classement,
      ],
      [
        VERSEMENTS,
        (v: string) => ({ prix: { versement: v } }),
        (c: ReturnType<typeof contratVide>) => c.prix.versement,
      ],
      [
        CHARGES,
        (v: string) => ({ prix: { charges: v } }),
        (c: ReturnType<typeof contratVide>) => c.prix.charges,
      ],
    ] as const;
    for (const [valeurs, brut, lire] of listes) {
      for (const v of valeurs) {
        expect(lire(restaurerContrat(brut(v))!)).toBe(v);
      }
    }
  });

  it('borne le nombre de pièces et d’objets et écarte ce qui n’en est pas', () => {
    const piece = {
      nom: 'Chambre',
      objets: Array.from({ length: 100 }, () => ({ designation: 'Lit', quantite: 1 })),
    };
    const c = restaurerContrat({
      pieces: [...Array.from({ length: 50 }, () => piece), 'cuisine'],
    })!;
    expect(c.pieces).toHaveLength(LIMITES.pieces);
    expect(c.pieces[0].objets).toHaveLength(LIMITES.objets);
    expect(restaurerContrat({ pieces: [null, 3, { nom: 'Séjour' }] })!.pieces).toEqual([
      { nom: 'Séjour', objets: [] },
    ]);
  });
});

describe('estEntame', () => {
  it('ne compte pas la date de signature proposée comme une saisie', () => {
    expect(estEntame({ ...contratVide(), date: '2027-03-02' })).toBe(false);
    const c = contratVide();
    c.locataire.nom = 'Julien Dupont';
    expect(estEntame(c)).toBe(true);
  });
});

describe('contratSuivant', () => {
  it('garde le logement, l’inventaire et les conditions, efface le locataire, les dates et le loyer', () => {
    const precedent = contratExemple();
    const suivant = contratSuivant(precedent, '2027-08-01');
    expect(suivant.bailleur).toEqual(precedent.bailleur);
    expect(suivant.logement).toEqual(precedent.logement);
    expect(suivant.pieces).toEqual(precedent.pieces);
    expect(suivant.prix.depotGarantie).toBe(400);
    expect(suivant.prix.taxeSejour).toBe(1.5);
    expect(suivant.lieu).toBe('Annecy');
    expect(suivant.locataire.nom).toBe('');
    expect(suivant.sejour.arrivee).toBe('');
    expect(suivant.prix.loyer).toBe(0);
    expect(suivant.prix.montantVersement).toBe(0);
    expect(suivant.date).toBe('2027-08-01');
    // Copie, pas partage : modifier l'inventaire du suivant ne touche pas le précédent.
    suivant.pieces[0].objets[0].quantite = 9;
    expect(precedent.pieces[0].objets[0].quantite).toBe(1);
  });
});

describe('piecesProposees', () => {
  it('propose des pièces nommées, chacune avec ses éléments', () => {
    for (const p of piecesProposees()) {
      expect(p.nom).not.toBe('');
      expect(p.objets.length).toBeGreaterThan(0);
      for (const o of p.objets) expect(o.quantite).toBeGreaterThan(0);
    }
  });
});

describe('dateDuJour', () => {
  it('écrit la date locale en AAAA-MM-JJ', () => {
    expect(dateDuJour(new Date(2027, 0, 5))).toBe('2027-01-05');
  });
});
