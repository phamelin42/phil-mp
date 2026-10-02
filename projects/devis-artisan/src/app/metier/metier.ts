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
import {
  FormField,
  SchemaPath,
  SchemaPathTree,
  applyEach,
  form,
  max,
  maxLength,
  min,
  validate,
} from '@angular/forms/signals';
import { AnalyticsService, KvStoreService } from '@mp/core';
import { CHAMPS, FORMULAIRE, focaliser, initialiserIonic } from '@mp/ui/formulaires';
import { ApercuDevis } from './apercu';
import { montantLigneHt, totaux } from './data/calculs';
import {
  Devis,
  TAUX_TVA,
  dateDuJour,
  devisSuivant,
  devisVide,
  estEntame,
  ligneVide,
  numeroParDefaut,
  restaurerDevis,
  LIMITES,
} from './data/devis';
import { FORMATS_EXPORT, FormatExport, preparerExport } from './data/export';
import { euros, taux } from './data/format';
import { verifierLogo } from './data/logo';
import { Champ, REGLES, champsManquants, erreur } from './data/regles';

/** Clé du devis en cours dans IndexedDB (`KvStoreService`). */
export const CLE_DEVIS = 'devis-artisan.devis';
/** Délai entre la dernière frappe et l'enregistrement. */
export const DELAI_ENREGISTREMENT = 400;

type EtatEnregistrement = 'attente' | 'enregistre' | 'erreur';

/**
 * Le module métier de Devis Artisan : le formulaire, l'aperçu fidèle et les
 * exports. Calculs et mentions vivent dans `data/` ; ce composant ne fait que
 * relier la saisie, l'enregistrement local et la mesure.
 */
@Component({
  selector: 'app-metier',
  imports: [ApercuDevis, FormField, FORMULAIRE],
  providers: [CHAMPS],
  // Composants Ionic construits dans le navigateur (voir @mp/ui/formulaires).
  host: { ngSkipHydration: 'true' },
  templateUrl: './metier.html',
})
export class Metier {
  private readonly analytics = inject(AnalyticsService);
  private readonly kv = inject(KvStoreService);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly navigateur = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly modele = signal<Devis>(devisVide());
  protected readonly f = form(this.modele, (p) => {
    const champs = chemins(p);
    for (const r of REGLES) {
      validate(champs[r.champ], ({ valueOf }) => {
        const message = erreur(r.champ, valueOf(p));
        return message ? { kind: 'devis', message } : null;
      });
    }
    min(p.validiteJours, 1, { message: 'Au moins un jour.' });
    max(p.validiteJours, 365, { message: 'Au plus 365 jours.' });
    min(p.acomptePct, 0, { message: 'Entre 0 et 100 %.' });
    max(p.acomptePct, 100, { message: 'Entre 0 et 100 %.' });
    applyEach(p.lignes, (l) => {
      min(l.quantite, 0);
      min(l.prixUnitaire, 0);
      maxLength(l.designation, LIMITES.texte);
      maxLength(l.unite, 20);
    });
    for (const texte of [
      p.entreprise.nom,
      p.entreprise.adresse,
      p.client.nom,
      p.client.adresse,
      p.paiement,
    ]) {
      maxLength(texte, LIMITES.texte);
    }
  });

  protected readonly tauxTva = TAUX_TVA;
  protected readonly formats = FORMATS_EXPORT;
  protected readonly eur = euros;
  protected readonly pct = taux;
  protected readonly montant = montantLigneHt;
  protected readonly consignes = computed(() =>
    Object.fromEntries(FORMATS_EXPORT.map((x) => [x, preparerExport(this.modele(), x).consigne])),
  );
  protected readonly manquants = computed(() => champsManquants(this.modele()));
  /** Sections complètes : aucune mention manquante parmi leurs champs. */
  protected readonly sections = computed(() => {
    const manque = this.manquants().map((m) => m.champ);
    const complete = (champs: string[]) =>
      !manque.some((c) => champs.some((x) => c === x || c.startsWith(`${x}.`)));
    return {
      entreprise: complete(['entreprise']),
      client: complete(['client']),
      devis: complete(['numero', 'date', 'debutTravaux', 'dureeTravaux']),
      lignes: complete(['lignes']),
      conditions: complete(['paiement', 'mediateur']),
    } as Record<string, boolean>;
  });
  protected readonly etapesFaites = computed(
    () => Object.values(this.sections()).filter(Boolean).length,
  );
  protected readonly total = computed(() => totaux(this.modele()));
  protected readonly societe = computed(() => this.modele().entreprise.statut === 'societe');
  protected readonly assujetti = computed(() => this.modele().regimeTva === 'assujetti');

  protected readonly charge = signal(false);
  protected readonly enregistrement = signal<EtatEnregistrement>('attente');
  protected readonly erreurLogo = signal<string | null>(null);
  protected readonly confirmerNouveau = signal(false);

  /** État au chargement : ce qui diffère ensuite vient de la personne. */
  private reference = '';
  private commence = false;
  private termine = false;
  private minuterie: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    initialiserIonic();
    afterNextRender(() => void this.reprendre());

    effect(() => {
      const devis = this.modele();
      if (!this.charge()) return;
      untracked(() => {
        this.mesurer(devis);
        this.programmerEnregistrement(devis);
      });
    });

    inject(DestroyRef).onDestroy(() => clearTimeout(this.minuterie));
  }

  /** Message de la première erreur d'un champ (`mat-error` l'affiche au bon moment). */
  protected erreurChamp(etat: { errors(): readonly { message?: string }[] }): string {
    return etat.errors()[0]?.message ?? '';
  }

  /** Erreur à afficher sous un champ : après qu'on l'a quitté. */
  protected erreurDe(etat: {
    touched(): boolean;
    errors(): readonly { message?: string }[];
  }): string | null {
    return etat.touched() ? (etat.errors()[0]?.message ?? null) : null;
  }

  protected ajouterLigne(): void {
    if (this.modele().lignes.length >= LIMITES.lignes) return;
    this.modele.update((d) => ({ ...d, lignes: [...d.lignes, ligneVide()] }));
    const rang = this.modele().lignes.length - 1;
    afterNextRender(() => focaliser(this.document, `ligne-${rang}-designation`), {
      injector: this.injector,
    });
  }

  protected supprimerLigne(rang: number): void {
    if (this.modele().lignes.length <= 1) return;
    this.modele.update((d) => ({ ...d, lignes: d.lignes.filter((_, i) => i !== rang) }));
    afterNextRender(() => focaliser(this.document, 'ajouter-ligne'), {
      injector: this.injector,
    });
  }

  protected choisirLogo(evenement: Event): void {
    const champ = evenement.target as HTMLInputElement;
    const fichier = champ.files?.[0];
    champ.value = '';
    if (!fichier) return;
    const refus = verifierLogo(fichier);
    if (refus) {
      this.erreurLogo.set(refus);
      return;
    }
    const lecteur = new FileReader();
    lecteur.onload = () => {
      const logo = restaurerDevis({ logo: lecteur.result })?.logo;
      if (logo) {
        this.erreurLogo.set(null);
        this.modele.update((d) => ({ ...d, logo }));
      } else {
        this.erreurLogo.set('Cette image n’a pas pu être lue.');
      }
    };
    lecteur.onerror = () => this.erreurLogo.set('Cette image n’a pas pu être lue.');
    lecteur.readAsDataURL(fichier);
  }

  protected retirerLogo(): void {
    this.modele.update((d) => ({ ...d, logo: '' }));
  }

  protected nouveauDevis(): void {
    this.confirmerNouveau.set(false);
    const suivant = devisSuivant(this.modele(), dateDuJour(new Date()));
    this.f().reset();
    this.reference = JSON.stringify(suivant);
    this.commence = false;
    this.termine = false;
    this.modele.set(suivant);
    afterNextRender(() => focaliser(this.document, 'client-nom'), {
      injector: this.injector,
    });
  }

  protected exporter(format: FormatExport): void {
    const fenetre = this.document.defaultView;
    if (!fenetre) return;
    const titre = this.document.title;
    this.document.title = preparerExport(this.modele(), format).titre;
    fenetre.addEventListener('afterprint', () => (this.document.title = titre), { once: true });
    this.analytics.track('export_fait', { format });
    fenetre.print();
  }

  protected allerA(champ: Champ): void {
    const id = champ === 'lignes' ? 'ligne-0-designation' : champ.replace('.', '-');
    focaliser(this.document, id);
  }

  private async reprendre(): Promise<void> {
    let devis: Devis | null;
    try {
      devis = restaurerDevis(await this.kv.read<unknown>(CLE_DEVIS));
    } catch {
      devis = null;
    }
    if (devis && estEntame(devis)) {
      this.modele.set(devis);
      this.analytics.track('donnees_reprises');
    } else {
      const date = dateDuJour(new Date());
      this.modele.update((d) => ({ ...d, date, numero: numeroParDefaut(date) }));
    }
    this.reference = JSON.stringify(this.modele());
    this.termine = champsManquants(this.modele()).length === 0;
    this.charge.set(true);
  }

  /**
   * `outil_commence` à la première saisie, `outil_termine` la première fois
   * que le devis devient complet : une fois chacun par devis et par visite.
   */
  private mesurer(devis: Devis): void {
    if (!this.commence && JSON.stringify(devis) !== this.reference) {
      this.commence = true;
      this.analytics.track('outil_commence');
    }
    if (!this.termine && champsManquants(devis).length === 0) {
      this.termine = true;
      this.analytics.track('outil_termine');
    }
  }

  private programmerEnregistrement(devis: Devis): void {
    if (!this.navigateur) return;
    clearTimeout(this.minuterie);
    this.minuterie = setTimeout(() => {
      this.kv.write(CLE_DEVIS, devis).then(
        () => this.enregistrement.set('enregistre'),
        () => this.enregistrement.set('erreur'),
      );
    }, DELAI_ENREGISTREMENT);
  }
}

/** Champ du formulaire désigné par chaque règle de `data/regles.ts`. */
function chemins(p: SchemaPathTree<Devis>): Record<Champ, SchemaPath<unknown>> {
  return {
    'entreprise.nom': p.entreprise.nom,
    'entreprise.adresse': p.entreprise.adresse,
    'entreprise.siret': p.entreprise.siret,
    'entreprise.formeJuridique': p.entreprise.formeJuridique,
    'entreprise.capital': p.entreprise.capital,
    'entreprise.immatriculation': p.entreprise.immatriculation,
    'entreprise.tvaIntra': p.entreprise.tvaIntra,
    'entreprise.assureur': p.entreprise.assureur,
    'entreprise.zoneAssurance': p.entreprise.zoneAssurance,
    'client.nom': p.client.nom,
    'client.adresse': p.client.adresse,
    numero: p.numero,
    date: p.date,
    debutTravaux: p.debutTravaux,
    dureeTravaux: p.dureeTravaux,
    lignes: p.lignes,
    paiement: p.paiement,
    mediateur: p.mediateur,
  };
}
