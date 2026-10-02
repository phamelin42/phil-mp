import { expect, test } from '@playwright/test';
import { appsConstruites } from './apps';

/**
 * Prix Fait Main : une fiche saisie survit au rechargement, le CSV se
 * télécharge et l'impression ne garde que la fiche de prix.
 */
const app = appsConstruites().find((a) => a.nom === 'prix-fait-main');

test.describe('prix-fait-main — module métier', () => {
  test.skip(!app, 'prix-fait-main non construit');
  test.use({ baseURL: `http://localhost:${app?.port}` });

  test('saisir, recharger, retrouver, exporter', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as Window & { impressions?: string[] };
      w.impressions = [];
      w.print = () => w.impressions?.push(document.title);
    });
    await page.goto('/');
    await page.locator('mp-shell[data-ready]').waitFor();

    await page.getByLabel('Nom de la création').fill('Bougie soja 180 g');
    await page.getByLabel('Matière', { exact: true }).fill('Cire de soja');
    await page.getByLabel('Prix payé').fill('20');
    await page.getByLabel('Quantité achetée').fill('1000');
    await page.getByLabel('Quantité utilisée').fill('180');
    await page.getByLabel('Temps pour une pièce').fill('30');
    await page.getByLabel('Taux horaire').fill('16');
    // 3,60 + 8,00 = 11,60 ; +10 % = 12,76 ; × 2 = 25,52 → étiquette 26,00
    await expect(page.locator('.resume')).toContainText('Prix de gros12,76');
    await expect(page.getByRole('status')).toContainText('Enregistré sur cet appareil.');

    await page.reload();
    await page.locator('mp-shell[data-ready]').waitFor();
    await expect(page.getByLabel('Nom de la création')).toHaveValue('Bougie soja 180 g');
    await expect(page.locator('.chiffre-cle')).toHaveText('26,00\u00a0€');

    const telechargement = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exporter en CSV' }).click();
    expect((await telechargement).suggestedFilename()).toBe('Prix Bougie soja 180 g.csv');

    await page.getByRole('button', { name: 'Télécharger en PDF' }).click();
    await expect
      .poll(() => page.evaluate(() => (window as Window & { impressions?: string[] }).impressions))
      .toEqual(['Prix Bougie soja 180 g']);

    await page.emulateMedia({ media: 'print' });
    const document = page.locator('.document');
    await expect(document).toBeVisible();
    await expect(document).toContainText('Cire de soja');
    await expect(page.getByLabel('Nom de la création')).toBeHidden();
    await expect(page.locator('h1')).toBeHidden();
  });
});
