import { TestBed } from '@angular/core/testing';
import { AnalyticsService, KvStoreService } from '@mp/core';
import { Devis } from './data/devis';
import { devisExemple } from './data/exemple';
import { FORMATS_EXPORT } from './data/export';
import { CLE_DEVIS, Metier } from './metier';

async function monter(enregistre: unknown = null) {
  const track = vi.fn();
  const kv = { read: vi.fn(async () => enregistre), write: vi.fn(async () => undefined) };
  TestBed.configureTestingModule({
    providers: [
      { provide: AnalyticsService, useValue: { track } },
      { provide: KvStoreService, useValue: kv },
    ],
  });
  const fixture = TestBed.createComponent(Metier);
  await fixture.whenStable();
  await vi.waitFor(() => expect(kv.read).toHaveBeenCalledWith(CLE_DEVIS));
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const champ = <T extends HTMLElement = HTMLInputElement>(id: string) =>
    el.querySelector<T>(`#${id}`)!;
  const saisir = async (id: string, valeur: string) => {
    const c = champ(id);
    c.value = valeur;
    c.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const quitter = async (id: string) => {
    champ(id).dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  };
  const bouton = (texte: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === texte)!;
  const noms = () => track.mock.calls.map((c) => c[0]);
  return { fixture, el, track, kv, champ, saisir, quitter, bouton, noms };
}

describe('Metier', () => {
  it('signale le début d’utilisation à la première saisie, pas à l’ouverture', async () => {
    const t = await monter();
    expect(t.noms()).not.toContain('outil_commence');
    await t.saisir('client-nom', 'Mme Durand');
    await t.saisir('client-adresse', '4 place Bellecour');
    await vi.waitFor(() => expect(t.noms().filter((n) => n === 'outil_commence')).toHaveLength(1));
  });

  it('propose la date du jour et un numéro', async () => {
    const t = await monter();
    expect(t.champ('date').value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(t.champ('numero').value).toMatch(/^D-\d{8}-01$/);
  });

  it('enregistre la saisie sur l’appareil', async () => {
    const t = await monter();
    await t.saisir('client-nom', 'Mme Durand');
    await vi.waitFor(() => {
      const [cle, valeur] = t.kv.write.mock.lastCall as unknown as [string, Devis];
      expect(cle).toBe(CLE_DEVIS);
      expect(valeur.client.nom).toBe('Mme Durand');
    });
    await vi.waitFor(() => expect(t.el.textContent).toContain('Enregistré sur cet appareil.'));
  });

  it('retrouve le devis d’une visite précédente', async () => {
    const t = await monter(devisExemple());
    expect(t.champ('client-nom').value).toBe('Mme Durand');
    expect(t.champ<HTMLTextAreaElement>('ligne-1-designation').value).toBe('Main-d’œuvre');
    expect(t.el.querySelector('app-apercu-devis')?.textContent).toContain(
      'Remplacement chauffe-eau 200 L',
    );
    expect(t.noms()).toEqual(['donnees_reprises']);
  });

  it('signale le devis complet une seule fois, quand il le devient', async () => {
    const t = await monter({ ...devisExemple(), mediateur: '' });
    expect(t.noms()).not.toContain('outil_termine');
    await t.saisir('mediateur', 'CM2C');
    await vi.waitFor(() => expect(t.noms()).toContain('outil_termine'));
    await t.saisir('mediateur', 'CM2C, www.cm2c.net');
    expect(t.noms().filter((n) => n === 'outil_termine')).toHaveLength(1);
    expect(t.el.textContent).toContain('Votre devis est complet.');
  });

  it('annonce l’erreur d’un champ obligatoire quitté vide', async () => {
    const t = await monter();
    expect(t.el.querySelector('#client-nom-erreur')).toBeNull();
    await t.quitter('client-nom');
    const erreur = t.el.querySelector('#client-nom-erreur');
    expect(erreur?.textContent).toContain('Indiquez le nom du client.');
    expect(t.champ('client-nom').getAttribute('aria-invalid')).toBe('true');
    expect(t.champ('client-nom').getAttribute('aria-describedby')).toBe('client-nom-erreur');
  });

  it('exporte dans chaque format par l’impression, sans saisie dans la mesure', async () => {
    const t = await monter(devisExemple());
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const libelles = { pdf: 'Télécharger en PDF', impression: 'Imprimer' };
    for (const format of FORMATS_EXPORT) {
      document.title = 'Titre de la page';
      print.mockImplementationOnce(() =>
        expect(document.title).toBe('Devis D-2026-001 Mme Durand'),
      );
      t.bouton(libelles[format]).click();
      expect(t.track).toHaveBeenLastCalledWith('export_fait', { format });
      window.dispatchEvent(new Event('afterprint'));
      expect(document.title).toBe('Titre de la page');
    }
    expect(print).toHaveBeenCalledTimes(FORMATS_EXPORT.length);
    print.mockRestore();
  });

  it('ne commence un nouveau devis qu’après confirmation, en gardant l’entreprise', async () => {
    const t = await monter(devisExemple());
    t.bouton('Nouveau devis').click();
    await t.fixture.whenStable();
    t.bouton('Garder ce devis').click();
    await t.fixture.whenStable();
    expect(t.champ('client-nom').value).toBe('Mme Durand');

    t.bouton('Nouveau devis').click();
    await t.fixture.whenStable();
    t.bouton('Effacer et commencer').click();
    await t.fixture.whenStable();
    expect(t.champ('client-nom').value).toBe('');
    expect(t.champ('entreprise-nom').value).toBe('Paul Martin Plomberie');
    expect(t.champ('numero').value).not.toBe('D-2026-001');
  });

  it('ajoute et retire des lignes, sans jamais descendre sous une', async () => {
    const t = await monter();
    expect(t.bouton('Supprimer la ligne 1').disabled).toBe(true);
    t.bouton('Ajouter une ligne').click();
    await t.fixture.whenStable();
    expect(t.champ('ligne-1-designation')).not.toBeNull();
    t.bouton('Supprimer la ligne 2').click();
    await t.fixture.whenStable();
    expect(t.el.querySelector('#ligne-1-designation')).toBeNull();
  });

  it('refuse un logo trop lourd ou d’un autre format', async () => {
    const t = await monter();
    const input = t.champ('logo');
    for (const fichier of [
      new File(['x'], 'logo.gif', { type: 'image/gif' }),
      new File([new Uint8Array(600 * 1024)], 'logo.png', { type: 'image/png' }),
    ]) {
      Object.defineProperty(input, 'files', { value: [fichier], configurable: true });
      input.dispatchEvent(new Event('change'));
      await t.fixture.whenStable();
      expect(t.el.querySelector('#logo-erreur')?.textContent).toBeTruthy();
    }
  });
});
