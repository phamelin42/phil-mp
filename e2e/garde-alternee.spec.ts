import { expect, test } from '@playwright/test';
import { appsConstruites } from './apps';

/**
 * Planning Garde Alternée : la saisie survit au rechargement, l'iCal se
 * télécharge et l'impression ne garde que le calendrier, sur une page.
 */
const app = appsConstruites().find((a) => a.nom === 'garde-alternee');

test.describe('garde-alternee — module métier', () => {
  test.skip(!app, 'garde-alternee non construit');
  test.use({ baseURL: `http://localhost:${app?.port}` });

  test('saisir, recharger, retrouver, exporter', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as Window & { impressions?: string[] };
      w.impressions = [];
      w.print = () => w.impressions?.push(document.title);
    });
    await page.goto('/');
    await page.locator('mp-shell[data-ready]').waitFor();

    await page.getByLabel('Premier parent').fill('Marie');
    await page.getByLabel('Second parent').fill('Julien');
    await page.getByLabel('Premier jour du rythme').fill('2026-08-31');
    await page.getByLabel('Zone de vacances scolaires').selectOption('B');
    await expect(page.getByRole('status')).toHaveText('Enregistré sur cet appareil.');

    await page.reload();
    await page.locator('mp-shell[data-ready]').waitFor();
    await expect(page.getByLabel('Second parent')).toHaveValue('Julien');
    await expect(page.getByLabel('Zone de vacances scolaires')).toHaveValue('B');
    const calendrier = page.locator('.document');
    await expect(calendrier.locator('.legende')).toContainText('Marie');
    await expect(calendrier.locator('td.serie-2').first()).toBeVisible();

    const telechargement = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Ajouter à mon agenda (iCal)' }).click();
    const fichier = await telechargement;
    expect(fichier.suggestedFilename()).toBe('Garde 2026-2027 Marie Julien.ics');

    await page.getByRole('button', { name: 'Télécharger en PDF' }).click();
    const impressions = await page.evaluate(
      () => (window as Window & { impressions?: string[] }).impressions,
    );
    expect(impressions).toEqual(['Garde 2026-2027 Marie Julien']);

    await page.emulateMedia({ media: 'print' });
    await expect(calendrier).toBeVisible();
    await expect(page.getByLabel('Premier parent')).toBeHidden();
    await expect(page.locator('h1')).toBeHidden();
    const pdf = await page.pdf({ preferCSSPageSize: true });
    expect(pdf.byteLength).toBeGreaterThan(1000);
  });
});
