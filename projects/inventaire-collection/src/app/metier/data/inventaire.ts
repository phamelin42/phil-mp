/**
 * L'inventaire : collections, objets, recherche et totaux. Fonctions pures,
 * sans Angular. Les photos ne sont pas ici : chacune est rangée à part dans
 * IndexedDB, sous `clePhoto(id)`, pour ne pas réécrire toutes les images à
 * chaque frappe.
 */

/** États normalisés, du meilleur au moins bon. */
export const ETATS = ['neuf', 'comme-neuf', 'tres-bon', 'bon', 'correct', 'abime'] as const;
export type Etat = (typeof ETATS)[number];

export const LIBELLES_ETAT: Record<Etat, string> = {
  neuf: 'Neuf, sous blister ou scellé',
  'comme-neuf': 'Comme neuf',
  'tres-bon': 'Très bon état',
  bon: 'Bon état',
  correct: 'État correct, traces d’usage',
  abime: 'Abîmé ou incomplet',
};

export interface Collection {
  id: string;
  nom: string;
}

export interface Objet {
  id: string;
  collection: string;
  nom: string;
  etat: Etat;
  /** Valeur estimée, en euros. */
  valeur: number;
  /** AAAA-MM-JJ, ou vide si inconnue. */
  dateAchat: string;
  note: string;
  /** Une photo est rangée sous `clePhoto(id)`. */
  photo: boolean;
}

export interface Inventaire {
  collections: Collection[];
  objets: Objet[];
}

export const LIMITES = {
  texte: 2000,
  nom: 200,
  collections: 100,
  objets: 5000,
  valeur: 100_000_000,
} as const;

export const CLE_INVENTAIRE = 'inventaire-collection.inventaire';
export const clePhoto = (id: string) => `inventaire-collection.photo.${id}`;

export function inventaireVide(): Inventaire {
  return { collections: [], objets: [] };
}

// --- Modifications --------------------------------------------------------

export function ajouterCollection(inv: Inventaire, id: string, nom: string): Inventaire {
  const propre = nom.trim().slice(0, LIMITES.nom);
  if (!propre || inv.collections.length >= LIMITES.collections) return inv;
  return { ...inv, collections: [...inv.collections, { id, nom: propre }] };
}

export function renommerCollection(inv: Inventaire, id: string, nom: string): Inventaire {
  const propre = nom.trim().slice(0, LIMITES.nom);
  if (!propre) return inv;
  return {
    ...inv,
    collections: inv.collections.map((c) => (c.id === id ? { ...c, nom: propre } : c)),
  };
}

/** Retire la collection et ses objets ; renvoie aussi les objets retirés (leurs photos sont à effacer). */
export function supprimerCollection(inv: Inventaire, id: string): [Inventaire, Objet[]] {
  const retires = inv.objets.filter((o) => o.collection === id);
  return [
    {
      collections: inv.collections.filter((c) => c.id !== id),
      objets: inv.objets.filter((o) => o.collection !== id),
    },
    retires,
  ];
}

/** Ajoute l'objet, ou le remplace s'il existe déjà (même id). */
export function enregistrerObjet(inv: Inventaire, objet: Objet): Inventaire {
  if (!inv.collections.some((c) => c.id === objet.collection)) return inv;
  const existe = inv.objets.some((o) => o.id === objet.id);
  if (!existe && inv.objets.length >= LIMITES.objets) return inv;
  return {
    ...inv,
    objets: existe
      ? inv.objets.map((o) => (o.id === objet.id ? objet : o))
      : [...inv.objets, objet],
  };
}

export function supprimerObjet(inv: Inventaire, id: string): Inventaire {
  return { ...inv, objets: inv.objets.filter((o) => o.id !== id) };
}

// --- Recherche et totaux ----------------------------------------------------

/** Minuscules sans accents : « Écran » et « ecran » se trouvent l'un l'autre. */
export function normaliser(texte: string): string {
  return texte.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

/** Objets dont le nom, la note ou l'état contiennent chaque mot cherché. */
export function rechercher(objets: readonly Objet[], texte: string): Objet[] {
  const mots = normaliser(texte).split(/\s+/).filter(Boolean);
  if (!mots.length) return [...objets];
  return objets.filter((o) => {
    const meule = normaliser(`${o.nom} ${o.note} ${LIBELLES_ETAT[o.etat]}`);
    return mots.every((m) => meule.includes(m));
  });
}

export interface Total {
  nombre: number;
  /** En centimes. */
  valeur: number;
}

export function centimes(euros: number): number {
  return Math.round(Number((euros * 100).toPrecision(12)));
}

export function total(objets: readonly Objet[]): Total {
  return {
    nombre: objets.length,
    valeur: objets.reduce((s, o) => s + centimes(o.valeur), 0),
  };
}

export function totalParCollection(inv: Inventaire): Map<string, Total> {
  return new Map(
    inv.collections.map((c) => [c.id, total(inv.objets.filter((o) => o.collection === c.id))]),
  );
}

// --- Relecture d'une copie enregistrée ------------------------------------

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function objet(v: unknown): Record<string, unknown> | null {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

const texte = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
const ident = (v: unknown) => (typeof v === 'string' && /^[\w-]{1,64}$/.test(v) ? v : null);

/**
 * Relit l'inventaire enregistré : chaque collection ou objet mal formé est
 * écarté, chaque champ faussé reprend une valeur sûre ; autre chose qu'un
 * objet → `null`. Ne lève jamais d'exception.
 */
export function restaurerInventaire(brut: unknown): Inventaire | null {
  const v = objet(brut);
  if (!v) return null;
  const collections: Collection[] = [];
  for (const c of Array.isArray(v['collections']) ? v['collections'] : []) {
    const o = objet(c);
    const id = ident(o?.['id']);
    const nom = texte(o?.['nom'], LIMITES.nom).trim();
    if (id && nom && !collections.some((x) => x.id === id)) collections.push({ id, nom });
    if (collections.length >= LIMITES.collections) break;
  }
  const ids = new Set(collections.map((c) => c.id));
  const objets: Objet[] = [];
  const vus = new Set<string>();
  for (const x of Array.isArray(v['objets']) ? v['objets'] : []) {
    const o = objet(x);
    const id = ident(o?.['id']);
    const collection = ident(o?.['collection']);
    const nom = texte(o?.['nom'], LIMITES.nom).trim();
    if (!o || !id || vus.has(id) || !collection || !ids.has(collection) || !nom) continue;
    const valeur = o['valeur'];
    const dateAchat = o['dateAchat'];
    vus.add(id);
    objets.push({
      id,
      collection,
      nom,
      etat: ETATS.includes(o['etat'] as Etat) ? (o['etat'] as Etat) : 'bon',
      valeur:
        typeof valeur === 'number' && Number.isFinite(valeur)
          ? Math.min(LIMITES.valeur, Math.max(0, valeur))
          : 0,
      dateAchat: typeof dateAchat === 'string' && DATE.test(dateAchat) ? dateAchat : '',
      note: texte(o['note'], LIMITES.texte),
      photo: o['photo'] === true,
    });
    if (objets.length >= LIMITES.objets) break;
  }
  return { collections, objets };
}

/** Une photo relue d'IndexedDB n'est acceptée qu'en image JPEG, PNG ou WebP de taille raisonnable. */
export const TAILLE_MAX_PHOTO = 400_000;
export function restaurerPhoto(brut: unknown): string | null {
  return typeof brut === 'string' &&
    brut.length <= TAILLE_MAX_PHOTO &&
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(brut)
    ? brut
    : null;
}
