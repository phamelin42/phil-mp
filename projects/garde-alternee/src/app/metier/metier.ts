import {
  Component,
  DOCUMENT,
  DestroyRef,
  PLATFORM_ID,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormField, form, maxLength, validate } from '@angular/forms/signals';
import { AnalyticsService, KvStoreService } from '@mp/core';
import { CalendrierMois, JourCalendrier } from '@mp/ui/sections';
import { CONSIGNES, FORMATS_EXPORT, FormatExport, nomDeFichier } from './data/export';
import { dateLongue, moisDeLAnnee } from './data/format';
import { versIcal } from './data/ical';
import {
  Champ,
  LIMITE_NOM,
  MESSAGES,
  Parent,
  Planning,
  RYTHMES,
  Rythme,
  anneeScolaire,
  champsManquants,
  dateDuJour,
  erreur,
  estEntame,
  joursDeLAnnee,
  nomDe,
  planningVide,
  repartition,
  restaurerPlanning,
} from './data/planning';
import { ANNEES_SCOLAIRES, ZONES } from './data/vacances';

/** Clé du planning en cours dans IndexedDB (`KvStoreService`). */
export const CLE_PLANNING = 'garde-alternee.planning';
/** Délai entre la dernière frappe et l'enregistrement. */
export const DELAI_ENREGISTREMENT = 400;

const LIBELLES_RYTHME: Record<Rythme, string> = {
  semaine: 'Une semaine sur deux (7 jours, 7 jours)',
  '2-2-3': '2-2-3 (deux jours, deux jours, trois jours)',
  '2-2-5-5': '2-2-5-5 (jours fixes, un week-end sur deux)',
  'week-end': 'Un week-end sur deux, du vendredi au dimanche',
};

type EtatEnregistrement = 'attente' | 'enregistre' | 'erreur';

/**
 * Le module métier de Planning Garde Alternée : le formulaire du rythme, le
 * calendrier de l'année et ses exports. Les calculs vivent dans `data/`.
 */
@Component({
  selector: 'app-metier',
  imports: [CalendrierMois, FormField],
  templateUrl: './metier.html',
})
export class Metier {
  private readonly analytics = inject(AnalyticsService);
  private readonly kv = inject(KvStoreService);
  private readonly document = inject(DOCUMENT);
  private readonly navigateur = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly modele = signal<Planning>(planningVide());
  protected readonly f = form(this.modele, (p) => {
    const champs = { parentA: p.parentA, parentB: p.parentB, depart: p.depart };
    for (const champ of Object.keys(champs) as Champ[]) {
      validate(champs[champ], ({ valueOf }) => {
        const message = erreur(champ, valueOf(p));
        return message ? { kind: 'planning', message } : null;
      });
    }
    maxLength(p.parentA, LIMITE_NOM);
    maxLength(p.parentB, LIMITE_NOM);
  });

  protected readonly rythmes = RYTHMES;
  protected readonly libellesRythme = LIBELLES_RYTHME;
  protected readonly zones = ZONES;
  protected readonly annees = ANNEES_SCOLAIRES;
  protected readonly formats = FORMATS_EXPORT;
  protected readonly consignes = CONSIGNES;
  protected readonly nom = (p: Parent) => nomDe(this.modele(), p);

  protected readonly jours = computed(() => joursDeLAnnee(this.modele()));
  protected readonly mois = computed(() => moisDeLAnnee(this.modele().annee));
  protected readonly compte = computed(() => repartition(this.jours()));
  protected readonly manquants = computed(() =>
    champsManquants(this.modele()).map((c) => ({ champ: c, message: MESSAGES[c] })),
  );
  protected readonly marques = computed<JourCalendrier[]>(() => {
    const planning = this.modele();
    return this.jours().map((j) => ({
      date: j.date,
      classe: `${j.parent === 'A' ? 'serie-1' : 'serie-2'}${j.vacances ? ' marque' : ''}`,
      libelle: `${nomDe(planning, j.parent)}${j.vacances ? `, vacances (${j.vacances})` : ''}`,
    }));
  });
  protected legende(p: Parent): string {
    return this.jours().length ? `${this.nom(p)}\u00a0: ${this.compte()[p]} jours` : this.nom(p);
  }
  protected readonly depart = computed(() => dateLongue(this.modele().depart));

  protected readonly charge = signal(false);
  protected readonly enregistrement = signal<EtatEnregistrement>('attente');

  private reference = '';
  private commence = false;
  private termine = false;
  private minuterie: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    afterNextRender(() => void this.reprendre());

    effect(() => {
      const planning = this.modele();
      if (!this.charge()) return;
      untracked(() => {
        this.mesurer(planning);
        this.programmerEnregistrement(planning);
      });
    });

    inject(DestroyRef).onDestroy(() => clearTimeout(this.minuterie));
  }

  /** Erreur à afficher sous un champ : après qu'on l'a quitté. */
  protected erreurDe(etat: {
    touched(): boolean;
    errors(): readonly { message?: string }[];
  }): string | null {
    return etat.touched() ? (etat.errors()[0]?.message ?? null) : null;
  }

  protected choisirAnnee(evenement: Event): void {
    const annee = Number((evenement.target as HTMLSelectElement).value);
    this.modele.update((p) => restaurerPlanning({ ...p, annee }) ?? p);
  }

  protected exporter(format: FormatExport): void {
    const fenetre = this.document.defaultView;
    if (!fenetre) return;
    const planning = this.modele();
    if (format === 'ical') {
      const ics = versIcal(planning, this.jours(), new Date());
      const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
      const lien = this.document.createElement('a');
      lien.href = url;
      lien.download = `${nomDeFichier(planning)}.ics`;
      lien.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } else {
      const titre = this.document.title;
      this.document.title = nomDeFichier(planning);
      fenetre.addEventListener('afterprint', () => (this.document.title = titre), { once: true });
      fenetre.print();
    }
    this.analytics.track('export_fait', { format });
  }

  protected allerA(champ: Champ): void {
    this.document.getElementById(champ)?.focus();
  }

  private async reprendre(): Promise<void> {
    let planning: Planning | null;
    try {
      planning = restaurerPlanning(await this.kv.read<unknown>(CLE_PLANNING));
    } catch {
      planning = null;
    }
    if (planning && estEntame(planning)) {
      this.modele.set(planning);
      this.analytics.track('donnees_reprises');
    } else {
      const annee = anneeScolaire(dateDuJour(new Date()));
      this.modele.update((p) => restaurerPlanning({ ...p, annee }) ?? p);
    }
    this.reference = JSON.stringify(this.modele());
    this.termine = champsManquants(this.modele()).length === 0;
    this.charge.set(true);
  }

  /**
   * `outil_commence` à la première saisie, `outil_termine` la première fois
   * que le calendrier devient complet : une fois chacun par visite.
   */
  private mesurer(planning: Planning): void {
    if (!this.commence && JSON.stringify(planning) !== this.reference) {
      this.commence = true;
      this.analytics.track('outil_commence');
    }
    if (!this.termine && champsManquants(planning).length === 0) {
      this.termine = true;
      this.analytics.track('outil_termine');
    }
  }

  private programmerEnregistrement(planning: Planning): void {
    if (!this.navigateur) return;
    clearTimeout(this.minuterie);
    this.minuterie = setTimeout(() => {
      this.kv.write(CLE_PLANNING, planning).then(
        () => this.enregistrement.set('enregistre'),
        () => this.enregistrement.set('erreur'),
      );
    }, DELAI_ENREGISTREMENT);
  }
}
