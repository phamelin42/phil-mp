import { expect, test } from '@playwright/test';
import { appsConstruites } from './apps';

/**
 * Contrat Location Saisonnière : la saisie survit au rechargement, et
 * l'export imprime le contrat et son annexe seuls, sans le formulaire.
 */
const app = appsConstruites().find((a) => a.nom === 'contrat-saisonnier');

test.describe('contrat-saisonnier — module métier', () => {
  test.skip(!app, 'contrat-saisonnier non construit');
  test.use({ baseURL: `http://localhost:${app?.port}` });

  test('saisir, recharger, retrouver, exporter', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as Window & { impressions?: string[] };
      w.impressions = [];
      w.print = () => w.impressions?.push(document.title);
    });
    await page.goto('/');
    await page.locator('mp-shell[data-ready]').waitFor();

    await page.getByLabel('Nom et prénom du locataire').fill('Julien Dupont');
    await page.getByLabel('Arrivée').fill('2027-07-10');
    await page.getByLabel('Départ', { exact: true }).fill('2027-07-17');
    await page.getByLabel('Loyer du séjour (€)').fill('840');
    await expect(page.getByRole('status')).toHaveText('Enregistré sur cet appareil.');

    await page.reload();
    await page.locator('mp-shell[data-ready]').waitFor();
    await expect(page.getByLabel('Nom et prénom du locataire')).toHaveValue('Julien Dupont');
    const contrat = page.locator('.document');
    await expect(contrat).toContainText('Julien Dupont');
    await expect(contrat).toContainText('soit 7 nuits');
    await expect(contrat).toContainText('840,00 €');
    await expect(contrat).toContainText('Annexe\u00a0: état des lieux et inventaire');

    await page.getByRole('button', { name: 'Télécharger en PDF' }).click();
    await page.getByRole('button', { name: 'Imprimer' }).click();
    const impressions = await page.evaluate(
      () => (window as Window & { impressions?: string[] }).impressions,
    );
    expect(impressions).toEqual([
      'Contrat de location Julien Dupont 2027-07-10',
      expect.any(String),
    ]);

    // À l'impression, seul le contrat reste à l'écran.
    await page.emulateMedia({ media: 'print' });
    await expect(contrat).toBeVisible();
    await expect(page.getByLabel('Nom et prénom du locataire')).toBeHidden();
    await expect(page.locator('h1')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Imprimer' })).toBeHidden();
    const pdf = await page.pdf({ format: 'A4' });
    expect(pdf.byteLength).toBeGreaterThan(1000);
  });
});
