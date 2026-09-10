// Dokumentvorlagen ansehen.
//
// Zweck: Das eigene Erscheinungsbild pruefen, ohne dafuer einen echten Beleg
// anlegen zu muessen. Wer Logo, Akzentfarbe oder Schrift aendert, will das
// Ergebnis sehen — und zwar auf einem vollstaendigen Blatt mit Anschriftfeld,
// Herleitung und Fusszeile, nicht an einem Farbfeld.
//
// Gerechnet wird mit erfundenen, aber plausiblen Zahlen. Die Buerodaten kommen
// aus den echten Einstellungen — sonst pruefte man ein fremdes Blatt. Das Muster
// bleibt auf diesem Geraet; es wird nichts verschickt und nichts abgelegt.

import { el, leeren, melden, feld, heuteIso } from '../ui.js';
import { einstellungenLesen, anschriftZeilen, telefonZeigen } from '../db.js';
import { honorarermittlung, ANRECHNUNG } from '../hoai/rechnen.js';
import { erstelleAbrechnung, RECHNUNGSART } from '../hoai/abrechnung.js';
import { rechnungHtml } from '../beleg/rechnung_html.js';
import { CD_KREATIVLABOR42, SCHRIFTEN } from '../beleg/cd.js';
import { pruefePflichtangaben } from '../beleg/pflichtangaben.js';
import { mahnungAufstellen } from '../beleg/mahnung.js';
import { mahnungHtml } from '../beleg/mahnung_html.js';
import { ermittlungAusPositionen } from '../vorgang.js';

// Frei erfundenes Vorhaben. Keine echten Projekt- oder Kundendaten — ein Muster
// muss ohne Rücksicht auf Vertraulichkeit zeigbar sein.
const MUSTERPROJEKT = {
  nummer: '2601', name: 'Musterhaus am Park', kuerzel: 'MAP',
};
const MUSTEREMPFAENGER = {
  name: 'Muster Bauträger GmbH',
  zusatz: 'Projektentwicklung',
  ansprechpartner: 'z. Hd. Frau Muster',
  zeile2: '',
  strasse: 'Musterweg 1',
  plzOrt: '12345 Musterstadt',
};

// Jede Dokumentart, die die App erzeugt — mit ihren eigenen Blaettern, nicht als
// Rechnung mit anderer Ueberschrift. Bis zum 11.09.2026 standen hier nur
// Abschlags- und Schlussrechnung; die uebrigen Blaetter gab es damals noch
// nicht. Wer sein Erscheinungsbild prueft, muss alles sehen koennen, was aus
// dem Haus geht.
const VARIANTEN = {
  angebot: {
    bezeichnung: 'Angebot',
    beschreibung: 'Sechs Blätter: Brief, Zusammenstellung, Leistungsbeschreibung mit den '
      + 'Grundleistungen im Wortlaut, Herleitung, Zahlungsplan und Annahmeerklärung.',
  },
  nachtrag: {
    bezeichnung: 'Nachtrag',
    beschreibung: 'Wie das Angebot, zusätzlich mit der Gegenüberstellung zum bisherigen '
      + 'Vertragsstand — der Bauherr sieht, was sich ändert und um wieviel.',
  },
  abschlag: {
    bezeichnung: 'Abschlagsrechnung',
    beschreibung: 'Der häufigste Fall: Honorar nach § 34 HOAI, Leistungsphasen 1–8, '
      + 'Umbauzuschlag, Nebenkostenpauschale, Abzug bisheriger Rechnungen.',
  },
  teilschluss: {
    bezeichnung: 'Teilschlussrechnung',
    beschreibung: 'Schließt einen Teil der Leistung endgültig ab (§ 650s BGB) — dieselbe '
      + 'Herleitung, anderer Rechnungskopf.',
  },
  schluss: {
    bezeichnung: 'Schlussrechnung',
    beschreibung: 'Alle Phasen erbracht, mit Rechnungseinbehalt und Ausweis der offenen '
      + 'Posten aus früheren Rechnungen.',
  },
  einzel: {
    bezeichnung: 'Einzelrechnung',
    beschreibung: 'Ohne Vertragsbezug: Pauschale und Zeithonorar nebeneinander, mit '
      + 'Skontoangebot. Keine HOAI-Herleitung — es gibt keine.',
  },
  mahnung: {
    bezeichnung: 'Mahnung',
    beschreibung: 'Zweite Stufe über zwei offene Rechnungen, mit Verzugszinsen nach '
      + '§ 288 Abs. 2 BGB, Verzugspauschale und prüfbarer Zinsstaffel.',
  },
};

export async function vorlagenZeigen(wurzel) {
  const einst = await einstellungenLesen();

  wurzel.append(
    el('h1', { text: 'Dokumentvorlagen' }),
    el('p', { class: 'unterzeile', text: 'So sieht ein Beleg mit den aktuellen Einstellungen aus — mit erfundenen Zahlen, ohne dass ein Beleg entsteht.' }),
  );

  // Am Muster faellt auf, was in den Einstellungen noch fehlt — dafuer muss man
  // keine echte Rechnung anlegen und wieder verwerfen.
  const pflicht = pruefePflichtangaben(musterDaten(einst, 'abschlag'));
  if (pflicht.fehlend.length) {
    wurzel.append(el('div', { class: 'karte hinweiskarte' },
      el('h3', { text: `${pflicht.fehlend.length} Pflichtangabe(n) fehlen` }),
      el('p', { class: 'klein', text: 'Ohne sie ist die Rechnung beim Empfänger nicht zum Vorsteuerabzug geeignet. Sie stehen in den Einstellungen:' }),
      el('ul', { class: 'liste schlicht' }, ...pflicht.fehlend.map((m) => el('li', {},
        el('div', { class: 'zeile' },
          el('span', { text: m.feld }),
          el('span', { class: 'mono klein', text: m.fundstelle }))))),
      el('div', { class: 'knopfreihe' },
        el('button', { class: 'knopf zweit', onclick: () => { location.hash = '#einstellungen'; } }, 'Zu den Einstellungen')),
    ));
  }

  const rahmen = el('iframe', {
    class: 'vorschau', title: 'Musterbeleg',
    sandbox: 'allow-same-origin',      // kein Skript, kein Formular, kein Netz
  });

  let art = 'angebot';
  const zeichnen = () => {
    const v = VARIANTEN[art];
    beschreibung.textContent = v.beschreibung;
    try {
      rahmen.srcdoc = musterHtml(einst, art);
    } catch (fehler) {
      console.error(fehler);
      melden(`Der Musterbeleg ließ sich nicht erzeugen: ${fehler.message}`, 'fehler');
    }
  };

  const wahl = feld({
    label: 'Vorlage', art: 'auswahl', wert: art,
    optionen: Object.entries(VARIANTEN).map(([k, v]) => ({ wert: k, text: v.bezeichnung })),
    onAenderung: (w) => { art = w; zeichnen(); },
  });
  const beschreibung = el('p', { class: 'klein' });

  wurzel.append(
    el('div', { class: 'abschnitt' }, el('h2', { text: 'Vorschau' })),
    wahl, beschreibung, rahmen,
    el('div', { class: 'knopfreihe' },
      el('button', { class: 'knopf zweit', onclick: () => oeffnen(musterHtml(einst, art)) }, 'In neuem Fenster öffnen'),
      el('button', { class: 'knopf leise', onclick: () => { location.hash = '#einstellungen'; } }, 'Auftritt ändern'),
    ),
    el('div', { class: 'abschnitt' }, el('h2', { text: 'Was fest ist' })),
    el('p', { class: 'fliess', text: 'Einstellbar sind Wortmarke oder Logo, Disziplinzeile, Akzentfarbe und Schrift. Der Satzspiegel, die Lage des Anschriftfelds, die Falzmarken und der Aufbau der Herleitung sind es nicht.' }),
    el('p', { class: 'fliess', text: 'Das ist Absicht: Das Anschriftfeld sitzt nach DIN 5008 Form B, damit es im Fensterumschlag steht. Und eine Rechnung, der eine Pflichtangabe nach § 14 UStG fehlt, ist beim Empfänger nicht zum Vorsteuerabzug geeignet — deshalb lässt sich die Struktur nicht verstellen.' }),
  );

  zeichnen();
}

function oeffnen(html) {
  const w = window.open('', '_blank');
  if (!w) { melden('Das Fenster wurde vom Browser blockiert.', 'fehler'); return; }
  w.document.write(html);
  w.document.close();
}

/**
 * Das Muster erzeugen. Die Mahnung geht ihren eigenen Weg — sie ist kein Beleg
 * und hat einen eigenen Renderer.
 */
function musterHtml(einst, art) {
  if (art === 'mahnung') return musterMahnung(einst);
  return rechnungHtml(musterDaten(einst, art));
}

/** Belegart und Nummer je Vorlage. */
const ART_ZU_BELEG = {
  angebot: { belegart: 'AN', nummer: 'AN-2601-01' },
  nachtrag: { belegart: 'NA', nummer: 'NA-2601-02' },
  abschlag: { belegart: 'AR', nummer: 'AR-2601-04' },
  teilschluss: { belegart: 'TS', nummer: 'TS-2601-05' },
  schluss: { belegart: 'SR', nummer: 'SR-2601-09' },
  einzel: { belegart: 'ER', nummer: 'ER-2601-01' },
};

function musterMahnung(einst) {
  const m = mahnungAufstellen({
    stufe: 2,
    datum: heuteIso(),
    pauschale: true,
    posten: [
      { nummer: 'AR-2601-03', datum: tageZurueck(210), faelligAm: tageZurueck(180), offen: 37765.00 },
      { nummer: 'AR-2601-04', datum: tageZurueck(120), faelligAm: tageZurueck(90), offen: 18420.50 },
    ],
  });
  return mahnungHtml({
    mahnung: m,
    buero: { ...einst.buero, ...anschriftZeilen(einst.buero) },
    empfaenger: MUSTEREMPFAENGER,
    projekt: MUSTERPROJEKT,
    zahlbarBis: tageVoraus(10),
    cd: cdAus(einst),
  });
}

const tageZurueck = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const tageVoraus = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

/**
 * Baut die Daten eines Musterbelegs mit den echten Einstellungen.
 * Eine Quelle fuer Vorschau und Pflichtangabenpruefung — sonst prueft man etwas
 * anderes, als man sieht.
 */
function musterDaten(einst, art) {
  const ermittlung = honorarermittlung({
    fassung: einst.vorgaben.fassung,
    leistungsbild: 'gebaeude',
    bezeichnung: '§ 34 HOAI: Leistungsbild Gebäude',
    kostenermittlung: {
      grundlage: 'Kostenberechnung',
      datum: '15.03.2026',
      dinFassung: 'DIN 276 Ausgabe Dezember 2018',
      gruppen: [
        { nr: '300', bezeichnung: 'Bauwerk – Baukonstruktionen', betrag: 1450000, anrechnung: ANRECHNUNG.VOLL },
        { nr: '400', bezeichnung: 'Bauwerk – Technische Anlagen', betrag: 420000, anrechnung: ANRECHNUNG.TECHNIK_33_2 },
        { nr: '500', bezeichnung: 'Außenanlagen', betrag: 35000, anrechnung: ANRECHNUNG.VOLL },
      ],
    },
    honorarzone: 3,
    honorarzoneBegruendung: 'Wohngebäude mit durchschnittlichen Planungsanforderungen (Objektliste Anlage 10.2)',
    honorarsatz: 0.5,
    phasen: [1, 2, 3, 4, 5, 6, 7, 8].map((nr) => ({ nr })),
    zuschlaege: [{ art: 'umbau', bezeichnung: 'Umbauzuschlag', prozent: 0.20, fundstelle: '§ 36 HOAI' }],
    nebenkosten: { art: 'pauschal', prozent: einst.vorgaben.nebenkostenProzent },
  });

  const { belegart, nummer } = ART_ZU_BELEG[art] || ART_ZU_BELEG.abschlag;
  const istAngebot = belegart === 'AN' || belegart === 'NA';

  // Die Einzelrechnung hat keine HOAI-Herleitung — sie steht fuer sich. Sie hier
  // aus dem Vertragshonorar zu bauen waere ein Blatt, das es so nie gibt.
  const einzelErmittlung = ermittlungAusPositionen({
    positionen: [
      { art: 'pauschal', bezeichnung: 'Bestandsaufnahme und Aufmaß, pauschal', betrag: 2400 },
      { art: 'zeit', bezeichnung: 'Abstimmung mit der Denkmalbehörde', stunden: 8,
        satz: einst.vorgaben.stundensatz },
    ],
  });
  const leistung = art === 'einzel' ? einzelErmittlung : ermittlung;

  // Vorrechnungen zieht nur ab, wer kumulativ abrechnet. Ein Angebot rechnet
  // nichts ab, eine Einzelrechnung steht fuer sich.
  const vorrechnungen = (istAngebot || art === 'einzel') ? [] : [
    { art: 'AR', nummer: 'AR-2601-01', datum: '12.01.2026', netto: 24500 },
    { art: 'AR', nummer: 'AR-2601-02', datum: '09.03.2026', netto: 38200 },
    { art: 'AR', nummer: 'AR-2601-03', datum: '04.05.2026', netto: 31750 },
  ];

  const abrechnung = erstelleAbrechnung({
    art: belegart,
    nummer,
    datum: '15.06.2026',
    leistungen: [leistung],
    ustSatz: einst.vorgaben.ustSatz,
    bisherigeRechnungen: vorrechnungen,
    // Die Schlussrechnung zeigt, was der Einbehalt mit dem Blatt macht.
    einbehalt: art === 'schluss'
      ? { bezeichnung: 'Rechnungseinbehalt aus LPh 8 bis Mängelbeseitigung', brutto: 5000 }
      : null,
    zahlungsstand: art === 'schluss'
      ? [{ bezeichnung: 'Abschlagsrechnung Nr. AR-2601-03 vom 04.05.2026',
          gestellt: 37782.50, gezahlt: 35000 }]
      : [],
    zahlungsstandVerrechnen: art === 'schluss',
    skonto: art === 'einzel' ? { prozent: 0.02, tage: 14, bis: '2026-06-29' } : null,
  });

  // Der Nachtrag braucht einen frueheren Stand, sonst hat die Gegenueberstellung
  // nichts zu vergleichen. Hier: dieselbe Ermittlung mit niedrigeren
  // anrechenbaren Kosten — der haeufigste Anlass eines Nachtrags.
  let vergleich = null;
  if (belegart === 'NA') {
    const vorher = honorarermittlung({
      fassung: einst.vorgaben.fassung,
      leistungsbild: 'gebaeude',
      bezeichnung: '§ 34 HOAI: Leistungsbild Gebäude',
      kostenermittlung: {
        grundlage: 'Kostenschätzung', datum: '20.11.2025',
        dinFassung: 'DIN 276 Ausgabe Dezember 2018',
        gruppen: [
          { nr: '300', bezeichnung: 'Bauwerk – Baukonstruktionen', betrag: 1180000, anrechnung: ANRECHNUNG.VOLL },
          { nr: '400', bezeichnung: 'Bauwerk – Technische Anlagen', betrag: 340000, anrechnung: ANRECHNUNG.TECHNIK_33_2 },
        ],
      },
      honorarzone: 3, honorarsatz: 0.5,
      phasen: [1, 2, 3, 4, 5, 6, 7, 8].map((nr) => ({ nr })),
      zuschlaege: [{ art: 'umbau', bezeichnung: 'Umbauzuschlag', prozent: 0.20, fundstelle: '§ 36 HOAI' }],
      nebenkosten: { art: 'pauschal', prozent: einst.vorgaben.nebenkostenProzent },
    });
    vergleich = {
      grund: 'Erhöhte anrechenbare Kosten nach der Kostenberechnung',
      gueltigAb: '2026-06-01',
      vorherVersion: 1,
      vorherDatum: '2025-11-25',
      vorher,
    };
  }

  return {
    belegart,
    buero: { ...einst.buero, ...anschriftZeilen(einst.buero), telefon: telefonZeigen(einst.buero) },
    empfaenger: MUSTEREMPFAENGER,
    projekt: MUSTERPROJEKT,
    abrechnung,
    ermittlungen: [leistung],
    vergleich,
    // Nur Angebot und Nachtrag: Bindefrist, Grundleistungen im Wortlaut und der
    // Zahlungsplan. Auf einer Rechnung hat nichts davon etwas zu suchen.
    ...(istAngebot ? {
      vertrag: vertragsstand(einst),
      bindefrist: tageVoraus(30),
      grundleistungenZeigen: true,
      zahlungsplan: { raten: [
        { bezeichnung: '1. Rate', prozent: 0.30, ausloeser: 'nach Vorplanung (LPh 2)' },
        { bezeichnung: '2. Rate', prozent: 0.30, ausloeser: 'nach Genehmigungsplanung (LPh 4)' },
        { bezeichnung: '3. Rate', prozent: 0.40, ausloeser: 'nach Fertigstellung' },
      ] },
    } : {}),
    cd: cdAus(einst),
    leistungszeitraum: istAngebot ? '' : '01.01.2026 – 31.05.2026',
    kickerRechts: art === 'einzel' ? '' : `HOAI ${einst.vorgaben.fassung}`,
    anrede: 'Sehr geehrte Frau Muster,',
    anschreiben: istAngebot
      ? 'für das oben genannte Vorhaben biete ich Ihnen die nachstehend beschriebenen '
        + 'Leistungen an. Der Umfang der Grundleistungen ist auf den Folgeseiten im '
        + 'Wortlaut der Verordnung aufgeführt.'
      : 'für die Planungsleistungen am oben genannten Vorhaben stellen wir Ihnen '
        + 'vereinbarungsgemäß folgendes Honorar in Rechnung. Die Herleitung nach HOAI '
        + 'finden Sie auf den Folgeseiten.',
    verweise: ['Musterbeleg — kein echter Vorgang'],
  };
}


/**
 * Das eingestellte Erscheinungsbild als CD — dieselbe Ableitung wie in der
 * Belegansicht. Steht hier als eigene Funktion, damit Beleg und Mahnung
 * dasselbe Bild bekommen; vorher lag sie in musterDaten() eingebettet und war
 * für das Mahnschreiben nicht erreichbar.
 */
function cdAus(einst) {
  const c = einst.cd || {};
  const wortmarke = [];
  if (c.wortmarkeMager) wortmarke.push({ text: c.wortmarkeMager, gewicht: 300 });
  if (c.wortmarkeFett) wortmarke.push({ text: c.wortmarkeFett, gewicht: 600 });
  if (c.wortmarkeEnde) wortmarke.push({ text: c.wortmarkeEnde, gewicht: 300 });
  const schrift = SCHRIFTEN[c.schrift] || SCHRIFTEN.geist;
  const name = einst.buero?.name || 'Musterbüro';

  return {
    ...CD_KREATIVLABOR42,
    marke: {
      ...CD_KREATIVLABOR42.marke,
      name,
      wortmarke: wortmarke.length ? wortmarke : [{ text: name, gewicht: 400 }],
      logo: c.logo || null,
      disziplin: c.disziplin || '',
    },
    farben: { ...CD_KREATIVLABOR42.farben, accent: c.akzent || CD_KREATIVLABOR42.farben.accent },
    schrift: { ...CD_KREATIVLABOR42.schrift, familie: schrift.familie, mono: schrift.mono },
  };
}

/**
 * Ein Vertragsstand fuer die Angebotsblaetter.
 *
 * Die Leistungsbeschreibung braucht ihn: Ohne Leistungsbild, Honorarzone und
 * Leistungsphasen faellt sie auf die kurze Fassung fuer freie Positionen zurueck
 * — und dann saehe man im Muster gerade das nicht, was das Angebot ausmacht.
 */
function vertragsstand(einst) {
  return {
    fassung: einst.vorgaben.fassung,
    leistungsbild: 'gebaeude',
    version: 1,
    honorarzone: 3,
    honorarzoneBegruendung: 'Wohngebäude mit durchschnittlichen Planungsanforderungen (Objektliste Anlage 10.2)',
    honorarsatz: 0.5,
    kostenermittlung: { grundlage: 'Kostenberechnung', datum: '2026-03-15' },
    phasen: [
      { nr: 1, vereinbart: 0.02 }, { nr: 2, vereinbart: 0.07 }, { nr: 3, vereinbart: 0.15 },
      { nr: 4, vereinbart: 0.03 }, { nr: 5, vereinbart: 0.25 }, { nr: 6, vereinbart: 0.10 },
      { nr: 7, vereinbart: 0.04 }, { nr: 8, vereinbart: 0.32 },
    ],
    nebenkosten: { art: 'pauschal', prozent: einst.vorgaben.nebenkostenProzent },
  };
}
