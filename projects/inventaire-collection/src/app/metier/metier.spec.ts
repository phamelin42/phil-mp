import { TestBed } from '@angular/core/testing';
import { AnalyticsService, KvStoreService } from '@mp/core';
import { FORMATS_EXPORT } from './data/export';
import { CLE_INVENTAIRE, Inventaire, clePhoto } from './data/inventaire';
import { CLE_BROUILLON, Metier } from './metier';

// jsdom ne fait pas défiler : `ion-segment` défilant appelle `scrollTo` sur ses onglets.
Element.prototype.scrollTo ??= () => undefined;

const enregistre: Inventaire = {
  collections: [{ id: 'vinyles', nom: 'Vinyles' }],
  objets: [
    {
      id: 'o1',
      collection: 'vinyles',
      nom: 'Abbey Road',
      etat: 'tres-bon',
      valeur: 45,
      dateAchat: '',
      note: '',
      photo: true,
    },
    {
      id: 'o2',
      collection: 'vinyles',
      nom: 'Thriller',
      etat: 'bon',
      valeur: 20,
      dateAchat: '',
      note: '',
      photo: false,
    },
  ],
};
const PHOTO = 'data:image/jpeg;base64,/9j/4AAQ';

async function monter(stock: Record<string, unknown> = {}, ecritureEchoue = false) {
  const track = vi.fn();
  const kv = {
    read: vi.fn(async (cle: string) => stock[cle] ?? null),
    writeMany: vi.fn(async () => {
      if (ecritureEchoue) throw new Error('quota');
    }),
    write: vi.fn(async () => undefined),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: AnalyticsService, useValue: { track } },
      { provide: KvStoreService, useValue: kv },
    ],
  });
  const fixture = TestBed.createComponent(Metier);
  await fixture.whenStable();
  await vi.waitFor(() => expect(kv.read).toHaveBeenCalledWith(CLE_INVENTAIRE));
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const champ = (id: string) => el.querySelector<HTMLInputElement>(`#${id}`)!;
  // Un champ Ionic annonce la saisie par `ionInput` (valeur lue sur l'élément).
  const saisir = async (id: string, valeur: string) => {
    champ(id).value = valeur;
    champ(id).dispatchEvent(new CustomEvent('ionInput', { bubbles: true }));
    await fixture.whenStable();
  };
  /** Valeur et nombre d'objets de la collection affichée. */
  const resume = () => el.querySelector('.resume')?.textContent?.replace(/\s+/g, ' ') ?? '';
  const bouton = (texte: string) => {
    const tous = [...el.querySelectorAll<HTMLElement>('button, ion-button')];
    const texteDe = (b: Element) => b.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    return (
      tous.find((b) => texteDe(b) === texte) ?? tous.find((b) => texteDe(b).startsWith(texte))!
    );
  };
  // Un `ion-button` de type submit soumet son formulaire (Ionic y place un
  // bouton natif caché, qui répond aussi à la touche Entrée) ; jsdom ne suit
  // pas ce relais, on soumet donc le formulaire comme le ferait ce bouton.
  const cliquer = async (texte: string) => {
    const b = bouton(texte);
    const formulaire = b.getAttribute('type') === 'submit' ? b.closest('form') : null;
    if (formulaire) formulaire.requestSubmit();
    else b.click();
    await vi.waitFor(() => fixture.whenStable());
    await fixture.whenStable();
  };
  const noms = () => track.mock.calls.map((c) => c[0]);
  return { fixture, el, track, kv, champ, saisir, bouton, cliquer, noms, resume };
}

describe('Metier (inventaire)', () => {
  it('crée une collection puis y ajoute un objet, en une transaction chacun', async () => {
    const t = await monter();
    await t.saisir('collection-nom', 'Lego');
    await t.cliquer('Créer la collection');
    await vi.waitFor(() =>
      expect(t.el.querySelector('#collection-titre')?.textContent).toBe('Lego'),
    );
    expect(t.noms()).toContain('outil_commence');

    await t.saisir('objet-nom', 'Faucon Millenium');
    await t.saisir('objet-valeur', '650');
    await t.cliquer('Ajouter à la collection');
    await vi.waitFor(() =>
      expect(t.el.querySelector('.liste-objets')?.textContent).toContain('Faucon Millenium'),
    );
    const [ecrit] = t.kv.writeMany.mock.lastCall as unknown as [Record<string, unknown>];
    expect((ecrit[CLE_INVENTAIRE] as Inventaire).objets[0]).toMatchObject({
      nom: 'Faucon Millenium',
      valeur: 650,
    });
    expect(ecrit[CLE_BROUILLON]).toMatchObject({ nom: '' });
    expect(t.noms()).toContain('outil_termine');
  });

  it('refuse un objet sans nom et l’annonce', async () => {
    const t = await monter({ [CLE_INVENTAIRE]: enregistre });
    const avant = t.kv.writeMany.mock.calls.length;
    await t.cliquer('Ajouter à la collection');
    // Ce qu'un lecteur d'écran lit après le champ natif : `aria-describedby`.
    const natif = t.champ('objet-nom').querySelector('input')!;
    await vi.waitFor(() => {
      const annonce = (natif.getAttribute('aria-describedby') ?? '')
        .split(' ')
        .filter(Boolean)
        .map((ref) => t.el.querySelector(`#${ref}`)?.textContent ?? '')
        .join(' ');
      expect(annonce).toContain('Donnez un nom');
      expect(natif.getAttribute('aria-invalid')).toBe('true');
    });
    expect(t.kv.writeMany.mock.calls.length).toBe(avant);
  });

  it('retrouve l’inventaire, ses photos et le total de la visite précédente', async () => {
    const t = await monter({ [CLE_INVENTAIRE]: enregistre, [clePhoto('o1')]: PHOTO });
    expect(t.noms()).toEqual(['donnees_reprises']);
    expect(t.el.querySelector('#collection-titre')?.textContent).toBe('Vinyles');
    expect(t.el.querySelector<HTMLImageElement>('.liste-objets img')?.src).toBe(PHOTO);
    expect(t.resume()).toContain('65,00');
    expect(t.resume()).toContain('2 objets');
  });

  it('cherche dans la collection sans tenir compte des accents', async () => {
    const t = await monter({ [CLE_INVENTAIRE]: enregistre });
    await t.saisir('recherche', 'THRILLER');
    const items = [...t.el.querySelectorAll('.liste-objets h3')].map((h) => h.textContent);
    expect(items).toEqual(['Thriller']);
  });

  it('ne supprime qu’après confirmation, et efface la photo dans la même transaction', async () => {
    const t = await monter({ [CLE_INVENTAIRE]: enregistre, [clePhoto('o1')]: PHOTO });
    await t.cliquer('Supprimer Abbey Road');
    await t.cliquer('Annuler');
    expect(t.el.querySelectorAll('.liste-objets h3')).toHaveLength(2);
    await t.cliquer('Supprimer Abbey Road');
    await t.cliquer('Supprimer');
    await vi.waitFor(() => expect(t.el.querySelectorAll('.liste-objets h3')).toHaveLength(1));
    const [ecrit] = t.kv.writeMany.mock.lastCall as unknown as [Record<string, unknown>];
    expect(ecrit[clePhoto('o1')]).toBeNull();
    expect((ecrit[CLE_INVENTAIRE] as Inventaire).objets.map((o) => o.id)).toEqual(['o2']);
  });

  it('ne change rien à l’écran quand l’écriture échoue', async () => {
    const t = await monter({ [CLE_INVENTAIRE]: enregistre }, true);
    await t.cliquer('Supprimer Thriller');
    await t.cliquer('Supprimer');
    await vi.waitFor(() =>
      expect(t.el.querySelector('[role="status"]')?.textContent).toContain('a échoué'),
    );
    expect(t.el.querySelectorAll('.liste-objets h3')).toHaveLength(2);
  });

  it('modifie un objet existant sans le dupliquer', async () => {
    const t = await monter({ [CLE_INVENTAIRE]: enregistre });
    await t.cliquer('Modifier Thriller');
    expect(t.champ('objet-nom').value).toBe('Thriller');
    await t.saisir('objet-valeur', '35');
    await t.cliquer('Enregistrer les modifications');
    await vi.waitFor(() => expect(t.resume()).toContain('80,00'));
    expect(t.resume()).toContain('2 objets');
  });

  it('exporte dans chaque format, sans saisie dans la mesure', async () => {
    const t = await monter({ [CLE_INVENTAIRE]: enregistre });
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const creer = vi.fn(() => 'blob:csv');
    Object.assign(URL, { createObjectURL: creer, revokeObjectURL: vi.fn() });
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const libelles = { pdf: 'Télécharger en PDF', csv: 'Exporter en CSV' };
    for (const format of FORMATS_EXPORT) {
      await t.cliquer(libelles[format]);
      expect(t.track).toHaveBeenLastCalledWith('export_fait', { format });
    }
    await vi.waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    expect(clic).toHaveBeenCalledTimes(1);
    expect(await (creer.mock.calls[0] as unknown as [Blob])[0].text()).toContain(
      'Vinyles;Abbey Road',
    );
    print.mockRestore();
    clic.mockRestore();
  });
});
