import { Fiche } from './fiche';

/** Un collier vendu sur Etsy : la fiche des tests. */
export function ficheExemple(): Fiche {
  return {
    nom: 'Collier perles de verre',
    matieres: [
      {
        nom: 'Perles de verre',
        prixAchat: 12,
        quantiteAchetee: 100,
        quantiteUtilisee: 30,
        unite: 'u',
      },
      { nom: 'Fermoir', prixAchat: 5, quantiteAchetee: 10, quantiteUtilisee: 1, unite: 'u' },
      { nom: 'Fil câblé', prixAchat: 4, quantiteAchetee: 20, quantiteUtilisee: 0.5, unite: 'm' },
    ],
    minutes: 45,
    tauxHoraire: 15,
    fraisParPiece: 0.8,
    margePct: 10,
    coefficientDetail: 2,
    regimeTva: 'franchise',
    cotisationsPct: 12.3,
    commissionPct: 10.5,
    fraisParVente: 0.3,
  };
}
