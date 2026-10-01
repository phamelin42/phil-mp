import { ANNEES_SCOLAIRES, PeriodeVacances, VACANCES, ZONES, Zone } from './vacances';

/**
 * Le planning de garde : modèle, attribution de chaque jour à un parent,
 * relecture d'une copie enregistrée. Fonctions pures, sans Angular. Les dates
 * sont des chaînes AAAA-MM-JJ, calculées en jours civils (sans fuseau).
 */

export type Parent = 'A' | 'B';

/** Rythmes sur un cycle de quatorze jours, à partir de la date de départ. */
export const RYTHMES = ['semaine', '2-2-3', '2-2-5-5', 'week-end'] as const;
export type Rythme = (typeof RYTHMES)[number];

/**
 * Le cycle de chaque rythme, jour par jour : « A » est le parent de la
 * première période. `week-end` : un week-end sur deux, du vendredi au
 * dimanche, si la date de départ est un lundi.
 */
export const CYCLES: Record<Rythme, string> = {
  semaine: 'AAAAAAABBBBBBB',
  '2-2-3': 'AABBAAABBAABBB',
  '2-2-5-5': 'AABBAAAAABBBBB',
  'week-end': 'AAAABBBAAAAAAA',
};

export const MODES_VACANCES = ['rythme', 'moities'] as const;
export type ModeVacances = (typeof MODES_VACANCES)[number];

export interface Planning {
  parentA: string;
  parentB: string;
  rythme: Rythme;
  /** Premier jour du cycle, AAAA-MM-JJ. */
  depart: string;
  /** Parent qui a la première période du cycle. */
  premier: Parent;
  /** Zone de vacances scolaires, ou vide pour les ignorer. */
  zone: Zone | '';
  /** Année de la rentrée : le calendrier va de septembre à août. */
  annee: number;
  vacances: ModeVacances;
  /** Parent qui a la première moitié des vacances les années paires. */
  moitiePaire: Parent;
}

export const LIMITE_NOM = 60;

export function planningVide(): Planning {
  return {
    parentA: '',
    parentB: '',
    rythme: 'semaine',
    depart: '',
    premier: 'A',
    zone: '',
    annee: ANNEES_SCOLAIRES[1],
    vacances: 'rythme',
    moitiePaire: 'A',
  };
}

// --- Dates civiles -------------------------------------------------------

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Numéro de jour depuis le 1er janvier 1970, ou `null` si la date est invalide. */
export function numeroJour(iso: string): number | null {
  const m = DATE.exec(iso);
  if (!m) return null;
  const [a, mo, j] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = Date.UTC(a, mo - 1, j);
  const d = new Date(t);
  if (d.getUTCFullYear() !== a || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== j) return null;
  return t / 86_400_000;
}

export function dateDeNumero(n: number): string {
  return new Date(n * 86_400_000).toISOString().slice(0, 10);
}

/** 0 = lundi … 6 = dimanche. */
export function jourSemaine(iso: string): number {
  const n = numeroJour(iso) ?? 0;
  // Le 1er janvier 1970 était un jeudi.
  return (((n + 3) % 7) + 7) % 7;
}

export function dateDuJour(maintenant: Date): string {
  const mois = String(maintenant.getMonth() + 1).padStart(2, '0');
  const jour = String(maintenant.getDate()).padStart(2, '0');
  return `${maintenant.getFullYear()}-${mois}-${jour}`;
}

/** Année de la rentrée scolaire qui contient cette date (septembre à août). */
export function anneeScolaire(iso: string): number {
  const m = DATE.exec(iso);
  if (!m) return ANNEES_SCOLAIRES[1];
  return Number(m[2]) >= 9 ? Number(m[1]) : Number(m[1]) - 1;
}

// --- Attribution des jours ----------------------------------------------

export interface Jour {
  date: string;
  parent: Parent;
  /** Nom de la période de vacances scolaires, s'il y en a une. */
  vacances?: string;
}

function autre(p: Parent): Parent {
  return p === 'A' ? 'B' : 'A';
}

/** Parent du jour selon le seul rythme, avant les vacances. */
export function parentDuRythme(planning: Planning, date: string): Parent | null {
  const depart = numeroJour(planning.depart);
  const jour = numeroJour(date);
  if (depart === null || jour === null) return null;
  const cycle = CYCLES[planning.rythme];
  const rang = (((jour - depart) % cycle.length) + cycle.length) % cycle.length;
  const lettre = cycle[rang] as Parent;
  return planning.premier === 'A' ? lettre : autre(lettre);
}

/** Les vacances partagées en moitiés : pas les ponts, trop courts pour se couper. */
function partageable(p: PeriodeVacances): boolean {
  const d = numeroJour(p.debut) ?? 0;
  const f = numeroJour(p.fin) ?? 0;
  return f - d + 1 >= 7;
}

export function vacancesDe(zone: Zone | '', date: string): PeriodeVacances | null {
  if (!zone) return null;
  return VACANCES[zone].find((p) => p.debut <= date && date <= p.fin) ?? null;
}

/** Parent du jour, vacances comprises. */
export function parentDuJour(planning: Planning, date: string): Parent | null {
  const rythme = parentDuRythme(planning, date);
  if (rythme === null) return null;
  const periode = vacancesDe(planning.zone, date);
  if (!periode || planning.vacances === 'rythme' || !partageable(periode)) return rythme;
  const debut = numeroJour(periode.debut) ?? 0;
  const duree = (numeroJour(periode.fin) ?? 0) - debut + 1;
  const premiereMoitie = (numeroJour(date) ?? 0) - debut < Math.ceil(duree / 2);
  // L'année civile du début des vacances décide : paire → `moitiePaire`.
  const pair = Number(periode.debut.slice(0, 4)) % 2 === 0;
  const premierParent = pair ? planning.moitiePaire : autre(planning.moitiePaire);
  return premiereMoitie ? premierParent : autre(premierParent);
}

/** Les jours de l'année scolaire, du 1er septembre au 31 août. */
export function joursDeLAnnee(planning: Planning): Jour[] {
  if (numeroJour(planning.depart) === null) return [];
  const debut = numeroJour(`${planning.annee}-09-01`) ?? 0;
  const fin = numeroJour(`${planning.annee + 1}-08-31`) ?? 0;
  const jours: Jour[] = [];
  for (let n = debut; n <= fin; n++) {
    const date = dateDeNumero(n);
    const parent = parentDuJour(planning, date) as Parent;
    const periode = vacancesDe(planning.zone, date);
    jours.push(periode ? { date, parent, vacances: periode.nom } : { date, parent });
  }
  return jours;
}

/** Jours passés chez chaque parent sur l'année. */
export function repartition(jours: readonly Jour[]): Record<Parent, number> {
  return {
    A: jours.filter((j) => j.parent === 'A').length,
    B: jours.filter((j) => j.parent === 'B').length,
  };
}

export interface Periode {
  parent: Parent;
  debut: string;
  /** Dernier jour de la période, compris. */
  fin: string;
}

/** Les jours regroupés en périodes continues chez le même parent. */
export function periodes(jours: readonly Jour[]): Periode[] {
  const liste: Periode[] = [];
  for (const j of jours) {
    const derniere = liste.at(-1);
    if (derniere && derniere.parent === j.parent) derniere.fin = j.date;
    else liste.push({ parent: j.parent, debut: j.date, fin: j.date });
  }
  return liste;
}

export function nomDe(planning: Planning, parent: Parent): string {
  const nom = (parent === 'A' ? planning.parentA : planning.parentB).trim();
  return nom || (parent === 'A' ? 'Parent 1' : 'Parent 2');
}

// --- Complétude et relecture --------------------------------------------

export type Champ = 'parentA' | 'parentB' | 'depart';

export const MESSAGES: Record<Champ, string> = {
  parentA: 'Indiquez le nom ou le prénom du premier parent.',
  parentB: 'Indiquez le nom ou le prénom du second parent.',
  depart: 'Indiquez la date de départ du rythme.',
};

export function erreur(champ: Champ, planning: Planning): string | null {
  if (champ === 'depart') return numeroJour(planning.depart) === null ? MESSAGES.depart : null;
  return planning[champ].trim() ? null : MESSAGES[champ];
}

export function champsManquants(planning: Planning): Champ[] {
  return (['parentA', 'parentB', 'depart'] as const).filter((c) => erreur(c, planning));
}

function objet(v: unknown): Record<string, unknown> | null {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function parmi<T>(liste: readonly T[], v: unknown, defaut: T): T {
  return liste.includes(v as T) ? (v as T) : defaut;
}

/**
 * Relit une copie enregistrée : tout champ absent, d'un mauvais type ou hors
 * bornes reprend sa valeur par défaut ; autre chose qu'un objet → `null`.
 */
export function restaurerPlanning(brut: unknown): Planning | null {
  const v = objet(brut);
  if (!v) return null;
  const d = planningVide();
  const nom = (x: unknown) => (typeof x === 'string' ? x.slice(0, LIMITE_NOM) : '');
  const depart =
    typeof v['depart'] === 'string' && numeroJour(v['depart']) !== null ? v['depart'] : '';
  return {
    parentA: nom(v['parentA']),
    parentB: nom(v['parentB']),
    rythme: parmi(RYTHMES, v['rythme'], d.rythme),
    depart,
    premier: parmi<Parent>(['A', 'B'], v['premier'], d.premier),
    zone: parmi<Zone | ''>(['', ...ZONES], v['zone'], d.zone),
    annee: parmi<number>(ANNEES_SCOLAIRES, v['annee'], d.annee),
    vacances: parmi(MODES_VACANCES, v['vacances'], d.vacances),
    moitiePaire: parmi<Parent>(['A', 'B'], v['moitiePaire'], d.moitiePaire),
  };
}

export function estEntame(planning: Planning): boolean {
  return (
    JSON.stringify({ ...planning, annee: 0 }) !== JSON.stringify({ ...planningVide(), annee: 0 })
  );
}
