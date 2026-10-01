import { Devis, devisVide } from './devis';

/** Un devis complet de plombier micro-entrepreneur, pour les tests. */
export function devisExemple(): Devis {
  const d = devisVide();
  return {
    ...d,
    entreprise: {
      ...d.entreprise,
      nom: 'Paul Martin Plomberie',
      adresse: '12 rue des Lilas\n69003 Lyon',
      siret: '123 456 789 00012',
      assureur: 'Mutuelle du Bâtiment, contrat 42-1234',
      zoneAssurance: 'France métropolitaine',
    },
    client: {
      type: 'particulier',
      nom: 'Mme Durand',
      adresse: '4 place Bellecour, 69002 Lyon',
      adresseChantier: '',
    },
    numero: 'D-2026-001',
    date: '2026-10-01',
    debutTravaux: 'semaine du 12 octobre',
    dureeTravaux: '2 jours',
    lignes: [
      {
        designation: 'Remplacement chauffe-eau 200 L',
        quantite: 1,
        unite: 'u',
        prixUnitaire: 890,
        tauxTva: '20',
      },
      { designation: 'Main-d’œuvre', quantite: 6, unite: 'h', prixUnitaire: 45, tauxTva: '20' },
    ],
    paiement: 'solde à la fin des travaux, par virement',
    mediateur: 'CM2C, 14 rue Saint-Jean, 75017 Paris, www.cm2c.net',
  };
}
