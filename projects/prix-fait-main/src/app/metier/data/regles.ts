import { Fiche } from './fiche';

/** Ce qui manque pour que le prix calculé ait un sens. */
export type Manque = 'matieres' | 'minutes' | 'tauxHoraire' | 'prelevements';

export const LIBELLES_MANQUE: Record<Manque, string> = {
  matieres: 'Au moins une matière avec son prix et ses quantités',
  minutes: 'Le temps de fabrication',
  tauxHoraire: 'Votre taux horaire',
  prelevements: 'Des cotisations et une commission sous 100 % du prix',
};

/** Identifiant du champ où aller corriger chaque manque. */
export const CHAMP_MANQUE: Record<Manque, string> = {
  matieres: 'matiere-0-prix',
  minutes: 'minutes',
  tauxHoraire: 'tauxHoraire',
  prelevements: 'cotisationsPct',
};

function positif(v: number): boolean {
  return Number.isFinite(v) && v > 0;
}

export function manques(fiche: Fiche): Manque[] {
  const liste: Manque[] = [];
  const matiereComplete = fiche.matieres.some(
    (m) => positif(m.prixAchat) && positif(m.quantiteAchetee) && positif(m.quantiteUtilisee),
  );
  if (!matiereComplete) liste.push('matieres');
  if (!positif(fiche.minutes)) liste.push('minutes');
  if (!positif(fiche.tauxHoraire)) liste.push('tauxHoraire');
  const tva = fiche.regimeTva === 'assujetti' ? 0.2 : 0;
  const cot = Number.isFinite(fiche.cotisationsPct) ? fiche.cotisationsPct : 0;
  const com = Number.isFinite(fiche.commissionPct) ? fiche.commissionPct : 0;
  if (cot + com * (1 + tva) >= 100) liste.push('prelevements');
  return liste;
}
