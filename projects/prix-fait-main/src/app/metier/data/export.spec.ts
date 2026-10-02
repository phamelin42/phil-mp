import { calculer } from './calculs';
import { ficheExemple } from './exemple';
import { REGIMES_TVA } from './fiche';
import { CONSIGNES, FORMATS_EXPORT, cellule, detail, nomDeFichier, versCsv } from './export';

describe('export', () => {
  it('donne une consigne pour chaque format', () => {
    for (const f of FORMATS_EXPORT) expect(CONSIGNES[f]).toBeTruthy();
  });

  it('écrit un CSV lisible par un tableur français', () => {
    const fiche = ficheExemple();
    const csv = versCsv(fiche, calculer(fiche)!);
    expect(csv.startsWith('\ufeffPoste;Détail;Montant (€)\r\n')).toBe(true);
    expect(csv).toContain('Perles de verre;30 u sur 100 u achetés;3,60\r\n');
    expect(csv).toContain('Coût de revient;;16,25\r\n');
    expect(csv).toContain('Prix de gros HT;Cotisations de 12,3\u00a0% comprises;20,39\r\n');
    expect(csv).toContain('Prix de détail;Prix de gros × 2;40,78\r\n');
    expect(csv).toContain('Prix d’étiquette;Arrondi à l’euro supérieur;41,00\r\n');
    expect(csv.endsWith('\r\n')).toBe(true);
  });

  it('nomme le prix de détail TTC selon le régime de TVA', () => {
    for (const regimeTva of REGIMES_TVA) {
      const fiche = { ...ficheExemple(), regimeTva };
      const postes = detail(fiche, calculer(fiche)!).map(([p]) => p);
      expect(postes).toContain(regimeTva === 'assujetti' ? 'Prix de détail TTC' : 'Prix de détail');
    }
  });

  it('neutralise les formules et protège les séparateurs', () => {
    expect(cellule('=SOMME(A1)')).toBe("'=SOMME(A1)");
    expect(cellule('Perles; dorées')).toBe('"Perles; dorées"');
    expect(cellule('Fil "doré"')).toBe('"Fil ""doré"""');
  });

  it('nomme une matière sans nom par son rang', () => {
    const fiche = ficheExemple();
    fiche.matieres[1] = { ...fiche.matieres[1], nom: ' ' };
    expect(detail(fiche, calculer(fiche)!)[1][0]).toBe('Matière 2');
  });

  it('propose un nom de fichier sûr', () => {
    expect(nomDeFichier(ficheExemple())).toBe('Prix Collier perles de verre');
    expect(nomDeFichier({ ...ficheExemple(), nom: 'Bol 1/2 : bleu\n' })).toBe(
      'Prix Bol 1-2 - bleu',
    );
    expect(nomDeFichier({ ...ficheExemple(), nom: '  ' })).toBe('Prix de vente');
  });
});
