// Leistungsbilder der HOAI: Bewertung der Leistungsphasen in Prozent des Honorars.
//
// Quelle: Wortlaut der Verordnung (gesetze-im-internet.de), jeweils Absatz mit der
// Aufzaehlung "... werden wie folgt in Prozentsaetzen der Honorare des § XX bewertet".
// Die Werte sind in HOAI 2013 und 2021 gleich — belegt fuer Gebaeude durch die nach
// HOAI 2013 gerechnete Referenzrechnung, die exakt 2/7/15/3/25/10/4/32/2
// ausweist. Deshalb traegt jedes Leistungsbild nur einen Satz Prozentwerte.
//
// Die Sonderregeln (abweichende Bewertungen einzelner Leistungsphasen) sind bewusst
// NICHT automatisiert. Sie haengen an Vereinbarungen und Objektarten, die nur der
// Planer kennt — die App bietet sie als benannte Varianten an, entscheiden muss der
// Mensch. Ein Programm, das hier selbsttaetig 30 statt 40 Prozent ansetzt, erzeugt
// eine falsche Rechnung, die niemand bemerkt.

import { TAFELN } from './tafeln.js';

/** Bezeichnungen der Leistungsphasen. Weicht je Leistungsbild ab (LPh 8!). */
const LPH_NAMEN_OBJEKT = {
  1: 'Grundlagenermittlung',
  2: 'Vorplanung',
  3: 'Entwurfsplanung',
  4: 'Genehmigungsplanung',
  5: 'Ausführungsplanung',
  6: 'Vorbereitung der Vergabe',
  7: 'Mitwirkung bei der Vergabe',
  8: 'Objektüberwachung – Bauüberwachung und Dokumentation',
  9: 'Objektbetreuung',
};

const LPH_NAMEN_BAUOBERLEITUNG = { ...LPH_NAMEN_OBJEKT, 8: 'Bauoberleitung' };

// Die Flaechenplanung hat eine ganz andere Gliederung: drei bzw. vier Phasen
// statt neun, und sie rechnet nach der Flaeche des Plangebiets in Hektar
// (§ 6 Abs. 1 Nr. 1) statt nach anrechenbaren Kosten.
const LPH_NAMEN_BAULEITPLANUNG = {
  1: 'Vorentwurf für die frühzeitigen Beteiligungen',
  2: 'Entwurf zur öffentlichen Auslegung',
  3: 'Plan zur Beschlussfassung',
};

const LPH_NAMEN_LANDSCHAFT = {
  1: 'Klären der Aufgabenstellung und Ermitteln des Leistungsumfangs',
  2: 'Ermitteln der Planungsgrundlagen',
  3: 'Vorläufige Fassung',
  4: 'Abgestimmte Fassung',
};
const LPH_NAMEN_TGA = { ...LPH_NAMEN_OBJEKT, 8: 'Objektüberwachung – Bauüberwachung' };

export const LEISTUNGSBILDER = {
  gebaeude: {
    bezeichnung: 'Gebäude',
    bezugsart: 'anrechenbare_kosten',
    leistungsbildParagraf: '§ 34',
    tafel: 'gebaeude',
    tafelParagraf: '§ 35',
    anrechenbareKosten: 'gebaeude',        // Regelwerk nach § 33
    namen: LPH_NAMEN_OBJEKT,
    phasen: { 1: 0.02, 2: 0.07, 3: 0.15, 4: 0.03, 5: 0.25, 6: 0.10, 7: 0.04, 8: 0.32, 9: 0.02 },
    umbauzuschlagBis: 0.33,
    umbauzuschlagFundstelle: '§ 36 Abs. 1',
  },

  innenraeume: {
    bezeichnung: 'Innenräume',
    bezugsart: 'anrechenbare_kosten',
    leistungsbildParagraf: '§ 34',
    tafel: 'gebaeude',
    tafelParagraf: '§ 35',
    anrechenbareKosten: 'gebaeude',
    namen: LPH_NAMEN_OBJEKT,
    phasen: { 1: 0.02, 2: 0.07, 3: 0.15, 4: 0.02, 5: 0.30, 6: 0.07, 7: 0.03, 8: 0.32, 9: 0.02 },
    // § 36 Abs. 2 — bei Innenräumen bis 50 %, nicht 33 % wie bei Gebäuden.
    // Stand hier bis 08.09.2026 falsch mit 0.33; aufgefallen erst beim Abgleich
    // mit dem Verordnungstext.
    umbauzuschlagBis: 0.50,
    umbauzuschlagFundstelle: '§ 36 Abs. 2',
  },

  freianlagen: {
    bezeichnung: 'Freianlagen',
    bezugsart: 'anrechenbare_kosten',
    leistungsbildParagraf: '§ 39',
    tafel: 'freianlagen',
    tafelParagraf: '§ 40',
    anrechenbareKosten: 'freianlagen',
    namen: LPH_NAMEN_OBJEKT,
    phasen: { 1: 0.03, 2: 0.10, 3: 0.16, 4: 0.04, 5: 0.25, 6: 0.07, 7: 0.03, 8: 0.30, 9: 0.02 },
  },

  ingenieurbauwerke: {
    bezeichnung: 'Ingenieurbauwerke',
    bezugsart: 'anrechenbare_kosten',
    leistungsbildParagraf: '§ 43',
    tafel: 'ingenieurbauwerke',
    tafelParagraf: '§ 44',
    anrechenbareKosten: 'ingenieurbauwerke',
    namen: LPH_NAMEN_BAUOBERLEITUNG,
    phasen: { 1: 0.02, 2: 0.20, 3: 0.25, 4: 0.05, 5: 0.15, 6: 0.13, 7: 0.04, 8: 0.15, 9: 0.01 },
    varianten: [
      { schluessel: 'lph2_tragwerk', bezeichnung: 'LPh 2 mit 10 % (Objekte nach § 41 Nr. 6 und 7 mit Tragwerksplanung)',
        fundstelle: '§ 43 Abs. 2', phase: 2, wert: 0.10 },
      { schluessel: 'lph4_planfeststellung', bezeichnung: 'LPh 4 mit 5–8 % (eigenständiges Planfeststellungsverfahren)',
        fundstelle: '§ 43 Abs. 3 Nr. 1', phase: 4, von: 0.05, bis: 0.08, textform: true },
      { schluessel: 'lph5_aufwand', bezeichnung: 'LPh 5 mit 15–35 % (überdurchschnittlicher Zeichnungsaufwand)',
        fundstelle: '§ 43 Abs. 3 Nr. 2', phase: 5, von: 0.15, bis: 0.35, textform: true },
    ],
    umbauzuschlagBis: 0.33,
    umbauzuschlagFundstelle: '§ 44 Abs. 6',
  },

  verkehrsanlagen: {
    bezeichnung: 'Verkehrsanlagen',
    bezugsart: 'anrechenbare_kosten',
    leistungsbildParagraf: '§ 47',
    tafel: 'verkehrsanlagen',
    tafelParagraf: '§ 48',
    anrechenbareKosten: 'verkehrsanlagen',
    namen: LPH_NAMEN_BAUOBERLEITUNG,
    phasen: { 1: 0.02, 2: 0.20, 3: 0.25, 4: 0.08, 5: 0.15, 6: 0.10, 7: 0.04, 8: 0.15, 9: 0.01 },
    umbauzuschlagBis: 0.33,
    umbauzuschlagFundstelle: '§ 48 Abs. 6',
  },

  tragwerksplanung: {
    bezeichnung: 'Tragwerksplanung',
    bezugsart: 'anrechenbare_kosten',
    leistungsbildParagraf: '§ 51',
    tafel: 'tragwerksplanung',
    tafelParagraf: '§ 52',
    anrechenbareKosten: 'tragwerksplanung',
    namen: LPH_NAMEN_OBJEKT,
    phasen: { 1: 0.03, 2: 0.10, 3: 0.15, 4: 0.30, 5: 0.40, 6: 0.02 },
    varianten: [
      { schluessel: 'lph5_ohne_schalplaene', bezeichnung: 'LPh 5 mit 30 % (Stahlbetonbau ohne Schalpläne / Holzbau unterdurchschnittlich)',
        fundstelle: '§ 51 Abs. 2', phase: 5, wert: 0.30 },
      { schluessel: 'lph5_nur_schalplaene', bezeichnung: 'LPh 5 mit 20 % (nur Schalpläne beauftragt)',
        fundstelle: '§ 51 Abs. 3', phase: 5, wert: 0.20 },
      { schluessel: 'lph5_enge_bewehrung', bezeichnung: 'LPh 5 um bis zu 4 % erhöht (sehr enge Bewehrung)',
        fundstelle: '§ 51 Abs. 4', phase: 5, zuschlagBis: 0.04 },
    ],
    umbauzuschlagBis: 0.50,
    umbauzuschlagFundstelle: '§ 52 Abs. 4',
  },

  technische_ausruestung: {
    bezeichnung: 'Technische Ausrüstung',
    bezugsart: 'anrechenbare_kosten',
    leistungsbildParagraf: '§ 55',
    tafel: 'technische_ausruestung',
    tafelParagraf: '§ 56',
    anrechenbareKosten: 'technische_ausruestung',
    namen: LPH_NAMEN_TGA,
    phasen: { 1: 0.02, 2: 0.09, 3: 0.17, 4: 0.02, 5: 0.22, 6: 0.07, 7: 0.05, 8: 0.35, 9: 0.01 },
    varianten: [
      { schluessel: 'lph5_abschlag_schlitzplaene', bezeichnung: 'LPh 5 abzüglich 4 % (Schlitz- und Durchbruchspläne nicht beauftragt)',
        fundstelle: '§ 55 Abs. 2', phase: 5, abschlag: 0.04 },
      { schluessel: 'lph5_abschlag_montageplaene', bezeichnung: 'LPh 5 abzüglich 4 % (Prüfen der Montage-/Werkstattpläne nicht beauftragt)',
        fundstelle: '§ 55 Abs. 2', phase: 5, abschlag: 0.04 },
    ],
    umbauzuschlagBis: 0.50,
    umbauzuschlagFundstelle: '§ 56 Abs. 5',
  },

  // ── Flächenplanung ────────────────────────────────────
  // Bemessungsgrundlage ist die Fläche des Plangebiets in Hektar, nicht die
  // anrechenbaren Kosten (§ 6 Abs. 1 Nr. 1). Drei Honorarzonen statt fünf.

  flaechennutzungsplan: {
    bezeichnung: 'Flächennutzungsplan',
    leistungsbildParagraf: '§ 18',
    tafel: 'flaechennutzungsplan',
    tafelParagraf: '§ 20',
    bezugsart: 'flaeche_hektar',
    namen: LPH_NAMEN_BAULEITPLANUNG,
    phasen: { 1: 0.60, 2: 0.30, 3: 0.10 },
  },

  bebauungsplan: {
    bezeichnung: 'Bebauungsplan',
    leistungsbildParagraf: '§ 19',
    tafel: 'bebauungsplan',
    tafelParagraf: '§ 21',
    bezugsart: 'flaeche_hektar',
    namen: LPH_NAMEN_BAULEITPLANUNG,
    phasen: { 1: 0.60, 2: 0.30, 3: 0.10 },
  },

  landschaftsplan: {
    bezeichnung: 'Landschaftsplan',
    leistungsbildParagraf: '§ 23',
    tafel: 'landschaftsplan',
    tafelParagraf: '§ 28',
    bezugsart: 'flaeche_hektar',
    namen: LPH_NAMEN_LANDSCHAFT,
    phasen: { 1: 0.03, 2: 0.37, 3: 0.50, 4: 0.10 },
  },

  gruenordnungsplan: {
    bezeichnung: 'Grünordnungsplan',
    leistungsbildParagraf: '§ 24',
    tafel: 'gruenordnungsplan',
    tafelParagraf: '§ 29',
    bezugsart: 'flaeche_hektar',
    namen: LPH_NAMEN_LANDSCHAFT,
    phasen: { 1: 0.03, 2: 0.37, 3: 0.50, 4: 0.10 },
  },

  landschaftsrahmenplan: {
    bezeichnung: 'Landschaftsrahmenplan',
    leistungsbildParagraf: '§ 25',
    tafel: 'landschaftsrahmenplan',
    tafelParagraf: '§ 30',
    bezugsart: 'flaeche_hektar',
    namen: LPH_NAMEN_LANDSCHAFT,
    phasen: { 1: 0.03, 2: 0.37, 3: 0.50, 4: 0.10 },
  },

  landschaftspflegerischer_begleitplan: {
    bezeichnung: 'Landschaftspflegerischer Begleitplan',
    leistungsbildParagraf: '§ 26',
    tafel: 'landschaftspflegerischer_begleitplan',
    tafelParagraf: '§ 31',
    bezugsart: 'flaeche_hektar',
    // § 26 benennt die zweite Phase abweichend
    namen: { ...LPH_NAMEN_LANDSCHAFT, 2: 'Ermitteln und Bewerten der Planungsgrundlagen' },
    phasen: { 1: 0.03, 2: 0.37, 3: 0.50, 4: 0.10 },
  },

  pflege_entwicklungsplan: {
    bezeichnung: 'Pflege- und Entwicklungsplan',
    leistungsbildParagraf: '§ 27',
    tafel: 'pflege_entwicklungsplan',
    tafelParagraf: '§ 32',
    bezugsart: 'flaeche_hektar',
    // § 27 benennt die erste Phase abweichend
    namen: { ...LPH_NAMEN_LANDSCHAFT, 1: 'Zusammenstellen der Ausgangsbedingungen' },
    phasen: { 1: 0.03, 2: 0.37, 3: 0.50, 4: 0.10 },
  },
};

/** Honorarzonen mit ihren Bezeichnungen aus den Honorartafeln. */
export const HONORARZONEN = {
  1: 'sehr geringe Anforderungen',
  2: 'geringe Anforderungen',
  3: 'durchschnittliche Anforderungen',
  4: 'hohe Anforderungen',
  5: 'sehr hohe Anforderungen',
};

export const ZONE_ROEMISCH = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V' };

/**
 * Die Honorarzonen EINES Leistungsbilds — mit Nummer, roemischer Ziffer und der
 * amtlichen Bezeichnung aus seiner eigenen Honorartafel.
 *
 * Notwendig, weil die Skala nicht ueberall gleich ist. Fuenfzonige
 * Leistungsbilder reichen von "sehr geringen" bis "sehr hohen" Anforderungen;
 * die dreizonigen — Technische Ausruestung (§ 56) und die gesamte
 * Flaechenplanung (§§ 20, 21, 28 bis 32) — beginnen bei "geringen" und enden
 * bei "hohen". Wer dort die Fuenferskala anbietet, laesst nicht nur zwei Zonen
 * waehlen, die es nicht gibt, sondern benennt auch die drei vorhandenen falsch:
 * Zone II hiesse dann "gering" statt "durchschnittlich".
 *
 * @param {string} schluessel  Leistungsbild
 * @returns {Array<{nr:number, roemisch:string, text:string}>}
 */
export function honorarzonenFuer(schluessel) {
  const lb = LEISTUNGSBILDER[schluessel];
  const tafel = lb ? TAFELN[lb.tafel] : null;
  const anzahl = tafel?.zonen ?? 5;
  return Array.from({ length: anzahl }, (_, i) => ({
    nr: i + 1,
    roemisch: ZONE_ROEMISCH[i + 1],
    text: tafel?.zonenNamen?.[i] || HONORARZONEN[i + 1],
  }));
}

/**
 * Honorarsaetze. Unter HOAI 2013 sind Mindest- und Hoechstsatz verbindlich
 * (§ 7 Abs. 1 in der Fassung 2013); unter HOAI 2021 sind die Tafelwerte
 * Orientierungswerte und das Honorar ist frei vereinbar. Die Benennung folgt
 * deshalb der Fassung — gerechnet wird in beiden Faellen mit demselben Anteil
 * zwischen unterem und oberem Tafelwert.
 */
export const HONORARSAETZE = {
  2013: [
    { schluessel: 'mindestsatz', bezeichnung: 'Mindestsatz', anteil: 0 },
    { schluessel: 'viertelsatz', bezeichnung: 'Viertelsatz', anteil: 0.25 },
    { schluessel: 'mittelsatz', bezeichnung: 'Mittelsatz', anteil: 0.5 },
    { schluessel: 'dreiviertelsatz', bezeichnung: 'Dreiviertelsatz', anteil: 0.75 },
    { schluessel: 'hoechstsatz', bezeichnung: 'Höchstsatz', anteil: 1 },
  ],
  2021: [
    { schluessel: 'mindestsatz', bezeichnung: 'Basishonorarsatz', anteil: 0 },
    { schluessel: 'viertelsatz', bezeichnung: 'Viertelsatz', anteil: 0.25 },
    { schluessel: 'mittelsatz', bezeichnung: 'Mittelsatz', anteil: 0.5 },
    { schluessel: 'dreiviertelsatz', bezeichnung: 'Dreiviertelsatz', anteil: 0.75 },
    { schluessel: 'hoechstsatz', bezeichnung: 'oberer Honorarsatz', anteil: 1 },
  ],
};

/** Bezeichnung eines Honorarsatzes fuer die Herleitung auf der Rechnung. */
export function satzBezeichnung(fassung, anteil) {
  const treffer = (HONORARSAETZE[fassung] || HONORARSAETZE[2021])
    .find((s) => Math.abs(s.anteil - anteil) < 1e-9);
  return treffer ? treffer.bezeichnung : 'frei vereinbarter Honorarsatz';
}

/** Summe der Phasenbewertungen — muss 100 % ergeben. Wird beim Laden geprueft. */
for (const [schluessel, lb] of Object.entries(LEISTUNGSBILDER)) {
  const summe = Object.values(lb.phasen).reduce((a, b) => a + b, 0);
  if (Math.abs(summe - 1) > 1e-9) {
    throw new Error(`Leistungsbild ${schluessel}: Phasen ergeben ${(summe * 100).toFixed(2)} %, nicht 100 %`);
  }
}
