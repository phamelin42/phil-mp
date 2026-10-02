import { Inventaire, LIBELLES_ETAT, centimes } from './inventaire';

/**
 * Exports de l'inventaire. Le PDF passe par l'impression du navigateur
 * (`print.css`) ; le CSV s'ouvre dans Excel, LibreOffice ou Numbers réglés
 * en français.
 */
export const FORMATS_EXPORT = ['pdf', 'csv'] as const;
export type FormatExport = (typeof FORMATS_EXPORT)[number];

export const CONSIGNES: Record<FormatExport, string> = {
  pdf: 'Dans la fenêtre qui s’ouvre, choisissez « Enregistrer au format PDF » comme imprimante.',
  csv: 'Le fichier s’ouvre dans Excel, LibreOffice ou Numbers.',
};

const ENTETES = ['Collection', 'Objet', 'État', 'Valeur estimée (€)', 'Date d’achat', 'Note'];

/**
 * Une cellule CSV : entre guillemets si besoin, guillemets doublés. Une
 * cellule qui commence par = + - @ serait lue comme une formule par un
 * tableur : on la préfixe d'une apostrophe.
 */
export function cellule(valeur: string): string {
  const sure = /^[=+\-@\t\r]/.test(valeur) ? `'${valeur}` : valeur;
  return /[";\r\n]/.test(sure) ? `"${sure.replace(/"/g, '""')}"` : sure;
}

/** 1234,5 → « 1234,50 » : décimale à virgule, sans séparateur de milliers. */
export function montantCsv(euros: number): string {
  return (centimes(euros) / 100).toFixed(2).replace('.', ',');
}

/** AAAA-MM-JJ → JJ/MM/AAAA. */
export function dateCsv(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/**
 * Tout l'inventaire en CSV : point-virgule, fins de ligne CRLF, précédé de
 * l'indicateur d'ordre des octets pour qu'Excel lise l'UTF-8.
 */
export function versCsv(inv: Inventaire): string {
  const noms = new Map(inv.collections.map((c) => [c.id, c.nom]));
  const lignes = [ENTETES.map(cellule).join(';')];
  for (const c of inv.collections) {
    for (const o of inv.objets.filter((x) => x.collection === c.id)) {
      lignes.push(
        [
          noms.get(o.collection) ?? '',
          o.nom,
          LIBELLES_ETAT[o.etat],
          montantCsv(o.valeur),
          dateCsv(o.dateAchat),
          o.note,
        ]
          .map(cellule)
          .join(';'),
      );
    }
  }
  return `\ufeff${lignes.join('\r\n')}\r\n`;
}

/** Nom de fichier sans extension : « Inventaire 2026-10-02 ». */
export function nomDeFichier(aujourdhui: string): string {
  return `Inventaire ${aujourdhui}`;
}
