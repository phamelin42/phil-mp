import { TestBed } from '@angular/core/testing';
import { AnalyticsService, KvStoreService } from '@mp/core';
import { ficheExemple } from './data/exemple';
import { Fiche } from './data/fiche';
import { FORMATS_EXPORT } from './data/export';
import { CLE_FICHE, Metier } from './metier';

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
  await vi.waitFor(() => expect(kv.read).toHaveBeenCalledWith(CLE_FICHE));
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const champ = (id: string) => el.querySelector<HTMLInputElement>(`#${id}`)!;
  const saisir = async (id: string, valeur: string) => {
    const c = champ(id);
    c.value = valeur;
    c.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const bouton = (texte: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === texte)!;
  const noms = () => track.mock.calls.map((c) => c[0]);
  return { fixture, el, track, kv, champ, saisir, bouton, noms };
}

describe('Metier', () => {
  it('signale le début d’utilisation à la première saisie, pas à l’ouverture', async () => {
    const t = await monter();
    expect(t.noms()).not.toContain('outil_commence');
    await t.saisir('matiere-0-prix', '12');
    await t.saisir('minutes', '45');
    await vi.waitFor(() => expect(t.noms().filter((n) => n === 'outil_commence')).toHaveLength(1));
  });

  it('liste ce qui manque avant de donner un prix', async () => {
    const t = await monter();
    const texte = t.el.textContent ?? '';
    expect(texte).toContain('Il manque encore');
    expect(texte).toContain('Le temps de fabrication');
    expect(t.el.querySelector('app-fiche-prix')).toBeNull();
  });

  it('donne le prix dès que matières, temps et taux horaire sont saisis', async () => {
    const t = await monter();
    await t.saisir('matiere-0-prix', '12');
    await t.saisir('matiere-0-achetee', '100');
    await t.saisir('matiere-0-utilisee', '30');
    await t.saisir('minutes', '60');
    await t.saisir('tauxHoraire', '15');
    // 3,60 + 15,00 = 18,60 ; +10 % = 20,46 ; × 2 = 40,92 → étiquette 41,00
    await vi.waitFor(() => {
      expect(t.el.textContent).toContain('Prix de gros\u00a0: 20,46');
      expect(t.el.textContent).toContain('Prix de détail conseillé\u00a0: 41,00');
    });
    await vi.waitFor(() => expect(t.noms().filter((n) => n === 'outil_termine')).toHaveLength(1));
  });

  it('enregistre la saisie sur l’appareil', async () => {
    const t = await monter();
    await t.saisir('nom', 'Bougie 180 g');
    await vi.waitFor(() => {
      const [cle, valeur] = t.kv.write.mock.lastCall as unknown as [string, Fiche];
      expect(cle).toBe(CLE_FICHE);
      expect(valeur.nom).toBe('Bougie 180 g');
    });
    await vi.waitFor(() => expect(t.el.textContent).toContain('Enregistré sur cet appareil.'));
  });

  it('retrouve la fiche d’une visite précédente', async () => {
    const t = await monter(ficheExemple());
    expect(t.champ('nom').value).toBe('Collier perles de verre');
    expect(t.champ('matiere-2-nom').value).toBe('Fil câblé');
    expect(t.el.querySelector('app-fiche-prix')?.textContent).toContain('Coût de revient');
    expect(t.noms()).toEqual(['donnees_reprises']);
  });

  it('ajoute et retire une matière', async () => {
    const t = await monter(ficheExemple());
    t.bouton('Ajouter une matière').click();
    await t.fixture.whenStable();
    expect(t.champ('matiere-3-nom')).not.toBeNull();
    t.bouton('Supprimer la matière 1').click();
    await t.fixture.whenStable();
    expect(t.champ('matiere-0-nom').value).toBe('Fermoir');
  });

  it('demande confirmation avant d’effacer la création, et garde les réglages', async () => {
    const t = await monter(ficheExemple());
    t.bouton('Nouvelle création').click();
    await t.fixture.whenStable();
    expect(t.champ('nom').value).toBe('Collier perles de verre');
    t.bouton('Effacer et commencer').click();
    await t.fixture.whenStable();
    expect(t.champ('nom').value).toBe('');
    expect(t.champ('minutes').value).toBe('0');
    expect(t.champ('tauxHoraire').value).toBe('15');
    expect(t.champ('commissionPct').value).toBe('10.5');
  });

  it('mesure chaque export avec son format', async () => {
    const t = await monter(ficheExemple());
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const creer = vi.fn(() => 'blob:csv');
    const revoquer = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL: creer, revokeObjectURL: revoquer });
    const libelles = { pdf: 'Télécharger en PDF', csv: 'Exporter en CSV' };
    for (const format of FORMATS_EXPORT) {
      t.bouton(libelles[format]).click();
      await t.fixture.whenStable();
      expect(t.track).toHaveBeenLastCalledWith('export_fait', { format });
    }
    expect(print).toHaveBeenCalledTimes(1);
    expect(creer).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
    print.mockRestore();
  });
});
