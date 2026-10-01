import { ANNEES_SCOLAIRES, VACANCES, ZONES } from './vacances';

describe('calendrier des vacances', () => {
  it('donne, pour chaque zone et chaque année, les cinq vacances dans l’ordre', () => {
    for (const zone of ZONES) {
      const liste = VACANCES[zone];
      for (let i = 0; i < liste.length; i++) {
        expect(liste[i].debut <= liste[i].fin, `${zone} ${liste[i].debut}`).toBe(true);
        if (i > 0)
          expect(liste[i - 1].fin < liste[i].debut, `${zone} ${liste[i].debut}`).toBe(true);
      }
      for (const annee of ANNEES_SCOLAIRES) {
        const noms = liste
          .filter((v) => v.debut >= `${annee}-09-01` && v.debut <= `${annee + 1}-08-31`)
          .map((v) => v.nom)
          .filter((n) => n !== 'Pont de l’Ascension');
        expect(noms, `${zone} ${annee}`).toEqual([
          'Toussaint',
          'Noël',
          'Hiver',
          'Printemps',
          'Été',
        ]);
      }
    }
  });

  it('commence chaque période un samedi', () => {
    for (const zone of ZONES) {
      for (const v of VACANCES[zone].filter((x) => x.nom !== 'Pont de l’Ascension')) {
        expect(new Date(`${v.debut}T12:00:00Z`).getUTCDay(), `${zone} ${v.nom} ${v.debut}`).toBe(6);
      }
    }
  });
});
