// Übergabe an die Buchhaltung.
//
// Bewusst eine schlichte CSV-Liste und kein DATEV-Buchungsstapel: Der Stapel
// verlangt Sachkonten, Gegenkonten und einen Berater-/Mandantenschluessel, die
// nur der Steuerberater kennt. Wer sie raet, erzeugt Buchungen, die der Berater
// haendisch korrigieren muss — das ist schlechter als eine saubere Liste, aus
// der er selbst bucht.
//
// Semikolon als Trennzeichen und Komma als Dezimalzeichen: So oeffnet Excel die
// Datei im deutschen Gebietsschema ohne Nachfrage. Die Byte-Order-Marke am
// Anfang sorgt dafuer, dass Umlaute ankommen — ohne sie zeigt Excel "Mller".
//
// ⚠️ Die Datei enthaelt saemtliche Rechnungsdaten mit Kundennamen und Betraegen.
// Sie gehoert in den Projektordner oder direkt an den Steuerberater, nicht in
// ein geteiltes Verzeichnis.

const FELDER = [
  'Belegnummer', 'Belegdatum', 'Art', 'Projektnummer', 'Projekt', 'Empfänger',
  'Leistungszeitraum', 'Netto', 'USt-Satz', 'USt', 'Brutto',
  'Bezahlt', 'Bezahlt am', 'Skonto gewährt', 'Offen', 'Storniert', 'Bemerkung',
];

const zahl = (z) => (Number.isFinite(z) ? z.toFixed(2).replace('.', ',') : '');
const text = (s) => {
  const t = String(s ?? '');
  // Semikolon, Anfuehrungszeichen und Zeilenumbrueche muessen eingefasst werden,
  // sonst verrutschen die Spalten.
  return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};
const deDatum = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(String(d || ''))
  ? String(d).split('-').reverse().join('.') : '');

/**
 * @param {Array} belege     festgeschriebene Belege
 * @param {object} nachschlag {projekte: Map, adressen: Map}
 * @returns {string} CSV mit BOM
 */
export function buchhaltungCsv(belege, { projekte = new Map(), adressen = new Map() } = {}) {
  const zeilen = [FELDER.join(';')];

  for (const b of belege) {
    const p = projekte.get(b.projektId);
    const a = adressen.get(b.adresseId);
    const zahlungen = b.zahlungen || [];
    const skonto = zahlungen.filter((z) => z.art === 'skonto')
      .reduce((s, z) => s + (z.betrag || 0), 0);
    const echt = zahlungen.filter((z) => z.art !== 'skonto');
    const letzte = echt.length ? echt[echt.length - 1].datum : '';
    const offen = Math.round(((b.brutto || 0) - (b.gezahlt || 0)) * 100) / 100;

    zeilen.push([
      text(b.nummer),
      deDatum(b.datum),
      text(b.art),
      text(p?.nummer || ''),
      text(p?.name || ''),
      text(a?.name || ''),
      text(b.leistungszeitraum || ''),
      zahl(b.summeNetto ?? 0),
      zahl((b.ustSatz ?? 0) * 100),
      zahl(b.ust ?? 0),
      zahl(b.brutto ?? 0),
      zahl(b.gezahlt ?? 0),
      deDatum(letzte),
      skonto ? zahl(Math.round(skonto * 100) / 100) : '',
      zahl(offen),
      b.status === 'storniert' || b.storniertBeleg ? 'ja' : '',
      text([b.uebernommen ? 'aus einem anderen Programm übernommen' : '', b.notiz || '']
        .filter(Boolean).join(' · ')),
    ].join(';'));
  }

  // BOM, damit Excel die Umlaute erkennt.
  return `﻿${zeilen.join('\r\n')}\r\n`;
}

/** Summen für die Kontrolle — der Steuerberater gleicht sie gegen seine Buchung ab. */
export function buchhaltungSummen(belege) {
  const s = { anzahl: belege.length, netto: 0, ust: 0, brutto: 0, gezahlt: 0, offen: 0 };
  for (const b of belege) {
    s.netto += b.summeNetto || 0;
    s.ust += b.ust || 0;
    s.brutto += b.brutto || 0;
    s.gezahlt += b.gezahlt || 0;
  }
  s.offen = s.brutto - s.gezahlt;
  for (const k of ['netto', 'ust', 'brutto', 'gezahlt', 'offen']) {
    s[k] = Math.round(s[k] * 100) / 100;
  }
  return s;
}
