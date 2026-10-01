import { Totaux } from './calculs';
import { Devis } from './devis';
import { ajouterJours, dateLongue, euros } from './format';

/**
 * Textes portés par le devis selon le statut, le régime de TVA et le type de
 * client. Un champ vide laisse un repère « à compléter » plutôt qu'une phrase
 * tronquée.
 */

const A_COMPLETER = '[à compléter]';
const ou = (s: string) => s.trim() || A_COMPLETER;

export const MENTION_FRANCHISE = 'TVA non applicable, art. 293 B du CGI.';
export const MENTION_TAUX_REDUIT =
  'Taux réduit de TVA : le client atteste que les travaux portent sur un logement achevé depuis plus de deux ans.';
export const MENTION_SIGNATURE =
  'Devis reçu avant l’exécution des travaux. Bon pour accord, date et signature du client :';
export const MENTION_PENALITES =
  'En cas de retard de paiement : pénalités au taux de trois fois le taux d’intérêt légal et indemnité forfaitaire de 40 € pour frais de recouvrement (art. L441-10 du Code de commerce).';

/** En-tête de l'émetteur, ligne par ligne. */
export function identite(devis: Devis): string[] {
  const e = devis.entreprise;
  const lignes: string[] = [];
  if (e.statut === 'societe') {
    lignes.push(ou(e.nom), `${ou(e.formeJuridique)} au capital de ${ou(e.capital)}\u00a0€`);
  } else {
    // Entrepreneur individuel : « EI » accolé au nom (loi du 14 février 2022).
    lignes.push(`${ou(e.nom)} EI`);
  }
  lignes.push(...ou(e.adresse).split('\n'));
  if (e.telephone.trim()) lignes.push(`Tél. ${e.telephone.trim()}`);
  if (e.email.trim()) lignes.push(e.email.trim());
  lignes.push(`SIRET\u00a0: ${ou(e.siret)}`);
  if (e.statut === 'societe') lignes.push(`RCS ${ou(e.immatriculation)}`);
  else if (e.immatriculation.trim())
    lignes.push(`Immatriculation\u00a0: ${e.immatriculation.trim()}`);
  if (devis.regimeTva === 'assujetti')
    lignes.push(`TVA intracommunautaire\u00a0: ${ou(e.tvaIntra)}`);
  return lignes;
}

/** Mentions de bas de devis, dans l'ordre où elles s'impriment. */
export function mentions(devis: Devis, t: Totaux): string[] {
  const liste: string[] = [];
  if (devis.regimeTva === 'franchise') liste.push(MENTION_FRANCHISE);
  else if (t.parTaux.some((x) => x.taux !== '20')) liste.push(MENTION_TAUX_REDUIT);

  const fin = dateLongue(ajouterJours(devis.date, devis.validiteJours));
  liste.push(
    `Devis valable ${devis.validiteJours}\u00a0jours${fin ? `, jusqu’au ${fin}` : ''}.`,
    `Début des travaux\u00a0: ${ou(devis.debutTravaux)}. Durée estimée\u00a0: ${ou(devis.dureeTravaux)}.`,
  );
  if (devis.acomptePct > 0) {
    liste.push(
      `Acompte de ${String(devis.acomptePct).replace('.', ',')}\u00a0% à la signature\u00a0: ${euros(t.acompte)}.`,
    );
  }
  liste.push(`Conditions de paiement\u00a0: ${ou(devis.paiement)}.`);
  liste.push(
    devis.deplacement.trim()
      ? `Frais de déplacement\u00a0: ${devis.deplacement.trim()}.`
      : 'Déplacement non facturé.',
  );
  liste.push(
    `Assurance décennale\u00a0: ${ou(devis.entreprise.assureur)}. Couverture géographique\u00a0: ${ou(devis.entreprise.zoneAssurance)}.`,
  );
  liste.push(
    devis.client.type === 'professionnel'
      ? MENTION_PENALITES
      : `En cas de litige, le client peut recourir gratuitement au médiateur de la consommation\u00a0: ${ou(devis.mediateur)}.`,
  );
  return liste;
}
