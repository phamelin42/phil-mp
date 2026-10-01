import { Devis } from './devis';

/**
 * Ce qu'un devis de travaux doit contenir pour être complet, selon le statut
 * de l'entreprise, son régime de TVA et le type de client. Source unique : le
 * formulaire en tire ses erreurs, l'outil son état « complet ».
 */

export type Champ =
  | 'entreprise.nom'
  | 'entreprise.adresse'
  | 'entreprise.siret'
  | 'entreprise.formeJuridique'
  | 'entreprise.capital'
  | 'entreprise.immatriculation'
  | 'entreprise.tvaIntra'
  | 'entreprise.assureur'
  | 'entreprise.zoneAssurance'
  | 'client.nom'
  | 'client.adresse'
  | 'numero'
  | 'date'
  | 'debutTravaux'
  | 'dureeTravaux'
  | 'lignes'
  | 'paiement'
  | 'mediateur';

export interface Regle {
  champ: Champ;
  /** Nom du champ, pour la liste de ce qui manque. */
  libelle: string;
  /** Message affiché sous le champ. */
  message: string;
  /** La règle s'applique-t-elle à ce devis ? */
  applicable: (d: Devis) => boolean;
  valide: (d: Devis) => boolean;
}

const rempli = (s: string) => s.trim().length > 0;
const toujours = () => true;
const societe = (d: Devis) => d.entreprise.statut === 'societe';

export const REGLES: readonly Regle[] = [
  {
    champ: 'entreprise.nom',
    libelle: 'Nom de l’entreprise',
    message: 'Indiquez le nom de l’entreprise.',
    applicable: toujours,
    valide: (d) => rempli(d.entreprise.nom),
  },
  {
    champ: 'entreprise.adresse',
    libelle: 'Adresse de l’entreprise',
    message: 'Indiquez l’adresse de l’entreprise.',
    applicable: toujours,
    valide: (d) => rempli(d.entreprise.adresse),
  },
  {
    champ: 'entreprise.siret',
    libelle: 'SIRET',
    message: 'Le SIRET compte 14 chiffres.',
    applicable: toujours,
    valide: (d) => /^\d{14}$/.test(d.entreprise.siret.replace(/\s/g, '')),
  },
  {
    champ: 'entreprise.formeJuridique',
    libelle: 'Forme juridique',
    message: 'Indiquez la forme juridique (SARL, SAS, EURL…).',
    applicable: societe,
    valide: (d) => rempli(d.entreprise.formeJuridique),
  },
  {
    champ: 'entreprise.capital',
    libelle: 'Capital social',
    message: 'Indiquez le capital social.',
    applicable: societe,
    valide: (d) => rempli(d.entreprise.capital),
  },
  {
    champ: 'entreprise.immatriculation',
    libelle: 'Immatriculation RCS',
    message: 'Indiquez le RCS et sa ville.',
    applicable: societe,
    valide: (d) => rempli(d.entreprise.immatriculation),
  },
  {
    champ: 'entreprise.tvaIntra',
    libelle: 'Numéro de TVA intracommunautaire',
    message: 'Indiquez le numéro de TVA intracommunautaire.',
    applicable: (d) => d.regimeTva === 'assujetti',
    valide: (d) => rempli(d.entreprise.tvaIntra),
  },
  {
    champ: 'entreprise.assureur',
    libelle: 'Assurance décennale',
    message: 'Indiquez l’assureur et le numéro de contrat.',
    applicable: toujours,
    valide: (d) => rempli(d.entreprise.assureur),
  },
  {
    champ: 'entreprise.zoneAssurance',
    libelle: 'Couverture géographique de l’assurance',
    message: 'Indiquez la zone couverte par l’assurance.',
    applicable: toujours,
    valide: (d) => rempli(d.entreprise.zoneAssurance),
  },
  {
    champ: 'client.nom',
    libelle: 'Nom du client',
    message: 'Indiquez le nom du client.',
    applicable: toujours,
    valide: (d) => rempli(d.client.nom),
  },
  {
    champ: 'client.adresse',
    libelle: 'Adresse du client',
    message: 'Indiquez l’adresse du client.',
    applicable: toujours,
    valide: (d) => rempli(d.client.adresse),
  },
  {
    champ: 'numero',
    libelle: 'Numéro du devis',
    message: 'Donnez un numéro au devis.',
    applicable: toujours,
    valide: (d) => rempli(d.numero),
  },
  {
    champ: 'date',
    libelle: 'Date du devis',
    message: 'Indiquez la date du devis.',
    applicable: toujours,
    valide: (d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date),
  },
  {
    champ: 'debutTravaux',
    libelle: 'Début des travaux',
    message: 'Indiquez quand les travaux peuvent commencer.',
    applicable: toujours,
    valide: (d) => rempli(d.debutTravaux),
  },
  {
    champ: 'dureeTravaux',
    libelle: 'Durée estimée des travaux',
    message: 'Indiquez la durée estimée des travaux.',
    applicable: toujours,
    valide: (d) => rempli(d.dureeTravaux),
  },
  {
    champ: 'lignes',
    libelle: 'Prestations',
    message: 'Chaque ligne a une désignation et une quantité supérieure à zéro.',
    applicable: toujours,
    valide: (d) =>
      d.lignes.length > 0 && d.lignes.every((l) => rempli(l.designation) && l.quantite > 0),
  },
  {
    champ: 'paiement',
    libelle: 'Conditions de paiement',
    message: 'Indiquez les conditions de paiement.',
    applicable: toujours,
    valide: (d) => rempli(d.paiement),
  },
  {
    champ: 'mediateur',
    libelle: 'Médiateur de la consommation',
    message: 'Un client particulier doit connaître votre médiateur de la consommation.',
    applicable: (d) => d.client.type === 'particulier',
    valide: (d) => rempli(d.mediateur),
  },
];

export function regle(champ: Champ): Regle {
  const r = REGLES.find((x) => x.champ === champ);
  if (!r) throw new Error(`Règle inconnue : ${champ}`);
  return r;
}

/** Message d'erreur du champ pour ce devis, ou `null` s'il est en règle. */
export function erreur(champ: Champ, devis: Devis): string | null {
  const r = regle(champ);
  return r.applicable(devis) && !r.valide(devis) ? r.message : null;
}

export function champsManquants(devis: Devis): Regle[] {
  return REGLES.filter((r) => r.applicable(devis) && !r.valide(devis));
}

export function estComplet(devis: Devis): boolean {
  return champsManquants(devis).length === 0;
}
