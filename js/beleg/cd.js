// Corporate Design als Token-Schicht.
//
// Grundlage: BR·03b „Titel Architektur" aus der Design-Session (Hardfacts-Papier
// vom 07.09.2026). Uebernommen sind Satzspiegel, Farben, Schriftlogik, Titelblock
// mit Mono-Kicker und Ink-Regel, Sidebar rechts und Fusszeile.
//
// Bewusste Entscheidung gegen einen Vorlagen-Editor: Anpassbar ist die Erscheinung,
// nicht die Struktur. Ein Buero tauscht Wortmarke, Schrift, Akzentfarbe und
// Satzspiegel — das deckt praktisch jedes Architektur- und Ingenieurbuero-CD ab.
// Wer einzelne Felder frei positionieren kann, baut sich frueher oder spaeter eine
// Rechnung, der eine Pflichtangabe fehlt (siehe pflichtangaben.js).

/** Voreinstellung kreativLABOR42 nach BR·03b. */
export const CD_KREATIVLABOR42 = {
  marke: {
    name: 'kreativLABOR42',
    // Wortmarke als Text — im neuen CD gesetzt, nicht als Bild. Die Gewichte
    // erzeugen den Wechsel: "kreativ" mager, "LABOR" fett, "42" mager.
    wortmarke: [
      { text: 'kreativ', gewicht: 300 },
      { text: 'LABOR', gewicht: 600 },
      { text: '42', gewicht: 300 },
    ],
    // Alternativ ein Bildlogo (data: oder Pfad). Gesetzt schlaegt es die Wortmarke.
    logo: null,
    logoBreiteMm: 46,
    // Rechts im Briefkopf: die Disziplin des Buros, nicht der Dokumenttyp.
    disziplin: 'ARCHITEKTUR · STADTENTWICKLUNG',
  },

  farben: {
    ink: '#0a0a0a',       // Titel, Ink-Regel
    inkSoft: '#1a1a1c',   // Fliesstext
    grey2: '#6f6f72',     // Mono-Labels, Sidebar, Fusszeile
    grey3: '#a8a6a1',     // Lochmarke
    hair: '#d4d2cd',      // Hairlines
    accent: '#14b8a6',    // Kicker, Belegnummer, Projekt-Meta, aktive Seitenzahl
    paper: '#ffffff',
    flaeche: '#f6f6f4',   // Hinterlegung der Summenzeile und Formelbloecke
  },

  schrift: {
    // Geist ist die Hausschrift. Dahinter Ausweichschriften, die auf jedem Rechner
    // vorhanden sind — eine Rechnung darf nie an einer fehlenden Schrift scheitern.
    familie: 'Geist, "Segoe UI", Inter, "Helvetica Neue", Helvetica, Arial, sans-serif',
    mono: '"IBM Plex Mono", Consolas, Menlo, "Courier New", monospace',
    // Groessen in pt fuer den Druck. Umrechnung aus den Bildschirmwerten des
    // Design-Papiers: 7px≈5,5pt · 7,5px≈6pt · 8px≈6,5pt · 9px≈7pt · 9,5px≈7,5pt
    // · 10px≈8pt · 22px≈17pt · 23px≈18pt
    wortmarkePt: 17,
    titelPt: 18,
    textPt: 7.5,
    monoKleinPt: 5.5,
    monoPt: 6,
    monoGrossPt: 7,
    // Eine einzige Groesse fuer alle Inhalte der Folgeseiten. Wechselnde Groessen
    // ohne Bedeutungsunterschied machen eine Herleitung unruhig, ohne sie
    // gliedern zu helfen — gegliedert wird ueber Weissraum und Linien.
    folgeseitePt: 7,
    zeilenhoehe: 1.65,
  },

  satz: {
    // Satzspiegel BR·03b — Inhaltsspalte 127 mm, Sidebar 50 mm rechts angedockt.
    randLinksMm: 25,
    randRechtsMm: 58,      // Abstand Blattrand bis Textende
    sidebarBreiteMm: 50,
    sidebarPadding: '45mm 10mm 18mm 14mm',
    kopfTopMm: 18,
    titelTopMm: 96,
    textTopMm: 122,
    fussBottomMm: 18,
    seitenzahlLinksMm: 174,
    anschriftTopMm: 45,
    // DIN 5008 Form B: Falzmarken 105 und 210 mm, Lochmarke 148,5 mm.
    // (Form A hätte 87 und 192 mm — die gehören zum Anschriftfeld ab 27 mm.)
    din5008: true,
    falz1Mm: 105,
    lochMm: 148.5,
    falz2Mm: 210,
    akzentstrichMm: 179,
  },

  beleg: {
    // Kicker rechts oben neben dem Betreff — bei Briefen die Leistungsphase,
    // bei Rechnungen die Fassung der Verordnung.
    kickerRechts: null,     // null = wird aus dem Beleg abgeleitet
    fussnoten: [
      'Gemäß § 14b Abs. 1 Satz 5 Umsatzsteuergesetz sind Sie verpflichtet, diese Rechnung zwei Jahre '
      + 'lang aufzubewahren. Die Frist beginnt mit dem Schluss des Kalenderjahres, in dem die Rechnung '
      + 'ausgestellt worden ist.',
      'Gemäß § 286 Abs. 3 BGB kommt ein zahlungspflichtiger Rechnungsempfänger in Verzug, wenn er nicht '
      + 'innerhalb von 30 Tagen nach Fälligkeit und Zugang der Rechnung seine Zahlung leistet.',
    ],
  },
};

/**
 * Zweites CD als Nachweis, dass die Trennung traegt — und als Ausgangspunkt fuer
 * ein fremdes Buero. Andere Schrift, andere Farbe, andere Anmutung, gleiche Struktur.
 */
export const CD_NEUTRAL = {
  ...CD_KREATIVLABOR42,
  marke: {
    name: 'Musterbüro für Architektur',
    wortmarke: [
      { text: 'Musterbüro', gewicht: 600 },
      { text: ' für Architektur', gewicht: 300 },
    ],
    logo: null,
    logoBreiteMm: 0,
    disziplin: 'HOCHBAU · BAUEN IM BESTAND',
  },
  farben: {
    ...CD_KREATIVLABOR42.farben,
    accent: '#8a5a2b',
    grey2: '#71717a',
    hair: '#c8c8cc',
    flaeche: '#f4f4f5',
  },
  schrift: {
    ...CD_KREATIVLABOR42.schrift,
    familie: 'Georgia, "Times New Roman", serif',
    mono: 'Menlo, Consolas, "Courier New", monospace',
  },
};

/**
 * Waehlbare Schriften.
 *
 * ⚠️ Ausschliesslich Schriften, die auf den Geraeten bereits vorhanden sind.
 * Eine Web-Schrift von Google Fonts oder einem CDN nachzuladen wuerde bei jedem
 * Oeffnen eines Belegs die IP-Adresse des Betrachters an den Anbieter
 * uebertragen — das LG Muenchen I hat genau das am 20.01.2022 (Az. 3 O 17493/20)
 * als DSGVO-Verstoss gewertet und Schadenersatz zugesprochen. Ausserdem sieht
 * ein Beleg ohne Netz sonst anders aus als mit. Deshalb: keine externen
 * Schriften, auch nicht als Angebot.
 *
 * Jeder Eintrag nennt mehrere Ausweichschriften — eine Rechnung darf nie an
 * einer fehlenden Schrift scheitern.
 */
export const SCHRIFTEN = {
  system: {
    bezeichnung: 'System (serifenlos)',
    hinweis: 'Nimmt die Schrift des jeweiligen Geräts — San Francisco, Segoe UI, Roboto.',
    familie: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, "SF Mono", Menlo, Consolas, "Courier New", monospace',
  },
  geist: {
    bezeichnung: 'Geist',
    hinweis: 'Die Hausschrift von kreativLABOR42. Ist sie nicht installiert, greift die Systemschrift.',
    familie: 'Geist, "Segoe UI", Inter, "Helvetica Neue", Helvetica, Arial, sans-serif',
    mono: '"IBM Plex Mono", Consolas, Menlo, "Courier New", monospace',
  },
  helvetica: {
    bezeichnung: 'Helvetica / Arial',
    hinweis: 'Die nüchterne Wahl — auf jedem Rechner und Drucker vorhanden.',
    familie: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    mono: 'Menlo, Consolas, "Courier New", monospace',
  },
  georgia: {
    bezeichnung: 'Georgia (Serife)',
    hinweis: 'Serifenschrift — wirkt auf Papier ruhiger und traditioneller.',
    familie: 'Georgia, "Times New Roman", Times, serif',
    mono: 'Menlo, Consolas, "Courier New", monospace',
  },
  palatino: {
    bezeichnung: 'Palatino (Serife)',
    hinweis: 'Breitere Serifenschrift mit viel Ruhe in langen Herleitungen.',
    familie: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif',
    mono: 'Menlo, Consolas, "Courier New", monospace',
  },
};

/** Fuellt fehlende Angaben eines Teil-CD mit der Voreinstellung auf. */
export function cdVervollstaendigen(cd) {
  const v = CD_KREATIVLABOR42;
  return {
    marke: { ...v.marke, ...(cd?.marke || {}) },
    farben: { ...v.farben, ...(cd?.farben || {}) },
    schrift: { ...v.schrift, ...(cd?.schrift || {}) },
    satz: { ...v.satz, ...(cd?.satz || {}) },
    beleg: { ...v.beleg, ...(cd?.beleg || {}) },
  };
}

/** Erzeugt die CSS-Variablen aus dem CD. Alles andere im Stylesheet ist fest. */
export function cdAlsCssVariablen(cd) {
  const c = cdVervollstaendigen(cd);
  const s = c.satz;
  return `:root{
  --ink:${c.farben.ink};
  --ink-soft:${c.farben.inkSoft};
  --grey-2:${c.farben.grey2};
  --grey-3:${c.farben.grey3};
  --hair:${c.farben.hair};
  --accent:${c.farben.accent};
  --paper:${c.farben.paper};
  --flaeche:${c.farben.flaeche};
  --schrift:${c.schrift.familie};
  --mono:${c.schrift.mono};
  --pt-wortmarke:${c.schrift.wortmarkePt}pt;
  --pt-titel:${c.schrift.titelPt}pt;
  --pt-text:${c.schrift.textPt}pt;
  --pt-mono-klein:${c.schrift.monoKleinPt}pt;
  --pt-mono:${c.schrift.monoPt}pt;
  --pt-mono-gross:${c.schrift.monoGrossPt}pt;
  --pt-folgeseite:${c.schrift.folgeseitePt}pt;
  --zeile:${c.schrift.zeilenhoehe};
  --links:${s.randLinksMm}mm;
  --rechts:${s.randRechtsMm}mm;
  --sidebar-breite:${s.sidebarBreiteMm}mm;
  --sidebar-padding:${s.sidebarPadding};
  --kopf-top:${s.kopfTopMm}mm;
  --titel-top:${s.titelTopMm}mm;
  --text-top:${s.textTopMm}mm;
  --fuss-bottom:${s.fussBottomMm}mm;
  --seitenzahl-links:${s.seitenzahlLinksMm}mm;
  --anschrift-top:${s.anschriftTopMm}mm;
  --falz1:${s.falz1Mm}mm;
  --loch:${s.lochMm}mm;
  --falz2:${s.falz2Mm}mm;
  --akzentstrich:${s.akzentstrichMm}mm;
}`;
}
