/**
 * La fiche de prix d'une création : modèle, valeurs par défaut et relecture
 * d'une copie enregistrée. Fonctions pures, sans Angular.
 */

export const REGIMES_TVA = ['franchise', 'assujetti'] as const;
export type RegimeTva = (typeof REGIMES_TVA)[number];

/** Taux normal : un objet fait main vendu en France y est soumis. */
export const TAUX_TVA = 20;

export interface Matiere {
  nom: string;
  /** Prix payé pour le lot acheté, en euros. */
  prixAchat: number;
  quantiteAchetee: number;
  quantiteUtilisee: number;
  unite: string;
}

export interface Fiche {
  /** Nom de la création : « Collier perles de verre ». */
  nom: string;
  matieres: Matiere[];
  /** Temps de fabrication d'une pièce, en minutes. */
  minutes: number;
  /** Euros par heure. */
  tauxHoraire: number;
  /** Emballage, étiquette, part d'outillage : euros par pièce. */
  fraisParPiece: number;
  /** Bénéfice visé, en pourcentage du coût de revient. */
  margePct: number;
  /** Coefficient appliqué par une boutique à votre prix de gros. */
  coefficientDetail: number;
  regimeTva: RegimeTva;
  /** Cotisations sociales, en pourcentage du chiffre d'affaires hors taxes. */
  cotisationsPct: number;
  /** Commission de la plateforme, en pourcentage du prix payé par le client. */
  commissionPct: number;
  /** Frais fixes de la plateforme par vente, en euros. */
  fraisParVente: number;
}

export const LIMITES = {
  texte: 200,
  matieres: 50,
  montant: 1_000_000,
  quantite: 1_000_000,
  minutes: 100_000,
  coefficient: 10,
} as const;

export function matiereVide(): Matiere {
  return { nom: '', prixAchat: 0, quantiteAchetee: 1, quantiteUtilisee: 1, unite: 'u' };
}

export function ficheVide(): Fiche {
  return {
    nom: '',
    matieres: [matiereVide()],
    minutes: 0,
    tauxHoraire: 0,
    fraisParPiece: 0,
    margePct: 10,
    coefficientDetail: 2,
    regimeTva: 'franchise',
    cotisationsPct: 0,
    commissionPct: 0,
    fraisParVente: 0,
  };
}

function objet(v: unknown): Record<string, unknown> | null {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function texte(v: unknown, defaut: string, max: number = LIMITES.texte): string {
  return typeof v === 'string' ? v.slice(0, max) : defaut;
}

function nombre(v: unknown, defaut: number, min: number, max: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : defaut;
}

function parmi<T extends string>(liste: readonly T[], v: unknown, defaut: T): T {
  return liste.includes(v as T) ? (v as T) : defaut;
}

function relireMatiere(v: unknown): Matiere | null {
  const m = objet(v);
  if (!m) return null;
  const d = matiereVide();
  return {
    nom: texte(m['nom'], d.nom),
    prixAchat: nombre(m['prixAchat'], d.prixAchat, 0, LIMITES.montant),
    quantiteAchetee: nombre(m['quantiteAchetee'], d.quantiteAchetee, 0, LIMITES.quantite),
    quantiteUtilisee: nombre(m['quantiteUtilisee'], d.quantiteUtilisee, 0, LIMITES.quantite),
    unite: texte(m['unite'], d.unite, 20),
  };
}

/**
 * Relit une copie enregistrée (IndexedDB) : tout champ absent, d'un mauvais
 * type ou hors bornes reprend sa valeur par défaut. Autre chose qu'un objet →
 * `null`. Ne lève jamais d'exception.
 */
export function restaurerFiche(brut: unknown): Fiche | null {
  const v = objet(brut);
  if (!v) return null;
  const d = ficheVide();
  const matieres = Array.isArray(v['matieres'])
    ? v['matieres']
        .slice(0, LIMITES.matieres)
        .map(relireMatiere)
        .filter((m): m is Matiere => m !== null)
    : d.matieres;
  return {
    nom: texte(v['nom'], d.nom),
    matieres: matieres.length ? matieres : d.matieres,
    minutes: nombre(v['minutes'], d.minutes, 0, LIMITES.minutes),
    tauxHoraire: nombre(v['tauxHoraire'], d.tauxHoraire, 0, LIMITES.montant),
    fraisParPiece: nombre(v['fraisParPiece'], d.fraisParPiece, 0, LIMITES.montant),
    margePct: nombre(v['margePct'], d.margePct, 0, 1000),
    coefficientDetail: nombre(v['coefficientDetail'], d.coefficientDetail, 1, LIMITES.coefficient),
    regimeTva: parmi(REGIMES_TVA, v['regimeTva'], d.regimeTva),
    cotisationsPct: nombre(v['cotisationsPct'], d.cotisationsPct, 0, 100),
    commissionPct: nombre(v['commissionPct'], d.commissionPct, 0, 100),
    fraisParVente: nombre(v['fraisParVente'], d.fraisParVente, 0, LIMITES.montant),
  };
}

/** La fiche diffère-t-elle d'une fiche vide ? */
export function estEntamee(fiche: Fiche): boolean {
  return JSON.stringify(fiche) !== JSON.stringify(ficheVide());
}

/**
 * Fiche suivante : les réglages de l'atelier (taux horaire, marge,
 * coefficient, TVA, cotisations, plateforme) restent ; la création, ses
 * matières, son temps et ses frais repartent de zéro.
 */
export function ficheSuivante(precedente: Fiche): Fiche {
  const vide = ficheVide();
  return {
    ...vide,
    tauxHoraire: precedente.tauxHoraire,
    margePct: precedente.margePct,
    coefficientDetail: precedente.coefficientDetail,
    regimeTva: precedente.regimeTva,
    cotisationsPct: precedente.cotisationsPct,
    commissionPct: precedente.commissionPct,
    fraisParVente: precedente.fraisParVente,
  };
}
