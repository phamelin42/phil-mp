import { Component, computed, input } from '@angular/core';
import { Resultat } from './data/calculs';
import { detail } from './data/export';
import { Fiche } from './data/fiche';
import { euros } from './data/format';

/**
 * La fiche de prix telle qu'elle s'imprime : à l'écran, elle sert de
 * résultat ; à l'impression, elle est seule sur la page (`.document`,
 * `print.css`).
 */
@Component({
  selector: 'app-fiche-prix',
  template: `
    <article class="document" aria-labelledby="fiche-titre">
      <h3 id="fiche-titre">{{ fiche().nom.trim() || 'Ma création' }}</h3>
      <div class="tableau-defilant" role="region" aria-label="Détail du calcul" tabindex="0">
        <table class="tableau">
          <thead>
            <tr>
              <th scope="col">Poste</th>
              <th scope="col">Détail</th>
              <th scope="col" class="nombre">Montant</th>
            </tr>
          </thead>
          <tbody>
            @for (l of lignes(); track $index) {
              <tr>
                <th scope="row">{{ l[0] }}</th>
                <td>{{ l[1] }}</td>
                <td class="nombre">{{ eur(l[2]) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (!assujetti()) {
        <p>Prix sans TVA : franchise en base.</p>
      }
    </article>
  `,
})
export class FichePrix {
  readonly fiche = input.required<Fiche>();
  readonly resultat = input.required<Resultat>();

  protected readonly lignes = computed(() => detail(this.fiche(), this.resultat()));
  protected readonly assujetti = computed(() => this.fiche().regimeTva === 'assujetti');
  protected readonly eur = euros;
}
