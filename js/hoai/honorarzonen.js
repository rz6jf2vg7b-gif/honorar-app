// Ermittlung der Honorarzone nach den Bewertungsmerkmalen der HOAI.
//
// Die Honorarzone ist der größte Hebel auf das Honorar und im Streitfall der
// häufigste Angriffspunkt. Die HOAI gibt dafür einen Weg vor, den man von Hand
// selten geht:
//
//   1. Objektliste (§ 35 Abs. 7, Anlage 10.2) — steht das Vorhaben dort, ist
//      die Zone benannt. Das ist der Regelfall und die beste Begründung.
//   2. Bewertungsmerkmale (§ 35 Abs. 2) — passt keins der Regelbeispiele.
//   3. Punktbewertung (§ 35 Abs. 4 bis 6) — erst dann, wenn Merkmale aus
//      MEHREREN Zonen zutreffen und deswegen Zweifel bestehen. Die Verordnung
//      sagt das ausdrücklich: die Punkte sind die Feinbewertung, nicht der
//      Einstieg.
//
// Diese Datei hält Merkmale, Gewichte und Zonengrenzen. Sie sind aus dem
// Verordnungstext abgelesen; tests/honorarzonen.test.mjs prüft sie Zeile für
// Zeile gegen den Volltext, damit sie nicht auseinanderlaufen können.

/**
 * Je Leistungsbild: die Bewertungsmerkmale mit ihrer Punktobergrenze und die
 * oberen Punktgrenzen der Honorarzonen I bis V.
 *
 * Nicht jedes Leistungsbild kennt eine Punktbewertung: Tragwerksplanung
 * (§ 52 Abs. 3) und Technische Ausrüstung (§ 56) entscheiden nach der Mehrzahl
 * der zutreffenden Merkmale und der Objektliste. Dort steht `punkte: false` —
 * eine Punktrechnung anzubieten, die die Verordnung nicht vorsieht, wäre eine
 * Scheingenauigkeit.
 */
export const HONORARZONEN_BEWERTUNG = {
  gebaeude: {
    punkte: true,
    fundstelle: '§ 35 Abs. 2, 4 und 6',
    objektliste: 'Anlage 10.2',
    merkmale: [
      { text: 'Anforderungen an die Einbindung in die Umgebung', max: 6 },
      { text: 'Anzahl der Funktionsbereiche', max: 9 },
      { text: 'gestalterische Anforderungen', max: 9 },
      { text: 'konstruktive Anforderungen', max: 6 },
      { text: 'technische Ausrüstung', max: 6 },
      { text: 'Ausbau', max: 6 },
    ],
    grenzen: [10, 18, 26, 34, 42],
  },

  innenraeume: {
    punkte: true,
    fundstelle: '§ 35 Abs. 3, 5 und 6',
    objektliste: 'Anlage 10.3',
    merkmale: [
      { text: 'Anzahl der Funktionsbereiche', max: 6 },
      { text: 'Anforderungen an die Lichtgestaltung', max: 6 },
      { text: 'Anforderungen an die Raumzuordnung und Raumproportion', max: 6 },
      { text: 'technische Ausrüstung', max: 6 },
      { text: 'Farb- und Materialgestaltung', max: 9 },
      { text: 'konstruktive Detailgestaltung', max: 9 },
    ],
    grenzen: [10, 18, 26, 34, 42],
  },

  freianlagen: {
    punkte: true,
    fundstelle: '§ 40 Abs. 2 bis 4',
    objektliste: 'Anlage 11.2',
    merkmale: [
      { text: 'Anforderungen an die Einbindung in die Umgebung', max: 8 },
      { text: 'Anforderungen an Schutz, Pflege und Entwicklung von Natur und Landschaft', max: 8 },
      { text: 'Anzahl der Funktionsbereiche', max: 6 },
      { text: 'gestalterische Anforderungen', max: 8 },
      { text: 'Ver- und Entsorgungseinrichtungen', max: 6 },
    ],
    grenzen: [8, 15, 22, 29, 36],
  },

  ingenieurbauwerke: {
    punkte: true,
    fundstelle: '§ 44 Abs. 2 bis 4',
    objektliste: 'Anlage 12.2',
    merkmale: [
      { text: 'geologische und baugrundtechnische Gegebenheiten', max: 5 },
      { text: 'technische Ausrüstung und Ausstattung', max: 5 },
      { text: 'Einbindung in die Umgebung oder in das Objektumfeld', max: 5 },
      { text: 'Umfang der Funktionsbereiche oder der konstruktiven oder technischen Anforderungen', max: 10 },
      { text: 'fachspezifische Bedingungen', max: 15 },
    ],
    grenzen: [10, 17, 25, 33, 40],
  },

  verkehrsanlagen: {
    punkte: true,
    fundstelle: '§ 48 Abs. 2 bis 4',
    objektliste: 'Anlage 13.2',
    // Anders gewichtet als bei den Ingenieurbauwerken, obwohl die Merkmale
    // gleich lauten: hier trägt Nummer 3 die 15 Punkte, dort Nummer 5.
    merkmale: [
      { text: 'geologische und baugrundtechnische Gegebenheiten', max: 5 },
      { text: 'technische Ausrüstung und Ausstattung', max: 5 },
      { text: 'Einbindung in die Umgebung oder das Objektumfeld', max: 15 },
      { text: 'Umfang der Funktionsbereiche oder der konstruktiven oder technischen Anforderungen', max: 10 },
      { text: 'fachspezifische Bedingungen', max: 5 },
    ],
    grenzen: [10, 17, 25, 33, 40],
  },

  tragwerksplanung: {
    punkte: false,
    fundstelle: '§ 52 Abs. 2 und 3',
    objektliste: 'Anlage 14.2',
    hinweis: 'Die Zone folgt dem statisch-konstruktiven Schwierigkeitsgrad nach '
      + 'Anlage 14 Nummer 14.2. Treffen Merkmale mehrerer Zonen zu, entscheidet die '
      + 'Mehrzahl der Merkmale und ihre Bedeutung im Einzelfall — eine Punktbewertung '
      + 'sieht die HOAI hier nicht vor.',
    merkmale: [],
    grenzen: null,
  },

  technische_ausruestung: {
    punkte: false,
    fundstelle: '§ 56 Abs. 2 und 3',
    objektliste: 'Anlage 15.2',
    hinweis: 'Die Zone richtet sich nach den Bewertungsmerkmalen und der Objektliste '
      + 'der Anlage 15 Nummer 15.2. Eine Punktbewertung sieht die HOAI hier nicht vor. '
      + 'Werden Anlagen einer Gruppe verschiedenen Zonen zugeordnet, ist das Honorar '
      + 'nach § 56 Abs. 4 aus Einzelhonoraren zusammenzusetzen.',
    merkmale: [
      { text: 'Anzahl der Funktionsbereiche', max: null },
      { text: 'Integrationsansprüche', max: null },
      { text: 'technische Ausgestaltung', max: null },
      { text: 'Anforderungen an die Technik', max: null },
      { text: 'konstruktive Anforderungen', max: null },
    ],
    grenzen: null,
  },
};

/**
 * Ordnet eine Punktsumme einer Honorarzone zu.
 * @returns {{zone:number, punkte:number, maxPunkte:number, spanne:string}|null}
 */
export function zoneAusPunkten(leistungsbild, punkte) {
  const b = HONORARZONEN_BEWERTUNG[leistungsbild];
  if (!b?.punkte) return null;

  const gesamt = Math.round(punkte * 100) / 100;
  const maxPunkte = b.merkmale.reduce((s, m) => s + m.max, 0);

  // Die Grenzen sind die OBEREN Werte je Zone. Die letzte Zone nimmt alles
  // darüber mit auf: Rundungen dürfen nicht dazu führen, dass gar keine Zone
  // herauskommt.
  let zone = b.grenzen.length;
  for (let i = 0; i < b.grenzen.length; i++) {
    if (gesamt <= b.grenzen[i]) { zone = i + 1; break; }
  }

  const von = zone === 1 ? 0 : b.grenzen[zone - 2] + 1;
  const bis = b.grenzen[zone - 1];
  return {
    zone,
    punkte: gesamt,
    maxPunkte,
    spanne: zone === 1 ? `bis zu ${bis} Punkte` : `${von} bis ${bis} Punkte`,
  };
}

/** Alle Merkmale auf demselben Anteil — als Ausgangslage einer Bewertung. */
export function vorbelegung(leistungsbild, anteil = 0.5) {
  const b = HONORARZONEN_BEWERTUNG[leistungsbild];
  if (!b?.punkte) return [];
  return b.merkmale.map((m) => Math.round(m.max * anteil));
}
