import { totaux } from './calculs';
import { Devis, REGIMES_TVA, STATUTS, TAUX_TVA, TYPES_CLIENT } from './devis';
import { devisExemple } from './exemple';
import {
  MENTION_FRANCHISE,
  MENTION_PENALITES,
  MENTION_TAUX_REDUIT,
  identite,
  mentions,
} from './mentions';

function variante(
  statut: Devis['entreprise']['statut'],
  regimeTva: Devis['regimeTva'],
  type: Devis['client']['type'],
): Devis {
  const d = devisExemple();
  return {
    ...d,
    regimeTva,
    entreprise: {
      ...d.entreprise,
      statut,
      formeJuridique: 'SARL',
      capital: '5 000',
      immatriculation: 'Lyon 123 456 789',
      tvaIntra: 'FR12123456789',
    },
    client: { ...d.client, type },
  };
}

describe('mentions du devis', () => {
  it('porte les mentions de chaque statut, régime et type de client', () => {
    for (const statut of STATUTS) {
      for (const regimeTva of REGIMES_TVA) {
        for (const type of TYPES_CLIENT) {
          const d = variante(statut, regimeTva, type);
          const cas = `${statut} · ${regimeTva} · ${type}`;
          const tete = identite(d);
          const bas = mentions(d, totaux(d));

          if (statut === 'societe') {
            expect(tete, cas).toContain('SARL au capital de 5 000\u00a0€');
            expect(tete, cas).toContain('RCS Lyon 123 456 789');
          } else {
            expect(tete[0], cas).toBe('Paul Martin Plomberie EI');
            expect(tete.join(' '), cas).not.toContain('capital');
          }
          expect(tete, cas).toContain('SIRET\u00a0: 123 456 789 00012');
          expect(tete.includes('TVA intracommunautaire\u00a0: FR12123456789'), cas).toBe(
            regimeTva === 'assujetti',
          );
          expect(bas.includes(MENTION_FRANCHISE), cas).toBe(regimeTva === 'franchise');
          expect(bas.includes(MENTION_PENALITES), cas).toBe(type === 'professionnel');
          expect(
            bas.some((m) => m.includes('médiateur de la consommation')),
            cas,
          ).toBe(type === 'particulier');
          expect(
            bas.some((m) => m.startsWith('Assurance décennale')),
            cas,
          ).toBe(true);
        }
      }
    }
  });

  it('signale le taux réduit seulement quand une ligne en relève', () => {
    for (const tauxTva of TAUX_TVA) {
      const base = variante('micro-entrepreneur', 'assujetti', 'particulier');
      const d = { ...base, lignes: base.lignes.map((l) => ({ ...l, tauxTva })) };
      expect(mentions(d, totaux(d)).includes(MENTION_TAUX_REDUIT), tauxTva).toBe(tauxTva !== '20');
    }
  });

  it('date la fin de validité et chiffre l’acompte', () => {
    const d = { ...devisExemple(), acomptePct: 30 };
    const bas = mentions(d, totaux(d));
    expect(bas).toContain('Devis valable 30\u00a0jours, jusqu’au 31\u00a0octobre 2026.');
    expect(bas).toContain('Acompte de 30\u00a0% à la signature\u00a0: 348,00\u00a0€.');
  });

  it('laisse un repère à compléter plutôt qu’une phrase tronquée', () => {
    const d = { ...devisExemple(), debutTravaux: '', paiement: ' ' };
    const bas = mentions(d, totaux(d));
    expect(bas).toContain('Début des travaux\u00a0: [à compléter]. Durée estimée\u00a0: 2 jours.');
    expect(bas).toContain('Conditions de paiement\u00a0: [à compléter].');
  });
});
