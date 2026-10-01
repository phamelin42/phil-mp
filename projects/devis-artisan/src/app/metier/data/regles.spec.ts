import { Devis, REGIMES_TVA, STATUTS, TYPES_CLIENT } from './devis';
import { devisExemple } from './exemple';
import { REGLES, champsManquants, erreur, estComplet } from './regles';

describe('règles de complétude', () => {
  it('un devis complet n’a rien qui manque', () => {
    expect(champsManquants(devisExemple())).toEqual([]);
    expect(estComplet(devisExemple())).toBe(true);
  });

  it('chaque règle a un libellé et un message', () => {
    for (const r of REGLES) {
      expect(r.libelle.length, r.champ).toBeGreaterThan(0);
      expect(r.message.length, r.champ).toBeGreaterThan(0);
    }
  });

  it('demande ce que chaque statut, régime et type de client exige', () => {
    for (const statut of STATUTS) {
      for (const regimeTva of REGIMES_TVA) {
        for (const type of TYPES_CLIENT) {
          const base = devisExemple();
          const d: Devis = {
            ...base,
            regimeTva,
            entreprise: { ...base.entreprise, statut },
            client: { ...base.client, type },
            mediateur: '',
          };
          const manquants = champsManquants(d).map((r) => r.champ);
          const attendus = [
            ...(statut === 'societe'
              ? ['entreprise.formeJuridique', 'entreprise.capital', 'entreprise.immatriculation']
              : []),
            ...(regimeTva === 'assujetti' ? ['entreprise.tvaIntra'] : []),
            ...(type === 'particulier' ? ['mediateur'] : []),
          ];
          expect(manquants, `${statut} · ${regimeTva} · ${type}`).toEqual(attendus);
        }
      }
    }
  });

  it('refuse un SIRET qui n’a pas 14 chiffres', () => {
    const d = devisExemple();
    for (const siret of ['', '123', '1234567890123A', '123 456 789 000123']) {
      expect(
        erreur('entreprise.siret', { ...d, entreprise: { ...d.entreprise, siret } }),
      ).not.toBeNull();
    }
    expect(erreur('entreprise.siret', d)).toBeNull();
  });

  it('refuse une ligne sans désignation ou sans quantité, et un devis sans ligne', () => {
    const d = devisExemple();
    const ligne = d.lignes[0];
    for (const lignes of [
      [],
      [{ ...ligne, designation: ' ' }],
      [ligne, { ...ligne, quantite: 0 }],
    ]) {
      expect(erreur('lignes', { ...d, lignes })).not.toBeNull();
    }
  });
});
