import {
  ETATS,
  Inventaire,
  LIBELLES_ETAT,
  LIMITES,
  Objet,
  ajouterCollection,
  enregistrerObjet,
  inventaireVide,
  normaliser,
  rechercher,
  renommerCollection,
  restaurerInventaire,
  restaurerPhoto,
  supprimerCollection,
  supprimerObjet,
  total,
  totalParCollection,
} from './inventaire';

function objet(p: Partial<Objet> = {}): Objet {
  return {
    id: 'o1',
    collection: 'vinyles',
    nom: 'Abbey Road',
    etat: 'tres-bon',
    valeur: 45.5,
    dateAchat: '2019-05-12',
    note: 'Pressage français 1969',
    photo: false,
    ...p,
  };
}

function exemple(): Inventaire {
  let inv = ajouterCollection(inventaireVide(), 'vinyles', 'Vinyles');
  inv = ajouterCollection(inv, 'lego', 'Lego');
  inv = enregistrerObjet(inv, objet());
  inv = enregistrerObjet(inv, objet({ id: 'o2', nom: 'Écran géant', valeur: 12.25, note: '' }));
  inv = enregistrerObjet(
    inv,
    objet({
      id: 'o3',
      collection: 'lego',
      nom: 'Faucon Millenium 75192',
      note: '',
      valeur: 650,
      etat: 'neuf',
    }),
  );
  return inv;
}

describe('collections et objets', () => {
  it('ajoute, renomme et refuse un nom vide', () => {
    let inv = ajouterCollection(inventaireVide(), 'a', '  Timbres  ');
    expect(inv.collections).toEqual([{ id: 'a', nom: 'Timbres' }]);
    expect(ajouterCollection(inv, 'b', '   ')).toBe(inv);
    inv = renommerCollection(inv, 'a', 'Timbres de France');
    expect(inv.collections[0].nom).toBe('Timbres de France');
  });

  it('remplace un objet modifié sans le dupliquer', () => {
    const inv = enregistrerObjet(exemple(), objet({ valeur: 60 }));
    expect(inv.objets.filter((o) => o.id === 'o1')).toEqual([objet({ valeur: 60 })]);
    expect(inv.objets).toHaveLength(3);
  });

  it('refuse un objet sans collection existante', () => {
    const inv = exemple();
    expect(enregistrerObjet(inv, objet({ id: 'x', collection: 'inconnue' }))).toBe(inv);
  });

  it('supprime une collection avec ses objets, et les renvoie pour effacer leurs photos', () => {
    const [inv, retires] = supprimerCollection(exemple(), 'vinyles');
    expect(inv.collections.map((c) => c.id)).toEqual(['lego']);
    expect(inv.objets.map((o) => o.id)).toEqual(['o3']);
    expect(retires.map((o) => o.id)).toEqual(['o1', 'o2']);
    expect(supprimerObjet(exemple(), 'o2').objets.map((o) => o.id)).toEqual(['o1', 'o3']);
  });
});

describe('recherche', () => {
  it('ignore la casse et les accents, et exige chaque mot', () => {
    const objets = exemple().objets;
    expect(rechercher(objets, 'ecran').map((o) => o.id)).toEqual(['o2']);
    expect(rechercher(objets, 'FAUCON 75192').map((o) => o.id)).toEqual(['o3']);
    expect(rechercher(objets, 'faucon abbey')).toEqual([]);
    expect(rechercher(objets, '  ')).toHaveLength(3);
    expect(rechercher(objets, 'pressage').map((o) => o.id)).toEqual(['o1']);
  });

  it('trouve chaque état par son libellé', () => {
    for (const etat of ETATS) {
      const o = objet({ etat });
      expect(rechercher([o], LIBELLES_ETAT[etat]), etat).toEqual([o]);
    }
    expect(normaliser(' Écran Été ')).toBe('ecran ete');
  });
});

describe('totaux', () => {
  it('compte les objets et additionne les valeurs en centimes', () => {
    expect(total(exemple().objets)).toEqual({ nombre: 3, valeur: 70775 });
    const parCollection = totalParCollection(exemple());
    expect(parCollection.get('vinyles')).toEqual({ nombre: 2, valeur: 5775 });
    expect(parCollection.get('lego')).toEqual({ nombre: 1, valeur: 65000 });
  });
});

describe('relecture', () => {
  it('retrouve à l’identique un inventaire enregistré, chaque état compris', () => {
    let inv = ajouterCollection(inventaireVide(), 'c', 'Cartes');
    ETATS.forEach(
      (etat, i) =>
        (inv = enregistrerObjet(
          inv,
          objet({ id: `o${i}`, collection: 'c', etat, photo: i % 2 === 0 }),
        )),
    );
    expect(restaurerInventaire(JSON.parse(JSON.stringify(inv)))).toEqual(inv);
  });

  it('refuse proprement ce qui n’est pas un inventaire', () => {
    for (const brut of [null, 1, 'x', []]) expect(restaurerInventaire(brut)).toBeNull();
  });

  it('écarte les objets orphelins, en double ou sans nom, et borne le reste', () => {
    const inv = restaurerInventaire({
      collections: [
        { id: 'c', nom: 'Cartes' },
        { id: 'c', nom: 'Doublon' },
        { id: '../x', nom: 'Piège' },
      ],
      objets: [
        { id: 'a', collection: 'c', nom: 'Pikachu', etat: 'pirate', valeur: -5, dateAchat: 'hier' },
        { id: 'a', collection: 'c', nom: 'Doublon' },
        { id: 'b', collection: 'absente', nom: 'Orphelin' },
        { id: 'c2', collection: 'c', nom: '  ' },
        { id: 'd', collection: 'c', nom: 'x'.repeat(500), valeur: 1e12 },
      ],
    });
    expect(inv?.collections).toEqual([{ id: 'c', nom: 'Cartes' }]);
    expect(inv?.objets.map((o) => o.id)).toEqual(['a', 'd']);
    expect(inv?.objets[0]).toMatchObject({
      etat: 'bon',
      valeur: 0,
      dateAchat: '',
      photo: false,
      note: '',
    });
    expect(inv?.objets[1].nom.length).toBe(LIMITES.nom);
    expect(inv?.objets[1].valeur).toBe(LIMITES.valeur);
  });

  it('n’accepte comme photo qu’une image en data: URL de taille raisonnable', () => {
    const jpeg = 'data:image/jpeg;base64,/9j/4AAQ';
    expect(restaurerPhoto(jpeg)).toBe(jpeg);
    for (const brut of [
      42,
      'data:image/svg+xml;base64,PHN2Zz4=',
      'https://x.fr/a.jpg',
      `data:image/jpeg;base64,${'A'.repeat(400_000)}`,
    ]) {
      expect(restaurerPhoto(brut)).toBeNull();
    }
  });
});
