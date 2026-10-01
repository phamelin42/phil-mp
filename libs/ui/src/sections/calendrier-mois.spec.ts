import { TestBed } from '@angular/core/testing';
import { CalendrierMois } from './calendrier-mois';

async function monter(
  annee: number,
  mois: number,
  jours = [] as { date: string; classe?: string; libelle?: string }[],
) {
  const fixture = TestBed.createComponent(CalendrierMois);
  fixture.componentRef.setInput('annee', annee);
  fixture.componentRef.setInput('mois', mois);
  fixture.componentRef.setInput('jours', jours);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('CalendrierMois', () => {
  it('place le premier jour sous son jour de la semaine, semaine commençant le lundi', async () => {
    // Le 1er octobre 2026 est un jeudi.
    const el = await monter(2026, 10);
    expect(el.querySelector('caption')?.textContent?.trim()).toBe('octobre 2026');
    const premiere = [...el.querySelectorAll('tbody tr:first-child td')].map((td) =>
      td.textContent?.trim(),
    );
    expect(premiere).toEqual(['', '', '', '1', '2', '3', '4']);
  });

  it('compte les jours de chaque mois, février bissextile compris', async () => {
    const attendus: [number, number, number][] = [
      [2027, 2, 28],
      [2028, 2, 29],
      [2026, 4, 30],
      [2026, 12, 31],
    ];
    for (const [annee, mois, total] of attendus) {
      const el = await monter(annee, mois);
      const numeros = [...el.querySelectorAll('td')]
        .map((td) => td.textContent?.trim())
        .filter(Boolean);
      expect(numeros.at(-1), `${mois}/${annee}`).toBe(String(total));
    }
  });

  it('colore les jours marqués et les nomme pour les lecteurs d’écran', async () => {
    const el = await monter(2026, 10, [
      { date: '2026-10-05', classe: 'serie-2 marque', libelle: 'Julien, vacances' },
    ]);
    const td = [...el.querySelectorAll('td')].find((c) => c.textContent?.trim().startsWith('5'));
    expect([...(td?.classList ?? [])].sort()).toEqual(['marque', 'serie-2']);
    expect(td?.querySelector('.visuellement-cache')?.textContent).toBe('Julien, vacances');
  });
});
