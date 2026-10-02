import { Montants, montants } from './calculs';
import { Contrat, NUITS_MAX, TypeLogement } from './contrat';
import { dateLongue, euros, heure, nombre, pluriel } from './format';

/**
 * Les articles du contrat, écrits d'après la saisie. Texte brut, rendu en
 * paragraphes : jamais de HTML. Un champ encore vide apparaît comme
 * « [à compléter] », pour que l'aperçu montre ce qui manque.
 */

export interface Article {
  titre: string;
  paragraphes: string[];
}

const A_COMPLETER = '[à compléter]';

const TYPES: Record<TypeLogement, string> = {
  appartement: 'un appartement meublé',
  maison: 'une maison meublée',
  studio: 'un studio meublé',
  chalet: 'un chalet meublé',
  autre: 'un logement meublé',
};

function ou(valeur: string): string {
  return valeur.trim() || A_COMPLETER;
}

function surUneLigne(adresse: string): string {
  return ou(
    adresse
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .join(', '),
  );
}

export function designation(c: Contrat): string[] {
  const l = c.logement;
  const caracteristiques = [
    l.surface > 0 ? `${nombre(l.surface)}\u00a0m²` : '',
    pluriel(l.pieces, 'pièce'),
    `${pluriel(l.capacite, 'personne')} au plus`,
  ].filter(Boolean);
  const paragraphes = [
    `Le bailleur loue au locataire ${TYPES[l.type]} situé ${surUneLigne(l.adresse)}\u00a0: ${caracteristiques.join(', ')}.`,
  ];
  paragraphes.push(
    l.classement === 'non-classe'
      ? 'Meublé de tourisme non classé.'
      : `Meublé de tourisme classé ${l.classement}\u00a0étoile${l.classement === '1' ? '' : 's'}.`,
  );
  if (l.enregistrement.trim()) {
    paragraphes.push(`Numéro d’enregistrement\u00a0: ${l.enregistrement.trim()}.`);
  }
  paragraphes.push(`État descriptif\u00a0: ${ou(l.description)}`);
  return paragraphes;
}

function versement(c: Contrat, m: Montants): string[] {
  if (m.versement === 0) {
    return [
      `Aucune somme n’est versée à la réservation\u00a0: le loyer est payé ${ou(c.prix.echeanceSolde)}.`,
    ];
  }
  const solde =
    m.solde > 0
      ? ` Le solde, ${euros(m.solde)}, est payé ${ou(c.prix.echeanceSolde)}.`
      : ' Le loyer est ainsi payé en entier.';
  if (c.prix.versement === 'arrhes') {
    return [
      `À la signature, le locataire verse ${euros(m.versement)} à titre d’arrhes.${solde}`,
      'Chaque partie peut renoncer à la location\u00a0: le locataire qui renonce perd les arrhes versées\u00a0; le bailleur qui renonce rembourse au locataire le double des arrhes (Code civil, art. 1590).',
    ];
  }
  return [
    `À la signature, le locataire verse ${euros(m.versement)} à titre d’acompte.${solde}`,
    'Le versement d’un acompte engage les deux parties de manière ferme\u00a0: le locataire qui annule son séjour reste redevable du loyer entier\u00a0; le bailleur qui ne fournit pas le logement rembourse l’acompte et peut devoir des dommages et intérêts.',
  ];
}

function taxe(c: Contrat, m: Montants): string {
  if (c.prix.taxeSejour > 0 && m.nuits !== null) {
    return `Le locataire règle au bailleur, qui la reverse à la commune, la taxe de séjour\u00a0: ${euros(Math.round(c.prix.taxeSejour * 100))} par adulte et par nuit, soit ${euros(m.taxe)} pour ${pluriel(c.sejour.adultes, 'adulte')} et ${pluriel(m.nuits, 'nuit')}. Les mineurs en sont exonérés.`;
  }
  return 'Le locataire règle au bailleur, qui la reverse à la commune, la taxe de séjour due selon le tarif de la commune, par adulte et par nuit. Les mineurs en sont exonérés.';
}

export function articles(c: Contrat): Article[] {
  const m = montants(c);
  const s = c.sejour;
  const duree = m.nuits === null ? A_COMPLETER : `${pluriel(m.nuits, 'nuit')}`;
  const occupants = [pluriel(s.adultes, 'adulte'), s.enfants ? pluriel(s.enfants, 'enfant') : '']
    .filter(Boolean)
    .join(' et ');
  const charges =
    c.prix.charges === 'comprises'
      ? 'Les charges (eau, électricité, chauffage) sont comprises dans le loyer.'
      : `S’ajoutent au loyer les charges suivantes\u00a0: ${ou(c.prix.detailCharges)}`;

  const liste: Article[] = [
    {
      titre: 'Objet',
      paragraphes: [
        `Le présent contrat porte sur la location saisonnière d’un meublé de tourisme, pour un séjour de vacances de ${NUITS_MAX} jours au plus. Le locataire n’y établit pas sa résidence principale et ne bénéficie d’aucun droit au maintien dans les lieux à la fin du séjour.`,
      ],
    },
    { titre: 'Désignation du logement', paragraphes: designation(c) },
    {
      titre: 'Durée',
      paragraphes: [
        `La location commence le ${ou(dateLongue(s.arrivee))} à partir de ${ou(heure(s.heureArrivee))} et prend fin le ${ou(dateLongue(s.depart))} à ${ou(heure(s.heureDepart))}, soit ${duree}. Elle ne se renouvelle pas tacitement.`,
      ],
    },
    {
      titre: 'Occupants',
      paragraphes: [
        `Le logement sera occupé par ${occupants}, sans dépasser ${pluriel(c.logement.capacite, 'personne')}. Toute personne supplémentaire demande l’accord écrit du bailleur.`,
      ],
    },
    {
      titre: 'Prix',
      paragraphes: [
        `Le loyer du séjour s’élève à ${euros(m.loyer)}${m.parNuit !== null ? `, soit ${euros(m.parNuit)} par nuit en moyenne` : ''}. ${charges}`,
      ],
    },
    { titre: 'Réservation et paiement', paragraphes: versement(c, m) },
    { titre: 'Taxe de séjour', paragraphes: [taxe(c, m)] },
    {
      titre: 'Dépôt de garantie',
      paragraphes: [
        m.depot > 0
          ? `Le locataire remet au bailleur, à son arrivée, un dépôt de garantie de ${euros(m.depot)}. Il lui est restitué au plus tard ${pluriel(c.prix.restitutionJours, 'jour')} après son départ, déduction faite des sommes justifiées par l’état des lieux de sortie (dégradations, objets manquants, ménage non fait si le contrat le prévoit).`
          : 'Aucun dépôt de garantie n’est demandé.',
      ],
    },
    {
      titre: 'État des lieux et inventaire',
      paragraphes: [
        'Un état des lieux et un inventaire du mobilier sont établis ensemble, à l’arrivée puis au départ, sur le document annexé. Le locataire signale dans les 48 heures toute anomalie qui n’y figurerait pas.',
      ],
    },
    {
      titre: 'Obligations du locataire',
      paragraphes: [
        'Le locataire occupe les lieux paisiblement, en respecte la destination et le règlement de l’immeuble, n’y fait aucune transformation et ne les sous-loue pas. Il vérifie que son assurance couvre sa responsabilité pendant le séjour (garantie villégiature) et rend le logement dans l’état où il l’a trouvé.',
      ],
    },
  ];
  if (c.particulieres.trim()) {
    liste.push({
      titre: 'Conditions particulières',
      paragraphes: c.particulieres
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
    });
  }
  return liste;
}

/** Ligne de signature : « Fait à Annecy, le 2 mai 2027, en deux exemplaires. » */
export function faitA(c: Contrat): string {
  return `Fait à ${ou(c.lieu)}, le ${ou(dateLongue(c.date))}, en deux exemplaires originaux.`;
}
