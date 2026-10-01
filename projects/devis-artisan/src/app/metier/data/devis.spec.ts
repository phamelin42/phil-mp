import {
  LIMITES,
  REGIMES_TVA,
  STATUTS,
  TAUX_TVA,
  TYPES_CLIENT,
  dateDuJour,
  devisSuivant,
  devisVide,
  estEntame,
  numeroParDefaut,
  restaurerDevis,
} from './devis';
import { devisExemple } from './exemple';

describe('restaurerDevis', () => {
  it('retrouve à l’identique un devis enregistré', () => {
    const d = devisExemple();
    expect(restaurerDevis(JSON.parse(JSON.stringify(d)))).toEqual(d);
  });

  it('refuse proprement ce qui n’est pas un devis', () => {
    for (const brut of [null, undefined, 42, 'texte', [], true]) {
      expect(restaurerDevis(brut)).toBeNull();
    }
  });

  it('reprend les valeurs par défaut des champs absents ou faussés', () => {
    const d = restaurerDevis({
      entreprise: { nom: 7, statut: 'pirate' },
      validiteJours: Infinity,
      lignes: 'x',
    });
    expect(d).toEqual({ ...devisVide(), entreprise: { ...devisVide().entreprise } });
  });

  it('garde chaque valeur énumérée valide', () => {
    for (const statut of STATUTS) {
      expect(restaurerDevis({ entreprise: { statut } })?.entreprise.statut).toBe(statut);
    }
    for (const regimeTva of REGIMES_TVA) {
      expect(restaurerDevis({ regimeTva })?.regimeTva).toBe(regimeTva);
    }
    for (const type of TYPES_CLIENT) {
      expect(restaurerDevis({ client: { type } })?.client.type).toBe(type);
    }
    for (const tauxTva of TAUX_TVA) {
      expect(restaurerDevis({ lignes: [{ tauxTva }] })?.lignes[0].tauxTva).toBe(tauxTva);
    }
  });

  it('borne la taille de ce qu’il relit', () => {
    const d = restaurerDevis({
      numero: 'x'.repeat(LIMITES.texte + 500),
      lignes: Array.from({ length: LIMITES.lignes + 50 }, () => ({
        designation: 'a',
        quantite: 1,
      })),
      acomptePct: 250,
      validiteJours: -3,
    });
    expect(d?.numero.length).toBe(LIMITES.texte);
    expect(d?.lignes.length).toBe(LIMITES.lignes);
    expect(d?.acomptePct).toBe(100);
    expect(d?.validiteJours).toBe(1);
  });

  it('n’accepte comme logo qu’une image en data: URL de taille raisonnable', () => {
    const png = 'data:image/png;base64,iVBORw0KGgo=';
    expect(restaurerDevis({ logo: png })?.logo).toBe(png);
    for (const logo of [
      'https://exemple.fr/logo.png',
      'data:text/html;base64,PHNjcmlwdD4=',
      `data:image/png;base64,${'A'.repeat(LIMITES.logo)}`,
    ]) {
      expect(restaurerDevis({ logo })?.logo).toBe('');
    }
  });
});

describe('numéro et date proposés', () => {
  it('propose un numéro tiré de la date', () => {
    expect(numeroParDefaut('2026-10-01')).toBe('D-20261001-01');
    expect(numeroParDefaut('')).toBe('');
  });

  it('écrit la date du jour au format AAAA-MM-JJ', () => {
    expect(dateDuJour(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('estEntame', () => {
  it('ne compte pas la date et le numéro proposés comme une saisie', () => {
    expect(estEntame({ ...devisVide(), date: '2026-10-01', numero: 'D-20261001-01' })).toBe(false);
    expect(estEntame({ ...devisVide(), client: { ...devisVide().client, nom: 'A' } })).toBe(true);
  });
});

describe('devisSuivant', () => {
  it('garde l’entreprise et ses conditions, vide le client et les prestations', () => {
    const precedent = {
      ...devisExemple(),
      logo: 'data:image/png;base64,AAAA',
      regimeTva: 'assujetti' as const,
    };
    const d = devisSuivant(precedent, '2026-10-02');
    expect(d.entreprise).toEqual(precedent.entreprise);
    expect(d).toMatchObject({
      logo: precedent.logo,
      regimeTva: 'assujetti',
      paiement: precedent.paiement,
      mediateur: precedent.mediateur,
    });
    expect(d.client).toEqual(devisVide().client);
    expect(d.lignes).toEqual(devisVide().lignes);
    expect(d.date).toBe('2026-10-02');
  });

  it('ne repropose jamais le numéro du devis précédent', () => {
    const cas: [string, string][] = [
      ['D-2026-001', 'D-20261002-01'],
      ['D-20261002-01', 'D-20261002-02'],
      ['D-20261002-09', 'D-20261002-10'],
      ['D-20261001-03', 'D-20261002-01'],
    ];
    for (const [avant, apres] of cas) {
      expect(devisSuivant({ ...devisExemple(), numero: avant }, '2026-10-02').numero, avant).toBe(
        apres,
      );
    }
  });
});
