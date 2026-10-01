import { Component, inject } from '@angular/core';
import { Contenu, SeoService } from '@mp/core';
import { Blocs, CalendrierMois, Faq, Hero, JourCalendrier, OffreBlock } from '@mp/ui/sections';
import contenu from '../../contenu.json';

/**
 * Vitrine interne : chaque composant de `@mp/ui` dans ses états, avec le
 * thème de ce faux produit. Non indexée, jamais publiée. Un composant ajouté
 * à `libs/ui` y entre (tools/check-vitrine.mjs). Ses textes sont des
 * exemples, exclus du contrôle de contenu unique.
 */
@Component({
  selector: 'app-vitrine-page',
  imports: [Blocs, CalendrierMois, Faq, Hero, OffreBlock],
  template: `
    <mp-hero [titre]="c.accueil.titre" [chapo]="c.accueil.chapo" />
    <section class="card" aria-labelledby="boutons">
      <h2 id="boutons">Boutons</h2>
      <p>
        <button type="button" class="btn btn-primary">Action principale</button>
        <button type="button" class="btn btn-secondary">Action secondaire</button>
      </p>
    </section>
    <mp-blocs id="blocs" titre="Blocs" [blocs]="c.accueil.explication" />
    <section class="card" aria-labelledby="calendrier">
      <h2 id="calendrier">Calendrier</h2>
      <div class="grille-calendriers">
        <mp-calendrier-mois [annee]="2026" [mois]="10" [jours]="joursExemple" />
        <mp-calendrier-mois [annee]="2026" [mois]="11" />
      </div>
    </section>
    <mp-faq [questions]="c.aide.faq" />
    <mp-offre-block [offre]="c.offre" />
  `,
})
export class VitrinePage {
  protected readonly c: Contenu = contenu;
  /** Deux séries en alternance hebdomadaire, une période marquée. */
  protected readonly joursExemple: JourCalendrier[] = Array.from({ length: 31 }, (_, i) => ({
    date: `2026-10-${String(i + 1).padStart(2, '0')}`,
    classe: `${Math.floor((i + 3) / 7) % 2 ? 'serie-2' : 'serie-1'}${i >= 16 ? ' marque' : ''}`,
    libelle: Math.floor((i + 3) / 7) % 2 ? 'Série 2' : 'Série 1',
  }));

  constructor() {
    inject(SeoService).apply({
      title: 'Vitrine des composants partagés',
      description: contenu.aide.description,
      path: '/',
      noIndex: true,
    });
  }
}
