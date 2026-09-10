// Einzelner Beleg: Zahlen, Blattvorschau, Ausgabe.
//
// Ausgabe heisst hier dreierlei, und alle drei Wege muessen ohne Nachdenken
// funktionieren:
//   Drucken/PDF — oeffnet den fertigen Beleg im Druckdialog des Geraets. Auf dem
//     Mac wird daraus "Als PDF sichern", auf iPhone und iPad das Teilen-Blatt.
//   Sichern     — legt den Beleg als Datei ab, benannt nach Steffens Schema.
//   Versenden   — bereitet die Mail vor. Ein Anhang laesst sich aus dem Browser
//     nicht anhaengen; die Datei wird deshalb zuerst gesichert und der Entwurf
//     mit Hinweis geoeffnet. Das ist eine Grenze des Browsers, keine Bequemlichkeit.

import {
  el, leeren, melden, eurZeigen, feld, zahlLesen, zahlZeigen, isoNachDe,
  bestaetigen, dateiSpeichern, dateiWaehlen, heuteIso,
} from '../ui.js';
import { SPEICHER, lesen, alle, einstellungenLesen, anschriftZeilen, telefonZeigen, personName } from '../db.js';
import {
  BELEGART_TEXT, IST_RECHNUNG, IST_ANGEBOT, ANNAHME, STATUS, belegRechnen,
  belegFestschreiben, belegStornieren, zahlungErfassen, vertraegeZuProjekt,
  ermittlungAusVertrag, belegGestellt, annahmeVermerken, faelligAm,
  anlageSpeichern, anlagenZuBeleg, anlageLesen,
} from '../vorgang.js';
import { rechnungHtml } from '../beleg/rechnung_html.js';
import { CD_KREATIVLABOR42, SCHRIFTEN } from '../beleg/cd.js';
import { pruefePflichtangaben } from '../beleg/pflichtangaben.js';
import { xrechnungXml, pruefeERechnung } from '../beleg/xrechnung.js';
import { prozent } from '../hoai/geld.js';

export async function belegAnsehen(wurzel, belegId) {
  const beleg = await lesen(SPEICHER.BELEGE, belegId);
  if (!beleg) {
    wurzel.append(el('div', { class: 'leer' }, el('p', { text: 'Dieser Beleg wurde nicht gefunden.' })));
    return;
  }

  const einst = await einstellungenLesen();
  const projekt = beleg.projektId ? await lesen(SPEICHER.PROJEKTE, beleg.projektId) : null;
  const adresse = beleg.adresseId ? await lesen(SPEICHER.ADRESSEN, beleg.adresseId) : null;
  const vertrag = beleg.snapshot?.vertrag
    || (beleg.vertragId ? await lesen(SPEICHER.VERTRAEGE, beleg.vertragId) : null);
  // Die Grundlage der Rechnung — das Angebot oder der Nachtrag, gegen den sie
  // laeuft. Sie steht als Verweis auf dem Blatt, damit der Auftraggeber sie
  // gegen seine Unterlagen halten kann, ohne nachzufragen.
  const bezug = beleg.bezugBelegId ? await lesen(SPEICHER.BELEGE, beleg.bezugBelegId) : null;
  // Rechnungsempfaenger und Auftraggeber sind nicht immer dieselbe Person: Die
  // Rechnung geht an die Hausverwaltung, der Vertrag besteht mit der
  // Eigentuemergemeinschaft. Der Beleg muss dann beide nennen — sonst fehlt dem
  // Empfaenger der Bezug, und im Streit ist offen, wem gegenueber abgerechnet
  // wurde. Ohne abweichende Angabe ist der Auftraggeber auch der Empfaenger.
  const auftraggeber = beleg.auftraggeberId && beleg.auftraggeberId !== beleg.adresseId
    ? await lesen(SPEICHER.ADRESSEN, beleg.auftraggeberId)
    : null;

  // Festgeschriebene Belege werden aus ihrem eingefrorenen Stand gezeigt, nicht neu
  // gerechnet — sonst wuerde ein spaeterer Nachtrag eine alte Rechnung veraendern.
  let ermittlung; let abrechnung;
  if (beleg.status === STATUS.FEST && beleg.snapshot) {
    ({ ermittlung, abrechnung } = beleg.snapshot);
  } else {
    try {
      ({ ermittlung, abrechnung } = await belegRechnen(beleg, vertrag));
    } catch (f) {
      wurzel.append(el('div', { class: 'karte' },
        el('h3', { text: 'Der Beleg lässt sich nicht rechnen' }),
        el('p', { class: 'hinweis fehler', text: f.message }),
      ));
      return;
    }
  }

  // Beim Nachtrag wird der vorherige Vertragsstand mitgerechnet. Ohne ihn zeigte
  // das Blatt nur eine neue Zahl, und der Auftraggeber muesste die alte selbst
  // heraussuchen — genau das macht Nachtraege streitanfaellig. Alte Versionen
  // werden nie veraendert, der Vergleich bleibt deshalb auch spaeter derselbe.
  let vergleich = null;
  if (beleg.art === 'NA' && vertrag) {
    vergleich = {
      grund: vertrag.grund, gueltigAb: vertrag.gueltigAb,
    };
    const stände = beleg.projektId ? await vertraegeZuProjekt(beleg.projektId) : [];
    const vorher = stände.filter((v) => (v.version || 0) < (vertrag.version || 0)).pop();
    if (vorher) {
      vergleich.vorherVersion = vorher.version;
      vergleich.vorherDatum = vorher.gueltigAb;
      try { vergleich.vorher = ermittlungAusVertrag(vorher); } catch { /* dann ohne Zahlen */ }
    }
  }

  const belegdaten = () => ({
    belegart: beleg.art,
    // Der Beleg bekommt die zusammengesetzten Zeilen, nicht die Einzelfelder.
    buero: { ...einst.buero, ...anschriftZeilen(einst.buero), telefon: telefonZeigen(einst.buero) },
    // Reihenfolge nach DIN 5008: Firma, Firmenzusatz, Person, Adresszusatz,
    // Straße, Ort. Der Ansprechpartner steht mit "z. Hd." davor, damit die Post
    // ihn nicht für den Empfänger hält.
    empfaenger: adresse ? {
      name: adresse.name,
      zusatz: adresse.zusatz,
      ansprechpartner: personName(adresse) ? `z. Hd. ${personName(adresse)}` : '',
      zeile2: adresse.adresszeile2 || '',
      strasse: adresse.strasse, plzOrt: `${adresse.plz || ''} ${adresse.ort || ''}`.trim(),
    } : { name: '—', strasse: '', plzOrt: '' },
    auftraggeber: auftraggeber ? {
      name: auftraggeber.name,
      zusatz: auftraggeber.zusatz,
      strasse: auftraggeber.strasse,
      plzOrt: `${auftraggeber.plz || ''} ${auftraggeber.ort || ''}`.trim(),
    } : null,
    projekt: projekt
      ? { nummer: projekt.nummer, name: projekt.name, kuerzel: projekt.kuerzel }
      : { nummer: '—', name: '—' },
    abrechnung,
    ermittlungen: [ermittlung],
    cd: cdAus(einst),
    leistungszeitraum: beleg.leistungszeitraum,
    kickerRechts: vertrag ? `HOAI ${vertrag.fassung}` : '',
    anrede: beleg.anrede,
    anschreiben: beleg.anschreiben,
    verweise: verweiseAus(vertrag, bezug),
    // Angebot und Nachtrag tragen eigene Blaetter: Leistungsbeschreibung,
    // Gegenueberstellung und Annahmeerklaerung.
    vertrag,
    bindefrist: beleg.bindefrist || '',
    grundleistungenZeigen: beleg.grundleistungenZeigen !== false,
    vergleich,
  });

  const html = () => rechnungHtml(belegdaten());

  // ── E-Rechnung ───────────────────────────────────────
  // Die Norm verlangt Angaben, die auf dem gedruckten Blatt nicht vorkommen:
  // eine Kaeuferreferenz, elektronische Adressen beider Seiten, ein Datum statt
  // eines Zeitraums. Sie werden hier zusammengetragen, nicht in der Beleglogik —
  // ein gedruckter Beleg bleibt vollstaendig, auch wenn sie fehlen.
  const erechnungdaten = () => ({
    ...belegdaten(),
    leitwegId: adresse?.leitwegId || '',
    bestellnummer: beleg.bestellnummer || projekt?.bestellnummer || '',
    empfaengerMail: adresse?.mail || '',
    empfaengerUstId: adresse?.ustId || '',
    faelligkeit: beleg.faelligkeit || tagePlus(beleg.datum, einst.vorgaben.zahlungsziel),
    zahlungsbedingung: `Zahlbar ohne Abzug innerhalb von ${einst.vorgaben.zahlungsziel} Tagen.`,
    leistungsdatum: beleg.leistungsdatum || beleg.datum,
  });

  // ── Kopf ─────────────────────────────────────────────
  wurzel.append(
    el('div', { class: 'schrittkopf' },
      el('span', { class: 'kicker', text: BELEGART_TEXT[beleg.art] || 'Beleg' }),
      el('span', { class: `marke-status ${beleg.status}`, text: statusText(beleg.status) }),
    ),
    el('h1', { text: beleg.nummer }),
    el('p', { class: 'unterzeile', text: [
      projekt ? `${projekt.nummer} ${projekt.name}` : null,
      adresse?.name,
      beleg.datumDe || isoNachDe(beleg.datum),
    ].filter(Boolean).join(' · ') }),
  );

  // ── Beträge ──────────────────────────────────────────
  const zeile = (bez, wert, summe = false) => el('div', { class: summe ? 'summe' : '' },
    el('dt', { text: bez }), el('dd', { text: wert }));

  wurzel.append(el('div', { class: 'karte gefuellt' }, el('dl', { class: 'werte' },
    zeile('Leistungen netto', eurZeigen(abrechnung.summeLeistungen)),
    abrechnung.einbehaltNetto ? zeile('Einbehalt netto', eurZeigen(-abrechnung.einbehaltNetto)) : null,
    abrechnung.summeAbzug ? zeile('Abzug bisheriger Rechnungen', eurZeigen(-abrechnung.summeAbzug)) : null,
    zeile('Rechnungsbetrag netto', eurZeigen(abrechnung.rechnungsbetragNetto)),
    zeile(`Umsatzsteuer ${prozent(abrechnung.ustSatz)}`, eurZeigen(abrechnung.ust)),
    zeile('Betrag zur Zahlung', eurZeigen(abrechnung.zahlbetrag), true),
  )));

  // ── Pflichtangaben ───────────────────────────────────
  // Nur Rechnungen: Ein Angebot oder ein Nachtrag ist keine Rechnung im Sinne
  // des § 14 UStG. Die App verlangte dort bis 09.09.2026 den Leistungszeitpunkt
  // und behauptete, ohne ihn sei "die Rechnung" nicht vorsteuerabzugsfaehig.
  const pflicht = IST_RECHNUNG(beleg.art)
    ? pruefePflichtangaben(belegdaten())
    : { ok: true, fehlend: [], hinweise: [] };
  if (!pflicht.ok) {
    wurzel.append(el('div', { class: 'karte' },
      el('h3', { text: 'Pflichtangaben fehlen' }),
      el('p', { class: 'klein', text: 'Ohne sie ist die Rechnung nicht zum Vorsteuerabzug geeignet — der Empfänger bekommt seine Umsatzsteuer nicht zurück.' }),
      el('ul', { class: 'liste' }, ...pflicht.fehlend.map((f) => el('li', {},
        el('div', { class: 'eintrag' }, el('div', { class: 'haupt' },
          el('div', { class: 'titel', text: f.feld }),
          el('div', { class: 'neben', text: f.fundstelle }))),
      ))),
    ));
  }

  // ── Ausgabe ──────────────────────────────────────────
  wurzel.append(el('h2', { text: 'Ausgabe' }),
    el('div', { class: 'knopfreihe' },
      el('button', { class: 'knopf akzent', onclick: () => drucken(html()) }, 'Drucken / PDF'),
      el('button', {
        class: 'knopf zweit',
        onclick: () => sichern(beleg, projekt, adresse, einst.vorgaben.ablageschema, html()),
      }, 'Beleg sichern'),
      el('button', {
        class: 'knopf zweit',
        onclick: () => versenden(beleg, projekt, adresse, einst.vorgaben.ablageschema, abrechnung, html()),
      }, 'Per Mail'),
      IST_RECHNUNG(beleg.art) ? el('button', {
        class: 'knopf zweit',
        onclick: async () => {
          const daten = erechnungdaten();
          const p = pruefeERechnung(daten);
          if (!p.ok && !await bestaetigen('Angaben fehlen — trotzdem erzeugen?',
            `${p.fehlend.map((f) => `• ${f.feld} (${f.fundstelle})`).join('\n')}\n\n`
            + 'Ein öffentlicher Auftraggeber weist den Datensatz dann maschinell ab. '
            + 'Für einen privaten Auftraggeber kann er trotzdem brauchbar sein.')) return;
          const name = dateiname(beleg, projekt, adresse, einst.vorgaben.ablageschema, 'xml');
          dateiSpeichern(name, xrechnungXml(daten), 'application/xml;charset=utf-8');
          melden(`Gesichert als ${name} — enthält Bankverbindung und Steuernummer.`);
        },
      }, 'E-Rechnung (XML)') : null,
    ));

  // ── Was der E-Rechnung fehlt ─────────────────────────
  if (IST_RECHNUNG(beleg.art)) {
    const p = pruefeERechnung(erechnungdaten());
    if (!p.ok) {
      wurzel.append(el('div', { class: 'karte' },
        el('h3', { text: 'Für die E-Rechnung fehlen Angaben' }),
        el('p', { class: 'klein', text: 'Öffentliche Auftraggeber nehmen nur XRechnungen an und '
          + 'prüfen sie maschinell. Für den gedruckten Beleg ändert das nichts.' }),
        el('ul', { class: 'liste' }, ...p.fehlend.map((f) => el('li', {},
          el('div', { class: 'eintrag' }, el('div', { class: 'haupt' },
            el('div', { class: 'titel', text: f.feld }),
            el('div', { class: 'neben', text: f.fundstelle }))),
        ))),
      ));
    }
  }

  // ── Vorgang ──────────────────────────────────────────
  // Der Lebenslauf des Belegs: geschrieben, versandt, angenommen oder bezahlt.
  // Alle Daten sind frei waehlbar, weil sie fast immer nachgetragen werden — man
  // vermerkt den Posteingang nicht in dem Augenblick, in dem der Brief kommt.
  if (beleg.status === STATUS.FEST) {
    await vorgangZeigen(wurzel, beleg, einst, () => location.reload());
  }

  // ── Vorschau ─────────────────────────────────────────
  // Zum Schliessen, weil sie zwei Drittel des Bildschirms einnimmt und die
  // Knoepfe darunter sonst hinter ihr liegen. Der Zustand haelt nur, solange die
  // Seite offen ist — beim naechsten Beleg will man wieder sehen, was man tut.
  const rahmen = el('iframe', { title: 'Blattvorschau', sandbox: 'allow-same-origin' });
  const kasten = el('div', { class: 'vorschau' }, rahmen);
  const zeigen = el('button', {
    class: 'knopf zweit', hidden: true,
    onclick: () => { kasten.hidden = false; zeigen.hidden = true; kreuz.hidden = false; },
  }, 'Blattvorschau zeigen');
  const kreuz = el('button', {
    class: 'kreuz', 'aria-label': 'Vorschau schließen', title: 'Vorschau schließen',
    onclick: () => { kasten.hidden = true; zeigen.hidden = false; kreuz.hidden = true; },
  }, '×');
  wurzel.append(el('div', { class: 'abschnittkopf' },
    el('h2', { text: 'Blattvorschau' }), kreuz), kasten, zeigen);
  rahmen.srcdoc = html();

  // ── Zustand ──────────────────────────────────────────
  wurzel.append(el('h2', { text: 'Beleg' }));
  const reihe = el('div', { class: 'knopfreihe' });
  if (beleg.status === STATUS.ENTWURF) {
    reihe.append(el('button', {
      class: 'knopf',
      onclick: async () => {
        try {
          await belegFestschreiben(beleg, vertrag);
          melden('Festgeschrieben. Ab jetzt unveränderlich.');
          location.reload();
        } catch (f) { melden(f.message, 'fehler'); }
      },
    }, 'Festschreiben'));
  }
  // Stornieren gilt nur fuer Rechnungen: Eine Stornorechnung hebt einen
  // steuerlichen Vorgang auf. Ein Angebot ist kein solcher Vorgang — es wird
  // zurueckgezogen oder laeuft ab, und beides ist ein Vermerk, keine Gegenbuchung.
  if (beleg.status === STATUS.FEST && IST_RECHNUNG(beleg.art)) {
    reihe.append(el('button', {
      class: 'knopf leise',
      onclick: async () => {
        if (!await bestaetigen('Rechnung stornieren?',
          'Es entsteht eine Stornorechnung mit umgekehrtem Vorzeichen. Der Beleg selbst bleibt erhalten.')) return;
        const s = await belegStornieren(beleg, '');
        melden('Storno angelegt.');
        location.hash = `#beleg/${s.id}`;
      },
    }, 'Stornieren'));
  }
  if (beleg.status === STATUS.FEST && IST_ANGEBOT(beleg.art) && !beleg.annahme) {
    reihe.append(el('button', {
      class: 'knopf leise',
      onclick: async () => {
        if (!await bestaetigen('Angebot zurückziehen?',
          'Es wird als abgelehnt vermerkt. Das Blatt selbst bleibt unverändert erhalten.')) return;
        await annahmeVermerken(beleg.id, { am: heuteIso(), art: ANNAHME.ABGELEHNT,
          bemerkung: 'Vom Auftragnehmer zurückgezogen' });
        melden('Als zurückgezogen vermerkt.');
        location.reload();
      },
    }, 'Zurückziehen'));
  }
  reihe.append(el('button', { class: 'knopf leise', onclick: () => { location.hash = '#dashboard'; } }, 'Zur Übersicht'));
  wurzel.append(reihe);
}

// ————————————————————————————————————————————————————————————————

const statusText = (s) => ({ entwurf: 'Entwurf', fest: 'festgeschrieben', storniert: 'storniert' }[s] || s);

function cdAus(einst) {
  const c = einst.cd || {};
  const wortmarke = [];
  if (c.wortmarkeMager) wortmarke.push({ text: c.wortmarkeMager, gewicht: 300 });
  if (c.wortmarkeFett) wortmarke.push({ text: c.wortmarkeFett, gewicht: 600 });
  if (c.wortmarkeEnde) wortmarke.push({ text: c.wortmarkeEnde, gewicht: 300 });
  const schrift = SCHRIFTEN[c.schrift] || SCHRIFTEN.geist;
  return {
    ...CD_KREATIVLABOR42,
    marke: {
      ...CD_KREATIVLABOR42.marke,
      name: einst.buero?.name || CD_KREATIVLABOR42.marke.name,
      wortmarke: wortmarke.length ? wortmarke : [{ text: einst.buero?.name || '', gewicht: 400 }],
      // Ein hinterlegtes Logo schlaegt die Wortmarke — so ist es in cd.js
      // vorgesehen und so erwartet man es auch.
      logo: c.logo || null,
      disziplin: c.disziplin || '',
    },
    farben: { ...CD_KREATIVLABOR42.farben, accent: c.akzent || CD_KREATIVLABOR42.farben.accent },
    schrift: { ...CD_KREATIVLABOR42.schrift, familie: schrift.familie, mono: schrift.mono },
  };
}

function verweiseAus(vertrag, bezug = null) {
  const v = [];
  if (bezug) {
    v.push(`${BELEGART_TEXT[bezug.art]} ${bezug.nummer} vom ${isoNachDe(bezug.datum)}`);
    if (bezug.annahme?.am) {
      v.push(bezug.annahme.art === 'geaendert'
        ? `beauftragt am ${isoNachDe(bezug.annahme.am)}, mit Änderungen`
        : `beauftragt am ${isoNachDe(bezug.annahme.am)}`);
    }
  }
  if (!vertrag) return v;
  if (vertrag.kostenermittlung?.grundlage && vertrag.kostenermittlung?.datum) {
    v.push(`${vertrag.kostenermittlung.grundlage} vom ${isoNachDe(vertrag.kostenermittlung.datum)}`);
  }
  if (vertrag.version > 1) v.push(`Vertragsstand Version ${vertrag.version}`);
  return v;
}

/**
 * Dateiname nach dem Ablageschema aus den Einstellungen. Zentral gesteuert, damit
 * alle Belege gleich heissen und im Projektordner beieinanderliegen.
 */
function dateiname(beleg, projekt, adresse, schema, endung) {
  const datum = (beleg.datum || '').replace(/-/g, '');
  const roh = (schema || '{datum}_{projekt}_{nummer}_{art}')
    .replace('{datum}', datum)
    .replace('{jahr}', (beleg.datum || '').slice(0, 4))
    .replace('{projekt}', projekt?.nummer || '')
    .replace('{kuerzel}', projekt?.kuerzel || '')
    .replace('{nummer}', beleg.nummer || '')
    .replace('{art}', beleg.art || '')
    .replace('{empfaenger}', adresse?.name || '');
  // Alles, was in Dateinamen Ärger macht, faellt weg — auch Leerzeichen.
  const sauber = roh.replace(/[^\w.\-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
  return `${sauber || 'beleg'}.${endung}`;
}

/** Beleg im Druckdialog oeffnen. Auf iOS fuehrt das ins Teilen-Blatt. */
function drucken(html) {
  const w = window.open('', '_blank');
  if (!w) { melden('Der Browser hat das Fenster blockiert. Bitte Pop-ups für diese Seite erlauben.', 'fehler'); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.addEventListener('load', () => setTimeout(() => w.print(), 300));
  // Manche Browser feuern load bereits vor dem Zuhoeren
  setTimeout(() => { try { w.print(); } catch { /* egal */ } }, 700);
}

function sichern(beleg, projekt, adresse, schema, html) {
  const name = dateiname(beleg, projekt, adresse, schema, 'html');
  dateiSpeichern(name, html, 'text/html;charset=utf-8');
  melden(`Gesichert als ${name}`);
}

function versenden(beleg, projekt, adresse, schema, abrechnung, html) {
  sichern(beleg, projekt, adresse, schema, html);
  const betreff = `${BELEGART_TEXT[beleg.art]} ${beleg.nummer}`
    + (projekt ? ` — ${projekt.nummer} ${projekt.name}` : '');
  const koerper = [
    beleg.anrede || 'Sehr geehrte Damen und Herren,',
    '',
    beleg.anschreiben || `anbei erhalten Sie die ${BELEGART_TEXT[beleg.art]} ${beleg.nummer}.`,
    '',
    IST_RECHNUNG(beleg.art)
      ? `Betrag zur Zahlung: ${eurZeigen(abrechnung.zahlbetrag)}`
      : `${beleg.art === 'AN' ? 'Angebotssumme' : 'Nachtragssumme'}: ${eurZeigen(abrechnung.zahlbetrag)}`,
    '',
    'Mit freundlichen Grüßen',
  ].join('\n');
  const url = `mailto:${encodeURIComponent(adresse?.mail || '')}`
    + `?subject=${encodeURIComponent(betreff)}&body=${encodeURIComponent(koerper)}`;
  window.location.href = url;
  melden('Mailentwurf geöffnet — die gesicherte Datei bitte selbst anhängen.', '');
}

/** Datum plus Tage, beides als ISO. Fuer die Faelligkeit der E-Rechnung. */
function tagePlus(iso, tage) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + (tage || 0));
  return d.toISOString().slice(0, 10);
}

// ————————————————————————————————————————————————————————————————
// Der Vorgang: was mit dem Beleg geschehen ist
// ————————————————————————————————————————————————————————————————
//
// Ein Beleg ist nicht fertig, wenn er gedruckt ist. Ein Angebot geht raus,
// kommt unterschrieben zurueck — oft mit Streichungen — und wird dann zur
// Abrechnungsgrundlage. Eine Rechnung geht raus, wird faellig, wird bezahlt.
// Diese Karte bildet genau das ab, und zwar mit frei waehlbaren Daten: In der
// Praxis traegt man den Ruecklauf nach, nicht am selben Tag.

/** Eine Zeile "Beschriftung — Wert" fuer die Werteliste. */
const wzeile = (bez, wert, stark = false) => el('div', { class: stark ? 'summe' : '' },
  el('dt', { text: bez }), el('dd', { text: wert }));

/** Dateigroesse lesbar: "0 KB" bei einer kleinen Datei sah nach Fehler aus. */
const groesseZeigen = (b) => {
  if (!Number.isFinite(b)) return '—';
  if (b < 1024) return `${b} Byte`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

const annahmeText = {
  [ANNAHME.VOLL]: 'wie angeboten',
  [ANNAHME.GEAENDERT]: 'mit Änderungen',
  [ANNAHME.ABGELEHNT]: 'abgelehnt',
};

async function vorgangZeigen(wurzel, beleg, einst, neuZeichnen) {
  const karte = el('div', { class: 'karte' });
  const werte = el('dl', { class: 'werte' });
  karte.append(werte);

  // ── Versand ──
  werte.append(wzeile('Beleg vom', isoNachDe(beleg.datum) || '—'));
  werte.append(wzeile('Versandt am', beleg.gestelltAm ? isoNachDe(beleg.gestelltAm) : 'noch nicht'));

  // Dieselbe Vorgabe wie im Dashboard und auf dem Beleg: vorgaben.zahlungsziel.
  const ziel = Number.isFinite(einst.vorgaben?.zahlungsziel) ? einst.vorgaben.zahlungsziel : 30;
  if (IST_RECHNUNG(beleg.art)) {
    const faellig = faelligAm(beleg, ziel);
    const offen = (beleg.brutto || 0) - (beleg.gezahlt || 0);
    if (faellig && Math.abs(offen) > 0.005) {
      const tage = Math.floor((Date.now() - new Date(`${faellig}T00:00:00`).getTime()) / 86400000);
      werte.append(wzeile('Fällig am',
        `${isoNachDe(faellig)}${tage > 0 ? ` — seit ${tage} Tag${tage === 1 ? '' : 'en'} überfällig` : ''}`));
    }
  }

  if (!beleg.gestelltAm) {
    const d = feld({ label: 'Versandt am', art: 'date', wert: heuteIso() });
    karte.append(el('div', { class: 'feldreihe' }, d,
      el('button', {
        class: 'knopf zweit',
        onclick: async () => {
          await belegGestellt(beleg.id, d.eingabe.value || heuteIso());
          melden('Als versandt vermerkt.');
          neuZeichnen();
        },
      }, 'Versandt')));
  }

  wurzel.append(el('h2', { text: 'Vorgang' }), karte);

  if (IST_ANGEBOT(beleg.art)) await annahmeBlock(wurzel, beleg, neuZeichnen);
  else if (IST_RECHNUNG(beleg.art)) await zahlungsBlock(wurzel, beleg, neuZeichnen);

  await anlagenBlock(wurzel, beleg, neuZeichnen);
}

/**
 * Annahme eines Angebots oder Nachtrags.
 *
 * Der haeufigste Fall in der Praxis ist nicht die glatte Annahme, sondern die
 * mit Streichungen: "LPh 1-4 ja, der Rest spaeter." Rechtlich ist das ein neuer
 * Antrag (§ 150 Abs. 2 BGB) — fuer die App heisst es, dass ab hier ein anderer
 * Umfang gilt als im Angebot. Das Angebot selbst bleibt unveraendert; es ist
 * festgeschrieben und dokumentiert, was man angeboten hatte.
 */
async function annahmeBlock(wurzel, beleg, neuZeichnen) {
  const a = beleg.annahme;
  const karte = el('div', { class: 'karte' });

  if (a) {
    karte.append(el('dl', { class: 'werte' },
      wzeile('Beantwortet am', isoNachDe(a.am)),
      wzeile('Ergebnis', annahmeText[a.art] || a.art, true),
      a.bemerkung ? wzeile('Bemerkung', a.bemerkung) : null,
    ));
    if (a.art === ANNAHME.GEAENDERT && (a.phasen || []).length) {
      karte.append(el('p', { class: 'klein', text:
        `Beauftragt: ${a.phasen.map((p) => `LPh ${p.nr}`).join(', ')}. `
        + 'Abschlags- und Schlussrechnungen rechnen gegen diesen Umfang.' }));
    }
    if (a.art === ANNAHME.GEAENDERT && (a.positionen || []).length) {
      karte.append(el('table', { class: 'daten' },
        el('thead', {}, el('tr', {}, el('th', { text: 'Beauftragte Leistung' }),
          el('th', { class: 'num', text: 'Betrag' }))),
        el('tbody', {}, ...a.positionen.map((p) => el('tr', {},
          el('td', { text: p.bezeichnung }),
          el('td', { class: 'num', text: eurZeigen(p.betrag) }))))));
    }
    const reihe = el('div', { class: 'knopfreihe' });
    // Der eigentliche Gewinn: Aus dem Auftrag heraus weiterarbeiten. Empfänger,
    // Grundlage und die beauftragten Positionen stehen fest — sie noch einmal zu
    // tippen ist nicht nur lästig, es ist die Stelle, an der Angebot und
    // Rechnung auseinanderlaufen.
    if (a.art !== ANNAHME.ABGELEHNT) {
      reihe.append(el('button', {
        class: 'knopf akzent',
        onclick: () => { location.hash = `#neu/${beleg.projektId}?aus=${beleg.id}`; },
      }, 'Rechnung dazu'));
    }
    reihe.append(el('button', {
      class: 'knopf leise',
      onclick: async () => {
        if (!await bestaetigen('Vermerk zurücknehmen?',
          'Der Vermerk über die Antwort des Auftraggebers wird gelöscht. '
          + 'Ein daraus entstandener Vertragsstand bleibt bestehen und ist im Projekt zu prüfen.')) return;
        const { verwaltungsdatenSetzen } = await import('../vorgang.js');
        await verwaltungsdatenSetzen(beleg.id, { annahme: null });
        melden('Vermerk zurückgenommen.');
        neuZeichnen();
      },
    }, 'Vermerk zurücknehmen'));
    karte.append(reihe);
    wurzel.append(el('h2', { text: 'Antwort des Auftraggebers' }), karte);
    return;
  }

  // Noch keine Antwort — das Formular.
  const datumF = feld({ label: 'Antwort vom', art: 'date', wert: heuteIso() });
  const artF = feld({
    label: 'Ergebnis', art: 'auswahl', wert: ANNAHME.VOLL,
    optionen: [
      { wert: ANNAHME.VOLL, text: 'angenommen wie angeboten' },
      { wert: ANNAHME.GEAENDERT, text: 'angenommen mit Änderungen' },
      { wert: ANNAHME.ABGELEHNT, text: 'abgelehnt' },
    ],
  });
  const bemerkungF = feld({ label: 'Bemerkung', wert: '',
    platzhalter: 'z. B. LPh 5–9 zurückgestellt' });

  const aenderungen = el('div', { hidden: true });
  karte.append(el('div', { class: 'feldreihe' }, datumF, artF), bemerkungF, aenderungen);

  // Die Änderungen: Leistungsphasen abwählen oder Positionen anpassen.
  const vertrag = beleg.vertragId ? await lesen(SPEICHER.VERTRAEGE, beleg.vertragId) : null;
  const phasenFelder = [];
  const positionsFelder = [];

  if (vertrag && (vertrag.phasen || []).length) {
    aenderungen.append(el('p', { class: 'unterzeile', text:
      'Welche Leistungsphasen sind beauftragt? Abgewählte gelten als nicht beauftragt '
      + 'und können später als Nachtrag hinzukommen.' }));
    for (const ph of vertrag.phasen) {
      const f = feld({
        label: '', art: 'schalter', wert: true,
        schaltertext: `LPh ${ph.nr} — ${prozent(ph.vereinbart)} der Leistung`,
      });
      phasenFelder.push({ ph, f });
      aenderungen.append(f);
    }
  }

  const eigene = beleg.positionen || [];
  if (eigene.length) {
    aenderungen.append(el('p', { class: 'unterzeile', text:
      'Welche Positionen sind beauftragt, und zu welchem Betrag? '
      + 'Ein geänderter Betrag ersetzt den angebotenen.' }));
    for (const pos of eigene) {
      const an = feld({ label: '', art: 'schalter', wert: true, schaltertext: pos.bezeichnung });
      const betrag = feld({ label: 'Betrag', art: 'geld', einheit: '€', wert: String(pos.betrag ?? '') });
      positionsFelder.push({ pos, an, betrag });
      aenderungen.append(el('div', { class: 'feldreihe' }, an, betrag));
    }
  }

  // Zusätzlich beauftragte Leistungen — der Bauherr ergänzt beim Unterschreiben
  // gelegentlich etwas, das im Angebot nicht stand.
  const zusatz = [];
  const zusatzKasten = el('div', {});
  aenderungen.append(zusatzKasten, el('div', { class: 'knopfreihe' }, el('button', {
    class: 'knopf leise',
    onclick: () => {
      const bez = feld({ label: 'Zusätzlich beauftragt', wert: '' });
      const bet = feld({ label: 'Betrag', art: 'geld', einheit: '€', wert: '' });
      zusatz.push({ bez, bet });
      zusatzKasten.append(el('div', { class: 'feldreihe' }, bez, bet));
    },
  }, 'Zusätzliche Leistung')));

  const umschalten = () => { aenderungen.hidden = artF.eingabe.value !== ANNAHME.GEAENDERT; };
  artF.eingabe.addEventListener('change', umschalten);
  umschalten();

  karte.append(el('div', { class: 'knopfreihe' }, el('button', {
    class: 'knopf',
    onclick: async () => {
      try {
        const art = artF.eingabe.value;
        const daten = { am: datumF.eingabe.value || heuteIso(), art,
          bemerkung: bemerkungF.eingabe.value.trim() };

        if (art === ANNAHME.GEAENDERT) {
          const phasen = phasenFelder.filter((x) => x.f.eingabe.checked).map((x) => x.ph);
          if (phasenFelder.length && !phasen.length) {
            melden('Ohne beauftragte Leistungsphase ist das eine Ablehnung.', 'fehler'); return;
          }
          if (phasenFelder.length) daten.phasen = phasen;

          const positionen = [
            ...positionsFelder.filter((x) => x.an.eingabe.checked).map((x) => ({
              ...x.pos, betrag: zahlLesen(x.betrag.eingabe.value) ?? x.pos.betrag })),
            ...zusatz.map((z) => ({ art: 'pauschal', bezeichnung: z.bez.eingabe.value.trim(),
              betrag: zahlLesen(z.bet.eingabe.value) || 0 }))
              .filter((z) => z.bezeichnung && z.betrag),
          ];
          if (positionen.length) daten.positionen = positionen;
        }

        const { vertrag: neu } = await annahmeVermerken(beleg.id, daten);
        melden(neu && neu.version > (vertrag?.version || 0)
          ? `Vermerkt. Neuer Vertragsstand Version ${neu.version} mit dem beauftragten Umfang.`
          : 'Antwort vermerkt.');
        neuZeichnen();
      } catch (f) { melden(f.message, 'fehler'); }
    },
  }, 'Antwort vermerken')));

  wurzel.append(el('h2', { text: 'Antwort des Auftraggebers' }), karte);
}

/**
 * Zahlungen einer Rechnung.
 *
 * Neben der freien Erfassung steht ein Knopf fuer den Regelfall: Der Betrag kam
 * vollstaendig. Ihn jedes Mal abzutippen ist die haeufigste Handlung der App und
 * war bisher die umstaendlichste.
 */
async function zahlungsBlock(wurzel, beleg, neuZeichnen) {
  const offen = Math.round(((beleg.brutto || 0) - (beleg.gezahlt || 0)) * 100) / 100;
  const karte = el('div', { class: 'karte' },
    el('dl', { class: 'werte' },
      wzeile('Gestellt', eurZeigen(beleg.brutto || 0)),
      wzeile('Gezahlt', eurZeigen(beleg.gezahlt || 0)),
      wzeile('Offen', eurZeigen(offen), true),
    ));

  for (const z of beleg.zahlungen || []) {
    karte.append(el('p', { class: 'klein', text:
      `${eurZeigen(z.betrag)} am ${isoNachDe(z.datum)}`
      + (z.art === 'skonto' ? ' — gewährtes Skonto' : '') }));
  }

  if (Math.abs(offen) > 0.005) {
    // Der Zahlbetrag ist mit dem offenen Betrag vorbelegt: Der Regelfall ist,
    // dass alles kommt — dann genuegt ein Druck. Kommt weniger, wird die Zahl
    // ueberschrieben. Zwei Knoepfe fuer "voll" und "teilweise" waren eine
    // Unterscheidung, die es an der Kasse nicht gibt.
    const datumF = feld({ label: 'Zahlungseingang am', art: 'date', wert: heuteIso() });
    const betragF = feld({
      label: 'Zahlbetrag', art: 'geld', einheit: '€', wert: zahlZeigen(Math.abs(offen)),
      hinweis: 'Weicht der Betrag ab, bleibt die Differenz offen und fließt in den '
        + 'Zahlbetrag der nächsten Rechnung dieses Projekts ein.',
    });
    const knoepfe = el('div', { class: 'knopfreihe' },
      el('button', {
        class: 'knopf',
        onclick: async () => {
          const b = zahlLesen(betragF.eingabe.value);
          if (!b) { melden('Zahlbetrag fehlt.', 'fehler'); return; }
          await zahlungErfassen(beleg.id, b, datumF.eingabe.value || heuteIso());
          const rest = Math.round((offen - b) * 100) / 100;
          melden(Math.abs(rest) < 0.005
            ? 'Vollständig bezahlt.'
            : `Erfasst. Offen bleiben ${eurZeigen(rest)} — sie werden auf der nächsten `
              + 'Rechnung dieses Projekts ausgewiesen.');
          neuZeichnen();
        },
      }, 'Zahlung erfassen'));

    // Skonto abschliessen: Der Auftraggeber hat fristgerecht gezahlt und den
    // Abzug genommen. Der Rest ist dann kein Aussenstand, sondern der gewaehrte
    // Nachlass — und die Umsatzsteuer darauf ist zu berichtigen.
    if (beleg.skontoProzent > 0) {
      knoepfe.append(el('button', {
        class: 'knopf zweit',
        onclick: async () => {
          const ust = beleg.ustSatz || 0;
          const netto = Math.round((offen / (1 + ust)) * 100) / 100;
          if (!await bestaetigen(`${eurZeigen(offen)} als Skonto abschließen?`,
            `Der Restbetrag wird als gewährtes Skonto verbucht, nicht als Zahlung. `
            + `Für die Umsatzsteuer-Voranmeldung: Das Entgelt mindert sich um `
            + `${eurZeigen(netto)}, die Umsatzsteuer um ${eurZeigen(offen - netto)} `
            + `(§ 17 Abs. 1 UStG, im Zeitpunkt der Zahlung).`)) return;
          const { skontoGewaehren } = await import('../vorgang.js');
          await skontoGewaehren(beleg.id, offen, datumF.eingabe.value || heuteIso());
          melden('Skonto verbucht. Die Rechnung ist abgeschlossen.');
          neuZeichnen();
        },
      }, 'Rest ist Skonto'));
    }
    karte.append(el('div', { class: 'feldreihe' }, datumF, betragF), knoepfe);
  } else {
    karte.append(el('p', { class: 'klein', text: 'Vollständig bezahlt.' }));
  }

  wurzel.append(el('h2', { text: 'Zahlungen' }), karte);
}

/**
 * Anlagen: das unterschriebene Original und was sonst zum Beleg gehoert.
 *
 * Die Datei liegt in der Datenbank des Geraets — nicht im Beleg selbst, denn ein
 * Scan wiegt Megabyte und der Beleg wird bei jeder Ansicht gelesen.
 */
async function anlagenBlock(wurzel, beleg, neuZeichnen) {
  const liste = await anlagenZuBeleg(beleg.id);
  const karte = el('div', { class: 'karte' });

  if (!liste.length) {
    karte.append(el('p', { class: 'klein', text: IST_ANGEBOT(beleg.art)
      ? 'Das vom Auftraggeber unterschriebene Blatt gehört hierher — im Streitfall ist es der Beweis, was vereinbart wurde.'
      : 'Hier lässt sich ablegen, was zum Beleg gehört: Zahlungsnachweis, Schriftwechsel, Prüfvermerk.' }));
  }

  for (const a of liste) {
    karte.append(el('div', { class: 'eintrag' },
      el('div', { class: 'haupt' },
        el('div', { class: 'titel', text: a.name }),
        el('div', { class: 'neben', text:
          `${groesseZeigen(a.groesse)} · abgelegt ${isoNachDe((a.angelegt || '').slice(0, 10))}` })),
      el('div', { class: 'knopfreihe' },
        el('button', {
          class: 'knopf leise',
          onclick: async () => {
            const voll = await anlageLesen(a.id);
            dateiSpeichern(voll.name, new Blob([voll.daten], { type: voll.typ }), voll.typ);
          },
        }, 'Öffnen'),
        el('button', {
          class: 'knopf leise',
          onclick: async () => {
            if (!await bestaetigen(`„${a.name}" löschen?`,
              'Die Datei wird aus der App entfernt. Das Original auf deinem Rechner bleibt.')) return;
            const { loeschen } = await import('../db.js');
            await loeschen(SPEICHER.ANLAGEN, a.id);
            melden('Anlage entfernt.');
            neuZeichnen();
          },
        }, 'Löschen'))));
  }

  karte.append(el('div', { class: 'knopfreihe' }, el('button', {
    class: 'knopf zweit',
    onclick: async () => {
      try {
        const datei = await dateiWaehlen('application/pdf,image/*');
        if (!datei) return;
        await anlageSpeichern(beleg.id, datei);
        melden(`„${datei.name}" abgelegt.`);
        neuZeichnen();
      } catch (f) { melden(f.message, 'fehler'); }
    },
  }, IST_ANGEBOT(beleg.art) ? 'Unterschriebenes Original ablegen' : 'Datei ablegen')));

  wurzel.append(el('h2', { text: 'Anlagen' }), karte);
}
