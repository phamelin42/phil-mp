import { Component, computed, input } from '@angular/core';
import { centimes, totaux } from './data/calculs';
import { Devis } from './data/devis';
import { dateLongue, euros, quantite, taux } from './data/format';
import { MENTION_SIGNATURE, identite, mentions } from './data/mentions';

/**
 * Le devis tel qu'il s'imprime : à l'écran, il sert d'aperçu ; à
 * l'impression, il est seul sur la page (`.document`, `print.css`).
 */
@Component({
  selector: 'app-apercu-devis',
  template: `
    <article class="document" aria-labelledby="apercu-titre">
      <header class="document-entete">
        <div>
          @if (devis().logo) {
            <img
              class="document-logo"
              [src]="devis().logo"
              alt="Logo de l’entreprise"
              width="160"
              height="80"
            />
          }
          @for (l of entete(); track $index) {
            <p>{{ l }}</p>
          }
        </div>
        <div>
          <h3 id="apercu-titre">Devis n°&nbsp;{{ devis().numero || '[à compléter]' }}</h3>
          <p>Date&nbsp;: {{ date() || '[à compléter]' }}</p>
        </div>
      </header>

      <div class="document-bloc">
        <p><strong>Client</strong></p>
        <p>{{ devis().client.nom || '[à compléter]' }}</p>
        @for (l of lignesAdresse(devis().client.adresse); track $index) {
          <p>{{ l }}</p>
        }
        @if (devis().client.adresseChantier.trim()) {
          <p>Adresse du chantier&nbsp;: {{ devis().client.adresseChantier }}</p>
        }
      </div>

      <div class="tableau-defilant" role="region" aria-label="Prestations du devis" tabindex="0">
        <table class="tableau">
          <thead>
            <tr>
              <th scope="col">Désignation</th>
              <th scope="col" class="nombre">Qté</th>
              <th scope="col" class="nombre">Prix unitaire HT</th>
              @if (!franchise()) {
                <th scope="col" class="nombre">TVA</th>
              }
              <th scope="col" class="nombre">Total HT</th>
            </tr>
          </thead>
          <tbody>
            @for (l of devis().lignes; track $index) {
              <tr>
                <td>{{ l.designation || '[à compléter]' }}</td>
                <td class="nombre">{{ qte(l.quantite) }}&nbsp;{{ l.unite }}</td>
                <td class="nombre">{{ eur(cts(l.prixUnitaire)) }}</td>
                @if (!franchise()) {
                  <td class="nombre">{{ pct(l.tauxTva) }}</td>
                }
                <td class="nombre">{{ eur(t().lignesHt[$index]) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <table class="tableau totaux">
        <tbody>
          <tr>
            <th scope="row">Total HT</th>
            <td class="nombre">{{ eur(t().totalHt) }}</td>
          </tr>
          @for (x of t().parTaux; track x.taux) {
            <tr>
              <th scope="row">TVA {{ pct(x.taux) }} sur {{ eur(x.baseHt) }}</th>
              <td class="nombre">{{ eur(x.tva) }}</td>
            </tr>
          }
          <tr>
            <th scope="row">{{ franchise() ? 'Net à payer' : 'Total TTC' }}</th>
            <td class="nombre">
              <strong>{{ eur(t().totalTtc) }}</strong>
            </td>
          </tr>
        </tbody>
      </table>

      <ul class="mentions">
        @for (m of basDePage(); track $index) {
          <li>{{ m }}</li>
        }
      </ul>

      <p>{{ signature }}</p>
      <div class="signature"></div>
    </article>
  `,
})
export class ApercuDevis {
  readonly devis = input.required<Devis>();

  protected readonly t = computed(() => totaux(this.devis()));
  protected readonly franchise = computed(() => this.devis().regimeTva === 'franchise');
  protected readonly entete = computed(() => identite(this.devis()));
  protected readonly basDePage = computed(() => mentions(this.devis(), this.t()));
  protected readonly date = computed(() => dateLongue(this.devis().date));
  protected readonly signature = MENTION_SIGNATURE;

  protected readonly eur = euros;
  protected readonly cts = centimes;
  protected readonly qte = quantite;
  protected readonly pct = taux;

  protected lignesAdresse(adresse: string): string[] {
    return adresse.split('\n').filter((l) => l.trim());
  }
}
