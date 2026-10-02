import { ficheExemple } from './exemple';
import { ficheVide } from './fiche';
import { CHAMP_MANQUE, LIBELLES_MANQUE, Manque, manques } from './regles';

describe('manques', () => {
  it('ne signale rien pour une fiche complète', () => {
    expect(manques(ficheExemple())).toEqual([]);
  });

  it('signale matières, temps et taux horaire sur une fiche vide', () => {
    expect(manques(ficheVide())).toEqual(['matieres', 'minutes', 'tauxHoraire']);
  });

  it('signale des prélèvements qui absorbent tout le prix', () => {
    expect(manques({ ...ficheExemple(), cotisationsPct: 60, commissionPct: 40 })).toEqual([
      'prelevements',
    ]);
  });

  it('nomme chaque manque et le champ où le corriger', () => {
    const tous: Manque[] = ['matieres', 'minutes', 'tauxHoraire', 'prelevements'];
    for (const m of tous) {
      expect(LIBELLES_MANQUE[m]).toBeTruthy();
      expect(CHAMP_MANQUE[m]).toMatch(/^[a-zA-Z0-9-]+$/);
    }
  });
});
