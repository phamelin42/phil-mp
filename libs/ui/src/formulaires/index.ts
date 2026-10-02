import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Provider, inject } from '@angular/core';
import { FormFieldBinding, provideSignalFormsConfig } from '@angular/forms/signals';
import {
  IonButton,
  IonInput,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonTextarea,
} from '@ionic/angular';
import { initialize } from '@ionic/core/components';

/**
 * Champs et boutons d'Ionic, pour les modules métier seulement (jamais la
 * coquille : le bundle initial n'en paie pas le poids). Ionic est la
 * bibliothèque de l'application mobile à venir (Capacitor) : les mêmes
 * composants serviront sur le web et dans l'app. Habillés par
 * `libs/ui/styles/ionic.css`, donc par les jetons et le thème du produit.
 *
 * Un module métier :
 *   - importe `FORMULAIRE`, fournit `CHAMPS` ;
 *   - porte `host: { ngSkipHydration: 'true' }` : ses composants Ionic se
 *     construisent dans le navigateur (le texte éditorial reste hydraté) ;
 *   - appelle `initialiserIonic()` dans son constructeur.
 *
 *   <ion-input label="Nom du client" labelPlacement="stacked" fill="outline"
 *     id="client-nom" [formField]="f.client.nom"
 *     helperText="…" [errorText]="erreurChamp(f.client.nom())" />
 *
 * Choix parmi deux à quatre valeurs : `ion-segment`. Liste plus longue :
 * `<label class="champ-liste">` et un `<select>` natif (le sélecteur du
 * téléphone, sans surcouche).
 */
export const FORMULAIRE = [
  IonButton,
  IonInput,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonTextarea,
] as const;

/**
 * Ionic n'affiche l'erreur d'un champ que s'il porte `ion-invalid` et
 * `ion-touched`. Il les recopie des classes `ng-*` d'Angular, mais seulement
 * quand le champ change ou perd le focus : une erreur révélée par l'envoi du
 * formulaire resterait cachée. Signal Forms pose donc les deux familles,
 * toujours d'accord entre elles.
 */
const ETATS: Record<string, (champ: FormFieldBinding) => boolean> = {
  invalid: (champ) => champ.state().invalid(),
  valid: (champ) => champ.state().valid(),
  touched: (champ) => champ.state().touched(),
  untouched: (champ) => !champ.state().touched(),
  dirty: (champ) => champ.state().dirty(),
  pristine: (champ) => !champ.state().dirty(),
};

export const CHAMPS: Provider[] = [
  provideSignalFormsConfig({
    classes: Object.fromEntries(
      Object.entries(ETATS).flatMap(([etat, f]) => [
        [`ng-${etat}`, f],
        [`ion-${etat}`, f],
      ]),
    ),
  }),
];

let initialise = false;

/** Configure Ionic une fois, dans le navigateur : apparence Material Design partout. */
export function initialiserIonic(): void {
  if (initialise || !isPlatformBrowser(inject(PLATFORM_ID))) return;
  initialise = true;
  initialize({ mode: 'md', animated: true });
}

/**
 * Place le curseur dans un champ désigné par son `id`. `ion-input` et
 * `ion-textarea` construisent puis révèlent leur champ natif un peu après leur
 * apparition, et un champ encore masqué refuse le focus : on réessaie à chaque
 * image (une demi-seconde au plus) jusqu'à ce que le focus prenne.
 */
export function focaliser(document: Document, id: string, essais = 30): void {
  const el = document.getElementById(id);
  if (!el) return;
  const natif = el.matches('ion-input, ion-textarea')
    ? el.querySelector<HTMLElement>('input, textarea')
    : el;
  natif?.focus();
  if (document.activeElement !== natif && essais > 0) {
    document.defaultView?.requestAnimationFrame(() => focaliser(document, id, essais - 1));
  }
}
