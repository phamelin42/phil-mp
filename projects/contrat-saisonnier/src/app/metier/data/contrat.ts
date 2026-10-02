/**
 * Le contrat de location saisonnière : modèle, valeurs par défaut et relecture
 * d'une copie enregistrée. Fonctions pures, sans Angular.
 */

export const TYPES_LOGEMENT = ['appartement', 'maison', 'studio', 'chalet', 'autre'] as const;
export type TypeLogement = (typeof TYPES_LOGEMENT)[number];

/** Classement en étoiles du meublé de tourisme ; la plupart ne le sont pas. */
export const CLASSEMENTS = ['non-classe', '1', '2', '3', '4', '5'] as const;
export type Classement = (typeof CLASSEMENTS)[number];

/** Somme versée à la réservation : arrhes (dédit possible) ou acompte (engagement ferme). */
export const VERSEMENTS = ['arrhes', 'acompte'] as const;
export type Versement = (typeof VERSEMENTS)[number];

export const CHARGES = ['comprises', 'en-sus'] as const;
export type Charges = (typeof CHARGES)[number];

export interface Partie {
  nom: string;
  adresse: string;
  telephone: string;
  email: string;
}

export interface Logement {
  type: TypeLogement;
  adresse: string;
  /** Surface habitable en m² ; 0 : non précisée. */
  surface: number;
  pieces: number;
  /** Nombre maximal d'occupants. */
  capacite: number;
  classement: Classement;
  /** Numéro de déclaration ou d'enregistrement en mairie ; vide s'il n'y en a pas. */
  enregistrement: string;
  /** État descriptif : situation, équipements, couchages. */
  description: string;
}

export interface Sejour {
  /** AAAA-MM-JJ. */
  arrivee: string;
  depart: string;
  /** HH:MM. */
  heureArrivee: string;
  heureDepart: string;
  adultes: number;
  enfants: number;
}

export interface Prix {
  /** Loyer du séjour entier, en euros. */
  loyer: number;
  charges: Charges;
  /** Charges facturées en plus du loyer (ménage, électricité…), telles que saisies. */
  detailCharges: string;
  versement: Versement;
  /** Montant versé à la réservation, en euros. */
  montantVersement: number;
  /** Échéance du solde, en clair : « le jour de l'arrivée », « 30 jours avant ». */
  echeanceSolde: string;
  /** Taxe de séjour par adulte et par nuit, en euros ; 0 : réglée selon le tarif de la commune. */
  taxeSejour: number;
  depotGarantie: number;
  /** Délai de restitution du dépôt après le départ, en jours. */
  restitutionJours: number;
}

export interface Objet {
  designation: string;
  quantite: number;
}

export interface Piece {
  nom: string;
  objets: Objet[];
}

export interface Contrat {
  bailleur: Partie;
  locataire: Partie;
  logement: Logement;
  sejour: Sejour;
  prix: Prix;
  particulieres: string;
  /** Lieu et date de signature. */
  lieu: string;
  date: string;
  pieces: Piece[];
}

export const LIMITES = {
  texte: 2000,
  pieces: 30,
  objets: 60,
  montant: 1_000_000,
  personnes: 50,
  jours: 365,
} as const;

/** Au-delà, la location n'est plus saisonnière (loi n° 70-9 du 2 janvier 1970, art. 1-1). */
export const NUITS_MAX = 90;

export function partieVide(): Partie {
  return { nom: '', adresse: '', telephone: '', email: '' };
}

export function objetVide(): Objet {
  return { designation: '', quantite: 1 };
}

export function pieceVide(): Piece {
  return { nom: '', objets: [objetVide()] };
}

/** Pièces proposées à la première visite : un point de départ, pas un modèle imposé. */
export function piecesProposees(): Piece[] {
  const p = (nom: string, objets: [string, number][]): Piece => ({
    nom,
    objets: objets.map(([designation, quantite]) => ({ designation, quantite })),
  });
  return [
    p('Séjour', [
      ['Canapé', 1],
      ['Table', 1],
      ['Chaises', 4],
      ['Télévision et télécommande', 1],
    ]),
    p('Cuisine', [
      ['Réfrigérateur', 1],
      ['Plaques de cuisson', 1],
      ['Assiettes plates', 6],
      ['Verres', 6],
      ['Couverts (ménagère)', 6],
      ['Casseroles', 3],
    ]),
    p('Chambre', [
      ['Lit double', 1],
      ['Couette', 1],
      ['Oreillers', 2],
    ]),
    p('Salle d’eau', [
      ['Miroir', 1],
      ['Sèche-cheveux', 1],
    ]),
  ];
}

export function contratVide(): Contrat {
  return {
    bailleur: partieVide(),
    locataire: partieVide(),
    logement: {
      type: 'appartement',
      adresse: '',
      surface: 0,
      pieces: 2,
      capacite: 4,
      classement: 'non-classe',
      enregistrement: '',
      description: '',
    },
    sejour: {
      arrivee: '',
      depart: '',
      heureArrivee: '16:00',
      heureDepart: '10:00',
      adultes: 2,
      enfants: 0,
    },
    prix: {
      loyer: 0,
      charges: 'comprises',
      detailCharges: '',
      versement: 'arrhes',
      montantVersement: 0,
      echeanceSolde: 'le jour de l’arrivée',
      taxeSejour: 0,
      depotGarantie: 0,
      restitutionJours: 15,
    },
    particulieres: '',
    lieu: '',
    date: '',
    pieces: piecesProposees(),
  };
}

/** Date du jour au format AAAA-MM-JJ, dans le fuseau de l'appareil. */
export function dateDuJour(maintenant: Date): string {
  const mois = String(maintenant.getMonth() + 1).padStart(2, '0');
  const jour = String(maintenant.getDate()).padStart(2, '0');
  return `${maintenant.getFullYear()}-${mois}-${jour}`;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;

function objet(v: unknown): Record<string, unknown> | null {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function texte(v: unknown, defaut: string): string {
  return typeof v === 'string' ? v.slice(0, LIMITES.texte) : defaut;
}

function nombre(v: unknown, defaut: number, min: number, max: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : defaut;
}

function entier(v: unknown, defaut: number, min: number, max: number): number {
  return Math.round(nombre(v, defaut, min, max));
}

function parmi<T extends string>(liste: readonly T[], v: unknown, defaut: T): T {
  return liste.includes(v as T) ? (v as T) : defaut;
}

function motif(v: unknown, re: RegExp, defaut: string): string {
  return typeof v === 'string' && re.test(v) ? v : defaut;
}

function relirePartie(v: unknown): Partie {
  const p = objet(v) ?? {};
  return {
    nom: texte(p['nom'], ''),
    adresse: texte(p['adresse'], ''),
    telephone: texte(p['telephone'], ''),
    email: texte(p['email'], ''),
  };
}

function relireObjet(v: unknown): Objet | null {
  const o = objet(v);
  if (!o) return null;
  return {
    designation: texte(o['designation'], ''),
    quantite: entier(o['quantite'], 1, 0, 10_000),
  };
}

function relirePiece(v: unknown): Piece | null {
  const p = objet(v);
  if (!p) return null;
  const objets = Array.isArray(p['objets'])
    ? p['objets']
        .slice(0, LIMITES.objets)
        .map(relireObjet)
        .filter((o): o is Objet => o !== null)
    : [];
  return { nom: texte(p['nom'], ''), objets };
}

/**
 * Relit une copie enregistrée (IndexedDB) : tout champ absent, d'un mauvais
 * type ou hors bornes reprend sa valeur par défaut. Autre chose qu'un objet →
 * `null`. Ne lève jamais d'exception.
 */
export function restaurerContrat(brut: unknown): Contrat | null {
  const v = objet(brut);
  if (!v) return null;
  const d = contratVide();
  const l = objet(v['logement']) ?? {};
  const s = objet(v['sejour']) ?? {};
  const p = objet(v['prix']) ?? {};
  const pieces = Array.isArray(v['pieces'])
    ? v['pieces']
        .slice(0, LIMITES.pieces)
        .map(relirePiece)
        .filter((x): x is Piece => x !== null)
    : d.pieces;
  return {
    bailleur: relirePartie(v['bailleur']),
    locataire: relirePartie(v['locataire']),
    logement: {
      type: parmi(TYPES_LOGEMENT, l['type'], d.logement.type),
      adresse: texte(l['adresse'], ''),
      surface: nombre(l['surface'], 0, 0, 10_000),
      pieces: entier(l['pieces'], d.logement.pieces, 1, 100),
      capacite: entier(l['capacite'], d.logement.capacite, 1, LIMITES.personnes),
      classement: parmi(CLASSEMENTS, l['classement'], d.logement.classement),
      enregistrement: texte(l['enregistrement'], ''),
      description: texte(l['description'], ''),
    },
    sejour: {
      arrivee: motif(s['arrivee'], DATE, ''),
      depart: motif(s['depart'], DATE, ''),
      heureArrivee: motif(s['heureArrivee'], HEURE, d.sejour.heureArrivee),
      heureDepart: motif(s['heureDepart'], HEURE, d.sejour.heureDepart),
      adultes: entier(s['adultes'], d.sejour.adultes, 0, LIMITES.personnes),
      enfants: entier(s['enfants'], d.sejour.enfants, 0, LIMITES.personnes),
    },
    prix: {
      loyer: nombre(p['loyer'], 0, 0, LIMITES.montant),
      charges: parmi(CHARGES, p['charges'], d.prix.charges),
      detailCharges: texte(p['detailCharges'], ''),
      versement: parmi(VERSEMENTS, p['versement'], d.prix.versement),
      montantVersement: nombre(p['montantVersement'], 0, 0, LIMITES.montant),
      echeanceSolde: texte(p['echeanceSolde'], d.prix.echeanceSolde),
      taxeSejour: nombre(p['taxeSejour'], 0, 0, 100),
      depotGarantie: nombre(p['depotGarantie'], 0, 0, LIMITES.montant),
      restitutionJours: entier(p['restitutionJours'], d.prix.restitutionJours, 0, LIMITES.jours),
    },
    particulieres: texte(v['particulieres'], ''),
    lieu: texte(v['lieu'], ''),
    date: motif(v['date'], DATE, ''),
    pieces,
  };
}

/** Le contrat diffère-t-il d'un contrat vide (hors date de signature proposée) ? */
export function estEntame(contrat: Contrat): boolean {
  const vide = { ...contratVide(), date: contrat.date };
  return JSON.stringify(contrat) !== JSON.stringify(vide);
}

/**
 * Contrat suivant pour le même logement : le bailleur, le logement, les
 * conditions et l'inventaire restent ; le locataire et les dates repartent de
 * zéro.
 */
export function contratSuivant(precedent: Contrat, aujourdhui: string): Contrat {
  const vide = contratVide();
  return {
    ...vide,
    bailleur: { ...precedent.bailleur },
    logement: { ...precedent.logement },
    sejour: {
      ...vide.sejour,
      heureArrivee: precedent.sejour.heureArrivee,
      heureDepart: precedent.sejour.heureDepart,
    },
    prix: {
      ...precedent.prix,
      loyer: 0,
      montantVersement: 0,
    },
    particulieres: precedent.particulieres,
    lieu: precedent.lieu,
    date: aujourdhui,
    pieces: precedent.pieces.map((p) => ({ nom: p.nom, objets: p.objets.map((o) => ({ ...o })) })),
  };
}
