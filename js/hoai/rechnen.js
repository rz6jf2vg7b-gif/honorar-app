// Rechenkern HOAI — Honorarermittlung mit vollstaendiger Herleitung.
//
// Grundsatz: Jeder Rechenschritt gibt neben dem Betrag auch seine Herleitung aus.
// Nicht als Kommentar, sondern als Datenstruktur, aus der die Rechnung den Abschnitt
// "Darstellung der Honorarermittlung" erzeugt. Der Empfaenger muss jede Zahl
// nachrechnen koennen, ohne Zugriff auf dieses Programm — das ist bei einer
// Honorarrechnung keine Kuer, sondern Voraussetzung ihrer Pruefbarkeit.
//
// Geprueft gegen zwei mit HOAI-Pro 2020 erzeugte Rechnungen nach HOAI 2013;
// die Pruefung liegt ausserhalb dieses Repositorys.

import { TAFELN } from './tafeln.js';
import { LEISTUNGSBILDER, ZONE_ROEMISCH, satzBezeichnung } from './leistungsbilder.js';
import { runde2, runde, eur, prozent } from './geld.js';

// ————————————————————————————————————————————————————————————————
// Bausteine der Herleitung
// ————————————————————————————————————————————————————————————————

const werte = (titel, zeilen) => ({ art: 'werte', titel, zeilen });
const formel = (formel, eingesetzt, ergebnis) => ({ art: 'formel', formel, eingesetzt, ergebnis });
const hinweis = (text, fundstelle = null) => ({ art: 'hinweis', text, fundstelle });
const tabelle = (titel, spalten, zeilen, fuss = null, anmerkungen = null) =>
  ({ art: 'tabelle', titel, spalten, zeilen, fuss, anmerkungen });

// ————————————————————————————————————————————————————————————————
// 1 Anrechenbare Kosten
// ————————————————————————————————————————————————————————————————

/** Anrechnungsarten einer Kostengruppe. */
/**
 * Art der Massnahme nach § 2. Sie entscheidet, welcher Zuschlag ueberhaupt in
 * Betracht kommt:
 *   Umbau und Modernisierung  -> Umbauzuschlag (§ 6 Abs. 2, § 36 und die
 *                                entsprechenden Vorschriften der Leistungsbilder)
 *   Instandsetzung/-haltung   -> Erhoehung der Objektueberwachung (§ 12 Abs. 2)
 *   Neubau und die uebrigen   -> keiner von beiden
 *
 * Beides sind KANN-Vereinbarungen in Textform. Der Unterschied: Beim
 * Umbauzuschlag gilt ohne Vereinbarung ein Zuschlag von 20 Prozent als
 * vereinbart (§ 6 Abs. 2 Satz 4) — bei der Objektueberwachung gibt es keine
 * solche Auffangregel.
 */
export const MASSNAHME = {
  NEUBAU: 'neubau',
  WIEDERAUFBAU: 'wiederaufbau',
  ERWEITERUNG: 'erweiterung',
  UMBAU: 'umbau',
  MODERNISIERUNG: 'modernisierung',
  INSTANDSETZUNG: 'instandsetzung',
  INSTANDHALTUNG: 'instandhaltung',
};

export const MASSNAHME_TEXT = {
  neubau: 'Neubau / Neuanlage (§ 2 Abs. 2)',
  wiederaufbau: 'Wiederaufbau (§ 2 Abs. 3)',
  erweiterung: 'Erweiterungsbau (§ 2 Abs. 4)',
  umbau: 'Umbau (§ 2 Abs. 5)',
  modernisierung: 'Modernisierung (§ 2 Abs. 6)',
  instandsetzung: 'Instandsetzung (§ 2 Abs. 8)',
  instandhaltung: 'Instandhaltung (§ 2 Abs. 9)',
};

/** Bei welcher Massnahme kommt ein Umbau- oder Modernisierungszuschlag in Betracht? */
export const IST_UMBAU = (m) => m === MASSNAHME.UMBAU || m === MASSNAHME.MODERNISIERUNG;

/** Bei welcher Massnahme greift § 12 Abs. 2? */
export const IST_INSTANDSETZUNG = (m) =>
  m === MASSNAHME.INSTANDSETZUNG || m === MASSNAHME.INSTANDHALTUNG;

/**
 * Zuschlag, der ohne Vereinbarung in Textform als vereinbart gilt.
 * § 6 Abs. 2 Satz 4: "Sofern keine Vereinbarung in Textform getroffen wurde,
 * gilt ein Zuschlag von 20 Prozent ab einem durchschnittlichen
 * Schwierigkeitsgrad als vereinbart."
 */
export const UMBAUZUSCHLAG_OHNE_VEREINBARUNG = 0.20;

/** Obergrenze der Erhoehung nach § 12 Abs. 2. */
export const OBJEKTUEBERWACHUNG_ZUSCHLAG_MAX = 0.50;

/**
 * Minderung der Prozentsaetze bei Wiederholungen (§ 11 Abs. 3).
 *
 * "Umfasst ein Auftrag mehrere im Wesentlichen gleiche Gebaeude … oder mehrere
 * Objekte nach Typenplanung oder Serienbauten, so sind die Prozentsaetze der
 * Leistungsphasen 1 bis 6 fuer die erste bis vierte Wiederholung um 50 Prozent,
 * fuer die fuenfte bis siebte Wiederholung um 60 Prozent und ab der achten
 * Wiederholung um 90 Prozent zu mindern."
 *
 * Entscheidend ist das Wort WIEDERHOLUNG: Das erste Objekt wird voll berechnet,
 * gemindert werden erst die weiteren. Und gemindert werden nur die
 * Leistungsphasen 1 bis 6 — die Ausfuehrungsphasen 7 bis 9 fallen bei jedem
 * Objekt erneut vollstaendig an, ein Bauleiter steht auf jeder Baustelle.
 *
 * @param {number} nr Nummer der Wiederholung, 1 = erste Wiederholung
 * @returns {number} Minderung als Anteil (0.5 = um 50 Prozent gemindert)
 */
export function wiederholungsminderung(nr) {
  if (nr <= 0) return 0;
  if (nr <= 4) return 0.50;
  if (nr <= 7) return 0.60;
  return 0.90;
}

/** Leistungsphasen, die § 11 Abs. 3 mindert. */
export const GEMINDERTE_PHASEN = [1, 2, 3, 4, 5, 6];

/**
 * Einzelbeauftragung nach § 9 — keine Deckelung, sondern eine Anhebung.
 *
 * "Wird die Vorplanung oder Entwurfsplanung … als Einzelleistung in Auftrag
 * gegeben, koennen fuer die Leistungsbewertung der jeweiligen Leistungsphase
 *   1. fuer die Vorplanung hoechstens der Prozentsatz der Vorplanung und der
 *      Prozentsatz der Grundlagenermittlung und
 *   2. fuer die Entwurfsplanung hoechstens der Prozentsatz der Entwurfsplanung
 *      und der Prozentsatz der Vorplanung
 * zum Zweck der Honorarberechnung herangezogen werden."
 *
 * Der Gedanke dahinter: Wer nur die Vorplanung liefert, muss die
 * Grundlagenermittlung trotzdem leisten — sonst hat er nichts, worauf er
 * aufbauen kann. Die Verordnung erlaubt deshalb, ihren Prozentsatz
 * mitzuberechnen. "Hoechstens" ist die Obergrenze, nicht der Regelfall; zu
 * vereinbaren ist es in Textform.
 *
 * Absatz 3 regelt dasselbe fuer die Objektueberwachung bei Gebaeuden und
 * Technischer Ausruestung: dort kommen Grundlagenermittlung UND Vorplanung
 * hinzu.
 */
export const EINZELLEISTUNG = {
  KEINE: '',
  VORPLANUNG: 'vorplanung',
  ENTWURFSPLANUNG: 'entwurfsplanung',
  OBJEKTUEBERWACHUNG: 'objektueberwachung',
};

export const EINZELLEISTUNG_TEXT = {
  vorplanung: 'Vorplanung als Einzelleistung (§ 9 Abs. 1 Nr. 1)',
  entwurfsplanung: 'Entwurfsplanung als Einzelleistung (§ 9 Abs. 1 Nr. 2)',
  objektueberwachung: 'Objektüberwachung als Einzelleistung (§ 9 Abs. 3)',
};

/**
 * Welche Phase wird angehoben, und um die Prozentsaetze welcher Phasen?
 * @returns {{phase:number, zusatz:number[]}|null}
 */
export function einzelleistungAnhebung(art) {
  return ({
    vorplanung: { phase: 2, zusatz: [1] },
    entwurfsplanung: { phase: 3, zusatz: [2] },
    objektueberwachung: { phase: 8, zusatz: [1, 2] },
  })[art] || null;
}

/** § 9 Abs. 3 gilt nur fuer Gebaeude und Technische Ausruestung. */
export const OBJEKTUEBERWACHUNG_EINZELN_MOEGLICH =
  ['gebaeude', 'innenraeume', 'technische_ausruestung'];

export const ANRECHNUNG = {
  VOLL: 'voll',                 // vollstaendig anrechenbar
  ANTEILIG: 'anteilig',         // mit einem vereinbarten Prozentsatz
  TECHNIK_33_2: 'technik33_2',  // Technische Anlagen nach § 33 Abs. 2 (25-Prozent-Regel)
  KEINE: 'keine',               // nicht anrechenbar
};

/**
 * Ermittelt die anrechenbaren Kosten aus einer Kostenermittlung nach DIN 276.
 *
 * Die Zuordnung, welche Kostengruppe wie anrechenbar ist, trifft der Planer —
 * sie haengt davon ab, was er selbst plant und ueberwacht (§ 33 Abs. 2 und 3).
 * Das Programm rechnet die Zuordnung aus, es erfindet sie nicht.
 *
 * @param {object} k
 * @param {string} k.grundlage   z.B. "Kostenberechnung"
 * @param {string} [k.datum]     Datum der Kostenermittlung (fuer die Herleitung)
 * @param {string} [k.dinFassung] z.B. "DIN 276 Ausgabe Dezember 2008"
 * @param {Array}  k.gruppen     [{nr, bezeichnung, betrag, anrechnung, anteil?, bemerkung?}]
 * @param {number} [k.mitzuverarbeitendeBausubstanz] Betrag nach § 4 Abs. 3
 */
export function anrechenbareKosten(k) {
  const herleitung = [];
  const gruppen = k.gruppen || [];

  for (const g of gruppen) {
    if (typeof g.betrag !== 'number' || !Number.isFinite(g.betrag)) {
      throw new TypeError(`Kostengruppe ${g.nr}: Betrag fehlt oder ist keine Zahl`);
    }
    if (g.anrechnung === ANRECHNUNG.ANTEILIG && typeof g.anteil !== 'number') {
      throw new TypeError(`Kostengruppe ${g.nr}: anteilige Anrechnung ohne Prozentsatz`);
    }
  }

  // Erst alles ausser den Technischen Anlagen nach § 33 Abs. 2 — deren Anrechnung
  // bemisst sich an den "sonstigen anrechenbaren Kosten" und braucht sie als Basis.
  // Bemerkungen wandern als nummerierte Fussnoten unter die Tabelle — als eigene
  // Spalte waeren sie meist leer und wuerden den Zahlenspalten die Breite nehmen.
  const anmerkungen = [];
  const merke = (text) => {
    if (!text) return '';
    anmerkungen.push(text);
    return ` (${anmerkungen.length})`;
  };

  const zeilen = [];
  let sonstige = 0;
  for (const g of gruppen) {
    if (g.anrechnung === ANRECHNUNG.TECHNIK_33_2) continue;
    let betrag = 0;
    let art = '';
    if (g.anrechnung === ANRECHNUNG.VOLL) {
      betrag = g.betrag; art = '100 %';
    } else if (g.anrechnung === ANRECHNUNG.ANTEILIG) {
      betrag = runde2(g.betrag * g.anteil); art = prozent(g.anteil);
    } else {
      betrag = 0; art = '0 %';
    }
    sonstige = runde2(sonstige + betrag);
    zeilen.push([`${g.nr} ${g.bezeichnung}${merke(g.bemerkung)}`, eur(g.betrag), art, eur(betrag)]);
  }

  const mvb = k.mitzuverarbeitendeBausubstanz || 0;
  if (mvb) {
    sonstige = runde2(sonstige + mvb);
    zeilen.push(['mitzuverarbeitende Bausubstanz (§ 4 Abs. 3)', eur(mvb), '100 %', eur(mvb)]);
  }

  // Technische Anlagen nach § 33 Abs. 2
  const technik = gruppen.filter((g) => g.anrechnung === ANRECHNUNG.TECHNIK_33_2);
  const technikSumme = runde2(technik.reduce((s, g) => s + g.betrag, 0));
  let technikAnrechenbar = 0;
  const technikHerleitung = [];

  if (technik.length) {
    const grenze = runde2(sonstige * 0.25);
    const bisGrenze = Math.min(technikSumme, grenze);
    const ueber = Math.max(0, runde2(technikSumme - grenze));
    technikAnrechenbar = runde2(bisGrenze + ueber * 0.5);

    for (const g of technik) {
      zeilen.push([`${g.nr} ${g.bezeichnung}${merke(g.bemerkung)}`, eur(g.betrag), 'nach § 33 Abs. 2', '']);
    }
    zeilen.push(['davon anrechenbar (§ 33 Abs. 2)', '', 'siehe unten', eur(technikAnrechenbar)]);

    technikHerleitung.push(
      hinweis(
        'Für Grundleistungen bei Gebäuden und Innenräumen sind auch die Kosten für Technische Anlagen, '
        + 'die der Auftragnehmer nicht fachlich plant oder deren Ausführung er nicht fachlich überwacht, '
        + '1. vollständig anrechenbar bis zu einem Betrag von 25 Prozent der sonstigen anrechenbaren Kosten und '
        + '2. zur Hälfte anrechenbar mit dem Betrag, der 25 Prozent der sonstigen anrechenbaren Kosten übersteigt.',
        '§ 33 Abs. 2 HOAI',
      ),
      werte('Anrechnung der Technischen Anlagen', [
        { bez: 'Kosten für Technische Anlagen', wert: eur(technikSumme) },
        { bez: 'Sonstige anrechenbare Kosten', wert: eur(sonstige) },
        { bez: '25 % der sonstigen anrechenbaren Kosten', wert: eur(grenze) },
      ]),
      formel(
        'anrechenbar = min(TA; 25 % der sonstigen) + [TA − 25 % der sonstigen] × 0,5',
        `${eur(bisGrenze)} + [${eur(ueber)}] × 0,5`,
        eur(technikAnrechenbar),
      ),
    );
  }

  const gesamt = runde2(sonstige + technikAnrechenbar);

  herleitung.push(
    tabelle(
      `Kostenermittlung nach DIN 276${k.dinFassung ? ` (${k.dinFassung})` : ''}`
      + `${k.grundlage ? ` — ${k.grundlage}` : ''}${k.datum ? ` vom ${k.datum}` : ''}`,
      ['Kostengruppe', 'Kosten', 'Ansatz', 'anrechenbar'],
      zeilen,
      null,
      anmerkungen,
    ),
    ...technikHerleitung,
  );

  if (technik.length) {
    herleitung.push(formel(
      'Sonstige anrechenbare Kosten + anrechenbare Kosten für Technische Anlagen = anrechenbare Kosten',
      `${eur(sonstige)} + ${eur(technikAnrechenbar)}`,
      eur(gesamt),
    ));
  }

  return { betrag: gesamt, sonstige, technik: technikAnrechenbar, herleitung };
}

// ————————————————————————————————————————————————————————————————
// 2 Grundhonorar: Honorartafel und Interpolation
// ————————————————————————————————————————————————————————————————

/**
 * Grundhonorar (100 % der Leistungsphasen) nach Honorartafel.
 *
 * Rechenweg wie in der Verordnung und wie in HOAI-Pro dargestellt:
 * zuerst wird der Honorarsatz auf die beiden benachbarten Tafelwerte angewendet,
 * danach zwischen ihnen linear interpoliert.
 *
 * @param {object} p
 * @param {string} p.leistungsbild  Schluessel aus LEISTUNGSBILDER
 * @param {number} p.kosten         anrechenbare Kosten in Euro
 * @param {number} p.zone           Honorarzone 1..5
 * @param {number} p.satzAnteil     0 = Mindest-/Basissatz … 1 = Hoechstsatz
 * @param {number} p.fassung        2013 oder 2021 (nur fuer die Benennung)
 */
const HEKTAR = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });

/**
 * Wie die Bezugsgroesse der Tafel heisst und wie sie geschrieben wird.
 *
 * Die Honorartafeln der Flaechenplanung (§§ 20, 21, 28 bis 32) sind nach Hektar
 * gestaffelt, nicht nach Euro. Stuende in ihrer Herleitung "anrechenbare Kosten
 * 5,00 €", waere das nicht nur ein Schoenheitsfehler: Die Herleitung ist das,
 * was auf der Rechnung erscheint und was der Auftraggeber pruefen soll.
 */
function bezug(tafel) {
  return tafel.bezugsart === 'flaeche_hektar'
    ? {
      name: 'Fläche des Plangebiets',
      kurz: 'Fläche (F)',
      trifft: 'die Fläche trifft einen Tafelwert',
      zeigen: (x) => `${HEKTAR.format(x)} ha`,
    }
    : {
      name: 'anrechenbare Kosten',
      kurz: 'anrechenbare Kosten (AG)',
      trifft: 'anrechenbare Kosten treffen einen Tafelwert',
      zeigen: (x) => eur(x),
    };
}

export function grundhonorar({ leistungsbild, kosten, zone, satzAnteil, fassung = 2021 }) {
  const lb = LEISTUNGSBILDER[leistungsbild];
  if (!lb) throw new Error(`Unbekanntes Leistungsbild: ${leistungsbild}`);
  const tafel = TAFELN[lb.tafel];
  if (!tafel) throw new Error(`Keine Honorartafel für ${leistungsbild}`);
  if (!Number.isFinite(kosten) || kosten <= 0) throw new Error('Anrechenbare Kosten fehlen');
  if (!Number.isInteger(zone) || zone < 1 || zone > tafel.zonen) {
    throw new Error(`Honorarzone ${zone} gibt es in ${tafel.paragraf} nicht (1 bis ${tafel.zonen})`);
  }
  if (!Number.isFinite(satzAnteil) || satzAnteil < 0 || satzAnteil > 1) {
    throw new Error('Honorarsatz muss zwischen 0 (Mindestsatz) und 1 (Höchstsatz) liegen');
  }

  const zeilen = tafel.zeilen;
  const kleinste = zeilen[0].bezug;
  const groesste = zeilen[zeilen.length - 1].bezug;

  // Ausserhalb der Tafel wird nicht extrapoliert. Die Verordnung gibt fuer diesen
  // Bereich keine Werte vor; das Honorar ist dort frei zu vereinbaren. Ein Programm,
  // das trotzdem eine Zahl liefert, taeuscht eine Grundlage vor, die es nicht gibt.
  if (kosten < kleinste || kosten > groesste) {
    const b = bezug(tafel);
    const e = new Error(
      `${b.name[0].toUpperCase()}${b.name.slice(1)} ${b.zeigen(kosten)} liegen außerhalb der `
      + `Honorartafel ${tafel.paragraf} (${b.zeigen(kleinste)} bis ${b.zeigen(groesste)}). `
      + 'In diesem Bereich ist das Honorar frei zu vereinbaren — als Pauschal- oder '
      + 'Zeithonorar erfassen.',
    );
    e.code = 'AUSSERHALB_TAFEL';
    e.grenzen = { von: kleinste, bis: groesste };
    throw e;
  }

  const satzName = satzBezeichnung(fassung, satzAnteil);
  const zoneRoem = ZONE_ROEMISCH[zone];
  const bezugsgroesse = bezug(tafel);
  const herleitung = [];

  // Stuetzstellen suchen
  const treffer = zeilen.find((z) => Math.abs(z.bezug - kosten) < 0.005);
  if (treffer) {
    const [min, max] = treffer.zonen[zone - 1];
    const betrag = runde2(min + (max - min) * satzAnteil);
    herleitung.push(
      werte(`Honorartafel ${tafel.paragraf} — ${bezugsgroesse.trifft}`, [
        { bez: bezugsgroesse.name, wert: bezugsgroesse.zeigen(kosten) },
        { bez: `Honorarzone (HZ)`, wert: zoneRoem },
        { bez: `Honorarsatz (HS)`, wert: `${satzName} (${prozent(satzAnteil)})` },
        { bez: 'unterer Tafelwert', wert: eur(min) },
        { bez: 'oberer Tafelwert', wert: eur(max) },
      ]),
      formel('GH = Hmin + (Hmax − Hmin) × HS',
        `${eur(min)} + (${eur(max)} − ${eur(min)}) × ${prozent(satzAnteil)}`, eur(betrag)),
    );
    return { betrag, herleitung, tafel: tafel.paragraf };
  }

  const unten = [...zeilen].reverse().find((z) => z.bezug < kosten);
  const oben = zeilen.find((z) => z.bezug > kosten);
  const [huwMin, huwMax] = unten.zonen[zone - 1];
  const [howMin, howMax] = oben.zonen[zone - 1];

  const huw = runde2(huwMin + (huwMax - huwMin) * satzAnteil);
  const how = runde2(howMin + (howMax - howMin) * satzAnteil);
  const anteil = (kosten - unten.bezug) / (oben.bezug - unten.bezug);
  const betrag = runde2(huw + (how - huw) * anteil);

  herleitung.push(
    werte(`Interpolation gemäß Honorartafel ${tafel.paragraf}`, [
      { bez: bezugsgroesse.kurz, wert: bezugsgroesse.zeigen(kosten) },
      { bez: 'Honorarzone (HZ)', wert: zoneRoem },
      { bez: 'Honorarsatz (HS)', wert: `${satzName} (${prozent(satzAnteil)})` },
      { bez: 'unterer Wert lt. Honorartafel (UW)', wert: bezugsgroesse.zeigen(unten.bezug) },
      { bez: 'Honorar für unteren Wert, unterer Satz (HUWmin)', wert: eur(huwMin) },
      { bez: 'Honorar für unteren Wert, oberer Satz (HUWmax)', wert: eur(huwMax) },
      { bez: 'oberer Wert lt. Honorartafel (OW)', wert: bezugsgroesse.zeigen(oben.bezug) },
      { bez: 'Honorar für oberen Wert, unterer Satz (HOWmin)', wert: eur(howMin) },
      { bez: 'Honorar für oberen Wert, oberer Satz (HOWmax)', wert: eur(howMax) },
    ]),
    formel('HUW = HUWmin + (HUWmax − HUWmin) × HS',
      `${eur(huwMin)} + (${eur(huwMax)} − ${eur(huwMin)}) × ${prozent(satzAnteil)}`, eur(huw)),
    formel('HOW = HOWmin + (HOWmax − HOWmin) × HS',
      `${eur(howMin)} + (${eur(howMax)} − ${eur(howMin)}) × ${prozent(satzAnteil)}`, eur(how)),
    formel(`GH = HUW + (HOW − HUW) × [(${bezugsgroesse.kurz.match(/\(([^)]+)\)/)?.[1] || 'AG'} − UW) : (OW − UW)]`,
      `${eur(huw)} + (${eur(how)} − ${eur(huw)}) × [(${bezugsgroesse.zeigen(kosten)} − `
      + `${bezugsgroesse.zeigen(unten.bezug)}) : (${bezugsgroesse.zeigen(oben.bezug)} − `
      + `${bezugsgroesse.zeigen(unten.bezug)})]`, eur(betrag)),
  );

  return { betrag, herleitung, tafel: tafel.paragraf };
}

// ————————————————————————————————————————————————————————————————
// 3 Leistungsphasen
// ————————————————————————————————————————————————————————————————

/**
 * Bezugsgroesse der Flaechenplanung: die Flaeche des Plangebiets in Hektar.
 *
 * Baut dieselbe Form wie anrechenbareKosten(), damit der weitere Rechenweg
 * nicht unterscheiden muss — nur die Herleitung sieht anders aus, weil es
 * nichts nach DIN 276 zu gliedern gibt.
 */
function flaecheAlsBezug(v) {
  const ha = v.flaecheHektar;
  if (!Number.isFinite(ha) || ha <= 0) {
    throw new Error(
      'Für dieses Leistungsbild ist die Fläche des Plangebiets in Hektar anzugeben '
      + '(§ 6 Abs. 1 Nr. 1 HOAI), nicht die anrechenbaren Kosten.',
    );
  }
  return {
    betrag: ha,
    herleitung: [werte('Bemessungsgrundlage — Fläche des Plangebiets', [
      { bez: 'Fläche', wert: `${HEKTAR.format(ha)} ha` },
      ...(v.flaecheBemerkung ? [{ bez: 'Anmerkung', wert: v.flaecheBemerkung }] : []),
    ])],
  };
}

/**
 * Grundhonorar bei Anlagen verschiedener Honorarzonen — § 56 Abs. 4 HOAI.
 *
 * Die Vorschrift ist umstaendlich formuliert und meint etwas Einfaches: Jede
 * Zone bekommt das Honorar, das sich ergaebe, wenn die GESAMTEN anrechenbaren
 * Kosten dieser Zone zugeordnet waeren — davon aber nur den Anteil, den ihre
 * Anlagen an den Gesamtkosten haben.
 *
 * Der Grund fuer diesen Umweg ist die Degression der Honorartafel: Wuerde man
 * je Zone nur mit ihren eigenen Kosten rechnen, fiele jede Teilsumme in einen
 * niedrigeren Tafelbereich mit hoeherem Prozentsatz — und das Gesamthonorar
 * laege ueber dem, was dieselbe Anlage aus einer Hand kostet. Die Verordnung
 * verhindert genau das.
 *
 * @param {object} p
 * @param {string} p.leistungsbild
 * @param {Array}  p.gruppen  [{zone, kosten, bezeichnung?}]
 * @param {number} p.satzAnteil
 * @param {number} p.fassung
 */
export function honorarNachAnlagengruppen({ leistungsbild, gruppen, satzAnteil, fassung = 2021 }) {
  if (!gruppen?.length) throw new Error('Keine Anlagengruppen angegeben.');
  const gesamt = runde2(gruppen.reduce((s, g) => s + (g.kosten || 0), 0));
  if (gesamt <= 0) throw new Error('Die anrechenbaren Kosten der Anlagengruppen sind null.');

  const zeilen = [];
  let summe = 0;
  for (const g of gruppen) {
    if (!(g.kosten > 0)) continue;
    const anteil = g.kosten / gesamt;
    // Honorar, als gehoerte die GESAMTE Summe in diese Zone
    const voll = grundhonorar({
      leistungsbild, kosten: gesamt, zone: g.zone, satzAnteil, fassung,
    });
    const betrag = runde2(voll.betrag * anteil);
    summe = runde2(summe + betrag);
    zeilen.push({
      ...g, anteil, honorarVoll: voll.betrag, betrag,
    });
  }

  return {
    betrag: summe,
    gesamtkosten: gesamt,
    zeilen,
    herleitung: [tabelle(
      'Anlagen verschiedener Honorarzonen — § 56 Abs. 4 HOAI',
      ['Anlagengruppe', 'Zone', 'anrechenbare Kosten', 'Anteil', 'Honorar bei voller Summe', 'Einzelhonorar'],
      zeilen.map((z) => [
        z.bezeichnung || '', ZONE_ROEMISCH[z.zone], eur(z.kosten),
        prozent(z.anteil), eur(z.honorarVoll), eur(z.betrag),
      ]),
      ['Summe', '', eur(gesamt), '100 %', '', eur(summe)],
      ['Je Zone wird das Honorar für die gesamten anrechenbaren Kosten ermittelt und '
        + 'nach dem Kostenanteil dieser Zone gewichtet. Ohne diesen Umweg fiele jede '
        + 'Teilsumme in einen niedrigeren Tafelbereich und das Honorar läge zu hoch.'],
    )],
  };
}

/**
 * Verteilt das Grundhonorar auf die Leistungsphasen.
 *
 * Je Phase koennen zwei Groessen abweichen:
 *   vereinbart — wie viel der Phase beauftragt ist (Teilbeauftragung in Prozentpunkten)
 *   erbracht   — wie viel davon zum Stichtag geleistet ist (Grundlage der Abschlagsrechnung)
 *
 * Gerundet wird je Phase auf Cent und erst danach summiert; genau so rechnet HOAI-Pro,
 * und nur so stimmt die Summe mit den ausgewiesenen Einzelbetraegen ueberein.
 *
 * @param {object} p
 * @param {string} p.leistungsbild
 * @param {number} p.grundhonorar100  Grundhonorar fuer 100 %
 * @param {Array}  p.phasen  [{nr, vereinbart?, erbracht?}] — vereinbart als Anteil
 *                           (0.0175 = 1,75 %); fehlt er, gilt die volle Bewertung
 *                           der Verordnung. erbracht als Anteil des Vereinbarten
 *                           (1 = vollstaendig), Vorgabe 1.
 * @param {number} p.fassung
 * @param {object} [p.phasenzuschlaege]  {8: 0.5} erhoeht die Bewertung der
 *                           Leistungsphase 8 um 50 Prozent ihrer Bewertung
 *                           (§ 12 Abs. 2). Erhoeht wird die BEWERTUNG, nicht der
 *                           vereinbarte Anteil — nur so bleibt eine
 *                           Teilbeauftragung dieser Phase richtig gerechnet.
 * @param {object} [p.phasenaufschlaege] {2: 0.02} schlaegt zwei Prozentpunkte
 *                           auf die Bewertung der Phase 2 auf (§ 9). Anders als
 *                           der Zuschlag ist das ein absoluter Wert: Es geht um
 *                           den Prozentsatz einer ANDEREN Phase, nicht um einen
 *                           Anteil der eigenen.
 */
export function leistungsphasen({
  leistungsbild, grundhonorar100, phasen, fassung = 2021,
  phasenzuschlaege = {}, phasenaufschlaege = {},
}) {
  const lb = LEISTUNGSBILDER[leistungsbild];
  if (!lb) throw new Error(`Unbekanntes Leistungsbild: ${leistungsbild}`);

  const zeilen = [];
  let summeVereinbartAnteil = 0, summeVereinbart = 0;
  let summeErbrachtAnteil = 0, summeErbracht = 0;

  for (const nr of Object.keys(lb.phasen).map(Number).sort((a, b) => a - b)) {
    const grundbewertung = lb.phasen[nr];
    const zuschlag = phasenzuschlaege[nr] || 0;
    const aufschlag = phasenaufschlaege[nr] || 0;
    // Auf vier Nachkommastellen: Die Bewertungen der HOAI sind ganze Prozent,
    // ein Zuschlag von 50 Prozent darauf ergibt halbe. Weiter zu runden hiesse
    // Cent zu verlieren, weniger zu runden schleppt Gleitkommareste mit.
    const voll = Math.round((grundbewertung * (1 + zuschlag) + aufschlag) * 10000) / 10000;
    const eingabe = (phasen || []).find((p) => p.nr === nr);
    const vereinbart = eingabe ? (eingabe.vereinbart ?? voll) : 0;
    const erbrachtAnteil = eingabe ? (eingabe.erbracht ?? 1) : 0;

    if (vereinbart < 0) throw new Error(`Leistungsphase ${nr}: negativer Anteil`);
    if (vereinbart > voll + 1e-9 && !eingabe?.abweichungBegruendet) {
      throw new Error(
        `Leistungsphase ${nr}: ${prozent(vereinbart)} vereinbart, die Verordnung bewertet sie mit `
        + `${prozent(voll)}. Höhere Bewertung nur mit ausdrücklicher Begründung `
        + `(abweichungBegruendet setzen, z. B. bei ${lb.leistungsbildParagraf} vorgesehenen Varianten).`,
      );
    }
    if (erbrachtAnteil < 0 || erbrachtAnteil > 1 + 1e-9) {
      throw new Error(`Leistungsphase ${nr}: erbracht muss zwischen 0 und 100 % liegen`);
    }

    const betragVereinbart = runde2(grundhonorar100 * vereinbart);
    const betragErbracht = runde2(betragVereinbart * erbrachtAnteil);

    summeVereinbartAnteil += vereinbart;
    summeVereinbart = runde2(summeVereinbart + betragVereinbart);
    summeErbrachtAnteil += vereinbart * erbrachtAnteil;
    summeErbracht = runde2(summeErbracht + betragErbracht);

    zeilen.push({
      nr,
      bezeichnung: lb.namen[nr],
      bewertung: voll,
      grundbewertung,
      zuschlag,
      aufschlag,
      vereinbart,
      betragVereinbart,
      erbrachtAnteil,
      betragErbracht,
    });
  }

  const herleitung = [tabelle(
    `Leistungen ${lb.bezeichnung} (HOAI ${fassung})`,
    ['', 'Leistungsphase', 'Bewertung', 'vereinbart', 'vereinbart €', 'erbracht', 'erbracht €'],
    zeilen.map((z) => [
      String(z.nr), z.bezeichnung, prozent(z.bewertung),
      prozent(z.vereinbart, 2), eur(z.betragVereinbart),
      prozent(z.erbrachtAnteil), eur(z.betragErbracht),
    ]),
    ['', 'Summe', '', prozent(summeVereinbartAnteil, 2), eur(summeVereinbart),
      prozent(summeErbrachtAnteil / (summeVereinbartAnteil || 1)), eur(summeErbracht)],
  )];

  return {
    zeilen,
    vereinbartAnteil: runde(summeVereinbartAnteil, 6),
    vereinbart: summeVereinbart,
    erbrachtAnteil: runde(summeErbrachtAnteil, 6),
    erbracht: summeErbracht,
    herleitung,
  };
}

// ————————————————————————————————————————————————————————————————
// 4 Gesamtes Honorar einer Leistung
// ————————————————————————————————————————————————————————————————

/**
 * Rechnet eine vollstaendige Honorarermittlung durch: anrechenbare Kosten,
 * Grundhonorar, Leistungsphasen, Zuschlaege, weitere Positionen, Nebenkosten.
 *
 * @param {object} v Vertragsstand
 * @param {number} v.fassung 2013 | 2021
 * @param {string} v.leistungsbild
 * @param {object} v.kostenermittlung  siehe anrechenbareKosten()
 * @param {number} v.honorarzone
 * @param {number} v.honorarsatz  Anteil 0..1
 * @param {Array}  v.phasen
 * @param {Array}  [v.zuschlaege]  [{bezeichnung, prozent, fundstelle?}] auf die erbrachten Grundleistungen
 * @param {Array}  [v.weiterePositionen] [{art:'zeithonorar'|'pauschal'|'besondere', bezeichnung, betrag?, stunden?, satz?}]
 * @param {object} [v.nebenkosten] {art:'pauschal', prozent} | {art:'einzeln', posten:[{bezeichnung, betrag}]}
 * @param {string} [v.bezeichnung] Freitext zur Leistung, erscheint im Rechnungskopf
 */
export function honorarermittlung(v) {
  const lb = LEISTUNGSBILDER[v.leistungsbild];
  if (!lb) throw new Error(`Unbekanntes Leistungsbild: ${v.leistungsbild}`);
  if (v.fassung !== 2013 && v.fassung !== 2021) {
    throw new Error(`HOAI-Fassung ${v.fassung} wird nicht unterstützt (2013 oder 2021)`);
  }

  const herleitung = [];

  // § 6 Abs. 1: Die Bemessungsgrundlage haengt am Leistungsbild. Objekt- und
  // Fachplanung rechnen nach anrechenbaren Kosten, die Flaechenplanung nach der
  // Flaeche des Plangebiets in Hektar. Beides landet in derselben Tafelabfrage —
  // die Tafel weiss selbst, worauf sich ihre Stuetzstellen beziehen.
  const nachFlaeche = lb.bezugsart === 'flaeche_hektar';
  const ak = nachFlaeche
    ? flaecheAlsBezug(v)
    : anrechenbareKosten(v.kostenermittlung);

  // § 56 Abs. 4: Anlagen einer Gruppe in verschiedenen Honorarzonen. Dann tritt
  // die Summe der Einzelhonorare an die Stelle des einen Grundhonorars.
  const nachGruppen = v.anlagengruppen?.length
    ? honorarNachAnlagengruppen({
      leistungsbild: v.leistungsbild,
      gruppen: v.anlagengruppen,
      satzAnteil: v.honorarsatz,
      fassung: v.fassung,
    })
    : null;

  if (nachGruppen && v.leistungsbild !== 'technische_ausruestung') {
    throw new Error(
      '§ 56 Abs. 4 gilt für die Technische Ausrüstung. Für andere Leistungsbilder ist '
      + 'das Honorar je Objekt getrennt zu berechnen (§ 11 Abs. 1).',
    );
  }

  const gh = nachGruppen || grundhonorar({
    leistungsbild: v.leistungsbild,
    kosten: ak.betrag,
    zone: v.honorarzone,
    satzAnteil: v.honorarsatz,
    fassung: v.fassung,
  });
  // § 12 Abs. 2: Bei Instandsetzungen und Instandhaltungen kann in Textform
  // vereinbart werden, dass der Prozentsatz fuer die Objektueberwachung oder
  // Bauoberleitung um bis zu 50 Prozent der Bewertung dieser Phase erhoeht
  // wird. Das ist Leistungsphase 8 — in allen Leistungsbildern heisst sie so.
  const phasenzuschlaege = {};
  const ouZuschlag = v.objektueberwachungZuschlag || 0;
  if (ouZuschlag) {
    if (!IST_INSTANDSETZUNG(v.massnahme)) {
      throw new Error(
        'Die Erhöhung der Objektüberwachung nach § 12 Abs. 2 setzt eine Instandsetzung '
        + 'oder Instandhaltung voraus. Die Maßnahme ist als '
        + `"${MASSNAHME_TEXT[v.massnahme] || v.massnahme || 'nicht angegeben'}" erfasst.`,
      );
    }
    if (ouZuschlag > OBJEKTUEBERWACHUNG_ZUSCHLAG_MAX + 1e-9) {
      throw new Error(
        `Erhöhung der Objektüberwachung ${prozent(ouZuschlag)} überschreitet die Grenze von `
        + `${prozent(OBJEKTUEBERWACHUNG_ZUSCHLAG_MAX)} (§ 12 Abs. 2 HOAI).`,
      );
    }
    if (!lb.phasen[8]) {
      throw new Error(`${lb.bezeichnung} kennt keine Leistungsphase 8 — § 12 Abs. 2 greift nicht.`);
    }
    phasenzuschlaege[8] = ouZuschlag;
  }

  // § 9: Einzelbeauftragung von Vorplanung, Entwurfsplanung oder
  // Objektueberwachung. Die betroffene Phase darf um die Prozentsaetze der
  // vorgelagerten Phasen angehoben werden — sie sind zu leisten, auch wenn sie
  // nicht gesondert beauftragt sind.
  const phasenaufschlaege = {};
  if (v.einzelleistung) {
    const a = einzelleistungAnhebung(v.einzelleistung);
    if (!a) throw new Error(`Unbekannte Einzelleistung: ${v.einzelleistung}`);
    if (v.einzelleistung === 'objektueberwachung'
        && !OBJEKTUEBERWACHUNG_EINZELN_MOEGLICH.includes(v.leistungsbild)) {
      throw new Error(
        '§ 9 Abs. 3 gilt nur für Gebäude, Innenräume und die Technische Ausrüstung — '
        + `nicht für ${lb.bezeichnung}.`,
      );
    }
    // Nur anheben, wenn die zusaetzlichen Phasen NICHT ohnehin beauftragt sind.
    // Sonst zaehlte man sie doppelt.
    const beauftragt = new Set((v.phasen || []).map((p) => p.nr));
    const anrechenbar = a.zusatz.filter((nr) => !beauftragt.has(nr));
    const summe = anrechenbar.reduce((s, nr) => s + (lb.phasen[nr] || 0), 0);
    if (summe > 0) {
      phasenaufschlaege[a.phase] = Math.round(summe * 10000) / 10000;
    }
    if (a.zusatz.length !== anrechenbar.length) {
      herleitung.push(hinweis(
        `§ 9: ${a.zusatz.filter((nr) => beauftragt.has(nr)).map((nr) => `LPh ${nr}`).join(' und ')} `
        + 'ist bereits gesondert beauftragt und wird nicht zusätzlich angerechnet.',
      ));
    }
  }

  const lph = leistungsphasen({
    leistungsbild: v.leistungsbild,
    grundhonorar100: gh.betrag,
    phasen: v.phasen,
    fassung: v.fassung,
    phasenzuschlaege,
    phasenaufschlaege,
  });

  // Reihenfolge der Herleitung folgt dem Rechenweg: erst die anrechenbaren Kosten,
  // dann die Honorarzone, dann die Interpolation, zuletzt die Leistungsphasen.
  // (HOAI-Pro stellt die Interpolation voran — dort steht die Zahl, die erst
  // darunter hergeleitet wird. Fuer den Pruefer ist die Reihenfolge hier besser.)
  herleitung.push(...ak.herleitung);
  if (v.honorarzoneBegruendung) {
    herleitung.push(werte('Honorarzonenermittlung nach Objektliste', [
      { bez: v.honorarzoneBegruendung, wert: `Honorarzone ${ZONE_ROEMISCH[v.honorarzone]}` },
    ]));
  }
  herleitung.push(...gh.herleitung);
  if (v.einzelleistung && Object.keys(phasenaufschlaege).length) {
    const a = einzelleistungAnhebung(v.einzelleistung);
    const zusatz = a.zusatz.filter((nr) => !(v.phasen || []).some((p) => p.nr === nr));
    herleitung.push(werte(
      EINZELLEISTUNG_TEXT[v.einzelleistung],
      [
        { bez: `Bewertung ${lb.namen[a.phase]} nach der Verordnung`, wert: prozent(lb.phasen[a.phase]) },
        ...zusatz.map((nr) => ({
          bez: `+ Prozentsatz ${lb.namen[nr]}`,
          wert: prozent(lb.phasen[nr]),
        })),
        {
          bez: 'Bewertung danach (Höchstwert nach § 9)',
          wert: prozent(Math.round((lb.phasen[a.phase] + phasenaufschlaege[a.phase]) * 10000) / 10000),
        },
      ],
    ));
  }
  if (ouZuschlag) {
    herleitung.push(werte(
      `Erhöhung der ${lb.namen[8]} nach § 12 Abs. 2 HOAI`,
      [
        { bez: 'Art der Maßnahme', wert: MASSNAHME_TEXT[v.massnahme] },
        { bez: 'Bewertung nach der Verordnung', wert: prozent(lb.phasen[8]) },
        { bez: 'vereinbarte Erhöhung', wert: prozent(ouZuschlag) },
        { bez: 'Bewertung danach', wert: prozent(Math.round(lb.phasen[8] * (1 + ouZuschlag) * 10000) / 10000) },
      ],
    ));
  }
  herleitung.push(...lph.herleitung);

  // ── Mehrere gleiche Objekte (§ 11 Abs. 3) ─────────────
  // Gerechnet wird das erste Objekt voll, jede Wiederholung mit geminderten
  // Prozentsaetzen der Leistungsphasen 1 bis 6. Das Ergebnis ist das Honorar
  // fuer ALLE Objekte zusammen — deshalb tritt es an die Stelle des
  // Einzelhonorars und nicht daneben.
  const wiederholungen = Math.max(0, Math.round(v.wiederholungen || 0));
  let grundleistungen = lph.erbracht;
  let objektzeilen = null;

  if (wiederholungen > 0) {
    const jeObjekt = (minderung) => {
      let summe = 0;
      for (const z of lph.zeilen) {
        const anteil = GEMINDERTE_PHASEN.includes(z.nr)
          ? z.vereinbart * z.erbrachtAnteil * (1 - minderung)
          : z.vereinbart * z.erbrachtAnteil;
        summe = runde2(summe + runde2(gh.betrag * anteil));
      }
      return summe;
    };

    objektzeilen = [{ nr: 1, bezeichnung: 'Erstes Objekt', minderung: 0, betrag: jeObjekt(0) }];
    let gesamt = objektzeilen[0].betrag;
    for (let k = 1; k <= wiederholungen; k++) {
      const minderung = wiederholungsminderung(k);
      const betrag = jeObjekt(minderung);
      objektzeilen.push({
        nr: k + 1,
        bezeichnung: `${k}. Wiederholung`,
        minderung,
        betrag,
      });
      gesamt = runde2(gesamt + betrag);
    }
    grundleistungen = gesamt;

    herleitung.push(tabelle(
      `Mehrere gleiche Objekte — § 11 Abs. 3 HOAI (${wiederholungen + 1} Objekte)`,
      ['Objekt', 'Minderung LPh 1–6', 'Honorar'],
      objektzeilen.map((o) => [
        o.bezeichnung,
        o.minderung ? prozent(o.minderung) : '—',
        eur(o.betrag),
      ]),
      [`Summe ${wiederholungen + 1} Objekte`, '', eur(grundleistungen)],
      ['Gemindert werden nur die Leistungsphasen 1 bis 6. Die Phasen 7 bis 9 '
        + 'fallen bei jedem Objekt erneut vollständig an.'],
    ));
  }

  // Zuschlaege auf die erbrachten Grundleistungen
  const zuschlaege = [];
  let summeZuschlaege = 0;
  for (const z of v.zuschlaege || []) {
    if (!Number.isFinite(z.prozent)) throw new Error(`Zuschlag "${z.bezeichnung}" ohne Prozentsatz`);
    if (lb.umbauzuschlagBis && z.prozent > lb.umbauzuschlagBis + 1e-9 && z.art === 'umbau') {
      throw new Error(
        `Umbauzuschlag ${prozent(z.prozent)} überschreitet den Rahmen von `
        + `${prozent(lb.umbauzuschlagBis)} (${lb.umbauzuschlagFundstelle} HOAI).`,
      );
    }
    const betrag = runde2(grundleistungen * z.prozent);
    summeZuschlaege = runde2(summeZuschlaege + betrag);
    zuschlaege.push({ ...z, betrag });
  }

  // ── Wiederholte Grundleistungen (§ 10 Abs. 2) ─────────
  // "Einigen sich Auftraggeber und Auftragnehmer ueber die Wiederholung von
  // Grundleistungen, ohne dass sich dadurch die anrechenbaren Kosten … aendern,
  // ist das Honorar fuer diese Grundleistungen entsprechend ihrem Anteil an der
  // jeweiligen Leistungsphase in Textform zu vereinbaren."
  //
  // Der praktische Fall: Der Bauherr will die Entwurfsplanung noch einmal
  // anders. Die anrechenbaren Kosten bleiben gleich, also traegt die
  // Honorartafel nichts bei — verguetet wird der Anteil der wiederholten
  // Grundleistungen an ihrer Phase. Ohne diese Vorschrift arbeitete man umsonst.
  const wiederholungen10 = [];
  let summeWiederholung = 0;
  for (const w of v.wiederholteGrundleistungen || []) {
    const bewertung = lb.phasen[w.phase];
    if (bewertung === undefined) {
      throw new Error(`Wiederholte Grundleistung: ${lb.bezeichnung} hat keine Leistungsphase ${w.phase}.`);
    }
    if (!Number.isFinite(w.anteil) || w.anteil <= 0 || w.anteil > 1 + 1e-9) {
      throw new Error(
        `Wiederholte Grundleistung in LPh ${w.phase}: Der Anteil muss zwischen 0 und 100 % `
        + 'der Leistungsphase liegen (§ 10 Abs. 2).',
      );
    }
    const betrag = runde2(gh.betrag * bewertung * w.anteil);
    summeWiederholung = runde2(summeWiederholung + betrag);
    wiederholungen10.push({ ...w, bewertung, betrag });
  }
  if (wiederholungen10.length) {
    herleitung.push(tabelle(
      'Wiederholung von Grundleistungen — § 10 Abs. 2 HOAI',
      ['Leistungsphase', 'Wiederholte Leistung', 'Anteil an der Phase', 'Betrag'],
      wiederholungen10.map((w) => [
        `LPh ${w.phase} ${lb.namen[w.phase] || ''}`,
        w.bezeichnung || '',
        prozent(w.anteil),
        eur(w.betrag),
      ]),
      ['', '', 'Summe', eur(summeWiederholung)],
      ['Die anrechenbaren Kosten ändern sich dadurch nicht — vergütet wird der '
        + 'Anteil der wiederholten Grundleistungen an ihrer Leistungsphase.'],
    ));
  }

  // Weitere Positionen: Zeithonorar, Pauschalen, Besondere Leistungen
  const weitere = [];
  let summeWeitere = 0;
  for (const p of v.weiterePositionen || []) {
    let betrag;
    if (p.art === 'zeithonorar') {
      if (!Number.isFinite(p.stunden) || !Number.isFinite(p.satz)) {
        throw new Error(`Zeithonorar "${p.bezeichnung}": Stunden und Stundensatz erforderlich`);
      }
      betrag = runde2(p.stunden * p.satz);
    } else {
      if (!Number.isFinite(p.betrag)) throw new Error(`Position "${p.bezeichnung}": Betrag erforderlich`);
      betrag = runde2(p.betrag);
    }
    summeWeitere = runde2(summeWeitere + betrag);
    weitere.push({ ...p, betrag });
  }

  // Nebenkosten
  const basisNebenkosten = runde2(grundleistungen + summeZuschlaege + summeWiederholung + summeWeitere);
  let nebenkosten = 0;
  const nk = v.nebenkosten;
  if (nk && nk.art === 'pauschal') {
    if (!Number.isFinite(nk.prozent)) throw new Error('Pauschale Nebenkosten ohne Prozentsatz');
    nebenkosten = runde2(basisNebenkosten * nk.prozent);
    herleitung.push(formel(
      `Nebenkosten pauschal ${prozent(nk.prozent)} (§ 14 HOAI)`,
      `${prozent(nk.prozent)} von ${eur(basisNebenkosten)}`, eur(nebenkosten),
    ));
  } else if (nk && nk.art === 'einzeln') {
    nebenkosten = runde2((nk.posten || []).reduce((s, p) => s + p.betrag, 0));
    herleitung.push(tabelle('Nebenkosten auf Einzelnachweis (§ 14 HOAI)',
      ['Posten', 'Betrag'],
      (nk.posten || []).map((p) => [p.bezeichnung, eur(p.betrag)]),
      ['Summe der Nebenkosten', eur(nebenkosten)]));
  }

  const netto = runde2(grundleistungen + summeZuschlaege + summeWiederholung + summeWeitere + nebenkosten);

  const zusammenstellung = [
    {
      bez: wiederholungen > 0
        ? `Grundleistungen (${wiederholungen + 1} Objekte, § 11 Abs. 3)`
        : 'Grundleistungen',
      betrag: grundleistungen,
    },
    ...zuschlaege.map((z) => ({ bez: `+ ${z.bezeichnung}`, betrag: z.betrag })),
    ...wiederholungen10.map((w) => ({
      bez: `+ Wiederholung LPh ${w.phase}${w.bezeichnung ? ` — ${w.bezeichnung}` : ''}`,
      betrag: w.betrag,
    })),
    ...weitere.map((p) => ({ bez: `+ ${p.bezeichnung}`, betrag: p.betrag })),
    { bez: '+ Nebenkosten', betrag: nebenkosten },
    { bez: '= Gesamt netto', betrag: netto, summe: true },
  ];

  return {
    bezeichnung: v.bezeichnung || `${lb.leistungsbildParagraf} HOAI: Leistungsbild ${lb.bezeichnung}`,
    anrechenbareKosten: ak.betrag,
    grundhonorar100: gh.betrag,
    grundleistungenVereinbart: lph.vereinbart,
    grundleistungen,
    // Honorar eines einzelnen Objekts — bleibt sichtbar, damit die Wirkung der
    // Minderung nachvollziehbar ist.
    grundleistungenJeObjekt: lph.erbracht,
    wiederholungen,
    objekte: objektzeilen,
    wiederholteGrundleistungen: wiederholungen10,
    zuschlaege,
    weiterePositionen: weitere,
    nebenkosten,
    netto,
    phasen: lph.zeilen,
    zusammenstellung,
    herleitung,
  };
}
