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

import { el, leeren, melden, eurZeigen, feld, zahlLesen, isoNachDe, bestaetigen, dateiSpeichern } from '../ui.js';
import { SPEICHER, lesen, alle, einstellungenLesen, anschriftZeilen, telefonZeigen, personName } from '../db.js';
import {
  BELEGART_TEXT, IST_RECHNUNG, STATUS, belegRechnen, belegFestschreiben,
  belegStornieren, zahlungErfassen,
} from '../vorgang.js';
import { rechnungHtml } from '../beleg/rechnung_html.js';
import { CD_KREATIVLABOR42, SCHRIFTEN } from '../beleg/cd.js';
import { pruefePflichtangaben } from '../beleg/pflichtangaben.js';
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

  const belegdaten = () => ({
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
    verweise: verweiseAus(vertrag),
  });

  const html = () => rechnungHtml(belegdaten());

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
  const pflicht = pruefePflichtangaben(belegdaten());
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
    ));

  // ── Zahlungen ────────────────────────────────────────
  if (IST_RECHNUNG(beleg.art) && beleg.status === STATUS.FEST) {
    const offen = (beleg.brutto || 0) - (beleg.gezahlt || 0);
    const box = el('div', { class: 'karte' },
      el('dl', { class: 'werte' },
        zeile('Gestellt', eurZeigen(beleg.brutto || 0)),
        zeile('Gezahlt', eurZeigen(beleg.gezahlt || 0)),
        zeile('Offen', eurZeigen(offen), true),
      ),
    );
    const betragF = feld({ label: 'Zahlungseingang', art: 'zahl', einheit: '€', wert: '' });
    const datumF = feld({ label: 'am', art: 'date', wert: new Date().toISOString().slice(0, 10) });
    box.append(el('div', { class: 'feldreihe' }, betragF, datumF),
      el('div', { class: 'knopfreihe' }, el('button', {
        class: 'knopf zweit',
        onclick: async () => {
          const b = zahlLesen(betragF.eingabe.value);
          if (!b) { melden('Betrag fehlt.', 'fehler'); return; }
          await zahlungErfassen(beleg.id, b, datumF.eingabe.value);
          melden('Zahlung erfasst.');
          location.reload();
        },
      }, 'Erfassen')));
    wurzel.append(el('h2', { text: 'Zahlungen' }), box);
  }

  // ── Vorschau ─────────────────────────────────────────
  wurzel.append(el('h2', { text: 'Blattvorschau' }));
  const rahmen = el('iframe', { title: 'Blattvorschau', sandbox: 'allow-same-origin' });
  wurzel.append(el('div', { class: 'vorschau' }, rahmen));
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
  if (beleg.status === STATUS.FEST) {
    reihe.append(el('button', {
      class: 'knopf leise',
      onclick: async () => {
        if (!await bestaetigen('Beleg stornieren?',
          'Es entsteht eine Stornorechnung mit umgekehrtem Vorzeichen. Der Beleg selbst bleibt erhalten.')) return;
        const s = await belegStornieren(beleg, '');
        melden('Storno angelegt.');
        location.hash = `#beleg/${s.id}`;
      },
    }, 'Stornieren'));
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

function verweiseAus(vertrag) {
  if (!vertrag) return [];
  const v = [];
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
    `Betrag zur Zahlung: ${eurZeigen(abrechnung.zahlbetrag)}`,
    '',
    'Mit freundlichen Grüßen',
  ].join('\n');
  const url = `mailto:${encodeURIComponent(adresse?.mail || '')}`
    + `?subject=${encodeURIComponent(betreff)}&body=${encodeURIComponent(koerper)}`;
  window.location.href = url;
  melden('Mailentwurf geöffnet — die gesicherte Datei bitte selbst anhängen.', '');
}
