import { Fiche, Matiere, TAUX_TVA } from './fiche';

/**
 * Le prix d'une création, en centimes entiers. Les prix s'arrondissent au
 * centime supérieur : arrondir en dessous rognerait la marge visée.
 */

export interface Resultat {
  /** Coût de chaque matière, dans l'ordre de la fiche. */
  matieres: number[];
  totalMatieres: number;
  mainOeuvre: number;
  frais: number;
  coutRevient: number;
  benefice: number;
  /** Prix de gros hors taxes : ce que vous facturez à une boutique. */
  prixGrosHt: number;
  /** Prix public conseillé : prix de gros × coefficient, ou le plancher de la vente directe s'il est plus haut. */
  prixDetailHt: number;
  prixDetailTtc: number;
  /** Prix de détail arrondi à l'euro supérieur, pour l'étiquette. */
  prixEtiquette: number;
  /** Prix public minimum pour garder coût et bénéfice en vendant soi-même sur la plateforme. */
  plancherDirectHt: number;
  /** Le plancher de la vente directe dépasse le prix de gros × coefficient. */
  detailReleve: boolean;
  /** Vente au prix d'étiquette sur la plateforme : ce qui part et ce qui reste. */
  venteDirecte: VenteDirecte;
}

export interface VenteDirecte {
  prixTtc: number;
  tva: number;
  commission: number;
  cotisations: number;
  /** Ce qu'il reste une fois coût de revient, commission, cotisations et TVA payés. */
  benefice: number;
}

/** Valeur saisie utilisable : un nombre fini positif, sinon 0. */
function positif(v: number): number {
  return Number.isFinite(v) && v > 0 ? v : 0;
}

/**
 * Euros → centimes. 2,5 × 33,33 vaut 8332,4999… en virgule flottante : on
 * ramène à 12 chiffres significatifs avant d'arrondir.
 */
export function centimes(euros: number): number {
  return Math.round(Number((euros * 100).toPrecision(12)));
}

function auCentimeSuperieur(c: number): number {
  return Math.ceil(Number(c.toPrecision(12)));
}

/** Coût de la part utilisée : prix du lot × quantité utilisée ÷ quantité achetée. */
export function coutMatiere(m: Matiere): number {
  const achetee = positif(m.quantiteAchetee);
  if (!achetee) return 0;
  return centimes((positif(m.prixAchat) * positif(m.quantiteUtilisee)) / achetee);
}

function tauxTva(fiche: Fiche): number {
  return fiche.regimeTva === 'assujetti' ? TAUX_TVA / 100 : 0;
}

/** TVA d'un prix hors taxes, arrondie au centime. */
export function tvaSur(ht: number, fiche: Fiche): number {
  return Math.round(ht * tauxTva(fiche));
}

/**
 * Le calcul complet, ou `null` si cotisations et commission absorbent tout le
 * prix (100 % ou plus) : aucun prix ne couvrirait alors le coût.
 */
export function calculer(fiche: Fiche): Resultat | null {
  const cot = positif(fiche.cotisationsPct) / 100;
  const com = positif(fiche.commissionPct) / 100;
  const tva = tauxTva(fiche);
  const resteGros = 1 - cot;
  const resteDirect = 1 - cot - com * (1 + tva);
  if (resteGros <= 0 || resteDirect <= 0) return null;

  const matieres = fiche.matieres.map(coutMatiere);
  const totalMatieres = matieres.reduce((s, c) => s + c, 0);
  const mainOeuvre = centimes((positif(fiche.minutes) / 60) * positif(fiche.tauxHoraire));
  const frais = centimes(positif(fiche.fraisParPiece));
  const coutRevient = totalMatieres + mainOeuvre + frais;
  const benefice = Math.round((coutRevient * positif(fiche.margePct)) / 100);
  const cible = coutRevient + benefice;

  const prixGrosHt = auCentimeSuperieur(cible / resteGros);
  const fixe = centimes(positif(fiche.fraisParVente));
  const plancherDirectHt = auCentimeSuperieur((cible + fixe) / resteDirect);
  const coefficient = Math.max(1, positif(fiche.coefficientDetail));
  const parCoefficient = auCentimeSuperieur(prixGrosHt * coefficient);
  const prixDetailHt = Math.max(parCoefficient, plancherDirectHt);
  const prixDetailTtc = prixDetailHt + tvaSur(prixDetailHt, fiche);
  const prixEtiquette = Math.ceil(prixDetailTtc / 100) * 100;

  return {
    matieres,
    totalMatieres,
    mainOeuvre,
    frais,
    coutRevient,
    benefice,
    prixGrosHt,
    prixDetailHt,
    prixDetailTtc,
    prixEtiquette,
    plancherDirectHt,
    detailReleve: plancherDirectHt > parCoefficient,
    venteDirecte: venteDirecte(fiche, prixEtiquette, coutRevient),
  };
}

/**
 * Ce que rapporte une vente au prix public `prixTtc` sur la plateforme : la
 * commission porte sur le prix payé, les cotisations sur le hors-taxes.
 */
export function venteDirecte(fiche: Fiche, prixTtc: number, coutRevient: number): VenteDirecte {
  const ht = Math.round(prixTtc / (1 + tauxTva(fiche)));
  const tva = prixTtc - ht;
  const commission =
    Math.round((prixTtc * positif(fiche.commissionPct)) / 100) +
    centimes(positif(fiche.fraisParVente));
  const cotisations = Math.round((ht * positif(fiche.cotisationsPct)) / 100);
  return {
    prixTtc,
    tva,
    commission,
    cotisations,
    benefice: ht - commission - cotisations - coutRevient,
  };
}
