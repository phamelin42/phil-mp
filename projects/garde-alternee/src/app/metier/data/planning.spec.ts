import {
  CYCLES,
  MODES_VACANCES,
  Planning,
  RYTHMES,
  anneeScolaire,
  champsManquants,
  estEntame,
  jourSemaine,
  joursDeLAnnee,
  numeroJour,
  parentDuJour,
  periodes,
  planningVide,
  repartition,
  restaurerPlanning,
} from './planning';
import { ANNEES_SCOLAIRES, VACANCES, ZONES } from './vacances';

function planning(p: Partial<Planning> = {}): Planning {
  // Le 31 août 2026 est un lundi.
  return { ...planningVide(), parentA: 'Marie', parentB: 'Julien', depart: '2026-08-31', ...p };
}

function plage(debut: string, n: number): string[] {
  const d = numeroJour(debut) ?? 0;
  return Array.from({ length: n }, (_, i) =>
    new Date((d + i) * 86_400_000).toISOString().slice(0, 10),
  );
}

describe('dates civiles', () => {
  it('refuse une date qui n’existe pas', () => {
    for (const iso of ['2026-02-30', '2026-13-01', '01/10/2026', ''])
      expect(numeroJour(iso), iso).toBeNull();
    expect(numeroJour('2028-02-29')).not.toBeNull();
  });

  it('donne le jour de la semaine, lundi = 0', () => {
    expect(jourSemaine('2026-08-31')).toBe(0);
    expect(jourSemaine('2026-10-04')).toBe(6);
  });

  it('rattache une date à son année scolaire', () => {
    expect(anneeScolaire('2026-09-01')).toBe(2026);
    expect(anneeScolaire('2027-08-31')).toBe(2026);
  });
});

describe('rythmes', () => {
  it('suit le cycle de chaque rythme, dans les deux sens et pour chaque premier parent', () => {
    for (const rythme of RYTHMES) {
      const cycle = CYCLES[rythme];
      for (const premier of ['A', 'B'] as const) {
        const p = planning({ rythme, premier });
        const jours = plage('2026-08-31', 28).map((d) => parentDuJour(p, d));
        const attendu = [...cycle, ...cycle].map((l) =>
          premier === 'A' ? l : l === 'A' ? 'B' : 'A',
        );
        expect(jours.join(''), `${rythme} · ${premier}`).toBe(attendu.join(''));
        // Avant la date de départ, le cycle continue à rebours.
        expect(parentDuJour(p, '2026-08-17'), rythme).toBe(parentDuJour(p, '2026-08-31'));
      }
    }
  });

  it('répartit chaque cycle comme annoncé', () => {
    const attendu = { semaine: [7, 7], '2-2-3': [7, 7], '2-2-5-5': [7, 7], 'week-end': [11, 3] };
    for (const rythme of RYTHMES) {
      const cycle = CYCLES[rythme];
      expect(cycle.length, rythme).toBe(14);
      expect([cycle.split('A').length - 1, cycle.split('B').length - 1], rythme).toEqual(
        attendu[rythme],
      );
    }
  });

  it('2-2-5-5 : chaque parent garde ses deux jours fixes et un week-end sur deux', () => {
    const p = planning({ rythme: '2-2-5-5' });
    const semaine = (lundi: string) =>
      plage(lundi, 7)
        .map((d) => parentDuJour(p, d))
        .join('');
    expect(semaine('2026-08-31')).toBe('AABBAAA');
    expect(semaine('2026-09-07')).toBe('AABBBBB');
  });
});

describe('vacances scolaires', () => {
  it('suivent le rythme habituel par défaut', () => {
    for (const zone of ZONES) {
      const avec = planning({ zone, vacances: 'rythme' });
      const sans = planning({ zone: '' });
      for (const d of plage('2026-12-19', 16))
        expect(parentDuJour(avec, d), d).toBe(parentDuJour(sans, d));
    }
  });

  it('se partagent en moitiés, la première au parent choisi les années paires', () => {
    for (const zone of ZONES) {
      for (const moitiePaire of ['A', 'B'] as const) {
        const p = planning({ zone, vacances: 'moities', moitiePaire });
        const autre = moitiePaire === 'A' ? 'B' : 'A';
        // Noël 2026 (année paire) : 16 jours, 8 et 8.
        const noel = plage('2026-12-19', 16)
          .map((d) => parentDuJour(p, d))
          .join('');
        expect(noel, `${zone} · ${moitiePaire}`).toBe(moitiePaire.repeat(8) + autre.repeat(8));
        // Hiver 2027 (année impaire) : l'ordre s'inverse.
        const hiver = VACANCES[zone].find((v) => v.nom === 'Hiver' && v.debut.startsWith('2027'))!;
        expect(parentDuJour(p, hiver.debut), zone).toBe(autre);
        expect(parentDuJour(p, hiver.fin), zone).toBe(moitiePaire);
      }
    }
  });

  it('laissent les ponts au rythme habituel', () => {
    const p = planning({ zone: 'A', vacances: 'moities' });
    expect(parentDuJour(p, '2027-05-07')).toBe(parentDuJour(planning(), '2027-05-07'));
  });
});

describe('l’année', () => {
  it('couvre chaque jour de septembre à août, et nomme les vacances de la zone', () => {
    for (const annee of ANNEES_SCOLAIRES) {
      for (const zone of ZONES) {
        const jours = joursDeLAnnee(planning({ annee, zone }));
        expect(jours[0].date).toBe(`${annee}-09-01`);
        expect(jours.at(-1)?.date).toBe(`${annee + 1}-08-31`);
        expect(jours.length).toBe((annee + 1) % 4 === 0 ? 366 : 365);
        expect(
          jours.some((j) => j.vacances === 'Noël'),
          `${annee} · ${zone}`,
        ).toBe(true);
        const r = repartition(jours);
        expect(r.A + r.B).toBe(jours.length);
      }
    }
  });

  it('est vide tant que la date de départ manque', () => {
    expect(joursDeLAnnee(planning({ depart: '' }))).toEqual([]);
  });

  it('regroupe les jours en périodes continues', () => {
    const jours = joursDeLAnnee(planning({ rythme: 'semaine', depart: '2026-09-01' }));
    const liste = periodes(jours);
    expect(liste[0]).toEqual({ parent: 'A', debut: '2026-09-01', fin: '2026-09-07' });
    expect(liste[1]).toEqual({ parent: 'B', debut: '2026-09-08', fin: '2026-09-14' });
    expect(liste.reduce((n, p) => n + (numeroJour(p.fin)! - numeroJour(p.debut)! + 1), 0)).toBe(
      jours.length,
    );
  });
});

describe('complétude et relecture', () => {
  it('demande les deux noms et la date de départ', () => {
    expect(champsManquants(planningVide())).toEqual(['parentA', 'parentB', 'depart']);
    expect(champsManquants(planning())).toEqual([]);
  });

  it('retrouve à l’identique un planning enregistré', () => {
    for (const rythme of RYTHMES) {
      for (const vacances of MODES_VACANCES) {
        const p = planning({
          rythme,
          vacances,
          zone: 'C',
          premier: 'B',
          moitiePaire: 'B',
          annee: 2025,
        });
        expect(restaurerPlanning(JSON.parse(JSON.stringify(p)))).toEqual(p);
      }
    }
  });

  it('refuse proprement ce qui n’est pas un planning, et borne le reste', () => {
    for (const brut of [null, 3, 'x', []]) expect(restaurerPlanning(brut)).toBeNull();
    const p = restaurerPlanning({
      parentA: 'x'.repeat(500),
      rythme: '3-4',
      depart: '2026-02-30',
      annee: 1999,
      zone: 'D',
    });
    expect(p).toEqual({ ...planningVide(), parentA: 'x'.repeat(60) });
  });

  it('ne compte pas l’année proposée comme une saisie', () => {
    expect(estEntame({ ...planningVide(), annee: 2027 })).toBe(false);
    expect(estEntame({ ...planningVide(), parentA: 'M' })).toBe(true);
  });
});
