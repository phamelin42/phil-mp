import { Component, inject, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { Contenu, SeoService } from '@mp/core';
import { CHAMPS, FORMULAIRE, initialiserIonic } from '@mp/ui/formulaires';
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
  imports: [Blocs, CalendrierMois, Faq, FormField, FORMULAIRE, Hero, OffreBlock],
  providers: [CHAMPS],
  host: { ngSkipHydration: 'true' },
  template: `
    <mp-hero [titre]="c.accueil.titre" [chapo]="c.accueil.chapo" />
    <section class="card" aria-labelledby="boutons">
      <h2 id="boutons">Boutons</h2>
      <p class="actions">
        <button type="button" class="btn btn-primary">Action principale</button>
        <button type="button" class="btn btn-secondary">Action secondaire</button>
      </p>
    </section>
    <section class="card" aria-labelledby="formulaires">
      <h2 id="formulaires" class="etape">
        <span class="etape-numero" aria-hidden="true">1</span>Formulaires (Ionic)
      </h2>
      <div class="progression">
        <p class="etat" id="exemple-progression">2 étapes sur 4 renseignées</p>
        <progress class="jauge" max="4" value="2" aria-labelledby="exemple-progression"></progress>
      </div>
      <div class="grille-champs">
        <ion-input
          label="Champ vide"
          labelPlacement="stacked"
          fill="outline"
          id="exemple-vide"
          [formField]="f.vide"
        ></ion-input>
        <ion-input
          label="Avec aide et unité"
          labelPlacement="stacked"
          fill="outline"
          id="exemple-aide"
          type="number"
          [formField]="f.montant"
          helperText="Une aide longue passe sous le champ sans décaler son voisin."
        >
          <span slot="end">€</span>
        </ion-input>
        <ion-input
          label="Obligatoire"
          labelPlacement="stacked"
          fill="outline"
          id="exemple-erreur"
          [formField]="f.obligatoire"
          errorText="Ce champ est obligatoire."
        ></ion-input>
        <label class="champ-liste">
          <span>Liste native</span>
          <select id="exemple-liste" [formField]="f.choix">
            <option value="a">Premier choix</option>
            <option value="b">Second choix</option>
          </select>
        </label>
        <ion-textarea
          label="Zone de texte"
          labelPlacement="stacked"
          fill="outline"
          id="exemple-texte"
          [autoGrow]="true"
          [formField]="f.texte"
          class="champ-large"
        ></ion-textarea>
      </div>
      <p class="aide" id="exemple-segment-libelle">Choix court</p>
      <ion-segment
        id="exemple-segment"
        aria-labelledby="exemple-segment-libelle"
        [formField]="f.choix"
      >
        <ion-segment-button value="a"><ion-label>Premier</ion-label></ion-segment-button>
        <ion-segment-button value="b"><ion-label>Second</ion-label></ion-segment-button>
      </ion-segment>
      <fieldset class="cartes-choix">
        <legend class="visuellement-cache">Cartes de choix</legend>
        <label class="carte-choix">
          <input type="radio" value="a" [formField]="f.choix" />
          <span
            ><strong>Carte A</strong><span class="aide">Une option et sa description.</span></span
          >
        </label>
        <label class="carte-choix">
          <input type="radio" value="b" [formField]="f.choix" />
          <span><strong>Carte B</strong><span class="aide">L’option retenue s’allume.</span></span>
        </label>
      </fieldset>
      <p class="actions">
        <ion-button>Ionic principal</ion-button>
        <ion-button fill="outline">Ionic secondaire</ion-button>
        <ion-button fill="outline" [disabled]="true">Indisponible</ion-button>
      </p>
    </section>
    <section class="card" aria-labelledby="resultats">
      <h2 id="resultats">Résultat</h2>
      <div class="resume">
        <p>Chiffre clé <strong class="chiffre-cle">38,00 €</strong></p>
        <ul class="postes">
          <li>
            <span>Premier poste</span><strong>11,25 €</strong>
            <progress class="jauge" max="18" value="11" aria-label="Premier poste"></progress>
          </li>
          <li>
            <span>Second poste</span><strong>3,60 €</strong>
            <progress class="jauge" max="18" value="4" aria-label="Second poste"></progress>
          </li>
        </ul>
      </div>
      <div class="barre-collante">
        <p>Total<br /><strong class="chiffre-barre">38,00 €</strong></p>
        <ion-button>Action</ion-button>
      </div>
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
  protected readonly f = form(
    signal({ vide: '', montant: 12, obligatoire: '', choix: 'a', texte: '' }),
    (p) => required(p.obligatoire),
  );
  /** Deux séries en alternance hebdomadaire, une période marquée. */
  protected readonly joursExemple: JourCalendrier[] = Array.from({ length: 31 }, (_, i) => ({
    date: `2026-10-${String(i + 1).padStart(2, '0')}`,
    classe: `${Math.floor((i + 3) / 7) % 2 ? 'serie-2' : 'serie-1'}${i >= 16 ? ' marque' : ''}`,
    libelle: Math.floor((i + 3) / 7) % 2 ? 'Série 2' : 'Série 1',
  }));

  constructor() {
    initialiserIonic();
    inject(SeoService).apply({
      title: 'Vitrine des composants partagés',
      description: contenu.aide.description,
      path: '/',
      noIndex: true,
    });
  }
}
