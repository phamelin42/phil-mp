import { Resultat } from './calculs';
import { Fiche } from './fiche';
import { duree, nombre, pourcentage } from './format';

/**
 * Exports de la fiche de prix. Le PDF passe par l'impression du navigateur
 * (`print.css`) ; le CSV s'ouvre dans Excel, LibreOffice ou Numbers réglés
 * en français.
 */
export const FORMATS_EXPORT = ['pdf', 'csv'] as const;
export type FormatExport = (typeof FORMATS_EXPORT)[number];

export const CONSIGNES: Record<FormatExport, string> = {
  pdf: 'Dans la fenêtre qui s’ouvre, choisissez « Enregistrer au format PDF » comme imprimante.',
  csv: 'Le détail du calcul s’ouvre dans Excel, LibreOffice ou Numbers.',
};

/**
 * Une cellule CSV : entre guillemets si besoin, guillemets doublés. Une
 * cellule qui commence par = + - @ serait lue comme une formule par un
 * tableur : on la préfixe d'une apostrophe.
 */
export function cellule(valeur: string): string {
  const sure = /^[=+\-@\t\r]/.test(valeur) ? `'${valeur}` : valeur;
  return /[";\r\n]/.test(sure) ? `"${sure.replace(/"/g, '""')}"` : sure;
}

/** 123456 centimes → « 1234,56 » : décimale à virgule, sans séparateur de milliers. */
export function montantCsv(centimes: number): string {
  return (centimes / 100).toFixed(2).replace('.', ',');
}

function quantite(q: number, unite: string): string {
  return `${nombre(q)} ${unite.trim()}`.trim();
}

/** Lignes du détail du calcul : poste, précision, montant en centimes. */
export function detail(fiche: Fiche, r: Resultat): [string, string, number][] {
  const assujetti = fiche.regimeTva === 'assujetti';
  const lignes: [string, string, number][] = fiche.matieres.map((m, i) => [
    m.nom.trim() || `Matière ${i + 1}`,
    `${quantite(m.quantiteUtilisee, m.unite)} sur ${quantite(m.quantiteAchetee, m.unite)} achetés`,
    r.matieres[i] ?? 0,
  ]);
  lignes.push(
    ['Total matières', '', r.totalMatieres],
    [
      'Temps de travail',
      `${duree(fiche.minutes)} à ${nombre(fiche.tauxHoraire)} € de l’heure`,
      r.mainOeuvre,
    ],
    ['Frais par pièce', 'Emballage, étiquette, outillage', r.frais],
    ['Coût de revient', '', r.coutRevient],
    ['Bénéfice', `${pourcentage(fiche.margePct)} du coût de revient`, r.benefice],
    [
      'Prix de gros HT',
      `Cotisations de ${pourcentage(fiche.cotisationsPct)} comprises`,
      r.prixGrosHt,
    ],
    [
      assujetti ? 'Prix de détail TTC' : 'Prix de détail',
      r.detailReleve
        ? 'Relevé au minimum de la vente directe'
        : `Prix de gros × ${nombre(fiche.coefficientDetail)}`,
      assujetti ? r.prixDetailTtc : r.prixDetailHt,
    ],
    ['Prix d’étiquette', 'Arrondi à l’euro supérieur', r.prixEtiquette],
  );
  return lignes;
}

/**
 * La fiche en CSV : point-virgule, fins de ligne CRLF, précédé de
 * l'indicateur d'ordre des octets pour qu'Excel lise l'UTF-8.
 */
export function versCsv(fiche: Fiche, r: Resultat): string {
  const lignes = [['Poste', 'Détail', 'Montant (€)'].map(cellule).join(';')];
  for (const [poste, precision, montant] of detail(fiche, r)) {
    lignes.push([poste, precision, montantCsv(montant)].map(cellule).join(';'));
  }
  return `\ufeff${lignes.join('\r\n')}\r\n`;
}

/** Caractères refusés dans un nom de fichier sous Windows, macOS ou Android. */
const INTERDITS = /[\\/:*?"<>|]/g;
/** Sauts de ligne, tabulations et autres caractères de contrôle. */
const CONTROLE = /\p{Cc}/gu;

/** Nom de fichier sans extension : « Prix Collier perles de verre ». */
export function nomDeFichier(fiche: Fiche): string {
  const nom = fiche.nom
    .replace(CONTROLE, ' ')
    .replace(INTERDITS, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
  return nom ? `Prix ${nom}` : 'Prix de vente';
}
