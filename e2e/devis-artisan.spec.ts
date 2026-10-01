import { expect, test } from '@playwright/test';
import { appsConstruites } from './apps';

/**
 * Devis Artisan : la saisie survit au rechargement, et l'export imprime le
 * devis seul, sans le formulaire ni le texte de la page.
 */
const app = appsConstruites().find((a) => a.nom === 'devis-artisan');

test.describe('devis-artisan — module métier', () => {
  test.skip(!app, 'devis-artisan non construit');
  test.use({ baseURL: `http://localhost:${app?.port}` });

  test('saisir, recharger, retrouver, exporter', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as Window & { impressions?: string[] };
      w.impressions = [];
      w.print = () => w.impressions?.push(document.title);
    });
    await page.goto('/');
    await page.locator('mp-shell[data-ready]').waitFor();

    await page.getByLabel('Nom de l’entreprise').fill('Paul Martin Plomberie');
    await page.getByLabel('Nom du client').fill('Mme Durand');
    await page.getByLabel('Désignation').fill('Remplacement chauffe-eau 200 L');
    await page.getByLabel('Prix unitaire HT (€)').fill('890');
    await expect(page.getByRole('status')).toHaveText('Enregistré sur cet appareil.');

    await page.reload();
    await page.locator('mp-shell[data-ready]').waitFor();
    await expect(page.getByLabel('Nom du client')).toHaveValue('Mme Durand');
    await expect(page.getByLabel('Désignation')).toHaveValue('Remplacement chauffe-eau 200 L');
    const apercu = page.locator('.document');
    await expect(apercu).toContainText('Paul Martin Plomberie EI');
    await expect(apercu).toContainText('890,00\u00a0€');

    await page.getByRole('button', { name: 'Télécharger en PDF' }).click();
    await page.getByRole('button', { name: 'Imprimer' }).click();
    const impressions = await page.evaluate(
      () => (window as Window & { impressions?: string[] }).impressions,
    );
    expect(impressions).toEqual([
      expect.stringMatching(/^Devis D-\d{8}-01 Mme Durand$/),
      expect.any(String),
    ]);

    // À l'impression, seul le devis reste à l'écran.
    await page.emulateMedia({ media: 'print' });
    await expect(apercu).toBeVisible();
    await expect(page.getByLabel('Nom du client')).toBeHidden();
    await expect(page.locator('h1')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Imprimer' })).toBeHidden();
    const pdf = await page.pdf({ format: 'A4' });
    expect(pdf.byteLength).toBeGreaterThan(1000);
  });
});
