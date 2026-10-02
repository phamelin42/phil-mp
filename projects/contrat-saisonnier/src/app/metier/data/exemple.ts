import { Contrat, contratVide } from './contrat';

/** Un contrat complet, pour les tests : une semaine en juillet dans un deux-pièces d'Annecy. */
export function contratExemple(): Contrat {
  const vide = contratVide();
  return {
    ...vide,
    bailleur: {
      nom: 'Claire Morel',
      adresse: '12 rue des Marquisats\n74000 Annecy',
      telephone: '06 12 34 56 78',
      email: 'claire.morel@example.fr',
    },
    locataire: {
      nom: 'Julien Dupont',
      adresse: '8 avenue Jean-Jaurès\n69007 Lyon',
      telephone: '',
      email: '',
    },
    logement: {
      type: 'appartement',
      adresse: '3 quai de la Tournette\n74000 Annecy',
      surface: 42,
      pieces: 2,
      capacite: 4,
      classement: '2',
      enregistrement: '74010000123AB',
      description:
        'Deux-pièces au 2e étage avec ascenseur, balcon vue lac. Lit double et canapé convertible, cuisine équipée, lave-linge, wifi.',
    },
    sejour: {
      arrivee: '2027-07-10',
      depart: '2027-07-17',
      heureArrivee: '16:00',
      heureDepart: '10:00',
      adultes: 2,
      enfants: 1,
    },
    prix: {
      ...vide.prix,
      loyer: 840,
      versement: 'arrhes',
      montantVersement: 210,
      echeanceSolde: 'le jour de l’arrivée',
      taxeSejour: 1.5,
      depotGarantie: 400,
      restitutionJours: 15,
    },
    lieu: 'Annecy',
    date: '2027-03-02',
  };
}
