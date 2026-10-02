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
import { ApercuContrat } from './apercu';
import { montants, partVersee } from './data/calculs';
import {
  Contrat,
  LIMITES,
  contratSuivant,
  contratVide,
  dateDuJour,
  estEntame,
  objetVide,
  pieceVide,
  restaurerContrat,
} from './data/contrat';
import { CONSIGNES, FormatExport, nomDeFichier } from './data/export';
import { euros, pluriel } from './data/format';
import {
  Champ,
  REGLES,
  SECTIONS,
  Section,
  champsManquants,
  erreur,
  sectionsCompletes,
} from './data/regles';

/** Clé du contrat en cours dans IndexedDB (`KvStoreService`). */
export const CLE_CONTRAT = 'contrat-saisonnier.contrat';
/** Délai entre la dernière frappe et l'enregistrement. */
export const DELAI_ENREGISTREMENT = 400;

type EtatEnregistrement = 'attente' | 'enregistre' | 'erreur';

const POSITIF = { message: 'Un nombre positif ou zéro.' };

/**
 * Le module métier de Contrat Location Saisonnière : le formulaire guidé,
 * l'aperçu du contrat et de son annexe, les exports. Règles, calculs et
 * clauses vivent dans `data/` ; ce composant ne fait que relier la saisie,
 * l'enregistrement local et la mesure.
 */
@Component({
  selector: 'app-metier',
  imports: [ApercuContrat, FormField, FORMULAIRE],
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

  protected readonly modele = signal<Contrat>(contratVide());
  protected readonly f = form(this.modele, (p) => {
    const champs = chemins(p);
    for (const r of REGLES) {
      validate(champs[r.champ], ({ valueOf }) => {
        const message = erreur(r.champ, valueOf(p));
        return message ? { kind: 'contrat', message } : null;
      });
    }
    for (const partie of [p.bailleur, p.locataire]) {
      maxLength(partie.nom, LIMITES.texte);
      maxLength(partie.adresse, LIMITES.texte);
      maxLength(partie.telephone, 40);
      maxLength(partie.email, 200);
    }
    for (const texte of [
      p.logement.adresse,
      p.logement.description,
      p.logement.enregistrement,
      p.prix.detailCharges,
      p.prix.echeanceSolde,
      p.particulieres,
      p.lieu,
    ]) {
      maxLength(texte, LIMITES.texte);
    }
    min(p.logement.surface, 0, POSITIF);
    min(p.logement.pieces, 1, { message: 'Au moins une pièce.' });
    min(p.logement.capacite, 1, { message: 'Au moins une personne.' });
    max(p.logement.capacite, LIMITES.personnes, { message: `Au plus ${LIMITES.personnes}.` });
    min(p.sejour.enfants, 0, POSITIF);
    for (const montant of [
      p.prix.loyer,
      p.prix.montantVersement,
      p.prix.taxeSejour,
      p.prix.depotGarantie,
      p.prix.restitutionJours,
    ]) {
      min(montant, 0, POSITIF);
    }
    max(p.prix.taxeSejour, 100, {
      message: 'Un tarif par adulte et par nuit\u00a0: vérifiez le montant.',
    });
    applyEach(p.pieces, (piece) => {
      maxLength(piece.nom, 100);
      applyEach(piece.objets, (o) => {
        maxLength(o.designation, 200);
        min(o.quantite, 0, POSITIF);
      });
    });
  });

  protected readonly consignes = CONSIGNES;
  protected readonly eur = euros;
  protected readonly pluriel = pluriel;
  protected readonly limites = LIMITES;

  protected readonly manquants = computed(() => champsManquants(this.modele()));
  protected readonly completes = computed(() => new Set<Section>(sectionsCompletes(this.modele())));
  protected readonly etapes = SECTIONS.length;
  protected readonly montants = computed(() => montants(this.modele()));
  protected readonly part = computed(() => partVersee(this.modele()));

  protected readonly charge = signal(false);
  protected readonly enregistrement = signal<EtatEnregistrement>('attente');
  protected readonly confirmerNouveau = signal(false);
  /** Rang de la pièce dont on demande la suppression ; `null` sans demande. */
  protected readonly pieceASupprimer = signal<number | null>(null);

  /** État au chargement : ce qui diffère ensuite vient de la personne. */
  private reference = '';
  private commence = false;
  private termine = false;
  private minuterie: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    initialiserIonic();
    afterNextRender(() => void this.reprendre());

    effect(() => {
      const contrat = this.modele();
      if (!this.charge()) return;
      untracked(() => {
        this.mesurer(contrat);
        this.programmerEnregistrement(contrat);
      });
    });

    inject(DestroyRef).onDestroy(() => clearTimeout(this.minuterie));
  }

  protected faite(section: Section): boolean {
    return this.completes().has(section);
  }

  /** Message de la première erreur d'un champ (le champ Ionic l'affiche une fois quitté). */
  protected erreurChamp(etat: { errors(): readonly { message?: string }[] }): string {
    return etat.errors()[0]?.message ?? '';
  }

  /** Erreur à afficher hors d'un champ Ionic : après qu'on l'a quitté. */
  protected erreurDe(etat: {
    touched(): boolean;
    errors(): readonly { message?: string }[];
  }): string | null {
    return etat.touched() ? (etat.errors()[0]?.message ?? null) : null;
  }

  protected ajouterPiece(): void {
    if (this.modele().pieces.length >= LIMITES.pieces) return;
    this.modele.update((c) => ({ ...c, pieces: [...c.pieces, pieceVide()] }));
    this.focaliserApres(`piece-${this.modele().pieces.length - 1}-nom`);
  }

  protected supprimerPiece(rang: number): void {
    this.pieceASupprimer.set(null);
    if (this.modele().pieces.length <= 1) return;
    this.modele.update((c) => ({ ...c, pieces: c.pieces.filter((_, i) => i !== rang) }));
    this.focaliserApres('ajouter-piece');
  }

  protected ajouterObjet(piece: number): void {
    if (this.modele().pieces[piece].objets.length >= LIMITES.objets) return;
    this.modele.update((c) => ({
      ...c,
      pieces: c.pieces.map((p, i) =>
        i === piece ? { ...p, objets: [...p.objets, objetVide()] } : p,
      ),
    }));
    this.focaliserApres(`piece-${piece}-objet-${this.modele().pieces[piece].objets.length - 1}`);
  }

  protected supprimerObjet(piece: number, objet: number): void {
    this.modele.update((c) => ({
      ...c,
      pieces: c.pieces.map((p, i) =>
        i === piece ? { ...p, objets: p.objets.filter((_, j) => j !== objet) } : p,
      ),
    }));
    this.focaliserApres(`piece-${piece}-ajouter-objet`);
  }

  protected nouveauContrat(): void {
    this.confirmerNouveau.set(false);
    const suivant = contratSuivant(this.modele(), dateDuJour(new Date()));
    this.f().reset();
    this.reference = JSON.stringify(suivant);
    this.commence = false;
    this.termine = false;
    this.modele.set(suivant);
    this.focaliserApres('locataire-nom');
  }

  protected exporter(format: FormatExport): void {
    const fenetre = this.document.defaultView;
    if (!fenetre) return;
    const titre = this.document.title;
    this.document.title = nomDeFichier(this.modele());
    fenetre.addEventListener('afterprint', () => (this.document.title = titre), { once: true });
    this.analytics.track('export_fait', { format });
    fenetre.print();
  }

  protected cible(champ: Champ): string {
    return champ === 'pieces' ? 'piece-0-nom' : champ;
  }

  protected allerA(champ: Champ): void {
    focaliser(this.document, this.cible(champ));
  }

  private focaliserApres(id: string): void {
    afterNextRender(() => focaliser(this.document, id), { injector: this.injector });
  }

  private async reprendre(): Promise<void> {
    let contrat: Contrat | null;
    try {
      contrat = restaurerContrat(await this.kv.read<unknown>(CLE_CONTRAT));
    } catch {
      contrat = null;
    }
    if (contrat && estEntame(contrat)) {
      this.modele.set(contrat);
      this.analytics.track('donnees_reprises');
    } else {
      this.modele.update((c) => ({ ...c, date: dateDuJour(new Date()) }));
    }
    this.reference = JSON.stringify(this.modele());
    this.termine = champsManquants(this.modele()).length === 0;
    this.charge.set(true);
  }

  /**
   * `outil_commence` à la première saisie, `outil_termine` la première fois
   * que le contrat devient complet : une fois chacun par contrat et par visite.
   */
  private mesurer(contrat: Contrat): void {
    if (!this.commence && JSON.stringify(contrat) !== this.reference) {
      this.commence = true;
      this.analytics.track('outil_commence');
    }
    if (!this.termine && champsManquants(contrat).length === 0) {
      this.termine = true;
      this.analytics.track('outil_termine');
    }
  }

  private programmerEnregistrement(contrat: Contrat): void {
    if (!this.navigateur) return;
    clearTimeout(this.minuterie);
    this.minuterie = setTimeout(() => {
      this.kv.write(CLE_CONTRAT, contrat).then(
        () => this.enregistrement.set('enregistre'),
        () => this.enregistrement.set('erreur'),
      );
    }, DELAI_ENREGISTREMENT);
  }
}

/** Champ du formulaire désigné par chaque règle de `data/regles.ts`. */
function chemins(p: SchemaPathTree<Contrat>): Record<Champ, SchemaPath<unknown>> {
  return {
    'bailleur-nom': p.bailleur.nom,
    'bailleur-adresse': p.bailleur.adresse,
    'locataire-nom': p.locataire.nom,
    'locataire-adresse': p.locataire.adresse,
    'logement-adresse': p.logement.adresse,
    'logement-description': p.logement.description,
    'sejour-arrivee': p.sejour.arrivee,
    'sejour-depart': p.sejour.depart,
    'sejour-adultes': p.sejour.adultes,
    'prix-loyer': p.prix.loyer,
    'prix-montantVersement': p.prix.montantVersement,
    'prix-echeanceSolde': p.prix.echeanceSolde,
    pieces: p.pieces,
    lieu: p.lieu,
    date: p.date,
  };
}
