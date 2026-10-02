/**
 * Vacances scolaires de France métropolitaine, par zone, des années
 * 2025-2026 à 2027-2028. Chaque période va du premier au dernier jour sans
 * classe, bornes comprises (du samedi au dimanche de la reprise).
 *
 * Sources : 2025-2026 et 2026-2027, paquet `vacances-scolaires-france`
 * 0.12.0 (PyPI), tiré du calendrier scolaire publié par le ministère de
 * l'Éducation nationale (data.education.gouv.fr, jeu
 * « fr-en-calendrier-scolaire ») ; 2027-2028, calendrier officiel transmis
 * par Phil le 2 octobre 2026 (rentrée le jeudi 2 septembre 2027, été après
 * la classe du mardi 4 juillet 2028 ; le pont de l'Ascension n'y figure pas).
 * À mettre à jour chaque année à la parution du calendrier suivant.
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
    { nom: 'Été', debut: '2027-07-03', fin: '2027-09-01' },
    { nom: 'Toussaint', debut: '2027-10-23', fin: '2027-11-07' },
    { nom: 'Noël', debut: '2027-12-18', fin: '2028-01-02' },
    { nom: 'Hiver', debut: '2028-02-19', fin: '2028-03-05' },
    { nom: 'Printemps', debut: '2028-04-22', fin: '2028-05-08' },
    { nom: 'Été', debut: '2028-07-05', fin: '2028-08-31' },
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
    { nom: 'Été', debut: '2027-07-03', fin: '2027-09-01' },
    { nom: 'Toussaint', debut: '2027-10-23', fin: '2027-11-07' },
    { nom: 'Noël', debut: '2027-12-18', fin: '2028-01-02' },
    { nom: 'Hiver', debut: '2028-02-05', fin: '2028-02-20' },
    { nom: 'Printemps', debut: '2028-04-08', fin: '2028-04-23' },
    { nom: 'Été', debut: '2028-07-05', fin: '2028-08-31' },
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
    { nom: 'Été', debut: '2027-07-03', fin: '2027-09-01' },
    { nom: 'Toussaint', debut: '2027-10-23', fin: '2027-11-07' },
    { nom: 'Noël', debut: '2027-12-18', fin: '2028-01-02' },
    { nom: 'Hiver', debut: '2028-02-12', fin: '2028-02-27' },
    { nom: 'Printemps', debut: '2028-04-15', fin: '2028-05-01' },
    { nom: 'Été', debut: '2028-07-05', fin: '2028-08-31' },
  ],
};

/** Années scolaires couvertes, de septembre à août. */
export const ANNEES_SCOLAIRES = [2025, 2026, 2027] as const;
