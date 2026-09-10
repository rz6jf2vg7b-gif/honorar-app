// Zahlungsplan: wann welcher Teil des Honorars fällig wird.
//
// Warum das ein eigenes Blatt verdient und keine Zeile im Angebot ist: Der
// Bauherr entscheidet ueber ein Honorar nicht nur nach seiner Hoehe, sondern
// nach dem Zeitpunkt — er muss die Raten gegen seine Finanzierung halten. Steht
// der Plan nur im Vertragstext, wird er dort ueberlesen und spaeter bestritten.
// Als eigenes Blatt mit Balken und Tabelle laesst er sich in einer Minute
// pruefen und unterschreiben.
//
// Frei definierbar heisst: beliebig viele Raten, jede entweder als Prozentsatz
// des Honorars oder als fester Betrag, und der Ausloeser ist Text — "nach
// Genehmigungsplanung" ist eine ebenso gueltige Faelligkeit wie ein Datum.
//
// § 15 Abs. 2 HOAI: Abschlagszahlungen koennen in Textform vereinbart werden,
// "in moeglichst gleichen Zeitabstaenden". Die Verordnung schreibt keine
// bestimmte Staffel vor — der Plan ist Vereinbarung, nicht Rechnung.

import { runde2 } from '../hoai/geld.js';

/**
 * Einen Zahlungsplan durchrechnen.
 *
 * @param {object} plan
 * @param {Array}  plan.raten  [{bezeichnung, prozent?, betrag?, ausloeser?, datum?}]
 * @param {number} summe       Honorar netto, auf das sich die Prozentsaetze beziehen
 * @param {number} [ustSatz]   fuer die Bruttospalte
 * @returns {{raten, summeProzent, summeNetto, summeBrutto, vollstaendig, hinweise}}
 */
export function zahlungsplanRechnen(plan, summe, ustSatz = 0) {
  const roh = (plan?.raten || []).filter((r) => r && (r.prozent || r.betrag));
  const hinweise = [];

  let kumuliertNetto = 0;
  const raten = roh.map((r, i) => {
    // Ein fester Betrag schlaegt den Prozentsatz: Wer eine Zahl eintraegt, meint sie.
    const netto = Number.isFinite(r.betrag) && r.betrag > 0
      ? runde2(r.betrag)
      : runde2(summe * (r.prozent || 0));
    kumuliertNetto = runde2(kumuliertNetto + netto);
    return {
      nr: i + 1,
      bezeichnung: r.bezeichnung || `${i + 1}. Rate`,
      ausloeser: r.ausloeser || '',
      datum: r.datum || '',
      prozent: summe > 0 ? netto / summe : 0,
      netto,
      ust: runde2(netto * ustSatz),
      brutto: runde2(netto * (1 + ustSatz)),
      kumuliertNetto,
      kumuliertProzent: summe > 0 ? kumuliertNetto / summe : 0,
    };
  });

  const summeNetto = kumuliertNetto;
  const summeProzent = summe > 0 ? summeNetto / summe : 0;
  // Auf den Cent genau ist bei Prozentsaetzen selten; ein Cent Rundung ist kein
  // Fehler, ein Prozentpunkt schon.
  const abweichung = runde2(summe - summeNetto);

  if (raten.length && Math.abs(abweichung) > 0.02) {
    hinweise.push(abweichung > 0
      ? `Der Plan deckt ${eurKurz(abweichung)} des Honorars nicht ab. `
        + 'Der Rest wird mit der Schlussrechnung fällig.'
      : `Der Plan übersteigt das Honorar um ${eurKurz(-abweichung)}.`);
  }
  if (!raten.length) hinweise.push('Noch keine Rate festgelegt.');

  return {
    raten,
    summeProzent,
    summeNetto,
    summeUst: runde2(summeNetto * ustSatz),
    summeBrutto: runde2(summeNetto * (1 + ustSatz)),
    honorar: runde2(summe),
    abweichung,
    vollstaendig: raten.length > 0 && Math.abs(abweichung) <= 0.02,
    hinweise,
  };
}

const eurKurz = (z) => `${new Intl.NumberFormat('de-DE',
  { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(z)} €`;

/**
 * Gebraeuchliche Staffeln als Ausgangspunkt.
 *
 * Keine Empfehlung, sondern Tippersparnis: Jede Staffel ist Verhandlungssache.
 * Die Bezeichnungen folgen den Leistungsphasen, weil der Bauherr daran den
 * Baufortschritt erkennt — "nach Genehmigungsplanung" sagt ihm mehr als
 * "2. Rate".
 */
export const VORLAGEN = [
  {
    name: 'Drei Raten (30 / 30 / 40)',
    raten: [
      { bezeichnung: '1. Rate', prozent: 0.30, ausloeser: 'nach Vorplanung (LPh 2)' },
      { bezeichnung: '2. Rate', prozent: 0.30, ausloeser: 'nach Genehmigungsplanung (LPh 4)' },
      { bezeichnung: '3. Rate', prozent: 0.40, ausloeser: 'nach Fertigstellung' },
    ],
  },
  {
    name: 'Nach Leistungsphasen (Anlage 10 HOAI)',
    raten: [
      { bezeichnung: 'LPh 1–2', prozent: 0.09, ausloeser: 'nach Vorplanung' },
      { bezeichnung: 'LPh 3–4', prozent: 0.18, ausloeser: 'nach Genehmigungsplanung' },
      { bezeichnung: 'LPh 5', prozent: 0.25, ausloeser: 'nach Ausführungsplanung' },
      { bezeichnung: 'LPh 6–7', prozent: 0.14, ausloeser: 'nach Vergabe' },
      { bezeichnung: 'LPh 8', prozent: 0.32, ausloeser: 'nach Objektüberwachung' },
      { bezeichnung: 'LPh 9', prozent: 0.02, ausloeser: 'nach Objektbetreuung' },
    ],
  },
  {
    name: 'Halbjährlich',
    raten: [
      { bezeichnung: '1. Rate', prozent: 0.25, ausloeser: 'bei Auftragserteilung' },
      { bezeichnung: '2. Rate', prozent: 0.25, ausloeser: 'nach sechs Monaten' },
      { bezeichnung: '3. Rate', prozent: 0.25, ausloeser: 'nach zwölf Monaten' },
      { bezeichnung: '4. Rate', prozent: 0.25, ausloeser: 'mit der Schlussrechnung' },
    ],
  },
];
