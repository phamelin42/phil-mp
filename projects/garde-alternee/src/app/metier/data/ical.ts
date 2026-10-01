import { Jour, Planning, dateDeNumero, nomDe, numeroJour, periodes } from './planning';

/**
 * Export iCalendar (RFC 5545), écrit à la main : un événement « journée
 * entière » par période continue chez le même parent.
 */

/** Échappe un texte (RFC 5545, 3.3.11) : antislash, point-virgule, virgule, saut de ligne. */
export function echapper(texte: string): string {
  return texte
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Plie une ligne à 75 octets (RFC 5545, 3.1) : la suite commence par une
 * espace. Ne coupe jamais au milieu d'un caractère UTF-8.
 */
export function plier(ligne: string): string {
  const encodeur = new TextEncoder();
  const morceaux: string[] = [];
  let courant = '';
  let octets = 0;
  for (const c of ligne) {
    const taille = encodeur.encode(c).length;
    const limite = morceaux.length === 0 ? 75 : 74;
    if (octets + taille > limite) {
      morceaux.push(courant);
      courant = '';
      octets = 0;
    }
    courant += c;
    octets += taille;
  }
  morceaux.push(courant);
  return morceaux.join('\r\n ');
}

const compacte = (iso: string) => iso.replaceAll('-', '');

/** Horodatage UTC au format iCalendar : AAAAMMJJTHHMMSSZ. */
export function horodatage(instant: Date): string {
  return instant
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/**
 * Le calendrier au format .ics. `instant` sert de DTSTAMP (passé en
 * paramètre pour que la fonction reste pure).
 */
export function versIcal(planning: Planning, jours: readonly Jour[], instant: Date): string {
  const stamp = horodatage(instant);
  const lignes = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//phamelin.fr//Planning Garde Alternee//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${echapper(`Garde ${planning.annee}-${planning.annee + 1}`)}`,
  ];
  for (const p of periodes(jours)) {
    // DTEND d'un événement « journée entière » : le lendemain du dernier jour (exclu).
    const lendemain = dateDeNumero((numeroJour(p.fin) ?? 0) + 1);
    lignes.push(
      'BEGIN:VEVENT',
      `UID:${compacte(p.debut)}-${p.parent}-${planning.annee}@garde-alternee.phamelin.fr`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compacte(p.debut)}`,
      `DTEND;VALUE=DATE:${compacte(lendemain)}`,
      `SUMMARY:${echapper(`Garde : ${nomDe(planning, p.parent)}`)}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }
  lignes.push('END:VCALENDAR');
  return lignes.map(plier).join('\r\n') + '\r\n';
}
