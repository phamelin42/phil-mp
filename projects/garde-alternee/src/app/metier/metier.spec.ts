import { TestBed } from '@angular/core/testing';
import { AnalyticsService, KvStoreService } from '@mp/core';
import { FORMATS_EXPORT } from './data/export';
import { Planning, planningVide } from './data/planning';
import { CLE_PLANNING, Metier } from './metier';

const complet: Planning = {
  ...planningVide(),
  parentA: 'Marie',
  parentB: 'Julien',
  depart: '2026-08-31',
  annee: 2026,
  zone: 'B',
};

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
  await vi.waitFor(() => expect(kv.read).toHaveBeenCalledWith(CLE_PLANNING));
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const champ = (id: string) => el.querySelector<HTMLInputElement>(`#${id}`)!;
  // Un champ Ionic annonce la saisie par `ionInput` (valeur lue sur l'élément).
  const saisir = async (id: string, valeur: string) => {
    champ(id).value = valeur;
    champ(id).dispatchEvent(new CustomEvent('ionInput', { bubbles: true }));
    await fixture.whenStable();
  };
  const bouton = (texte: string) =>
    [...el.querySelectorAll<HTMLButtonElement>('ion-button')].find(
      (b) => b.textContent?.trim() === texte,
    )!;
  const noms = () => track.mock.calls.map((c) => c[0]);
  return { fixture, el, track, kv, champ, saisir, bouton, noms };
}

describe('Metier (garde alternée)', () => {
  it('signale le début d’utilisation à la première saisie, pas à l’ouverture', async () => {
    const t = await monter();
    expect(t.noms()).not.toContain('outil_commence');
    await t.saisir('parentA', 'Marie');
    await vi.waitFor(() => expect(t.noms()).toContain('outil_commence'));
  });

  it('colore le calendrier une fois les parents et la date saisis, et signale le résultat complet', async () => {
    const t = await monter();
    expect(t.el.querySelectorAll('mp-calendrier-mois')).toHaveLength(12);
    expect(t.el.querySelector('td.serie-1')).toBeNull();
    await t.saisir('parentA', 'Marie');
    await t.saisir('parentB', 'Julien');
    await t.saisir('depart', '2026-08-31');
    await vi.waitFor(() => expect(t.noms()).toContain('outil_termine'));
    expect(t.el.querySelectorAll('td.serie-1').length).toBeGreaterThan(150);
    expect(t.el.querySelector('.legende')?.textContent).toContain('Marie');
    expect(t.el.textContent).toContain('Votre calendrier est prêt.');
  });

  it('enregistre la saisie sur l’appareil', async () => {
    const t = await monter();
    await t.saisir('parentA', 'Marie');
    await vi.waitFor(() => {
      const [cle, valeur] = t.kv.write.mock.lastCall as unknown as [string, Planning];
      expect(cle).toBe(CLE_PLANNING);
      expect(valeur.parentA).toBe('Marie');
    });
  });

  it('retrouve le planning d’une visite précédente, vacances marquées', async () => {
    const t = await monter(complet);
    expect(t.champ('parentB').value).toBe('Julien');
    expect(t.noms()).toEqual(['donnees_reprises']);
    expect(t.el.querySelectorAll('td.marque').length).toBeGreaterThan(50);
  });

  it('annonce l’erreur d’un champ obligatoire quitté vide', async () => {
    const t = await monter();
    t.champ('parentA').dispatchEvent(new CustomEvent('ionBlur', { bubbles: true }));
    await t.fixture.whenStable();
    // Ce qu'un lecteur d'écran lit après le champ natif : `aria-describedby`.
    const natif = t.champ('parentA').querySelector('input')!;
    await vi.waitFor(() => {
      const annonce = (natif.getAttribute('aria-describedby') ?? '')
        .split(' ')
        .filter(Boolean)
        .map((ref) => t.el.querySelector(`#${ref}`)?.textContent ?? '')
        .join(' ');
      expect(annonce).toContain('premier parent');
      expect(natif.getAttribute('aria-invalid')).toBe('true');
    });
  });

  it('exporte dans chaque format, sans saisie dans la mesure', async () => {
    const t = await monter(complet);
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const creer = vi.fn(() => 'blob:ics');
    const revoquer = vi.fn();
    Object.assign(URL, { createObjectURL: creer, revokeObjectURL: revoquer });
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const libelles = {
      pdf: 'Télécharger en PDF',
      ical: 'Ajouter à mon agenda (iCal)',
      impression: 'Imprimer',
    };
    for (const format of FORMATS_EXPORT) {
      t.bouton(libelles[format]).click();
      expect(t.track).toHaveBeenLastCalledWith('export_fait', { format });
    }
    expect(print).toHaveBeenCalledTimes(2);
    expect(clic).toHaveBeenCalledTimes(1);
    const blob = (creer.mock.calls[0] as unknown as [Blob])[0];
    expect(await blob.text()).toContain('SUMMARY:Garde : Julien');
    print.mockRestore();
    clic.mockRestore();
  });

  it('n’offre pas l’export iCal tant que le calendrier est vide', async () => {
    const t = await monter();
    expect(t.bouton('Ajouter à mon agenda (iCal)').disabled).toBe(true);
  });
});
