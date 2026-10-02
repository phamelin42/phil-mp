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

  // Seule exception : l'été 2028, qui commence après la classe du mardi 4 juillet.
  const APRES_UN_MARDI = '2028-07-05';

  it('commence chaque période un samedi, sauf l’été 2028 qui suit un mardi de classe', () => {
    for (const zone of ZONES) {
      expect(VACANCES[zone].find((v) => v.debut === APRES_UN_MARDI)?.nom).toBe('Été');
      for (const v of VACANCES[zone].filter(
        (x) => x.nom !== 'Pont de l’Ascension' && x.debut !== APRES_UN_MARDI,
      )) {
        expect(new Date(`${v.debut}T12:00:00Z`).getUTCDay(), `${zone} ${v.nom} ${v.debut}`).toBe(6);
      }
    }
  });

  it('donne le calendrier 2027-2028 transmis, zone par zone', () => {
    const hiver = { A: '2028-02-19', B: '2028-02-05', C: '2028-02-12' };
    const printemps = { A: '2028-05-08', B: '2028-04-23', C: '2028-05-01' };
    for (const zone of ZONES) {
      const v = (nom: string, annee: string) =>
        VACANCES[zone].find((x) => x.nom === nom && x.debut.startsWith(annee))!;
      expect(v('Été', '2027').fin, zone).toBe('2027-09-01');
      expect(v('Toussaint', '2027'), zone).toMatchObject({
        debut: '2027-10-23',
        fin: '2027-11-07',
      });
      expect(v('Noël', '2027'), zone).toMatchObject({ debut: '2027-12-18', fin: '2028-01-02' });
      expect(v('Hiver', '2028').debut, zone).toBe(hiver[zone]);
      expect(v('Printemps', '2028').fin, zone).toBe(printemps[zone]);
    }
  });
});
