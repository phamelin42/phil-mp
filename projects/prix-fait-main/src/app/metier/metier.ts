import {
  Component,
  DOCUMENT,
  DestroyRef,
  Injector,
  PLATFORM_ID,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormField, applyEach, form, max, maxLength, min } from '@angular/forms/signals';
import { AnalyticsService, KvStoreService } from '@mp/core';
import { calculer, coutMatiere } from './data/calculs';
import { CONSIGNES, FormatExport, nomDeFichier, versCsv } from './data/export';
import {
  Fiche,
  LIMITES,
  estEntamee,
  ficheSuivante,
  ficheVide,
  matiereVide,
  restaurerFiche,
} from './data/fiche';
import { euros, pourcentage } from './data/format';
import { CHAMP_MANQUE, LIBELLES_MANQUE, Manque, manques } from './data/regles';
import { FichePrix } from './fiche-prix';

/** Clé de la fiche en cours dans IndexedDB (`KvStoreService`). */
export const CLE_FICHE = 'prix-fait-main.fiche';
/** Délai entre la dernière frappe et l'enregistrement. */
export const DELAI_ENREGISTREMENT = 400;

type EtatEnregistrement = 'attente' | 'enregistre' | 'erreur';

const POSITIF = { message: 'Un nombre positif ou zéro.' };
const POURCENT = { message: 'Entre 0 et 100 %.' };

/**
 * Le module métier de Prix Fait Main : la saisie des coûts, le prix calculé
 * et les exports. Les calculs vivent dans `data/` ; ce composant ne fait que
 * relier la saisie, l'enregistrement local et la mesure.
 */
@Component({
  selector: 'app-metier',
  imports: [FichePrix, FormField],
  templateUrl: './metier.html',
})
export class Metier {
  private readonly analytics = inject(AnalyticsService);
  private readonly kv = inject(KvStoreService);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly navigateur = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly modele = signal<Fiche>(ficheVide());
  protected readonly f = form(this.modele, (p) => {
    maxLength(p.nom, LIMITES.texte);
    applyEach(p.matieres, (m) => {
      maxLength(m.nom, LIMITES.texte);
      maxLength(m.unite, 20);
      min(m.prixAchat, 0, POSITIF);
      min(m.quantiteAchetee, 0, POSITIF);
      min(m.quantiteUtilisee, 0, POSITIF);
    });
    min(p.minutes, 0, POSITIF);
    max(p.minutes, LIMITES.minutes, { message: 'Plus de 1 600 heures : vérifiez l’unité.' });
    min(p.tauxHoraire, 0, POSITIF);
    min(p.fraisParPiece, 0, POSITIF);
    min(p.margePct, 0, POSITIF);
    min(p.coefficientDetail, 1, { message: 'Au moins 1.' });
    max(p.coefficientDetail, LIMITES.coefficient, { message: 'Au plus 10.' });
    for (const pct of [p.cotisationsPct, p.commissionPct]) {
      min(pct, 0, POURCENT);
      max(pct, 100, POURCENT);
    }
    min(p.fraisParVente, 0, POSITIF);
  });

  protected readonly resultat = computed(() => calculer(this.modele()));
  protected readonly manques = computed(() => manques(this.modele()));
  protected readonly assujetti = computed(() => this.modele().regimeTva === 'assujetti');
  protected readonly consignes = CONSIGNES;
  protected readonly libellesManque = LIBELLES_MANQUE;
  protected readonly champManque = CHAMP_MANQUE;
  protected readonly eur = euros;
  protected readonly pct = pourcentage;
  protected readonly cout = coutMatiere;

  protected readonly charge = signal(false);
  protected readonly enregistrement = signal<EtatEnregistrement>('attente');
  protected readonly confirmerNouvelle = signal(false);

  /** État au chargement : ce qui diffère ensuite vient de la personne. */
  private reference = '';
  private commence = false;
  private termine = false;
  private minuterie: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    afterNextRender(() => void this.reprendre());

    effect(() => {
      const fiche = this.modele();
      if (!this.charge()) return;
      untracked(() => {
        this.mesurer(fiche);
        this.programmerEnregistrement(fiche);
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

  protected ajouterMatiere(): void {
    if (this.modele().matieres.length >= LIMITES.matieres) return;
    this.modele.update((f) => ({ ...f, matieres: [...f.matieres, matiereVide()] }));
    const rang = this.modele().matieres.length - 1;
    afterNextRender(() => this.document.getElementById(`matiere-${rang}-nom`)?.focus(), {
      injector: this.injector,
    });
  }

  protected supprimerMatiere(rang: number): void {
    if (this.modele().matieres.length <= 1) return;
    this.modele.update((f) => ({ ...f, matieres: f.matieres.filter((_, i) => i !== rang) }));
    afterNextRender(() => this.document.getElementById('ajouter-matiere')?.focus(), {
      injector: this.injector,
    });
  }

  protected allerA(manque: Manque): void {
    this.document.getElementById(CHAMP_MANQUE[manque])?.focus();
  }

  protected nouvelleFiche(): void {
    this.confirmerNouvelle.set(false);
    const suivante = ficheSuivante(this.modele());
    this.f().reset();
    this.reference = JSON.stringify(suivante);
    this.commence = false;
    this.termine = false;
    this.modele.set(suivante);
    afterNextRender(() => this.document.getElementById('nom')?.focus(), {
      injector: this.injector,
    });
  }

  protected exporter(format: FormatExport): void {
    const fenetre = this.document.defaultView;
    const resultat = this.resultat();
    if (!fenetre || !resultat) return;
    const nom = nomDeFichier(this.modele());
    if (format === 'csv') {
      const url = URL.createObjectURL(
        new Blob([versCsv(this.modele(), resultat)], { type: 'text/csv;charset=utf-8' }),
      );
      const lien = this.document.createElement('a');
      lien.href = url;
      lien.download = `${nom}.csv`;
      lien.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } else {
      const titre = this.document.title;
      this.document.title = nom;
      fenetre.addEventListener('afterprint', () => (this.document.title = titre), { once: true });
      fenetre.print();
    }
    this.analytics.track('export_fait', { format });
  }

  private async reprendre(): Promise<void> {
    let fiche: Fiche | null;
    try {
      fiche = restaurerFiche(await this.kv.read<unknown>(CLE_FICHE));
    } catch {
      fiche = null;
    }
    if (fiche && estEntamee(fiche)) {
      this.modele.set(fiche);
      this.analytics.track('donnees_reprises');
    }
    this.reference = JSON.stringify(this.modele());
    this.termine = manques(this.modele()).length === 0;
    this.charge.set(true);
  }

  /**
   * `outil_commence` à la première saisie, `outil_termine` la première fois
   * que le prix devient calculable : une fois chacun par fiche et par visite.
   */
  private mesurer(fiche: Fiche): void {
    if (!this.commence && JSON.stringify(fiche) !== this.reference) {
      this.commence = true;
      this.analytics.track('outil_commence');
    }
    if (!this.termine && manques(fiche).length === 0) {
      this.termine = true;
      this.analytics.track('outil_termine');
    }
  }

  private programmerEnregistrement(fiche: Fiche): void {
    if (!this.navigateur) return;
    clearTimeout(this.minuterie);
    this.minuterie = setTimeout(() => {
      this.kv.write(CLE_FICHE, fiche).then(
        () => this.enregistrement.set('enregistre'),
        () => this.enregistrement.set('erreur'),
      );
    }, DELAI_ENREGISTREMENT);
  }
}
