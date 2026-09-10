// Mahnwesen: Verzug, Zinsen, Mahnstufen.
//
// Was hier gerechnet wird, ist eine Forderung gegen einen Vertragspartner. Sie
// muss stimmen — eine zu hoch angesetzte Zinsforderung ist selbst eine
// unberechtigte Forderung und schwaecht die Position im Streit.
//
// Keine Rechtsberatung: Die Regeln bilden den Normalfall der §§ 286–288 BGB ab.
// Ob Verzug tatsaechlich eingetreten ist, haengt am Einzelfall (Zugang der
// Rechnung, Mahnung, vereinbarte Zahlungsziele, Einwendungen des Auftraggebers)
// und gehoert im Zweifel vor den Anwalt.

import { runde2 } from '../hoai/geld.js';

/**
 * Basiszinssatz nach § 247 BGB.
 *
 * Er wird zum 1. Januar und 1. Juli von der Deutschen Bundesbank
 * bekanntgegeben. Die Tabelle ist deshalb Pflege, keine Rechnung — sie muss
 * halbjaehrlich ergaenzt werden.
 *
 * ⚠️ Stand dieser Tabelle: 1. Halbjahr 2026. Fuer spaetere Zeitraeume gibt
 * basiszinssatz() den letzten bekannten Wert zurueck UND meldet das, damit
 * niemand mit einem veralteten Satz mahnt. Der aktuelle Wert steht unter
 * bundesbank.de → Basiszinssatz.
 */
export const BASISZINS = [
  { ab: '2022-01-01', satz: -0.0088 },
  { ab: '2022-07-01', satz: -0.0088 },
  { ab: '2023-01-01', satz: 0.0162 },
  { ab: '2023-07-01', satz: 0.0312 },
  { ab: '2024-01-01', satz: 0.0362 },
  { ab: '2024-07-01', satz: 0.0337 },
  { ab: '2025-01-01', satz: 0.0227 },
  { ab: '2025-07-01', satz: 0.0127 },
  { ab: '2026-01-01', satz: 0.0127 },
];

/** Der zuletzt gepflegte Halbjahresbeginn — alles danach ist ungeprueft. */
export const BASISZINS_STAND = BASISZINS[BASISZINS.length - 1].ab;

/**
 * @returns {{satz: number, ab: string, geprueft: boolean}}
 *   `geprueft: false` heisst: Der Zeitraum liegt hinter der gepflegten Tabelle,
 *   der letzte bekannte Wert wird weiterverwendet und ist zu ueberpruefen.
 */
export function basiszinssatz(datum) {
  const tag = String(datum || '').slice(0, 10);
  let treffer = BASISZINS[0];
  for (const e of BASISZINS) if (e.ab <= tag) treffer = e;
  return { satz: treffer.satz, ab: treffer.ab, geprueft: tag < naechstesHalbjahr(BASISZINS_STAND) };
  // `geprueft: false` heisst nicht "falsch", sondern "nicht nachgesehen": Der
  // letzte bekannte Satz wird weiterverwendet und die Oberflaeche warnt.
}

/**
 * Der naechste Halbjahresbeginn NACH diesem Datum.
 *
 * Muss vom Datum selbst ausgehen, nicht vom Tabelleneintrag: Liegt das Datum
 * hinter der gepflegten Tabelle, zeigt deren letzter Eintrag in die
 * Vergangenheit — die Zinsschleife lief dann rueckwaerts und blieb haengen
 * (gefunden am 10.09.2026 durch den Test fuer den ungepflegten Zinssatz).
 */
function naechstesHalbjahr(datum) {
  const [j, m] = String(datum).split('-').map(Number);
  return m < 7 ? `${j}-07-01` : `${j + 1}-01-01`;
}

/**
 * Verzugszinssatz nach § 288 BGB.
 *
 * Abs. 1: 5 Prozentpunkte ueber dem Basiszinssatz.
 * Abs. 2: 9 Prozentpunkte, wenn an dem Rechtsgeschaeft kein Verbraucher
 *         beteiligt ist — bei Entgeltforderungen zwischen Unternehmern also der
 *         Regelfall eines Architektenbueros.
 */
export function verzugszinssatz(datum, istVerbraucher) {
  const basis = basiszinssatz(datum);
  const aufschlag = istVerbraucher ? 0.05 : 0.09;
  return {
    satz: runde4(basis.satz + aufschlag),
    basis: basis.satz,
    basisAb: basis.ab,
    aufschlag,
    fundstelle: istVerbraucher ? '§ 288 Abs. 1 BGB' : '§ 288 Abs. 2 BGB',
    geprueft: basis.geprueft,
  };
}

const runde4 = (z) => Math.round(z * 10000) / 10000;

/** Tage zwischen zwei Datumsangaben, in UTC — sonst kostet die Sommerzeit einen. */
export function tageZwischen(von, bis) {
  const a = Date.UTC(...von.split('-').map((x, i) => (i === 1 ? Number(x) - 1 : Number(x))));
  const b = Date.UTC(...bis.split('-').map((x, i) => (i === 1 ? Number(x) - 1 : Number(x))));
  return Math.max(0, Math.round((b - a) / 86400000));
}

/**
 * Verzugszinsen auf einen offenen Betrag.
 *
 * Gerechnet wird taggenau auf Basis des tatsaechlichen Jahres (actual/365,
 * im Schaltjahr /366) und halbjahresweise, weil sich der Basiszinssatz zum
 * 1. Januar und 1. Juli aendert. Ein Zeitraum ueber den Jahreswechsel wird
 * deshalb geteilt — sonst faengt man sich stillschweigend einen falschen Satz
 * ein, sobald die Forderung ein halbes Jahr alt ist.
 */
export function verzugszinsen({ betrag, ab, bis, istVerbraucher = false }) {
  if (!betrag || !ab || !bis) return { betrag: 0, abschnitte: [], geprueft: true };
  const abschnitte = [];
  let zeiger = ab;

  // Die Grenze wird aus dem Zeiger selbst gebildet, damit sie immer vorwaerts
  // zeigt. Der Zaehler ist eine Reissleine: Bei einem Datumsfehler soll die App
  // eine falsche Zahl melden, nicht einfrieren.
  let runden = 0;
  while (zeiger < bis && runden++ < 200) {
    const grenze = naechstesHalbjahr(zeiger);
    const ende = grenze < bis ? grenze : bis;
    const tage = tageZwischen(zeiger, ende);
    if (tage > 0) {
      const z = verzugszinssatz(zeiger, istVerbraucher);
      const jahr = Number(zeiger.slice(0, 4));
      const tageImJahr = (jahr % 4 === 0 && jahr % 100 !== 0) || jahr % 400 === 0 ? 366 : 365;
      abschnitte.push({
        von: zeiger, bis: ende, tage,
        satz: z.satz, basis: z.basis, fundstelle: z.fundstelle, geprueft: z.geprueft,
        betrag: runde2((betrag * z.satz * tage) / tageImJahr),
      });
    }
    zeiger = ende;
  }

  return {
    betrag: runde2(abschnitte.reduce((s, a) => s + a.betrag, 0)),
    abschnitte,
    geprueft: abschnitte.every((a) => a.geprueft),
  };
}

/**
 * Verzugspauschale nach § 288 Abs. 5 BGB: 40 €.
 *
 * Nur bei Entgeltforderungen und nur, wenn der Schuldner kein Verbraucher ist.
 * Sie wird auf einen Schadensersatz wegen Rechtsverfolgungskosten angerechnet —
 * wer spaeter Anwaltskosten geltend macht, muss sie abziehen.
 */
export const VERZUGSPAUSCHALE = 40;

export const MAHNSTUFEN = [
  { nr: 1, titel: 'Zahlungserinnerung', frist: 10,
    text: 'vermutlich haben Sie die nachstehende Rechnung übersehen. '
      + 'Ich bitte Sie, den offenen Betrag bis zum {frist} auszugleichen.' },
  { nr: 2, titel: 'Mahnung', frist: 10,
    text: 'auf meine Zahlungserinnerung habe ich keinen Zahlungseingang feststellen können. '
      + 'Ich fordere Sie auf, den offenen Betrag bis zum {frist} zu begleichen.' },
  { nr: 3, titel: 'Letzte Mahnung', frist: 7,
    text: 'trotz Mahnung ist der offene Betrag bis heute nicht eingegangen. '
      + 'Ich fordere Sie letztmalig auf, bis zum {frist} zu zahlen. '
      + 'Nach fruchtlosem Ablauf dieser Frist werde ich die Forderung ohne weitere '
      + 'Ankündigung gerichtlich geltend machen.' },
];

/**
 * Eine Mahnung aufstellen.
 *
 * @param {object} m
 * @param {number} m.stufe            1–3
 * @param {Array}  m.posten           [{nummer, datum, faelligAm, offen}]
 * @param {string} m.datum            Datum der Mahnung
 * @param {boolean} [m.istVerbraucher]
 * @param {boolean} [m.pauschale]     40 € nach § 288 Abs. 5 BGB ansetzen
 */
export function mahnungAufstellen({
  stufe = 1, posten = [], datum, istVerbraucher = false, pauschale = false,
}) {
  const definition = MAHNSTUFEN.find((s) => s.nr === stufe) || MAHNSTUFEN[0];
  const zeilen = [];
  let hauptforderung = 0;
  let zinsen = 0;
  let ungeprueft = false;

  for (const p of posten) {
    hauptforderung = runde2(hauptforderung + p.offen);
    // Verzug beginnt fruehestens mit der Faelligkeit. Ohne Faelligkeitsdatum
    // wird kein Zins gerechnet — lieber keine Forderung als eine falsche.
    const z = p.faelligAm
      ? verzugszinsen({ betrag: p.offen, ab: p.faelligAm, bis: datum, istVerbraucher })
      : { betrag: 0, abschnitte: [], geprueft: true };
    zinsen = runde2(zinsen + z.betrag);
    if (!z.geprueft) ungeprueft = true;
    zeilen.push({ ...p, zinsen: z.betrag, abschnitte: z.abschnitte });
  }

  // Die Pauschale steht nur zu, wenn kein Verbraucher beteiligt ist.
  const pauschalbetrag = (pauschale && !istVerbraucher) ? VERZUGSPAUSCHALE : 0;

  return {
    stufe,
    titel: definition.titel,
    text: definition.text,
    frist: definition.frist,
    datum,
    zeilen,
    hauptforderung,
    zinsen,
    pauschale: pauschalbetrag,
    gesamt: runde2(hauptforderung + zinsen + pauschalbetrag),
    istVerbraucher,
    // Warnung nach oben durchreichen: Der Basiszinssatz ist nicht gepflegt.
    zinssatzUngeprueft: ungeprueft,
    zinssatzStand: BASISZINS_STAND,
  };
}
