import { Component, input } from '@angular/core';
import { Bloc } from '@mp/core';
import { Paragraphes } from './paragraphes';

/**
 * Une section titrée faite de blocs (explication, exemples, aide). `id`
 * reste sur l'élément hôte, cible des ancres (#explication) ; le titre prend
 * `<id>-titre`, sans quoi la section serait nommée par tout son contenu.
 */
@Component({
  selector: 'mp-blocs',
  imports: [Paragraphes],
  template: `
    <section class="blocs" [attr.aria-labelledby]="id() + '-titre'">
      <h2 [id]="id() + '-titre'">{{ titre() }}</h2>
      @for (bloc of blocs(); track bloc.titre) {
        <h3>{{ bloc.titre }}</h3>
        <mp-paragraphes [texte]="bloc.texte" />
      }
    </section>
  `,
})
export class Blocs {
  readonly titre = input.required<string>();
  readonly id = input.required<string>();
  readonly blocs = input.required<readonly Bloc[]>();
}
