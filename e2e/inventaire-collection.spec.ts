import { expect, test } from '@playwright/test';
import { appsConstruites } from './apps';

/**
 * Inventaire Collection : une fiche avec photo survit au rechargement, le
 * CSV se télécharge et l'impression ne garde que l'inventaire.
 */
const app = appsConstruites().find((a) => a.nom === 'inventaire-collection');

// PNG 2 × 2 rouge, pour la photo.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==',
  'base64',
);

test.describe('inventaire-collection — module métier', () => {
  test.skip(!app, 'inventaire-collection non construit');
  test.use({ baseURL: `http://localhost:${app?.port}` });

  test('saisir, recharger, retrouver, exporter', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as Window & { impressions?: string[] };
      w.impressions = [];
      w.print = () => w.impressions?.push(document.title);
    });
    await page.goto('/');
    await page.locator('mp-shell[data-ready]').waitFor();

    await page.getByLabel('Nouvelle collection').fill('Vinyles');
    await page.getByRole('button', { name: 'Créer la collection' }).click();
    // La création place le focus sur le nom de l'objet : on l'attend avant de taper.
    await expect(page.getByLabel('Nom de l’objet')).toBeFocused();
    await page.getByLabel('Nom de l’objet').fill('Abbey Road');
    await page.getByLabel('Valeur estimée (€)').fill('45');
    await page
      .getByLabel('Photo (facultatif)')
      .setInputFiles({ name: 'abbey.png', mimeType: 'image/png', buffer: PNG });
    await expect(page.getByAltText('Photo choisie')).toBeVisible();
    await page.getByRole('button', { name: 'Ajouter à la collection' }).click();
    await expect(page.getByRole('status')).toContainText('« Abbey Road » est ajouté.');

    await page.reload();
    await page.locator('mp-shell[data-ready]').waitFor();
    const liste = page.getByRole('list', { name: 'Objets de la collection' });
    await expect(liste).toContainText('Abbey Road');
    await expect(liste.getByAltText('Photo de Abbey Road')).toBeVisible();
    await expect(page.getByText('1 objet en tout, valeur estimée 45,00')).toBeVisible();

    const telechargement = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exporter en CSV' }).click();
    expect((await telechargement).suggestedFilename()).toMatch(
      /^Inventaire \d{4}-\d{2}-\d{2}\.csv$/,
    );

    await page.getByRole('button', { name: 'Télécharger en PDF' }).click();
    await expect
      .poll(() => page.evaluate(() => (window as Window & { impressions?: string[] }).impressions))
      .toEqual([expect.stringMatching(/^Inventaire \d{4}-\d{2}-\d{2}$/)]);

    await page.emulateMedia({ media: 'print' });
    const document = page.locator('.document');
    await expect(document).toBeVisible();
    await expect(document).toContainText('Abbey Road');
    await expect(page.getByLabel('Nom de l’objet')).toBeHidden();
    await expect(page.locator('h1')).toBeHidden();
  });
});
