/**
 * Vacances scolaires de France métropolitaine, par zone, des années
 * 2025-2026 et 2026-2027. Chaque période va du premier au dernier jour sans
 * classe, bornes comprises (du samedi au dimanche de la reprise).
 *
 * Source : paquet `vacances-scolaires-france` 0.12.0 (PyPI), tiré du
 * calendrier scolaire publié par le ministère de l'Éducation nationale
 * (data.education.gouv.fr, jeu « fr-en-calendrier-scolaire »). À mettre à
 * jour chaque année à la parution du calendrier suivant. 2027-2028 est
 * absent : la source y donne un été commençant un mardi, signe d'une
 * donnée provisoire.
 */

export const ZONES = ['A', 'B', 'C'] as const;
export type Zone = (typeof ZONES)[number];

export interface PeriodeVacances {
  nom: string;
  /** Premier jour sans classe, AAAA-MM-JJ. */
  debut: string;
  /** Dernier jour sans classe, AAAA-MM-JJ. */
  fin: string;
}

export const VACANCES: Record<Zone, readonly PeriodeVacances[]> = {
  A: [
    { nom: 'Toussaint', debut: '2025-10-18', fin: '2025-11-02' },
    { nom: 'Noël', debut: '2025-12-20', fin: '2026-01-04' },
    { nom: 'Hiver', debut: '2026-02-07', fin: '2026-02-22' },
    { nom: 'Printemps', debut: '2026-04-04', fin: '2026-04-19' },
    { nom: 'Été', debut: '2026-07-04', fin: '2026-08-31' },
    { nom: 'Toussaint', debut: '2026-10-17', fin: '2026-11-01' },
    { nom: 'Noël', debut: '2026-12-19', fin: '2027-01-03' },
    { nom: 'Hiver', debut: '2027-02-13', fin: '2027-02-28' },
    { nom: 'Printemps', debut: '2027-04-10', fin: '2027-04-25' },
    { nom: 'Pont de l’Ascension', debut: '2027-05-06', fin: '2027-05-08' },
    { nom: 'Été', debut: '2027-07-03', fin: '2027-08-31' },
  ],
  B: [
    { nom: 'Toussaint', debut: '2025-10-18', fin: '2025-11-02' },
    { nom: 'Noël', debut: '2025-12-20', fin: '2026-01-04' },
    { nom: 'Hiver', debut: '2026-02-14', fin: '2026-03-01' },
    { nom: 'Printemps', debut: '2026-04-11', fin: '2026-04-26' },
    { nom: 'Été', debut: '2026-07-04', fin: '2026-08-31' },
    { nom: 'Toussaint', debut: '2026-10-17', fin: '2026-11-01' },
    { nom: 'Noël', debut: '2026-12-19', fin: '2027-01-03' },
    { nom: 'Hiver', debut: '2027-02-20', fin: '2027-03-07' },
    { nom: 'Printemps', debut: '2027-04-17', fin: '2027-05-02' },
    { nom: 'Pont de l’Ascension', debut: '2027-05-06', fin: '2027-05-08' },
    { nom: 'Été', debut: '2027-07-03', fin: '2027-08-31' },
  ],
  C: [
    { nom: 'Toussaint', debut: '2025-10-18', fin: '2025-11-02' },
    { nom: 'Noël', debut: '2025-12-20', fin: '2026-01-04' },
    { nom: 'Hiver', debut: '2026-02-21', fin: '2026-03-08' },
    { nom: 'Printemps', debut: '2026-04-18', fin: '2026-05-03' },
    { nom: 'Été', debut: '2026-07-04', fin: '2026-08-31' },
    { nom: 'Toussaint', debut: '2026-10-17', fin: '2026-11-01' },
    { nom: 'Noël', debut: '2026-12-19', fin: '2027-01-03' },
    { nom: 'Hiver', debut: '2027-02-06', fin: '2027-02-21' },
    { nom: 'Printemps', debut: '2027-04-03', fin: '2027-04-18' },
    { nom: 'Pont de l’Ascension', debut: '2027-05-06', fin: '2027-05-08' },
    { nom: 'Été', debut: '2027-07-03', fin: '2027-08-31' },
  ],
};

/** Années scolaires couvertes, de septembre à août. */
export const ANNEES_SCOLAIRES = [2025, 2026] as const;
