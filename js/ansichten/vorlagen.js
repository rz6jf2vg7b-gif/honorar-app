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

import { el, leeren, melden, feld } from '../ui.js';
import { einstellungenLesen, anschriftZeilen, telefonZeigen } from '../db.js';
import { honorarermittlung, ANRECHNUNG } from '../hoai/rechnen.js';
import { erstelleAbrechnung, RECHNUNGSART } from '../hoai/abrechnung.js';
import { rechnungHtml } from '../beleg/rechnung_html.js';
import { CD_KREATIVLABOR42, SCHRIFTEN } from '../beleg/cd.js';
import { pruefePflichtangaben } from '../beleg/pflichtangaben.js';

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

const VARIANTEN = {
  rechnung: {
    bezeichnung: 'Abschlagsrechnung',
    beschreibung: 'Der häufigste Fall: Honorar nach § 35 HOAI, Leistungsphasen 1–8, Umbauzuschlag, Nebenkostenpauschale, Abzug bisheriger Rechnungen.',
  },
  schluss: {
    bezeichnung: 'Schlussrechnung',
    beschreibung: 'Alle Phasen erbracht, keine weiteren Abschläge — dieselbe Herleitung, anderer Rechnungskopf.',
  },
  // Ein Angebot fehlt hier bewusst: Es ist keine Rechnung — keine
  // Zahlungsaufforderung, keine Pflichtangaben nach § 14 UStG, andere
  // Kopfzeile. Es durch eine Abschlagsrechnung mit anderer Nummer
  // darzustellen waere eine Vorlage, die es so nie gibt. Das eigene
  // Angebotsblatt steht noch aus.
};

export async function vorlagenZeigen(wurzel) {
  const einst = await einstellungenLesen();

  wurzel.append(
    el('h1', { text: 'Dokumentvorlagen' }),
    el('p', { class: 'unterzeile', text: 'So sieht ein Beleg mit den aktuellen Einstellungen aus — mit erfundenen Zahlen, ohne dass ein Beleg entsteht.' }),
  );

  // Am Muster faellt auf, was in den Einstellungen noch fehlt — dafuer muss man
  // keine echte Rechnung anlegen und wieder verwerfen.
  const pflicht = pruefePflichtangaben(musterDaten(einst, 'rechnung'));
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

  let art = 'rechnung';
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
    el('div', { class: 'abschnitt' }, el('h2', { text: 'Noch nicht dabei' })),
    el('p', { class: 'fliess', text: 'Angebot und Nachtrag haben noch kein eigenes Blatt. Beide sind keine Rechnungen — sie fordern kein Geld und tragen keine Pflichtangaben nach § 14 UStG. Sie hier als Rechnung mit anderer Nummer zu zeigen, ergäbe eine Vorlage, die es so nicht gibt.' }),

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

const musterHtml = (einst, art) => rechnungHtml(musterDaten(einst, art));

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

  const abrechnung = erstelleAbrechnung({
    art: art === 'schluss' ? RECHNUNGSART.SCHLUSS : RECHNUNGSART.ABSCHLAG,
    nummer: art === 'schluss' ? 'SR-2601-09' : 'AR-2601-04',
    datum: '15.06.2026',
    leistungen: [ermittlung],
    ustSatz: einst.vorgaben.ustSatz,
    bisherigeRechnungen: [
      { art: 'AR', nummer: 'AR-2601-01', datum: '12.01.2026', netto: 24500 },
      { art: 'AR', nummer: 'AR-2601-02', datum: '09.03.2026', netto: 38200 },
      { art: 'AR', nummer: 'AR-2601-03', datum: '04.05.2026', netto: 31750 },
    ],
  });

  const c = einst.cd || {};
  const wortmarke = [];
  if (c.wortmarkeMager) wortmarke.push({ text: c.wortmarkeMager, gewicht: 300 });
  if (c.wortmarkeFett) wortmarke.push({ text: c.wortmarkeFett, gewicht: 600 });
  if (c.wortmarkeEnde) wortmarke.push({ text: c.wortmarkeEnde, gewicht: 300 });
  const schrift = SCHRIFTEN[c.schrift] || SCHRIFTEN.geist;

  return {
    belegart: art === 'schluss' ? 'SR' : 'AR',
    buero: { ...einst.buero, ...anschriftZeilen(einst.buero), telefon: telefonZeigen(einst.buero) },
    empfaenger: MUSTEREMPFAENGER,
    projekt: MUSTERPROJEKT,
    abrechnung,
    ermittlungen: [ermittlung],
    cd: {
      ...CD_KREATIVLABOR42,
      marke: {
        ...CD_KREATIVLABOR42.marke,
        name: einst.buero?.name || 'Musterbüro',
        wortmarke: wortmarke.length ? wortmarke : [{ text: einst.buero?.name || 'Musterbüro', gewicht: 400 }],
        logo: c.logo || null,
        disziplin: c.disziplin || '',
      },
      farben: { ...CD_KREATIVLABOR42.farben, accent: c.akzent || CD_KREATIVLABOR42.farben.accent },
      schrift: { ...CD_KREATIVLABOR42.schrift, familie: schrift.familie, mono: schrift.mono },
    },
    leistungszeitraum: '01.01.2026 – 31.05.2026',
    kickerRechts: `HOAI ${einst.vorgaben.fassung}`,
    anrede: 'Sehr geehrte Frau Muster,',
    anschreiben: 'für die Planungsleistungen am oben genannten Vorhaben stellen wir Ihnen vereinbarungsgemäß folgendes Honorar in Rechnung. Die Herleitung nach HOAI finden Sie auf den Folgeseiten.',
    verweise: ['Musterbeleg — kein echter Vorgang'],
  };
}
