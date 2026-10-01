/**
 * Le devis : modèle, valeurs par défaut et relecture d'une copie enregistrée.
 * Fonctions pures, sans Angular.
 */

export const STATUTS = ['micro-entrepreneur', 'entreprise-individuelle', 'societe'] as const;
export type Statut = (typeof STATUTS)[number];

export const REGIMES_TVA = ['franchise', 'assujetti'] as const;
export type RegimeTva = (typeof REGIMES_TVA)[number];

/** Taux de TVA des travaux : normal, rénovation, amélioration énergétique. */
export const TAUX_TVA = ['20', '10', '5.5'] as const;
export type TauxTva = (typeof TAUX_TVA)[number];

export const TYPES_CLIENT = ['particulier', 'professionnel'] as const;
export type TypeClient = (typeof TYPES_CLIENT)[number];

export interface Ligne {
  designation: string;
  quantite: number;
  unite: string;
  /** Prix unitaire hors taxes, en euros. */
  prixUnitaire: number;
  tauxTva: TauxTva;
}

export interface Entreprise {
  nom: string;
  statut: Statut;
  /** Société seulement : SARL, SAS, EURL… */
  formeJuridique: string;
  /** Société seulement : capital social, en euros, tel que saisi. */
  capital: string;
  adresse: string;
  siret: string;
  /** RNE ou répertoire des métiers ; RCS et ville pour une société. */
  immatriculation: string;
  tvaIntra: string;
  telephone: string;
  email: string;
  assureur: string;
  zoneAssurance: string;
}

export interface Client {
  type: TypeClient;
  nom: string;
  adresse: string;
  /** Vide : le chantier est à l'adresse du client. */
  adresseChantier: string;
}

export interface Devis {
  entreprise: Entreprise;
  client: Client;
  numero: string;
  /** AAAA-MM-JJ. */
  date: string;
  validiteJours: number;
  debutTravaux: string;
  dureeTravaux: string;
  regimeTva: RegimeTva;
  lignes: Ligne[];
  acomptePct: number;
  paiement: string;
  deplacement: string;
  mediateur: string;
  /** Logo en `data:` URL, lu sur l'appareil ; vide sans logo. */
  logo: string;
}

export const LIMITES = {
  texte: 2000,
  lignes: 100,
  /** Un logo de 500 Ko donne environ 680 000 caractères en base 64. */
  logo: 700_000,
} as const;

export function ligneVide(): Ligne {
  return { designation: '', quantite: 1, unite: 'u', prixUnitaire: 0, tauxTva: '20' };
}

export function devisVide(): Devis {
  return {
    entreprise: {
      nom: '',
      statut: 'micro-entrepreneur',
      formeJuridique: '',
      capital: '',
      adresse: '',
      siret: '',
      immatriculation: '',
      tvaIntra: '',
      telephone: '',
      email: '',
      assureur: '',
      zoneAssurance: '',
    },
    client: { type: 'particulier', nom: '', adresse: '', adresseChantier: '' },
    numero: '',
    date: '',
    validiteJours: 30,
    debutTravaux: '',
    dureeTravaux: '',
    regimeTva: 'franchise',
    lignes: [ligneVide()],
    acomptePct: 30,
    paiement: '',
    deplacement: '',
    mediateur: '',
    logo: '',
  };
}

/** Numéro proposé pour un devis du jour : D-AAAAMMJJ-01. */
export function numeroParDefaut(date: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? `D-${date.replaceAll('-', '')}-01` : '';
}

/** Date du jour au format AAAA-MM-JJ, dans le fuseau de l'appareil. */
export function dateDuJour(maintenant: Date): string {
  const mois = String(maintenant.getMonth() + 1).padStart(2, '0');
  const jour = String(maintenant.getDate()).padStart(2, '0');
  return `${maintenant.getFullYear()}-${mois}-${jour}`;
}

const LOGO_ACCEPTE = /^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/;

function objet(v: unknown): Record<string, unknown> | null {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function texte(v: unknown, defaut: string): string {
  return typeof v === 'string' ? v.slice(0, LIMITES.texte) : defaut;
}

function nombre(v: unknown, defaut: number, min: number, max: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : defaut;
}

function parmi<T extends string>(liste: readonly T[], v: unknown, defaut: T): T {
  return liste.includes(v as T) ? (v as T) : defaut;
}

function relireLigne(v: unknown): Ligne | null {
  const l = objet(v);
  if (!l) return null;
  const d = ligneVide();
  return {
    designation: texte(l['designation'], d.designation),
    quantite: nombre(l['quantite'], d.quantite, 0, 1_000_000),
    unite: texte(l['unite'], d.unite).slice(0, 20),
    prixUnitaire: nombre(l['prixUnitaire'], d.prixUnitaire, 0, 10_000_000),
    tauxTva: parmi(TAUX_TVA, l['tauxTva'], d.tauxTva),
  };
}

/**
 * Relit une copie enregistrée (IndexedDB) : tout champ absent, d'un mauvais
 * type ou hors bornes reprend sa valeur par défaut. Autre chose qu'un objet →
 * `null`. Ne lève jamais d'exception.
 */
export function restaurerDevis(brut: unknown): Devis | null {
  const v = objet(brut);
  if (!v) return null;
  const d = devisVide();
  const e = objet(v['entreprise']) ?? {};
  const c = objet(v['client']) ?? {};
  const lignes = Array.isArray(v['lignes'])
    ? v['lignes']
        .slice(0, LIMITES.lignes)
        .map(relireLigne)
        .filter((l): l is Ligne => l !== null)
    : d.lignes;
  const logo = v['logo'];
  return {
    entreprise: {
      nom: texte(e['nom'], ''),
      statut: parmi(STATUTS, e['statut'], d.entreprise.statut),
      formeJuridique: texte(e['formeJuridique'], ''),
      capital: texte(e['capital'], ''),
      adresse: texte(e['adresse'], ''),
      siret: texte(e['siret'], ''),
      immatriculation: texte(e['immatriculation'], ''),
      tvaIntra: texte(e['tvaIntra'], ''),
      telephone: texte(e['telephone'], ''),
      email: texte(e['email'], ''),
      assureur: texte(e['assureur'], ''),
      zoneAssurance: texte(e['zoneAssurance'], ''),
    },
    client: {
      type: parmi(TYPES_CLIENT, c['type'], d.client.type),
      nom: texte(c['nom'], ''),
      adresse: texte(c['adresse'], ''),
      adresseChantier: texte(c['adresseChantier'], ''),
    },
    numero: texte(v['numero'], ''),
    date: typeof v['date'] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v['date']) ? v['date'] : '',
    validiteJours: Math.round(nombre(v['validiteJours'], d.validiteJours, 1, 365)),
    debutTravaux: texte(v['debutTravaux'], ''),
    dureeTravaux: texte(v['dureeTravaux'], ''),
    regimeTva: parmi(REGIMES_TVA, v['regimeTva'], d.regimeTva),
    lignes: lignes.length ? lignes : d.lignes,
    acomptePct: nombre(v['acomptePct'], d.acomptePct, 0, 100),
    paiement: texte(v['paiement'], ''),
    deplacement: texte(v['deplacement'], ''),
    mediateur: texte(v['mediateur'], ''),
    logo:
      typeof logo === 'string' && logo.length <= LIMITES.logo && LOGO_ACCEPTE.test(logo)
        ? logo
        : '',
  };
}

/** Le devis diffère-t-il d'un devis vide (hors date et numéro proposés) ? */
export function estEntame(devis: Devis): boolean {
  const vide = { ...devisVide(), date: devis.date, numero: devis.numero };
  return JSON.stringify(devis) !== JSON.stringify(vide);
}

/**
 * Nouveau devis à partir du précédent : l'entreprise, son logo, son régime de
 * TVA et ses conditions restent ; le client et les prestations repartent de
 * zéro. Le numéro proposé ne reprend jamais celui du devis précédent.
 */
export function devisSuivant(precedent: Devis, aujourdhui: string): Devis {
  const vide = devisVide();
  // Même jour que le précédent : D-AAAAMMJJ-01 devient D-AAAAMMJJ-02.
  const prefixe = numeroParDefaut(aujourdhui).slice(0, -2);
  const meme = new RegExp(`^${prefixe}(\\d+)$`).exec(precedent.numero.trim());
  const rang = meme ? Number(meme[1]) + 1 : 1;
  const numero = prefixe ? `${prefixe}${String(rang).padStart(2, '0')}` : '';
  return {
    ...vide,
    entreprise: { ...precedent.entreprise },
    logo: precedent.logo,
    regimeTva: precedent.regimeTva,
    validiteJours: precedent.validiteJours,
    acomptePct: precedent.acomptePct,
    paiement: precedent.paiement,
    deplacement: precedent.deplacement,
    mediateur: precedent.mediateur,
    date: aujourdhui,
    numero,
  };
}
