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
    const e = new Error(
      `Anrechenbare Kosten ${eur(kosten)} liegen außerhalb der Honorartafel ${tafel.paragraf} `
      + `(${eur(kleinste)} bis ${eur(groesste)}). In diesem Bereich ist das Honorar frei zu vereinbaren — `
      + `als Pauschal- oder Zeithonorar erfassen.`,
    );
    e.code = 'AUSSERHALB_TAFEL';
    e.grenzen = { von: kleinste, bis: groesste };
    throw e;
  }

  const satzName = satzBezeichnung(fassung, satzAnteil);
  const zoneRoem = ZONE_ROEMISCH[zone];
  const herleitung = [];

  // Stuetzstellen suchen
  const treffer = zeilen.find((z) => Math.abs(z.bezug - kosten) < 0.005);
  if (treffer) {
    const [min, max] = treffer.zonen[zone - 1];
    const betrag = runde2(min + (max - min) * satzAnteil);
    herleitung.push(
      werte(`Honorartafel ${tafel.paragraf} — anrechenbare Kosten treffen einen Tafelwert`, [
        { bez: 'anrechenbare Kosten', wert: eur(kosten) },
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
      { bez: 'anrechenbare Kosten (AG)', wert: eur(kosten) },
      { bez: 'Honorarzone (HZ)', wert: zoneRoem },
      { bez: 'Honorarsatz (HS)', wert: `${satzName} (${prozent(satzAnteil)})` },
      { bez: 'unterer Wert lt. Honorartafel (UW)', wert: eur(unten.bezug) },
      { bez: 'Honorar für unteren Wert, unterer Satz (HUWmin)', wert: eur(huwMin) },
      { bez: 'Honorar für unteren Wert, oberer Satz (HUWmax)', wert: eur(huwMax) },
      { bez: 'oberer Wert lt. Honorartafel (OW)', wert: eur(oben.bezug) },
      { bez: 'Honorar für oberen Wert, unterer Satz (HOWmin)', wert: eur(howMin) },
      { bez: 'Honorar für oberen Wert, oberer Satz (HOWmax)', wert: eur(howMax) },
    ]),
    formel('HUW = HUWmin + (HUWmax − HUWmin) × HS',
      `${eur(huwMin)} + (${eur(huwMax)} − ${eur(huwMin)}) × ${prozent(satzAnteil)}`, eur(huw)),
    formel('HOW = HOWmin + (HOWmax − HOWmin) × HS',
      `${eur(howMin)} + (${eur(howMax)} − ${eur(howMin)}) × ${prozent(satzAnteil)}`, eur(how)),
    formel('GH = HUW + (HOW − HUW) × [(AG − UW) : (OW − UW)]',
      `${eur(huw)} + (${eur(how)} − ${eur(huw)}) × [(${eur(kosten)} − ${eur(unten.bezug)}) : `
      + `(${eur(oben.bezug)} − ${eur(unten.bezug)})]`, eur(betrag)),
  );

  return { betrag, herleitung, tafel: tafel.paragraf };
}

// ————————————————————————————————————————————————————————————————
// 3 Leistungsphasen
// ————————————————————————————————————————————————————————————————

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
 */
export function leistungsphasen({ leistungsbild, grundhonorar100, phasen, fassung = 2021 }) {
  const lb = LEISTUNGSBILDER[leistungsbild];
  if (!lb) throw new Error(`Unbekanntes Leistungsbild: ${leistungsbild}`);

  const zeilen = [];
  let summeVereinbartAnteil = 0, summeVereinbart = 0;
  let summeErbrachtAnteil = 0, summeErbracht = 0;

  for (const nr of Object.keys(lb.phasen).map(Number).sort((a, b) => a - b)) {
    const voll = lb.phasen[nr];
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

  const ak = anrechenbareKosten(v.kostenermittlung);
  const gh = grundhonorar({
    leistungsbild: v.leistungsbild,
    kosten: ak.betrag,
    zone: v.honorarzone,
    satzAnteil: v.honorarsatz,
    fassung: v.fassung,
  });
  const lph = leistungsphasen({
    leistungsbild: v.leistungsbild,
    grundhonorar100: gh.betrag,
    phasen: v.phasen,
    fassung: v.fassung,
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
  herleitung.push(...gh.herleitung, ...lph.herleitung);

  // Zuschlaege auf die erbrachten Grundleistungen
  const zuschlaege = [];
  let summeZuschlaege = 0;
  for (const z of v.zuschlaege || []) {
    if (!Number.isFinite(z.prozent)) throw new Error(`Zuschlag "${z.bezeichnung}" ohne Prozentsatz`);
    if (lb.umbauzuschlagBis && z.prozent > lb.umbauzuschlagBis + 1e-9 && z.art === 'umbau') {
      throw new Error(
        `Umbauzuschlag ${prozent(z.prozent)} überschreitet den Rahmen von `
        + `${prozent(lb.umbauzuschlagBis)} (§ 36 Abs. 1 HOAI).`,
      );
    }
    const betrag = runde2(lph.erbracht * z.prozent);
    summeZuschlaege = runde2(summeZuschlaege + betrag);
    zuschlaege.push({ ...z, betrag });
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
  const basisNebenkosten = runde2(lph.erbracht + summeZuschlaege + summeWeitere);
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

  const netto = runde2(lph.erbracht + summeZuschlaege + summeWeitere + nebenkosten);

  const zusammenstellung = [
    { bez: 'Grundleistungen', betrag: lph.erbracht },
    ...zuschlaege.map((z) => ({ bez: `+ ${z.bezeichnung}`, betrag: z.betrag })),
    ...weitere.map((p) => ({ bez: `+ ${p.bezeichnung}`, betrag: p.betrag })),
    { bez: '+ Nebenkosten', betrag: nebenkosten },
    { bez: '= Gesamt netto', betrag: netto, summe: true },
  ];

  return {
    bezeichnung: v.bezeichnung || `${lb.leistungsbildParagraf} HOAI: Leistungsbild ${lb.bezeichnung}`,
    anrechenbareKosten: ak.betrag,
    grundhonorar100: gh.betrag,
    grundleistungenVereinbart: lph.vereinbart,
    grundleistungen: lph.erbracht,
    zuschlaege,
    weiterePositionen: weitere,
    nebenkosten,
    netto,
    phasen: lph.zeilen,
    zusammenstellung,
    herleitung,
  };
}
