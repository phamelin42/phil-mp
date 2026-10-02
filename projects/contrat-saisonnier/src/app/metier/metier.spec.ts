import { TestBed } from '@angular/core/testing';
import { AnalyticsService, KvStoreService } from '@mp/core';
import { Contrat } from './data/contrat';
import { contratExemple } from './data/exemple';
import { FORMATS_EXPORT } from './data/export';
import { CLE_CONTRAT, Metier } from './metier';

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
  await vi.waitFor(() => expect(kv.read).toHaveBeenCalledWith(CLE_CONTRAT));
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const champ = <T extends HTMLElement = HTMLInputElement>(id: string) =>
    el.querySelector<T>(`#${id}`)!;
  // Un champ Ionic annonce la saisie par `ionInput` et la sortie par `ionBlur`.
  const saisir = async (id: string, valeur: string) => {
    const c = champ(id);
    c.value = valeur;
    c.dispatchEvent(new CustomEvent('ionInput', { bubbles: true }));
    await fixture.whenStable();
  };
  const quitter = async (id: string) => {
    champ(id).dispatchEvent(new CustomEvent('ionBlur', { bubbles: true }));
    await fixture.whenStable();
  };
  const bouton = (texte: string) =>
    [...el.querySelectorAll<HTMLButtonElement>('ion-button')].find(
      (b) => b.textContent?.trim() === texte,
    )!;
  const cliquer = async (texte: string) => {
    bouton(texte).click();
    await fixture.whenStable();
  };
  const noms = () => track.mock.calls.map((c) => c[0]);
  const apercu = () => el.querySelector('app-apercu-contrat')?.textContent ?? '';
  /** Ce qu'un lecteur d'écran lit après le champ natif : les textes de `aria-describedby`. */
  const annonce = (id: string) => {
    const natif = champ(id).querySelector('input, textarea') ?? champ(id);
    return (natif.getAttribute('aria-describedby') ?? '')
      .split(' ')
      .filter(Boolean)
      .map((ref) => el.querySelector(`#${ref}`)?.textContent ?? '')
      .join(' ');
  };
  return { fixture, el, track, kv, champ, saisir, quitter, bouton, cliquer, noms, apercu, annonce };
}

describe('Metier', () => {
  it('signale le début d’utilisation à la première saisie, pas à l’ouverture', async () => {
    const t = await monter();
    expect(t.noms()).not.toContain('outil_commence');
    await t.saisir('bailleur-nom', 'Claire Morel');
    await t.saisir('locataire-nom', 'Julien Dupont');
    await vi.waitFor(() => expect(t.noms().filter((n) => n === 'outil_commence')).toHaveLength(1));
  });

  it('propose la date du jour pour la signature et un inventaire à compléter', async () => {
    const t = await monter();
    expect(t.champ('date').value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(t.champ('piece-0-nom').value).toBe('Séjour');
    expect(t.apercu()).toContain('Annexe\u00a0: état des lieux et inventaire');
  });

  it('enregistre la saisie sur l’appareil', async () => {
    const t = await monter();
    await t.saisir('locataire-nom', 'Julien Dupont');
    await vi.waitFor(() => {
      const [cle, valeur] = t.kv.write.mock.lastCall as unknown as [string, Contrat];
      expect(cle).toBe(CLE_CONTRAT);
      expect(valeur.locataire.nom).toBe('Julien Dupont');
    });
    await vi.waitFor(() => expect(t.el.textContent).toContain('Enregistré sur cet appareil.'));
  });

  it('retrouve le contrat d’une visite précédente', async () => {
    const t = await monter(contratExemple());
    expect(t.champ('locataire-nom').value).toBe('Julien Dupont');
    expect(t.apercu()).toContain('soit 7\u00a0nuits');
    expect(t.el.querySelector('.resume')?.textContent).toContain('630,00\u00a0€');
    expect(t.noms()).toEqual(['donnees_reprises']);
  });

  it('signale le contrat complet une seule fois, quand il le devient', async () => {
    const t = await monter({ ...contratExemple(), lieu: '' });
    expect(t.noms()).not.toContain('outil_termine');
    await t.saisir('lieu', 'Annecy');
    await vi.waitFor(() => expect(t.noms()).toContain('outil_termine'));
    await t.saisir('lieu', 'Annecy-le-Vieux');
    expect(t.noms().filter((n) => n === 'outil_termine')).toHaveLength(1);
    expect(t.el.textContent).toContain('Votre contrat est complet.');
  });

  it('annonce l’erreur d’un champ obligatoire quitté vide', async () => {
    const t = await monter();
    expect(t.annonce('locataire-nom')).not.toContain('Indiquez le nom du locataire.');
    await t.quitter('locataire-nom');
    await vi.waitFor(() => {
      expect(t.annonce('locataire-nom')).toContain('Indiquez le nom du locataire.');
      expect(t.champ('locataire-nom').querySelector('input')?.getAttribute('aria-invalid')).toBe(
        'true',
      );
    });
  });

  it('refuse un séjour de plus de 90 jours', async () => {
    const t = await monter(contratExemple());
    await t.saisir('sejour-depart', '2027-12-01');
    await t.quitter('sejour-depart');
    await vi.waitFor(() =>
      expect(t.annonce('sejour-depart')).toContain(
        'Une location saisonnière dure au plus 90 jours.',
      ),
    );
  });

  it('ajoute un élément à une pièce et le montre dans l’annexe', async () => {
    const t = await monter(contratExemple());
    await t.cliquer('Ajouter un élément');
    await t.saisir('piece-0-objet-4', 'Lampe de lecture');
    expect(t.apercu()).toContain('Lampe de lecture');
  });

  it('demande confirmation avant de supprimer une pièce', async () => {
    const t = await monter(contratExemple());
    await t.cliquer('Supprimer la pièce 1');
    expect(t.el.textContent).toContain('Retirer la pièce Séjour et son inventaire\u00a0?');
    await t.cliquer('Garder');
    expect(t.champ('piece-0-nom').value).toBe('Séjour');
    await t.cliquer('Supprimer la pièce 1');
    await t.cliquer('Retirer la pièce');
    expect(t.champ('piece-0-nom').value).toBe('Cuisine');
  });

  it('exporte dans chaque format par l’impression, sans saisie dans la mesure', async () => {
    const t = await monter(contratExemple());
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const libelles = { pdf: 'Télécharger en PDF', impression: 'Imprimer' };
    for (const format of FORMATS_EXPORT) {
      document.title = 'Titre de la page';
      print.mockImplementationOnce(() =>
        expect(document.title).toBe('Contrat de location Julien Dupont 2027-07-10'),
      );
      t.bouton(libelles[format]).click();
      expect(t.track).toHaveBeenLastCalledWith('export_fait', { format });
      window.dispatchEvent(new Event('afterprint'));
      expect(document.title).toBe('Titre de la page');
    }
    expect(print).toHaveBeenCalledTimes(FORMATS_EXPORT.length);
    print.mockRestore();
  });

  it('repart pour un nouveau locataire après confirmation, logement et inventaire gardés', async () => {
    const t = await monter(contratExemple());
    await t.cliquer('Nouveau contrat');
    expect(t.champ('locataire-nom').value).toBe('Julien Dupont');
    await t.cliquer('Effacer et commencer');
    expect(t.champ('locataire-nom').value).toBe('');
    expect(t.champ('bailleur-nom').value).toBe('Claire Morel');
    expect(t.champ('piece-0-nom').value).toBe('Séjour');
  });
});
