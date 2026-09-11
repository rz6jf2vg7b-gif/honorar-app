// Übungsdaten: ein Projekt zum gefahrlosen Ausprobieren.
//
// Der Anlass ist konkret: Beim ersten Erkunden der App entstanden zwei
// Angebote, die niemand wollte — im echten Bestand, mit echten Belegnummern.
// Wer eine Fachanwendung lernt, probiert Dinge aus, und Ausprobieren erzeugt
// Ausschuss. Also braucht es einen Ort dafuer.
//
// Alles, was hier entsteht, traegt `uebung: true`. Daran haengen drei Dinge:
// Die Zahlen bleiben aus Dashboard und Buchhaltung heraus (sonst stimmte der
// Umsatz nicht), die Belege sind in Listen erkennbar, und am Ende laesst sich
// der ganze Satz in einem Zug entfernen.
//
// Die Beispieldaten sind frei erfunden — ein Uebungsprojekt darf niemandem
// gehoeren.

import { SPEICHER, alle, lesen, schreiben, loeschen } from '../db.js';

export const UEBUNG_PROJEKT = 'uebung-projekt';
export const UEBUNG_ADRESSE = 'uebung-adresse';

/** Liegen Übungsdaten vor? */
export async function uebungVorhanden() {
  return !!(await lesen(SPEICHER.PROJEKTE, UEBUNG_PROJEKT));
}

/**
 * Das Übungsprojekt anlegen.
 *
 * Feste Kennungen statt neuer: Zweimal "Übung starten" soll dasselbe Projekt
 * ergeben und nicht ein zweites daneben — sonst entstuende beim Lernen genau
 * der Wildwuchs, den die Uebung verhindern soll.
 */
export async function uebungAnlegen() {
  await schreiben(SPEICHER.ADRESSEN, {
    id: UEBUNG_ADRESSE,
    uebung: true,
    name: 'Familie Übungsbauherr',
    anrede: 'Familie',
    strasse: 'Beispielweg 7',
    plz: '00000',
    ort: 'Übungshausen',
    mail: 'niemand@example.invalid',
    istVerbraucher: true,          // private Bauherrschaft — wirkt auf die Mahnung
    notiz: 'Übungsdaten. Frei erfunden.',
  });

  await schreiben(SPEICHER.PROJEKTE, {
    id: UEBUNG_PROJEKT,
    uebung: true,
    nummer: '0000',
    kuerzel: 'ÜBG',
    name: 'Übung — Einfamilienhaus am Hang',
    adresseId: UEBUNG_ADRESSE,
    ort: 'Übungshausen',
    appNotiz: 'Zum Ausprobieren. Lässt sich in der Hilfe wieder entfernen.',
  });

  return { projektId: UEBUNG_PROJEKT, adresseId: UEBUNG_ADRESSE };
}

/**
 * Alles entfernen, was zur Übung gehört — auch festgeschriebene Belege.
 *
 * Das ist die eine Stelle, an der ein festgeschriebener Beleg verschwinden darf.
 * Die GoBD schuetzt Aufzeichnungen ueber tatsaechliche Geschaeftsvorfaelle; ein
 * Uebungsbeleg ist keiner. Waere er nicht loeschbar, muesste man ihn stornieren
 * — und haette dann zwei Uebungsbelege statt einem.
 */
export async function uebungEntfernen() {
  const belege = (await alle(SPEICHER.BELEGE, { mitGeloeschten: true }))
    .filter((b) => b.uebung || b.projektId === UEBUNG_PROJEKT);
  const vertraege = (await alle(SPEICHER.VERTRAEGE, { mitGeloeschten: true }))
    .filter((v) => v.uebung || v.projektId === UEBUNG_PROJEKT);
  const anlagen = (await alle(SPEICHER.ANLAGEN))
    .filter((a) => belege.some((b) => b.id === a.belegId));

  for (const a of anlagen) await loeschen(SPEICHER.ANLAGEN, a.id);
  for (const b of belege) await loeschen(SPEICHER.BELEGE, b.id);
  for (const v of vertraege) await loeschen(SPEICHER.VERTRAEGE, v.id);
  await loeschen(SPEICHER.PROJEKTE, UEBUNG_PROJEKT);
  await loeschen(SPEICHER.ADRESSEN, UEBUNG_ADRESSE);

  return { belege: belege.length, vertraege: vertraege.length, anlagen: anlagen.length };
}

/** Gehört dieser Datensatz zur Übung? */
export const istUebung = (x) => !!(x?.uebung || x?.projektId === UEBUNG_PROJEKT
  || x?.id === UEBUNG_PROJEKT || x?.id === UEBUNG_ADRESSE);
