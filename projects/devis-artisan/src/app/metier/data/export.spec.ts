import { devisExemple } from './exemple';
import { FORMATS_EXPORT, preparerExport } from './export';

describe('exports', () => {
  it('chaque format donne un titre de fichier et une consigne', () => {
    for (const format of FORMATS_EXPORT) {
      const p = preparerExport(devisExemple(), format);
      expect(p.titre, format).toBe('Devis D-2026-001 Mme Durand');
      expect(p.consigne.length, format).toBeGreaterThan(0);
    }
    expect(preparerExport(devisExemple(), 'pdf').consigne).toContain('Enregistrer au format PDF');
  });

  it('retire du titre les caractères interdits dans un nom de fichier', () => {
    for (const format of FORMATS_EXPORT) {
      const d = {
        ...devisExemple(),
        numero: 'D/2026:01',
        client: { ...devisExemple().client, nom: 'A <B> "C"' },
      };
      expect(preparerExport(d, format).titre).toBe('Devis D-2026-01 A -B- -C-');
    }
  });

  it('se contente de « Devis » quand rien n’est saisi', () => {
    const d = { ...devisExemple(), numero: '', client: { ...devisExemple().client, nom: '' } };
    expect(preparerExport(d, 'pdf').titre).toBe('Devis');
  });
});
