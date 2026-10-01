import { Component, computed, input } from '@angular/core';

/** Un jour marqué sur le calendrier : sa classe (couleur) et son libellé lu par les lecteurs d'écran. */
export interface JourCalendrier {
  /** AAAA-MM-JJ. */
  date: string;
  /** `serie-1`, `serie-2` (couleurs de `tokens.css`), suivie ou non de `marque`. */
  classe?: string;
  /** Texte lu après le numéro du jour (« Marie, vacances de Noël »). */
  libelle?: string;
}

const MOIS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

interface Case {
  numero: number;
  classe: string;
  libelle: string;
}

/** Un mois en grille du lundi au dimanche, chaque jour coloré selon sa série. */
@Component({
  selector: 'mp-calendrier-mois',
  template: `
    <table class="calendrier-mois">
      <caption>
        {{
          titre()
        }}
      </caption>
      <thead>
        <tr>
          @for (j of nomsJours; track j) {
            <th scope="col" [attr.abbr]="j">{{ j.charAt(0).toUpperCase() }}</th>
          }
        </tr>
      </thead>
      <tbody>
        @for (semaine of semaines(); track $index) {
          <tr>
            @for (c of semaine; track $index) {
              @if (c) {
                <td [class]="c.classe">
                  {{ c.numero }}
                  @if (c.libelle) {
                    <span class="visuellement-cache">{{ c.libelle }}</span>
                  }
                </td>
              } @else {
                <td></td>
              }
            }
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class CalendrierMois {
  readonly annee = input.required<number>();
  /** 1 à 12. */
  readonly mois = input.required<number>();
  readonly jours = input<readonly JourCalendrier[]>([]);

  protected readonly nomsJours = JOURS;
  protected readonly titre = computed(() => `${MOIS[this.mois() - 1]} ${this.annee()}`);

  protected readonly semaines = computed(() => {
    const a = this.annee();
    const m = this.mois();
    const prefixe = `${a}-${String(m).padStart(2, '0')}-`;
    const marques = new Map(
      this.jours()
        .filter((j) => j.date.startsWith(prefixe))
        .map((j) => [Number(j.date.slice(8)), j]),
    );
    const total = new Date(Date.UTC(a, m, 0)).getUTCDate();
    // getUTCDay : 0 = dimanche ; on décale pour commencer au lundi.
    const decalage = (new Date(Date.UTC(a, m - 1, 1)).getUTCDay() + 6) % 7;
    const cases: (Case | null)[] = Array.from({ length: decalage }, () => null);
    for (let n = 1; n <= total; n++) {
      const j = marques.get(n);
      cases.push({ numero: n, classe: j?.classe ?? '', libelle: j?.libelle ?? '' });
    }
    while (cases.length % 7) cases.push(null);
    const semaines: (Case | null)[][] = [];
    for (let i = 0; i < cases.length; i += 7) semaines.push(cases.slice(i, i + 7));
    return semaines;
  });
}
