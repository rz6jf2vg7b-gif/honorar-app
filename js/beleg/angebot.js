// Die Blaetter, die ein Angebot oder ein Nachtrag ueber die Rechnung hinaus braucht.
//
// Eine Rechnung sagt, was etwas gekostet hat. Ein Angebot muss sagen, was der
// Auftraggeber dafuer bekommt — und ihm die Moeglichkeit geben, es anzunehmen.
// Beides fehlte bis hierher: Das Angebot trug zwar die Herleitung des Betrags,
// aber weder eine Leistungsbeschreibung noch eine Annahmeerklaerung. Damit war
// es kein Angebot im Rechtssinn, sondern eine Rechnung mit anderer Ueberschrift.
//
// Drei Blaetter entstehen hier:
//   Leistungsbeschreibung  Was beauftragt wird — Leistungsbild, Leistungsphasen
//                          und die Grundleistungen im Wortlaut der Verordnung.
//   Gegenueberstellung     Nur beim Nachtrag: was sich gegenueber dem bisherigen
//                          Vertragsstand aendert und warum.
//   Annahmeerklaerung      Bindefrist und Unterschriftenfeld.
//
// ⚠️ Keine Vertragsklauseln. Aus demselben Grund wie in unterlagen.js: eigene
// Klauseln zu formulieren waere Rechtsdienstleistung (§ 2 RDG). Was hier steht,
// ist entweder amtlicher Verordnungstext, eine Angabe aus dem Vertragsstand oder
// ein Formularfeld. Die Annahmeerklaerung erklaert die Annahme des Angebots
// (§ 147 BGB) — sie ersetzt keinen Architektenvertrag, und das steht auch drauf.

import { eur, prozent } from '../hoai/geld.js';
import { LEISTUNGSBILDER, ZONE_ROEMISCH } from '../hoai/leistungsbilder.js';
import { GRUNDLEISTUNGEN } from '../hoai/grundleistungen.js';

/** Belegarten, die diese Blaetter tragen. */
export const BRAUCHT_ANGEBOTSBLAETTER = (art) => ['AN', 'NA'].includes(art);

const HEKTAR = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });

const werte = (titel, zeilen) => ({ art: 'werte', titel, zeilen: zeilen.filter(Boolean) });
const hinweis = (text, fundstelle) => ({ art: 'hinweis', text, fundstelle });
const tabelle = (titel, spalten, zeilen, fuss, anmerkungen) => ({
  art: 'tabelle', titel, spalten, zeilen, fuss, anmerkungen,
});

/**
 * @param {object} d  dieselben Daten, aus denen der Beleg erzeugt wird
 * @returns {Array} Blaetter [{titel, bausteine}] — der Seitenumbruch geschieht
 *                  beim Rendern, ein Blatt kann also mehrere Seiten fuellen.
 */
export function angebotsblaetter(d) {
  if (!BRAUCHT_ANGEBOTSBLAETTER(d.belegart)) return [];
  const blaetter = [];

  const beschreibung = leistungsbeschreibung(d);
  if (beschreibung.length) {
    blaetter.push({ titel: 'Beschreibung der angebotenen Leistung', bausteine: beschreibung });
  }

  if (d.belegart === 'NA') {
    const g = gegenueberstellung(d);
    if (g.length) blaetter.push({ titel: 'Änderung gegenüber dem bisherigen Vertragsstand', bausteine: g });
  }

  blaetter.push({
    titel: d.belegart === 'NA' ? 'Nachtragsvereinbarung' : 'Annahme des Angebots',
    bausteine: annahmeerklaerung(d),
  });

  return blaetter;
}

// ————————————————————————————————————————————————————————————————
// Leistungsbeschreibung
// ————————————————————————————————————————————————————————————————

function leistungsbeschreibung(d) {
  const v = d.vertrag;
  const e = (d.ermittlungen || [])[0];
  const bausteine = [];

  // Ohne Vertragsstand — Pauschale oder Zeithonorar. Dann gibt es keine
  // Leistungsphasen, sondern nur die angebotenen Positionen. Auch das ist eine
  // Leistungsbeschreibung, nur eine kuerzere.
  if (!v || !v.leistungsbild) {
    if (!e) return [];
    bausteine.push(hinweis(
      'Das Honorar ist frei vereinbart. Die Leistung ist durch die nachstehenden '
      + 'Positionen beschrieben; eine Bewertung nach Leistungsphasen findet nicht statt.',
      '§ 7 HOAI',
    ));
    if ((e.weiterePositionen || []).length) {
      bausteine.push(tabelle('Angebotene Leistungen',
        ['Leistung', 'Betrag'],
        e.weiterePositionen.map((p) => [p.bezeichnung, eur(p.betrag)]),
        ['Summe netto', eur(e.netto)]));
    }
    return bausteine;
  }

  const lb = LEISTUNGSBILDER[v.leistungsbild];
  const nachFlaeche = lb?.bezugsart === 'flaeche_hektar';

  bausteine.push(werte('Grundlagen des Angebots', [
    { bez: 'Leistungsbild', wert: `${lb?.bezeichnung || v.leistungsbild} (${lb?.leistungsbildParagraf || ''} HOAI)` },
    { bez: 'Fassung der Verordnung', wert: `HOAI ${v.fassung}` },
    nachFlaeche
      ? { bez: 'Fläche des Plangebiets', wert: `${HEKTAR.format(v.flaecheHektar || 0)} ha` }
      : { bez: 'Anrechenbare Kosten', wert: eur(e?.anrechenbareKosten || 0) },
    !nachFlaeche && v.kostenermittlung?.grundlage
      ? { bez: 'Grundlage der Kostenermittlung', wert: v.kostenermittlung.grundlage
          + (v.kostenermittlung.datum ? ` vom ${deDatum(v.kostenermittlung.datum)}` : '') }
      : null,
    { bez: 'Honorarzone', wert: ZONE_ROEMISCH[v.honorarzone] || String(v.honorarzone || '') },
    v.honorarzoneBegruendung ? { bez: 'Begründung der Honorarzone', wert: v.honorarzoneBegruendung } : null,
    { bez: 'Honorarsatz', wert: satzText(v.honorarsatz) },
    { bez: 'Grundhonorar für 100 % der Leistungsphasen', wert: eur(e?.grundhonorar100 || 0) },
  ]));

  // Die beauftragten Phasen mit ihrer Bewertung. Die Spalte "nach HOAI" steht
  // daneben, weil eine Abweichung nach unten (Teilbeauftragung) sonst nicht
  // erkennbar waere — genau darueber entsteht spaeter Streit.
  const phasen = (e?.phasen || []).filter((p) => p.vereinbart > 0);
  if (phasen.length) {
    bausteine.push(tabelle('Beauftragte Leistungsphasen',
      ['LPh', 'Leistungsphase', 'nach HOAI', 'vereinbart', 'Honorar'],
      phasen.map((p) => [
        String(p.nr), p.bezeichnung, prozent(p.bewertung), prozent(p.vereinbart),
        eur(p.betragVereinbart),
      ]),
      ['', 'Summe der Grundleistungen', '',
        prozent(phasen.reduce((s, p) => s + p.vereinbart, 0)),
        eur(e.grundleistungenVereinbart || 0)],
      phasen.some((p) => p.vereinbart < p.bewertung - 1e-9)
        ? ['Bei einzelnen Leistungsphasen ist weniger als die volle Bewertung der '
          + 'Verordnung vereinbart. Es werden dann nur die dort genannten Teile erbracht.']
        : null));
  }

  // Die Grundleistungen im Wortlaut der Anlagen. Das ist der eigentliche Zweck
  // des Blattes: Der Auftraggeber sieht, was er kauft, und der Auftragnehmer
  // ist gegen die spaetere Behauptung geschuetzt, etwas sei mitgeschuldet
  // gewesen, was in der Phase gar nicht steht.
  if (d.grundleistungenZeigen !== false) {
    const anlage = GRUNDLEISTUNGEN[v.leistungsbild];
    for (const p of phasen) {
      const phase = anlage?.phasen?.[String(p.nr)];
      if (!phase || !(phase.leistungen || []).length) continue;
      bausteine.push({
        art: 'leistungsliste',
        titel: `Leistungsphase ${p.nr} — ${phase.bezeichnung || p.bezeichnung}`,
        quelle: anlage.anlage ? `${anlage.anlage} HOAI` : '',
        eintraege: phase.leistungen.map((g) => ({ marke: g.buchstabe, text: g.text })),
      });
    }
  }

  // Besondere Leistungen und alles, was neben den Grundleistungen angeboten wird
  const weitere = e?.weiterePositionen || [];
  if (weitere.length) {
    bausteine.push(tabelle('Weitere angebotene Leistungen',
      ['Leistung', 'Betrag'],
      weitere.map((p) => [p.bezeichnung, eur(p.betrag)]),
      null,
      ['Besondere Leistungen sind frei vereinbar; die Honorartafeln gelten für sie nicht.']));
  }

  const zuschlaege = e?.zuschlaege || [];
  if (zuschlaege.length) {
    bausteine.push(tabelle('Vereinbarte Zuschläge',
      ['Zuschlag', 'Satz', 'Betrag'],
      zuschlaege.map((z) => [z.bezeichnung, prozent(z.prozent), eur(z.betrag)])));
  }

  bausteine.push(hinweis(nebenkostenText(v, e), '§ 14 HOAI'));

  // Was nicht dabei ist. Eine Leistungsbeschreibung, die das verschweigt, laedt
  // zu der Annahme ein, alles Weitere sei mitbezahlt.
  const offen = nichtEnthalten(v, phasen, lb);
  if (offen.length) {
    bausteine.push(hinweis(
      `Nicht Gegenstand dieses Angebots: ${offen.join(' · ')}. `
      + 'Diese Leistungen können gesondert beauftragt werden.',
    ));
  }

  return bausteine;
}

function nebenkostenText(v, e) {
  const nk = v.nebenkosten;
  if (nk?.art === 'pauschal') {
    return `Nebenkosten werden pauschal mit ${prozent(nk.prozent)} des Honorars berechnet `
      + `(${eur(e?.nebenkosten || 0)}).`;
  }
  if (nk?.art === 'einzeln') {
    return `Nebenkosten werden auf Einzelnachweis abgerechnet (derzeit ${eur(e?.nebenkosten || 0)}).`;
  }
  return 'Nebenkosten sind in diesem Angebot nicht gesondert ausgewiesen.';
}

function nichtEnthalten(v, phasen, lb) {
  const offen = [];
  const beauftragt = new Set(phasen.map((p) => p.nr));
  const fehlend = Object.keys(lb?.phasen || {}).map(Number)
    .filter((nr) => !beauftragt.has(nr))
    .map((nr) => `LPh ${nr} ${lb.namen[nr]}`);
  if (fehlend.length) offen.push(fehlend.join(', '));
  if (!(v.weiterePositionen || []).length) offen.push('Besondere Leistungen nach Anlage zur HOAI');
  offen.push('Leistungen anderer an der Planung fachlich Beteiligter');
  return offen;
}

const satzText = (s) => {
  if (!Number.isFinite(s)) return '—';
  if (s <= 0) return 'Basissatz';
  if (s >= 1) return 'Höchstsatz';
  if (Math.abs(s - 0.5) < 1e-9) return 'Mittelsatz';
  return `${prozent(s)} zwischen Basis- und Höchstsatz`;
};

const deDatum = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))
  ? String(iso).split('-').reverse().join('.') : String(iso || ''));

// ————————————————————————————————————————————————————————————————
// Gegenueberstellung beim Nachtrag
// ————————————————————————————————————————————————————————————————

/**
 * Ein Nachtrag ohne Gegenueberstellung ist nicht pruefbar: Der Auftraggeber
 * saehe nur eine neue Zahl und muesste die alte selbst heraussuchen. Gezeigt
 * wird deshalb beides nebeneinander samt Unterschied.
 */
function gegenueberstellung(d) {
  const neu = (d.ermittlungen || [])[0];
  const alt = d.vergleich?.vorher;
  const bausteine = [];

  if (d.vergleich?.grund) {
    bausteine.push(werte('Anlass des Nachtrags', [
      { bez: 'Grund', wert: d.vergleich.grund },
      d.vergleich.vorherVersion
        ? { bez: 'bisheriger Vertragsstand', wert: `Version ${d.vergleich.vorherVersion}`
            + (d.vergleich.vorherDatum ? ` vom ${deDatum(d.vergleich.vorherDatum)}` : '') }
        : null,
      d.vergleich.gueltigAb ? { bez: 'gültig ab', wert: deDatum(d.vergleich.gueltigAb) } : null,
    ]));
  }

  if (!alt || !neu) {
    bausteine.push(hinweis(
      'Ein früherer Vertragsstand liegt in der App nicht vor. Die Gegenüberstellung '
      + 'ist deshalb von Hand zu ergänzen.',
    ));
    return bausteine;
  }

  const zeile = (bez, a, b, zeigen = eur) => {
    const diff = (b || 0) - (a || 0);
    return [bez, zeigen(a || 0), zeigen(b || 0),
      Math.abs(diff) < 0.005 ? '—' : (diff > 0 ? `+ ${zeigen(diff)}` : `− ${zeigen(-diff)}`)];
  };

  const zeilen = [
    zeile('Anrechenbare Kosten', alt.anrechenbareKosten, neu.anrechenbareKosten),
    zeile('Grundhonorar für 100 %', alt.grundhonorar100, neu.grundhonorar100),
    zeile('Grundleistungen', alt.grundleistungenVereinbart, neu.grundleistungenVereinbart),
  ];
  if (alt.nebenkosten || neu.nebenkosten) zeilen.push(zeile('Nebenkosten', alt.nebenkosten, neu.nebenkosten));

  bausteine.push(tabelle('Vertragsstand bisher und neu',
    ['', 'bisher', 'neu', 'Unterschied'],
    zeilen,
    ['Honorar netto', eur(alt.netto || 0), eur(neu.netto || 0),
      vorzeichen((neu.netto || 0) - (alt.netto || 0))]));

  // Phasen, die neu hinzukommen oder wegfallen — die haeufigste Ursache eines
  // Nachtrags neben geaenderten Kosten.
  const alteP = new Map((alt.phasen || []).filter((p) => p.vereinbart > 0).map((p) => [p.nr, p]));
  const neueP = new Map((neu.phasen || []).filter((p) => p.vereinbart > 0).map((p) => [p.nr, p]));
  const geaendert = [];
  for (const [nr, p] of neueP) {
    const a = alteP.get(nr);
    if (!a) geaendert.push([`LPh ${nr} ${p.bezeichnung}`, 'nicht beauftragt', prozent(p.vereinbart)]);
    else if (Math.abs(a.vereinbart - p.vereinbart) > 1e-9) {
      geaendert.push([`LPh ${nr} ${p.bezeichnung}`, prozent(a.vereinbart), prozent(p.vereinbart)]);
    }
  }
  for (const [nr, a] of alteP) {
    if (!neueP.has(nr)) geaendert.push([`LPh ${nr} ${a.bezeichnung}`, prozent(a.vereinbart), 'entfällt']);
  }
  if (geaendert.length) {
    bausteine.push(tabelle('Geänderter Leistungsumfang',
      ['Leistungsphase', 'bisher', 'neu'], geaendert));
  }

  return bausteine;
}

const vorzeichen = (z) => (Math.abs(z) < 0.005 ? '—' : (z > 0 ? `+ ${eur(z)}` : `− ${eur(-z)}`));

// ————————————————————————————————————————————————————————————————
// Annahmeerklaerung
// ————————————————————————————————————————————————————————————————

function annahmeerklaerung(d) {
  const istNachtrag = d.belegart === 'NA';
  const bausteine = [];

  bausteine.push(hinweis(
    d.bindefrist
      ? `An dieses Angebot halte ich mich bis zum ${deDatum(d.bindefrist)} gebunden. `
        + 'Geht die Annahme später ein, gilt sie als neuer Antrag.'
      : 'Eine Frist für die Annahme ist nicht bestimmt. Das Angebot kann deshalb nur '
        + 'bis zu dem Zeitpunkt angenommen werden, in dem der Eingang der Antwort unter '
        + 'regelmäßigen Umständen erwartet werden darf.',
    d.bindefrist ? '§ 148, § 150 Abs. 1 BGB' : '§ 147 Abs. 2 BGB',
  ));

  bausteine.push(hinweis(
    istNachtrag
      ? 'Mit der Unterzeichnung wird der vorstehend dargestellte Vertragsstand '
        + 'vereinbart. Der bisherige Vertrag gilt im Übrigen unverändert fort.'
      : 'Mit der Unterzeichnung wird das vorstehende Angebot angenommen. Die '
        + 'Honorarvereinbarung bedarf der Textform und liegt mit diesem Blatt vor.',
    '§ 7 Abs. 1 HOAI',
  ));

  bausteine.push({
    art: 'unterschrift',
    titel: istNachtrag ? 'Nachtrag angenommen' : 'Angebot angenommen',
    felder: [
      { rolle: 'Auftraggeber', name: d.empfaenger?.name || '' },
      { rolle: 'Auftragnehmer', name: d.buero?.inhaber || d.buero?.name || '' },
    ],
  });

  bausteine.push(hinweis(
    'Dieses Blatt erklärt die Annahme des Honorarangebots. Es ersetzt keinen '
    + 'Architekten- oder Ingenieurvertrag; Leistungszeiten, Haftung, Kündigung und '
    + 'Urheberrecht sind dort zu regeln.',
  ));

  return bausteine;
}
