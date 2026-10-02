import { Component, inject, signal } from '@angular/core';
import { AnalyticsService } from '@mp/core';
import { CHAMPS, FORMULAIRE, initialiserIonic } from '@mp/ui/formulaires';

/**
 * Le module métier : seule partie du code propre à ce produit. À remplacer
 * par la fiche `prompts/contrat-saisonnier/01-module-metier.md`. Il montre déjà
 * l'événement d'activation que le module réel devra émettre. Champs et
 * boutons : Ionic par `@mp/ui/formulaires` (`ion-input`, `ion-segment`,
 * `ion-button`) ; motifs de mise en page dans `libs/ui/styles/base.css`
 * (étapes numérotées, jauge, résumé, barre collante).
 */
@Component({
  selector: 'app-metier',
  imports: [FORMULAIRE],
  providers: [CHAMPS],
  // Composants Ionic construits dans le navigateur (voir @mp/ui/formulaires).
  host: { ngSkipHydration: 'true' },
  template: `
    <section class="card" aria-labelledby="metier-titre">
      <h2 id="metier-titre">Commencer</h2>
      @if (!commence()) {
        <ion-button (click)="commencer()">Commencer</ion-button>
      } @else {
        <p role="status">L'outil arrive ici.</p>
      }
    </section>
  `,
})
export class Metier {
  private readonly analytics = inject(AnalyticsService);
  protected readonly commence = signal(false);

  constructor() {
    initialiserIonic();
  }

  protected commencer(): void {
    this.commence.set(true);
    this.analytics.track('outil_commence');
  }
}
