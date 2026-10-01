import { echapper, plier, versIcal } from './ical';
import { Planning, RYTHMES, joursDeLAnnee, periodes, planningVide } from './planning';

const instant = new Date(Date.UTC(2026, 9, 1, 8, 30, 0));

function planning(p: Partial<Planning> = {}): Planning {
  return { ...planningVide(), parentA: 'Marie', parentB: 'Julien', depart: '2026-08-31', ...p };
}

describe('iCal (RFC 5545)', () => {
  it('échappe virgule, point-virgule, antislash et saut de ligne', () => {
    expect(echapper('a,b;c\\d\ne')).toBe(String.raw`a\,b\;c\\d\ne`);
  });

  it('plie les lignes à 75 octets sans couper un caractère', () => {
    const ligne = `SUMMARY:${'é'.repeat(80)}`;
    const morceaux = plier(ligne).split('\r\n');
    for (const m of morceaux) expect(new TextEncoder().encode(m).length).toBeLessThanOrEqual(75);
    expect(morceaux.slice(1).every((m) => m.startsWith(' '))).toBe(true);
    expect(morceaux.map((m, i) => (i ? m.slice(1) : m)).join('')).toBe(ligne);
  });

  it('écrit un événement par période, journée entière, fin exclue', () => {
    for (const rythme of RYTHMES) {
      const p = planning({ rythme });
      const jours = joursDeLAnnee(p);
      const ics = versIcal(p, jours, instant);
      expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'), rythme).toBe(true);
      expect(ics.endsWith('END:VCALENDAR\r\n'), rythme).toBe(true);
      expect(
        ics.split('\n').every((l) => l === '' || l.endsWith('\r')),
        rythme,
      ).toBe(true);
      const evenements = ics.split('BEGIN:VEVENT').length - 1;
      expect(evenements, rythme).toBe(periodes(jours).length);
      for (const champ of [
        'UID:',
        'DTSTAMP:20261001T083000Z',
        'DTSTART;VALUE=DATE:',
        'DTEND;VALUE=DATE:',
        'SUMMARY:',
      ]) {
        expect(ics.split(champ).length - 1, `${rythme} ${champ}`).toBe(evenements);
      }
    }
  });

  it('fait finir la période le lendemain de son dernier jour', () => {
    const p = planning({ rythme: 'semaine', depart: '2026-09-01' });
    const ics = versIcal(p, joursDeLAnnee(p), instant);
    expect(ics).toContain(
      'DTSTART;VALUE=DATE:20260901\r\nDTEND;VALUE=DATE:20260908\r\nSUMMARY:Garde : Marie',
    );
  });

  it('échappe le nom des parents', () => {
    const p = planning({ parentA: 'Marie, maman' });
    expect(versIcal(p, joursDeLAnnee(p), instant)).toContain('SUMMARY:Garde : Marie\\, maman');
  });
});
