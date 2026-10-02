import { nuits } from './calculs';
import { Contrat, NUITS_MAX } from './contrat';

/**
 * Ce qu'un contrat de location saisonnière doit contenir pour être complet.
 * Source unique : le formulaire en tire ses erreurs, l'outil son état
 * « complet ». Le champ d'une règle est aussi l'`id` de son champ de saisie.
 */

export type Champ =
  | 'bailleur-nom'
  | 'bailleur-adresse'
  | 'locataire-nom'
  | 'locataire-adresse'
  | 'logement-adresse'
  | 'logement-description'
  | 'sejour-arrivee'
  | 'sejour-depart'
  | 'sejour-adultes'
  | 'prix-loyer'
  | 'prix-montantVersement'
  | 'prix-echeanceSolde'
  | 'lieu'
  | 'date'
  | 'pieces';

export type Section = 'parties' | 'logement' | 'sejour' | 'prix' | 'inventaire' | 'signature';

export interface Regle {
  champ: Champ;
  section: Section;
  /** Nom du champ, pour la liste de ce qui manque. */
  libelle: string;
  /** Message affiché sous le champ, selon le contrat (le départ dépend de l'arrivée…). */
  message: (c: Contrat) => string;
  valide: (c: Contrat) => boolean;
}

const rempli = (s: string) => s.trim().length > 0;
const fixe = (m: string) => () => m;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const REGLES: readonly Regle[] = [
  {
    champ: 'bailleur-nom',
    section: 'parties',
    libelle: 'Nom du propriétaire',
    message: fixe('Indiquez le nom du propriétaire.'),
    valide: (c) => rempli(c.bailleur.nom),
  },
  {
    champ: 'bailleur-adresse',
    section: 'parties',
    libelle: 'Adresse du propriétaire',
    message: fixe('Indiquez l’adresse du propriétaire.'),
    valide: (c) => rempli(c.bailleur.adresse),
  },
  {
    champ: 'locataire-nom',
    section: 'parties',
    libelle: 'Nom du locataire',
    message: fixe('Indiquez le nom du locataire.'),
    valide: (c) => rempli(c.locataire.nom),
  },
  {
    champ: 'locataire-adresse',
    section: 'parties',
    libelle: 'Adresse du locataire',
    message: fixe('Indiquez l’adresse habituelle du locataire.'),
    valide: (c) => rempli(c.locataire.adresse),
  },
  {
    champ: 'logement-adresse',
    section: 'logement',
    libelle: 'Adresse du logement loué',
    message: fixe('Indiquez l’adresse du logement loué.'),
    valide: (c) => rempli(c.logement.adresse),
  },
  {
    champ: 'logement-description',
    section: 'logement',
    libelle: 'Description du logement',
    message: fixe('Décrivez le logement\u00a0: le contrat doit en contenir un état descriptif.'),
    valide: (c) => rempli(c.logement.description),
  },
  {
    champ: 'sejour-arrivee',
    section: 'sejour',
    libelle: 'Date d’arrivée',
    message: fixe('Indiquez la date d’arrivée.'),
    valide: (c) => DATE.test(c.sejour.arrivee),
  },
  {
    champ: 'sejour-depart',
    section: 'sejour',
    libelle: 'Date de départ',
    message: (c) =>
      !DATE.test(c.sejour.depart) || nuits(c.sejour.arrivee, c.sejour.depart) === null
        ? 'Indiquez une date de départ postérieure à l’arrivée.'
        : `Une location saisonnière dure au plus ${NUITS_MAX} jours.`,
    valide: (c) => {
      const n = nuits(c.sejour.arrivee, c.sejour.depart);
      return n !== null && n <= NUITS_MAX;
    },
  },
  {
    champ: 'sejour-adultes',
    section: 'sejour',
    libelle: 'Nombre d’occupants',
    message: (c) =>
      c.sejour.adultes < 1
        ? 'Au moins un adulte signe le contrat.'
        : `Le logement accueille au plus ${c.logement.capacite} personnes.`,
    valide: (c) =>
      c.sejour.adultes >= 1 && c.sejour.adultes + c.sejour.enfants <= c.logement.capacite,
  },
  {
    champ: 'prix-loyer',
    section: 'prix',
    libelle: 'Loyer du séjour',
    message: fixe('Indiquez le loyer du séjour.'),
    valide: (c) => c.prix.loyer > 0,
  },
  {
    champ: 'prix-montantVersement',
    section: 'prix',
    libelle: 'Montant versé à la réservation',
    message: fixe('Le versement à la réservation ne peut pas dépasser le loyer.'),
    valide: (c) => c.prix.montantVersement <= c.prix.loyer,
  },
  {
    champ: 'prix-echeanceSolde',
    section: 'prix',
    libelle: 'Échéance du solde',
    message: fixe('Indiquez quand le solde est payé.'),
    valide: (c) => c.prix.montantVersement >= c.prix.loyer || rempli(c.prix.echeanceSolde),
  },
  {
    champ: 'pieces',
    section: 'inventaire',
    libelle: 'Inventaire',
    message: fixe('Chaque pièce a un nom, chaque objet une désignation.'),
    valide: (c) =>
      c.pieces.length > 0 &&
      c.pieces.every((p) => rempli(p.nom) && p.objets.every((o) => rempli(o.designation))),
  },
  {
    champ: 'lieu',
    section: 'signature',
    libelle: 'Lieu de signature',
    message: fixe('Indiquez la ville où le contrat est signé.'),
    valide: (c) => rempli(c.lieu),
  },
  {
    champ: 'date',
    section: 'signature',
    libelle: 'Date de signature',
    message: fixe('Indiquez la date de signature.'),
    valide: (c) => DATE.test(c.date),
  },
];

export const SECTIONS: readonly Section[] = [
  'parties',
  'logement',
  'sejour',
  'prix',
  'inventaire',
  'signature',
];

export function regle(champ: Champ): Regle {
  const r = REGLES.find((x) => x.champ === champ);
  if (!r) throw new Error(`Règle inconnue : ${champ}`);
  return r;
}

/** Message d'erreur du champ pour ce contrat, ou `null` s'il est en règle. */
export function erreur(champ: Champ, contrat: Contrat): string | null {
  const r = regle(champ);
  return r.valide(contrat) ? null : r.message(contrat);
}

export function champsManquants(contrat: Contrat): Regle[] {
  return REGLES.filter((r) => !r.valide(contrat));
}

/** Sections sans aucun champ manquant. */
export function sectionsCompletes(contrat: Contrat): Section[] {
  const manque = new Set(champsManquants(contrat).map((r) => r.section));
  return SECTIONS.filter((s) => !manque.has(s));
}
