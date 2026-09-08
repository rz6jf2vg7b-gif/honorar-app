// Prueft einen Rechnungsbeleg auf die Pflichtangaben nach § 14 Abs. 4 UStG.
//
// Warum das hier steht und nicht im CD: Weil es genau die Grenze ist, an der die
// Gestaltungsfreiheit endet. Ein Buero darf jede Farbe und jede Schrift waehlen —
// aber keine Rechnung erzeugen, der eine Pflichtangabe fehlt. Fehlt eine, ist die
// Rechnung nicht zum Vorsteuerabzug geeignet: der Empfaenger bekommt seine
// Umsatzsteuer nicht vom Finanzamt zurueck und wird die Rechnung zurueckweisen.
//
// Die Pruefung laeuft auf den Daten, nicht auf dem erzeugten HTML — ein Layout kann
// sie damit nicht aushebeln.
//
// Keine Rechtsberatung: Die Liste bildet den Regelfall ab. Sonderfaelle
// (Kleinunternehmer nach § 19, Reverse-Charge nach § 13b, innergemeinschaftliche
// Leistungen, Gutschriften, Reiseleistungen, Differenzbesteuerung) tragen weitere
// Pflichtangaben und gehoeren mit dem Steuerberater abgestimmt.

/** Kleinbetragsrechnungen bis 250 € brutto brauchen weniger Angaben (§ 33 UStDV). */
export const KLEINBETRAG_GRENZE = 250;

/**
 * @param {object} d  dieselben Daten, aus denen der Beleg erzeugt wird
 * @returns {{ok: boolean, fehlend: Array, hinweise: Array}}
 */
export function pruefePflichtangaben(d) {
  const fehlend = [];
  const hinweise = [];
  const b = d.buero || {};
  const e = d.empfaenger || {};
  const a = d.abrechnung || {};

  const kleinbetrag = Math.abs(a.brutto || 0) <= KLEINBETRAG_GRENZE;

  const verlangt = (bedingung, feld, fundstelle) => {
    if (!bedingung) fehlend.push({ feld, fundstelle });
  };

  // 1. Vollständiger Name und Anschrift des leistenden Unternehmers
  verlangt(b.name && b.strasse && b.plzOrt,
    'Name und vollständige Anschrift des Rechnungsstellers', '§ 14 Abs. 4 Nr. 1 UStG');

  // 2. Steuernummer oder Umsatzsteuer-Identifikationsnummer
  verlangt(b.steuernummer || b.ustId,
    'Steuernummer oder USt-IdNr. des Rechnungsstellers', '§ 14 Abs. 4 Nr. 2 UStG');

  // 3. Ausstellungsdatum
  verlangt(a.datum, 'Ausstellungsdatum', '§ 14 Abs. 4 Nr. 3 UStG');

  // 4. Fortlaufende Rechnungsnummer
  verlangt(a.nummer, 'Rechnungsnummer', '§ 14 Abs. 4 Nr. 4 UStG');

  // 5. Menge und Art der Leistung
  verlangt((a.zeilen || []).some((z) => z.art === 'leistung') || (d.ermittlungen || []).length,
    'Art und Umfang der Leistung', '§ 14 Abs. 4 Nr. 5 UStG');

  // 7./8. Entgelt und Steuerbetrag
  verlangt(Number.isFinite(a.rechnungsbetragNetto), 'Nettoentgelt', '§ 14 Abs. 4 Nr. 7 UStG');
  verlangt(Number.isFinite(a.ust) && Number.isFinite(a.ustSatz),
    'Steuersatz und Steuerbetrag', '§ 14 Abs. 4 Nr. 8 UStG');

  if (!kleinbetrag) {
    // 1. Name und Anschrift des Leistungsempfängers
    verlangt(e.name && e.strasse && e.plzOrt,
      'Name und vollständige Anschrift des Leistungsempfängers', '§ 14 Abs. 4 Nr. 1 UStG');

    // 6. Zeitpunkt der Leistung
    verlangt(d.leistungszeitraum || d.leistungsdatum,
      'Zeitpunkt der Leistung oder Leistungszeitraum', '§ 14 Abs. 4 Nr. 6 UStG');
  } else {
    hinweise.push({
      text: `Kleinbetragsrechnung bis ${KLEINBETRAG_GRENZE} € brutto — Angaben zum Empfänger und `
        + 'zum Leistungszeitpunkt sind hier nicht zwingend.',
      fundstelle: '§ 33 UStDV',
    });
  }

  // Vorauszahlungen und Abschläge: Wird über eine noch nicht erbrachte Leistung
  // abgerechnet, muss das erkennbar sein — sonst entsteht die Steuer trotzdem.
  if (a.art === 'AR' && !(d.leistungszeitraum || d.leistungsdatum)) {
    hinweise.push({
      text: 'Bei Abschlagsrechnungen sollte erkennbar sein, für welchen Leistungsstand abgerechnet wird.',
      fundstelle: '§ 14 Abs. 4 Nr. 6 UStG',
    });
  }

  if (b.kleinunternehmer) {
    hinweise.push({
      text: 'Kleinunternehmer nach § 19 UStG: Es darf keine Umsatzsteuer ausgewiesen werden, '
        + 'stattdessen ist ein Hinweis auf die Steuerbefreiung aufzunehmen.',
      fundstelle: '§ 19 UStG, § 14 Abs. 4 Nr. 8 UStG',
    });
  }

  return { ok: fehlend.length === 0, fehlend, hinweise, kleinbetrag };
}

/** Kurzfassung fuer die Ausgabe in der Oberflaeche oder auf der Konsole. */
export function pflichtangabenText(ergebnis) {
  if (ergebnis.ok) return 'Pflichtangaben nach § 14 UStG vollständig.';
  return 'Fehlende Pflichtangaben:\n'
    + ergebnis.fehlend.map((f) => `  - ${f.feld} (${f.fundstelle})`).join('\n');
}
