// Abrechnung: aus einer oder mehreren Honorarermittlungen wird eine Rechnung.
//
// Der kumulative Weg (Vorgabe aus dem Konzept): Die Rechnung weist das bis zum
// Stichtag insgesamt verdiente Honorar aus und zieht davon ab, was bereits berechnet
// wurde. Ein Nachtrag oder geaenderte anrechenbare Kosten wirken damit automatisch
// in der naechsten Rechnung, ohne dass eine bereits gestellte angefasst wird.
//
// Zwei Feinheiten, die aus einer geprueften Referenzrechnung stammen und in
// selbstgebauten Rechnungsprogrammen regelmaessig falsch gemacht werden:
//
// 1. Ein Rechnungseinbehalt (z. B. bis zur Maengelbeseitigung) wird ueblicherweise
//    als Bruttobetrag vereinbart — "2.000 € einbehalten" heisst 2.000 € weniger
//    ueberwiesen. Abgezogen werden muss er aber von der Nettosumme, sonst stimmt die
//    ausgewiesene Umsatzsteuer nicht. Beispiel: 2.000 € brutto = 1.724,14 € netto.
//
// 2. Der Abzug frueherer Rechnungen erfolgt netto, nicht brutto. Nur so bleibt der
//    Steuerausweis der neuen Rechnung richtig.

import { runde2, eur, prozent } from './geld.js';

export const RECHNUNGSART = {
  ABSCHLAG: 'AR',
  TEILSCHLUSS: 'TS',
  SCHLUSS: 'SR',
  EINZEL: 'ER',
};

export const ART_BEZEICHNUNG = {
  AR: 'Abschlagsrechnung',
  TS: 'Teilschlussrechnung',
  SR: 'Schlussrechnung',
  ER: 'Einzelrechnung',
  // Angebot und Nachtrag fordern kein Geld. Sie durchlaufen dieselbe
  // Aufstellung — die Betraege entstehen genauso —, tragen aber eine andere
  // Ueberschrift und keine Zahlungsaufforderung. Bis zum 08.09.2026 fehlten
  // sie hier, weshalb ein Angebot im Blatt "Einzelrechnung" hiess.
  AN: 'Angebot',
  NA: 'Nachtrag',
};

/** Belegarten, die eine Zahlung verlangen. */
export const FORDERT_ZAHLUNG = (art) => !['AN', 'NA'].includes(art);

/**
 * @param {object} r
 * @param {string} r.art            RECHNUNGSART
 * @param {string} r.nummer         z.B. "AR-2601-04"
 * @param {string} r.datum
 * @param {Array}  r.leistungen     Ergebnisse aus honorarermittlung() oder
 *                                  freie Positionen {bezeichnung, netto}
 * @param {number} r.ustSatz        z.B. 0.19
 * @param {object} [r.einbehalt]    {bezeichnung, brutto} oder {bezeichnung, netto}
 * @param {Array}  [r.bisherigeRechnungen] [{art, nummer, datum, netto}] — netto,
 *                                  Vorzeichen wie gestellt (Gutschrift negativ)
 * @param {Array}  [r.zahlungsstand] [{bezeichnung, gestellt, gezahlt}] brutto,
 *                                  fuer die Uebersicht offener Betraege
 * @param {boolean} [r.zahlungsstandVerrechnen] Ueber-/Unterzahlungen in den
 *                                  Zahlbetrag einrechnen (wie HOAI-Pro es tut)
 * @param {object} [r.skonto]       {prozent, tage, bis} — Skontovereinbarung
 */
export function erstelleAbrechnung(r) {
  if (!ART_BEZEICHNUNG[r.art]) throw new Error(`Unbekannte Rechnungsart: ${r.art}`);
  if (!Number.isFinite(r.ustSatz) || r.ustSatz < 0 || r.ustSatz > 0.3) {
    throw new Error(`Umsatzsteuersatz ${r.ustSatz} ist unplausibel`);
  }
  if (!r.nummer) throw new Error('Rechnungsnummer fehlt');

  const zeilen = [];

  // 1 Summe aller Leistungen (netto)
  let netto = 0;
  for (const l of r.leistungen || []) {
    const betrag = runde2(l.netto);
    netto = runde2(netto + betrag);
    zeilen.push({ art: 'leistung', bez: l.bezeichnung, netto: betrag });
  }
  const summeLeistungen = netto;

  // 2 Einbehalt
  let einbehaltNetto = 0;
  if (r.einbehalt) {
    if (Number.isFinite(r.einbehalt.brutto)) {
      einbehaltNetto = runde2(r.einbehalt.brutto / (1 + r.ustSatz));
    } else if (Number.isFinite(r.einbehalt.netto)) {
      einbehaltNetto = runde2(r.einbehalt.netto);
    } else {
      throw new Error('Einbehalt braucht einen Brutto- oder Nettobetrag');
    }
    netto = runde2(netto - einbehaltNetto);
    zeilen.push({
      art: 'einbehalt',
      bez: r.einbehalt.bezeichnung || 'Rechnungseinbehalt',
      netto: -einbehaltNetto,
      hinweis: Number.isFinite(r.einbehalt.brutto)
        ? `${eur(r.einbehalt.brutto)} brutto entsprechen ${eur(einbehaltNetto)} netto`
        : null,
    });
  }

  // 3 Abzug bereits gestellter Rechnungen (nur bei kumulativer Abrechnung)
  const bisher = r.bisherigeRechnungen || [];
  let summeAbzug = 0;
  for (const b of bisher) {
    if (!Number.isFinite(b.netto)) throw new Error(`Rechnung ${b.nummer}: Nettobetrag fehlt`);
    summeAbzug = runde2(summeAbzug + b.netto);
    zeilen.push({
      art: 'abzug',
      bez: `${ART_BEZEICHNUNG[b.art] || 'Rechnung'} Nr. ${b.nummer}${b.datum ? ` vom ${b.datum}` : ''}`,
      netto: runde2(-b.netto),
    });
  }
  const rechnungsbetragNetto = runde2(netto - summeAbzug);

  // 4 Umsatzsteuer
  const ust = runde2(rechnungsbetragNetto * r.ustSatz);
  const brutto = runde2(rechnungsbetragNetto + ust);

  // 5 Zahlungsstand
  const offeneposten = (r.zahlungsstand || []).map((z) => ({
    ...z,
    offen: runde2((z.gestellt || 0) - (z.gezahlt || 0)),
  }));
  const saldoOffen = runde2(offeneposten.reduce((s, z) => s + z.offen, 0));
  const zahlbetrag = r.zahlungsstandVerrechnen ? runde2(brutto + saldoOffen) : brutto;

  // 6 Skonto
  //
  // Die Rechnung weist den vollen Betrag aus. Skonto ist eine Bedingung, kein
  // Abzug: Erst wenn der Auftraggeber fristgerecht zahlt, mindert sich das
  // Entgelt — und dann ist die Umsatzsteuer nach § 17 Abs. 1 UStG zu berichtigen,
  // im Zeitpunkt der Zahlung, nicht im Zeitpunkt der Rechnung. Wer den Abzug
  // schon hier vornimmt, weist zu wenig Umsatzsteuer aus und schuldet sie
  // trotzdem (§ 14c UStG).
  //
  // Der Skontosatz bezieht sich auf den Bruttobetrag dieser Rechnung, nicht auf
  // den Zahlbetrag: Verrechnete Altposten sind nicht skontierfaehig, sie stammen
  // aus einer anderen Rechnung mit eigener Frist.
  let skonto = null;
  if (r.skonto && r.skonto.prozent > 0 && FORDERT_ZAHLUNG(r.art)) {
    const betrag = runde2(brutto * r.skonto.prozent);
    skonto = {
      prozent: r.skonto.prozent,
      tage: r.skonto.tage ?? null,
      bis: r.skonto.bis || null,
      betrag,
      // Was zu zahlen ist, wenn er die Frist einhaelt.
      zahlbetrag: runde2(zahlbetrag - betrag),
      // Die Aufteilung fuer die spaetere Berichtigung: Der Nachlass mindert
      // Entgelt und Steuer im selben Verhaeltnis.
      netto: runde2(betrag / (1 + r.ustSatz)),
      ust: runde2(betrag - betrag / (1 + r.ustSatz)),
    };
  }

  return {
    art: r.art,
    artBezeichnung: ART_BEZEICHNUNG[r.art],
    nummer: r.nummer,
    datum: r.datum,
    summeLeistungen,
    einbehaltNetto,
    summeAbzug,
    rechnungsbetragNetto,
    ustSatz: r.ustSatz,
    ust,
    brutto,
    offeneposten,
    saldoOffen,
    zahlbetrag,
    skonto,
    zeilen,
    zusammenstellung: bauZusammenstellung({
      zeilen, summeLeistungen, einbehaltNetto, summeAbzug,
      rechnungsbetragNetto, ust, ustSatz: r.ustSatz, brutto,
    }),
  };
}

/** Die Zusammenstellung, wie sie am Ende der Rechnung steht. */
function bauZusammenstellung(d) {
  const z = [];
  for (const zeile of d.zeilen.filter((x) => x.art === 'leistung')) {
    z.push({ bez: zeile.bez, netto: zeile.netto });
  }
  z.push({ bez: `Zwischensumme (${prozent(d.ustSatz)} USt.)`, netto: d.summeLeistungen, zwischensumme: true });
  for (const zeile of d.zeilen.filter((x) => x.art === 'einbehalt')) {
    z.push({ bez: zeile.bez, netto: zeile.netto, hinweis: zeile.hinweis });
  }
  const abzuege = d.zeilen.filter((x) => x.art === 'abzug');
  if (abzuege.length) {
    z.push({ bez: 'abzüglich gestellte Rechnungen', ueberschrift: true });
    for (const a of abzuege) z.push({ bez: a.bez, netto: a.netto });
    z.push({ bez: 'Summe Rechnungsabzug', netto: runde2(-d.summeAbzug), zwischensumme: true });
  }
  z.push({
    bez: `Rechnungsbetrag (${prozent(d.ustSatz)} USt.)`,
    netto: d.rechnungsbetragNetto, ust: d.ust, brutto: d.brutto, summe: true,
  });
  return z;
}
