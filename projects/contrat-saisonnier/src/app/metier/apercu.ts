import { Component, computed, input } from '@angular/core';
import { articles, faitA } from './data/clauses';
import { Contrat, Partie } from './data/contrat';
import { dateLongue } from './data/format';

/**
 * Le contrat tel qu'il s'imprime, suivi de son annexe (état des lieux et
 * inventaire, cases d'entrée et de sortie à remplir sur place). À l'écran, il
 * sert d'aperçu ; à l'impression, il est seul sur la page (`.document`,
 * `print.css`).
 */
@Component({
  selector: 'app-apercu-contrat',
  template: `
    <article class="document" aria-labelledby="apercu-titre">
      <h3 id="apercu-titre">Contrat de location saisonnière</h3>

      <div class="document-entete">
        @for (p of parties(); track p.role) {
          <div class="document-bloc">
            <p>
              <strong>{{ p.role }}</strong>
            </p>
            <p>{{ p.partie.nom || '[à compléter]' }}</p>
            @for (l of lignes(p.partie.adresse); track $index) {
              <p>{{ l }}</p>
            }
            @if (p.partie.telephone.trim()) {
              <p>{{ p.partie.telephone }}</p>
            }
            @if (p.partie.email.trim()) {
              <p>{{ p.partie.email }}</p>
            }
          </div>
        }
      </div>

      @for (a of texte(); track $index) {
        <h4>Article {{ $index + 1 }}. {{ a.titre }}</h4>
        @for (p of a.paragraphes; track $index) {
          <p>{{ p }}</p>
        }
      }

      <p>{{ fait() }}</p>
      <div class="grille-champs">
        <div>
          <p>Le bailleur, «&nbsp;lu et approuvé&nbsp;»</p>
          <div class="signature"></div>
        </div>
        <div>
          <p>Le locataire, «&nbsp;lu et approuvé&nbsp;»</p>
          <div class="signature"></div>
        </div>
      </div>

      <section class="document-annexe" aria-labelledby="annexe-titre">
        <h3 id="annexe-titre">Annexe&nbsp;: état des lieux et inventaire</h3>
        <p>
          Logement&nbsp;: {{ adresse() || '[à compléter]' }}. Séjour du
          {{ arrivee() || '[à compléter]' }} au {{ depart() || '[à compléter]' }}.
        </p>
        <p>
          À remplir ensemble à l’arrivée puis au départ&nbsp;: B = bon état, U = usure normale, D =
          dégradé, M = manquant.
        </p>
        @for (piece of contrat().pieces; track $index) {
          <div
            class="tableau-defilant"
            role="region"
            [attr.aria-label]="piece.nom || 'Pièce'"
            tabindex="0"
          >
            <table class="tableau">
              <caption>
                {{
                  piece.nom || '[à compléter]'
                }}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Élément</th>
                  <th scope="col" class="nombre">Qté</th>
                  <th scope="col">Entrée</th>
                  <th scope="col">Sortie</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Murs, sols, plafonds</td>
                  <td class="nombre"></td>
                  <td></td>
                  <td></td>
                </tr>
                @for (o of piece.objets; track $index) {
                  <tr>
                    <td>{{ o.designation || '[à compléter]' }}</td>
                    <td class="nombre">{{ o.quantite }}</td>
                    <td></td>
                    <td></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        <p>Observations :</p>
        <div class="signature"></div>
        <div class="grille-champs">
          <div>
            <p>À l’arrivée, le ……………&nbsp;: bailleur et locataire</p>
            <div class="signature"></div>
          </div>
          <div>
            <p>Au départ, le ……………&nbsp;: bailleur et locataire</p>
            <div class="signature"></div>
          </div>
        </div>
      </section>
    </article>
  `,
})
export class ApercuContrat {
  readonly contrat = input.required<Contrat>();

  protected readonly texte = computed(() => articles(this.contrat()));
  protected readonly fait = computed(() => faitA(this.contrat()));
  protected readonly parties = computed((): { role: string; partie: Partie }[] => [
    { role: 'Le bailleur', partie: this.contrat().bailleur },
    { role: 'Le locataire', partie: this.contrat().locataire },
  ]);
  protected readonly adresse = computed(() =>
    this.lignes(this.contrat().logement.adresse).join(', '),
  );
  protected readonly arrivee = computed(() => dateLongue(this.contrat().sejour.arrivee));
  protected readonly depart = computed(() => dateLongue(this.contrat().sejour.depart));

  protected lignes(adresse: string): string[] {
    return adresse
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  }
}
