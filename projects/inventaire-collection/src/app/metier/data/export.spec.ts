import {
  CONSIGNES,
  FORMATS_EXPORT,
  cellule,
  dateCsv,
  montantCsv,
  nomDeFichier,
  versCsv,
} from './export';
import {
  ETATS,
  LIBELLES_ETAT,
  ajouterCollection,
  enregistrerObjet,
  inventaireVide,
} from './inventaire';

describe('exports', () => {
  it('chaque format a sa consigne', () => {
    for (const format of FORMATS_EXPORT)
      expect(CONSIGNES[format].length, format).toBeGreaterThan(0);
    expect(nomDeFichier('2026-10-02')).toBe('Inventaire 2026-10-02');
  });

  it('protège les cellules : guillemets, point-virgule, saut de ligne, formule', () => {
    expect(cellule('simple')).toBe('simple');
    expect(cellule('a;b')).toBe('"a;b"');
    expect(cellule('dit "rare"')).toBe('"dit ""rare"""');
    expect(cellule('ligne1\nligne2')).toBe('"ligne1\nligne2"');
    for (const piege of ['=SOMME(A1)', '+33 6', '-1', '@cmd'])
      expect(cellule(piege).startsWith("'"), piege).toBe(true);
  });

  it('écrit montants et dates à la française', () => {
    expect(montantCsv(1234.5)).toBe('1234,50');
    expect(montantCsv(0.1 + 0.2)).toBe('0,30');
    expect(dateCsv('2019-05-12')).toBe('12/05/2019');
    expect(dateCsv('')).toBe('');
  });

  it('écrit une ligne par objet, chaque état en toutes lettres, lisible par Excel', () => {
    let inv = ajouterCollection(inventaireVide(), 'c', 'Cartes');
    ETATS.forEach((etat, i) => {
      inv = enregistrerObjet(inv, {
        id: `o${i}`,
        collection: 'c',
        nom: `Carte ${i}`,
        etat,
        valeur: i,
        dateAchat: '',
        note: '',
        photo: false,
      });
    });
    const csv = versCsv(inv);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lignes = csv.slice(1).split('\r\n');
    expect(lignes[0]).toBe('Collection;Objet;État;Valeur estimée (€);Date d’achat;Note');
    expect(lignes.at(-1)).toBe('');
    ETATS.forEach((etat, i) =>
      expect(lignes[i + 1], etat).toBe(`Cartes;Carte ${i};${LIBELLES_ETAT[etat]};${i},00;;`),
    );
  });
});
