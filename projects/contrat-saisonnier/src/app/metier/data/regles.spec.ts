import { contratVide } from './contrat';
import { contratExemple } from './exemple';
import { REGLES, SECTIONS, champsManquants, erreur, sectionsCompletes } from './regles';

describe('regles', () => {
  it('trouve complet le contrat d’exemple', () => {
    expect(champsManquants(contratExemple())).toEqual([]);
    expect(sectionsCompletes(contratExemple())).toEqual([...SECTIONS]);
  });

  it('signale chaque règle sur un contrat vide, sauf celles qu’un contrat vide respecte', () => {
    const manque = champsManquants({ ...contratVide(), date: '' }).map((r) => r.champ);
    for (const r of REGLES) {
      const attendu = ![
        'sejour-adultes',
        'prix-montantVersement',
        'prix-echeanceSolde',
        'pieces',
      ].includes(r.champ);
      expect(manque.includes(r.champ)).toBe(attendu);
      expect(r.message(contratVide())).toMatch(/\S/);
    }
  });

  it('refuse une location de plus de 90 nuits', () => {
    const c = contratExemple();
    c.sejour.depart = '2027-10-09';
    expect(erreur('sejour-depart', c)).toBe('Une location saisonnière dure au plus 90 jours.');
    c.sejour.depart = '2027-10-08';
    expect(erreur('sejour-depart', c)).toBeNull();
    c.sejour.depart = '2027-07-09';
    expect(erreur('sejour-depart', c)).toBe('Indiquez une date de départ postérieure à l’arrivée.');
  });

  it('refuse plus d’occupants que la capacité, et un séjour sans adulte', () => {
    const c = contratExemple();
    c.sejour.enfants = 3;
    expect(erreur('sejour-adultes', c)).toBe('Le logement accueille au plus 4 personnes.');
    c.sejour.enfants = 0;
    c.sejour.adultes = 0;
    expect(erreur('sejour-adultes', c)).toBe('Au moins un adulte signe le contrat.');
  });

  it('refuse un versement supérieur au loyer, et n’exige pas d’échéance quand tout est payé', () => {
    const c = contratExemple();
    c.prix.montantVersement = 900;
    expect(erreur('prix-montantVersement', c)).not.toBeNull();
    c.prix.montantVersement = 840;
    c.prix.echeanceSolde = '';
    expect(erreur('prix-montantVersement', c)).toBeNull();
    expect(erreur('prix-echeanceSolde', c)).toBeNull();
  });

  it('exige un nom pour chaque pièce et une désignation pour chaque élément', () => {
    const c = contratExemple();
    c.pieces[1].objets[0].designation = ' ';
    expect(erreur('pieces', c)).not.toBeNull();
    expect(sectionsCompletes(c)).not.toContain('inventaire');
    c.pieces = [];
    expect(erreur('pieces', c)).not.toBeNull();
  });
});
