import { articles, designation, faitA } from './clauses';
import { CLASSEMENTS, TYPES_LOGEMENT, VERSEMENTS, contratVide } from './contrat';
import { contratExemple } from './exemple';

const texte = (c = contratExemple()) =>
  articles(c)
    .flatMap((a) => [a.titre, ...a.paragraphes])
    .join('\n');

describe('articles', () => {
  it('reprend les parties du séjour, le prix et les sommes dues', () => {
    const t = texte();
    expect(t).toContain('3 quai de la Tournette, 74000 Annecy');
    expect(t).toContain('10\u00a0juillet 2027 à partir de 16\u00a0h');
    expect(t).toContain('17\u00a0juillet 2027 à 10\u00a0h, soit 7\u00a0nuits');
    expect(t).toContain('2\u00a0adultes et 1\u00a0enfant');
    expect(t).toContain('840,00\u00a0€, soit 120,00\u00a0€ par nuit');
    expect(t).toContain('210,00\u00a0€ à titre d’arrhes');
    expect(t).toContain('Le solde, 630,00\u00a0€, est payé le jour de l’arrivée');
    expect(t).toContain('soit 21,00\u00a0€ pour 2\u00a0adultes et 7\u00a0nuits');
    expect(t).toContain('dépôt de garantie de 400,00\u00a0€');
    expect(t).not.toContain('[à compléter]');
  });

  it('explique la règle propre aux arrhes et à l’acompte', () => {
    const regles = { arrhes: 'le double des arrhes', acompte: 'reste redevable du loyer entier' };
    for (const v of VERSEMENTS) {
      const c = contratExemple();
      c.prix.versement = v;
      expect(texte(c)).toContain(regles[v]);
      for (const autre of VERSEMENTS.filter((x) => x !== v)) {
        expect(texte(c)).not.toContain(regles[autre]);
      }
    }
  });

  it('marque ce qui reste à compléter sur un contrat vide', () => {
    expect(texte(contratVide())).toContain('[à compléter]');
    expect(faitA(contratVide())).toBe(
      'Fait à [à compléter], le [à compléter], en deux exemplaires originaux.',
    );
  });

  it('dit la taxe de séjour selon la commune quand le tarif n’est pas saisi', () => {
    const c = contratExemple();
    c.prix.taxeSejour = 0;
    expect(texte(c)).toContain('selon le tarif de la commune');
  });

  it('ajoute les conditions particulières ligne par ligne, et seulement s’il y en a', () => {
    expect(articles(contratExemple()).map((a) => a.titre)).not.toContain(
      'Conditions particulières',
    );
    const c = contratExemple();
    c.particulieres = 'Animaux non admis.\n\nLinge de lit fourni.';
    expect(articles(c).at(-1)).toEqual({
      titre: 'Conditions particulières',
      paragraphes: ['Animaux non admis.', 'Linge de lit fourni.'],
    });
  });

  it('décrit chaque type de logement et chaque classement', () => {
    for (const type of TYPES_LOGEMENT) {
      for (const classement of CLASSEMENTS) {
        const c = contratExemple();
        c.logement = { ...c.logement, type, classement };
        const d = designation(c).join(' ');
        expect(d).toMatch(/^Le bailleur loue au locataire (un|une) /);
        expect(d).toContain(classement === 'non-classe' ? 'non classé' : `classé ${classement}`);
      }
    }
  });

  it('signe au lieu et à la date saisis', () => {
    expect(faitA(contratExemple())).toBe(
      'Fait à Annecy, le 2\u00a0mars 2027, en deux exemplaires originaux.',
    );
  });
});
