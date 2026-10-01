import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Blocs } from './blocs';

@Component({
  imports: [Blocs],
  template: `<mp-blocs id="explication" titre="Comment ça marche" [blocs]="blocs" />`,
})
class Hote {
  blocs = [{ titre: 'Étape', texte: 'Un texte.' }];
}

describe('Blocs', () => {
  it('nomme la section par son seul titre, sans id en double', async () => {
    const fixture = TestBed.createComponent(Hote);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const section = el.querySelector('section')!;
    const cible = el.querySelectorAll(`#${section.getAttribute('aria-labelledby')}`);
    expect(cible).toHaveLength(1);
    expect(cible[0].tagName).toBe('H2');
    expect(cible[0].textContent).toBe('Comment ça marche');
    expect(el.querySelectorAll('#explication')).toHaveLength(1);
  });
});
