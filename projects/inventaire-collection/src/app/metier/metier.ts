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
import { FormField, form, maxLength, min, validate } from '@angular/forms/signals';
import { AnalyticsService, KvStoreService } from '@mp/core';
import { CHAMPS, FORMULAIRE, focaliser, initialiserIonic } from '@mp/ui/formulaires';
import { CONSIGNES, FormatExport, nomDeFichier, versCsv } from './data/export';
import { dateDuJour, dateLongue, euros } from './data/format';
import {
  CLE_INVENTAIRE,
  ETATS,
  Etat,
  Inventaire,
  LIBELLES_ETAT,
  LIMITES,
  Objet,
  ajouterCollection,
  centimes,
  clePhoto,
  enregistrerObjet,
  inventaireVide,
  rechercher,
  restaurerInventaire,
  restaurerPhoto,
  supprimerCollection,
  supprimerObjet,
  total,
  totalParCollection,
} from './data/inventaire';
import { dimensionsReduites, verifierPhoto } from './data/photo';

/** Brouillon de l'objet en cours de saisie, enregistré à part. */
export const CLE_BROUILLON = 'inventaire-collection.brouillon';
export const DELAI_ENREGISTREMENT = 400;

interface Brouillon {
  nom: string;
  etat: Etat;
  valeur: number;
  dateAchat: string;
  note: string;
}

function brouillonVide(): Brouillon {
  return { nom: '', etat: 'tres-bon', valeur: 0, dateAchat: '', note: '' };
}

function restaurerBrouillon(brut: unknown): Brouillon | null {
  const v = typeof brut === 'object' && brut !== null ? (brut as Record<string, unknown>) : null;
  if (!v) return null;
  const d = brouillonVide();
  const t = (x: unknown, max: number) => (typeof x === 'string' ? x.slice(0, max) : '');
  const valeur = v['valeur'];
  const date = v['dateAchat'];
  return {
    nom: t(v['nom'], LIMITES.nom),
    etat: ETATS.includes(v['etat'] as Etat) ? (v['etat'] as Etat) : d.etat,
    valeur: typeof valeur === 'number' && Number.isFinite(valeur) ? Math.max(0, valeur) : 0,
    dateAchat: typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '',
    note: t(v['note'], LIMITES.texte),
  };
}

type Confirmation = { type: 'objet' | 'collection'; id: string } | null;

/**
 * Le module métier d'Inventaire Collection : collections, fiches d'objets
 * avec photo réduite sur l'appareil, recherche, totaux et exports. Les
 * calculs vivent dans `data/`.
 */
@Component({
  selector: 'app-metier',
  imports: [FormField, FORMULAIRE],
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

  protected readonly inventaire = signal<Inventaire>(inventaireVide());
  protected readonly photos = signal<Record<string, string>>({});
  protected readonly selection = signal<string | null>(null);
  protected readonly recherche = signal('');
  protected readonly edition = signal<string | null>(null);
  /** Photo choisie pour le brouillon : `undefined` = inchangée, `''` = retirée. */
  protected readonly photoBrouillon = signal<string | undefined>(undefined);
  protected readonly confirmation = signal<Confirmation>(null);
  protected readonly message = signal<string | null>(null);
  protected readonly erreurPhoto = signal<string | null>(null);
  protected readonly charge = signal(false);

  protected readonly brouillon = signal<Brouillon>(brouillonVide());
  protected readonly f = form(this.brouillon, (p) => {
    validate(p.nom, ({ value }) =>
      value().trim() ? null : { kind: 'requis', message: 'Donnez un nom à l’objet.' },
    );
    maxLength(p.nom, LIMITES.nom);
    maxLength(p.note, LIMITES.texte);
    min(p.valeur, 0, { message: 'La valeur ne peut pas être négative.' });
  });

  protected readonly nouvelle = signal({ nom: '' });
  protected readonly fc = form(this.nouvelle, (p) => {
    validate(p.nom, ({ value }) =>
      value().trim() ? null : { kind: 'requis', message: 'Donnez un nom à la collection.' },
    );
    maxLength(p.nom, LIMITES.nom);
  });

  protected readonly etats = ETATS;
  protected readonly libellesEtat = LIBELLES_ETAT;
  protected readonly consignes = CONSIGNES;
  protected readonly eur = euros;
  protected readonly centimes = centimes;
  protected readonly dateLongue = dateLongue;

  protected readonly collection = computed(
    () => this.inventaire().collections.find((c) => c.id === this.selection()) ?? null,
  );
  protected readonly objetsCollection = computed(() =>
    this.inventaire().objets.filter((o) => o.collection === this.selection()),
  );
  protected readonly trouves = computed(() =>
    rechercher(this.objetsCollection(), this.recherche()),
  );
  protected readonly totaux = computed(() => totalParCollection(this.inventaire()));
  protected readonly totalGeneral = computed(() => total(this.inventaire().objets));
  protected readonly apercuPhoto = computed(() => {
    const choisie = this.photoBrouillon();
    if (choisie !== undefined) return choisie;
    const id = this.edition();
    return id ? (this.photos()[id] ?? '') : '';
  });
  protected readonly objetsDe = (id: string) =>
    this.inventaire().objets.filter((o) => o.collection === id);
  protected readonly aujourdhui = signal('');

  private commence = false;
  private termine = false;
  private minuterie: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    initialiserIonic();
    afterNextRender(() => void this.reprendre());

    effect(() => {
      const b = this.brouillon();
      if (!this.charge()) return;
      untracked(() => {
        if (!this.commence && JSON.stringify(b) !== JSON.stringify(brouillonVide()))
          this.signalerDebut();
        if (!this.navigateur) return;
        clearTimeout(this.minuterie);
        this.minuterie = setTimeout(
          () => void this.kv.write(CLE_BROUILLON, b).catch(() => undefined),
          DELAI_ENREGISTREMENT,
        );
      });
    });

    inject(DestroyRef).onDestroy(() => clearTimeout(this.minuterie));
  }

  /** Message de la première erreur d'un champ (`mat-error` l'affiche au bon moment). */
  protected erreurChamp(etat: { errors(): readonly { message?: string }[] }): string {
    return etat.errors()[0]?.message ?? '';
  }

  protected async creerCollection(): Promise<void> {
    this.fc.nom().markAsTouched();
    const nom = this.nouvelle().nom;
    if (!nom.trim()) return;
    const id = nouvelId();
    const suivant = ajouterCollection(this.inventaire(), id, nom);
    if (suivant === this.inventaire()) {
      this.message.set(`Vous avez atteint ${LIMITES.collections} collections.`);
      return;
    }
    if (!(await this.ecrire({ [CLE_INVENTAIRE]: suivant }))) return;
    this.signalerDebut();
    this.inventaire.set(suivant);
    this.selection.set(id);
    this.nouvelle.set({ nom: '' });
    this.fc().reset();
    this.focaliser('objet-nom');
  }

  protected choisir(id: string): void {
    this.selection.set(id);
    this.recherche.set('');
    this.annulerEdition();
  }

  protected async choisirPhoto(evenement: Event): Promise<void> {
    const champ = evenement.target as HTMLInputElement;
    const fichier = champ.files?.[0];
    champ.value = '';
    if (!fichier) return;
    const refus = verifierPhoto(fichier);
    if (refus) {
      this.erreurPhoto.set(refus);
      return;
    }
    try {
      const photo = restaurerPhoto(await this.reduire(fichier));
      if (!photo) throw new Error('illisible');
      this.erreurPhoto.set(null);
      this.photoBrouillon.set(photo);
      this.signalerDebut();
    } catch {
      this.erreurPhoto.set('Cette photo n’a pas pu être lue : essayez une image JPEG ou PNG.');
    }
  }

  protected retirerPhoto(): void {
    this.photoBrouillon.set('');
  }

  protected async enregistrer(): Promise<void> {
    const collection = this.selection();
    this.f().markAsTouched();
    if (!collection || this.f().invalid()) {
      this.focaliser('objet-nom');
      return;
    }
    const b = this.brouillon();
    const id = this.edition() ?? nouvelId();
    const ancienne = this.photos()[id] ?? '';
    const choisie = this.photoBrouillon();
    const photo = choisie === undefined ? ancienne : choisie;
    const objet: Objet = {
      id,
      collection,
      nom: b.nom.trim(),
      etat: b.etat,
      valeur: b.valeur,
      dateAchat: b.dateAchat,
      note: b.note,
      photo: !!photo,
    };
    const suivant = enregistrerObjet(this.inventaire(), objet);
    if (suivant === this.inventaire()) {
      this.message.set(`Vous avez atteint ${LIMITES.objets} objets.`);
      return;
    }
    // Inventaire et photo dans une seule transaction : jamais l'un sans l'autre.
    const ecritures: Record<string, unknown> = {
      [CLE_INVENTAIRE]: suivant,
      [CLE_BROUILLON]: brouillonVide(),
    };
    if (choisie !== undefined) ecritures[clePhoto(id)] = photo || null;
    if (!(await this.ecrire(ecritures))) return;
    this.inventaire.set(suivant);
    this.photos.update((p) => {
      const copie = { ...p };
      if (photo) copie[id] = photo;
      else delete copie[id];
      return copie;
    });
    this.message.set(
      this.edition() ? `« ${objet.nom} » est modifié.` : `« ${objet.nom} » est ajouté.`,
    );
    this.annulerEdition();
    if (!this.termine) {
      this.termine = true;
      this.analytics.track('outil_termine');
    }
    this.focaliser('objet-nom');
  }

  protected modifier(objet: Objet): void {
    this.edition.set(objet.id);
    this.photoBrouillon.set(undefined);
    this.erreurPhoto.set(null);
    this.brouillon.set({
      nom: objet.nom,
      etat: objet.etat,
      valeur: objet.valeur,
      dateAchat: objet.dateAchat,
      note: objet.note,
    });
    this.focaliser('objet-nom');
  }

  protected annulerEdition(): void {
    this.edition.set(null);
    this.photoBrouillon.set(undefined);
    this.erreurPhoto.set(null);
    this.brouillon.set(brouillonVide());
    this.f().reset();
  }

  protected async supprimer(): Promise<void> {
    const c = this.confirmation();
    if (!c) return;
    this.confirmation.set(null);
    let suivant: Inventaire;
    let retires: string[];
    if (c.type === 'objet') {
      suivant = supprimerObjet(this.inventaire(), c.id);
      retires = [c.id];
    } else {
      const [inv, objets] = supprimerCollection(this.inventaire(), c.id);
      suivant = inv;
      retires = objets.map((o) => o.id);
    }
    const ecritures: Record<string, unknown> = { [CLE_INVENTAIRE]: suivant };
    for (const id of retires) ecritures[clePhoto(id)] = null;
    if (!(await this.ecrire(ecritures))) return;
    this.inventaire.set(suivant);
    this.photos.update((p) => {
      const copie = { ...p };
      for (const id of retires) delete copie[id];
      return copie;
    });
    if (c.type === 'collection') this.selection.set(suivant.collections[0]?.id ?? null);
    if (retires.includes(this.edition() ?? '')) this.annulerEdition();
    this.message.set(c.type === 'objet' ? 'L’objet est supprimé.' : 'La collection est supprimée.');
  }

  protected exporter(format: FormatExport): void {
    const fenetre = this.document.defaultView;
    if (!fenetre) return;
    const jour = dateDuJour(new Date());
    this.aujourdhui.set(jour);
    if (format === 'csv') {
      const url = URL.createObjectURL(
        new Blob([versCsv(this.inventaire())], { type: 'text/csv;charset=utf-8' }),
      );
      const lien = this.document.createElement('a');
      lien.href = url;
      lien.download = `${nomDeFichier(jour)}.csv`;
      lien.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } else {
      const titre = this.document.title;
      this.document.title = nomDeFichier(jour);
      fenetre.addEventListener('afterprint', () => (this.document.title = titre), { once: true });
      // Laisse le document imprimable afficher la date du jour avant d'imprimer.
      afterNextRender(() => fenetre.print(), { injector: this.injector });
    }
    this.analytics.track('export_fait', { format });
  }

  private async reprendre(): Promise<void> {
    let inv: Inventaire | null = null;
    let brouillon: Brouillon | null = null;
    try {
      inv = restaurerInventaire(await this.kv.read<unknown>(CLE_INVENTAIRE));
      brouillon = restaurerBrouillon(await this.kv.read<unknown>(CLE_BROUILLON));
    } catch {
      /* stockage indisponible : on part d'un inventaire vide */
    }
    if (inv && (inv.collections.length || inv.objets.length)) {
      const photos: Record<string, string> = {};
      await Promise.all(
        inv.objets
          .filter((o) => o.photo)
          .map(async (o) => {
            const p = restaurerPhoto(await this.kv.read<unknown>(clePhoto(o.id)).catch(() => null));
            if (p) photos[o.id] = p;
          }),
      );
      this.inventaire.set(inv);
      this.photos.set(photos);
      this.selection.set(inv.collections[0]?.id ?? null);
      this.analytics.track('donnees_reprises');
    }
    if (brouillon) this.brouillon.set(brouillon);
    this.charge.set(true);
  }

  private signalerDebut(): void {
    if (this.commence) return;
    this.commence = true;
    this.analytics.track('outil_commence');
  }

  /** Écrit en une transaction ; un échec est annoncé et rien n'est changé à l'écran. */
  private async ecrire(entrees: Record<string, unknown>): Promise<boolean> {
    if (!this.navigateur) return false;
    try {
      await this.kv.writeMany(entrees);
      return true;
    } catch {
      this.message.set(
        'L’enregistrement a échoué : l’espace de stockage de cet appareil est peut-être plein. Rien n’a été modifié.',
      );
      return false;
    }
  }

  private async reduire(fichier: File): Promise<string> {
    const image = await createImageBitmap(fichier);
    const { largeur, hauteur } = dimensionsReduites(image.width, image.height);
    const canvas = this.document.createElement('canvas');
    canvas.width = largeur;
    canvas.height = hauteur;
    canvas.getContext('2d')?.drawImage(image, 0, 0, largeur, hauteur);
    image.close();
    return canvas.toDataURL('image/jpeg', 0.75);
  }

  private focaliser(id: string): void {
    afterNextRender(() => focaliser(this.document, id), { injector: this.injector });
  }
}

function nouvelId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  );
}
