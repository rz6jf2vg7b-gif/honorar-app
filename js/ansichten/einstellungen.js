// Einstellungen: alles, was fuer jeden Beleg gleich ist.
//
// Drei Bloecke:
//   Büro     — die Pflichtangaben nach § 14 UStG und die Bankverbindung.
//   Auftritt — Wortmarke, Disziplinzeile, Akzentfarbe. Mehr ist nicht einstellbar:
//              Struktur und Satz des Belegs sind fest, damit keine Rechnung
//              entsteht, der eine Pflichtangabe fehlt.
//   Vorgaben — was der Assistent voreinstellt, damit man es nicht jedes Mal tippt.

import { el, leeren, melden, feld, zahlZeigen, dateiSpeichern, dateiLaden, bestaetigen } from '../ui.js';
import { einstellungenLesen, einstellungenSchreiben, sicherungErstellen, sicherungEinspielen } from '../db.js';
import { LEISTUNGSBILDER, HONORARSAETZE } from '../hoai/leistungsbilder.js';
import {
  ibanFormatieren, ibanPruefen, bicFormatieren, bicPruefen,
  steuernummerFormatieren, steuernummerPruefen, ustIdFormatieren, ustIdPruefen,
} from '../format.js';
import { prozent } from '../hoai/geld.js';

export async function einstellungenZeigen(wurzel) {
  const e = await einstellungenLesen();
  const f = {};

  const t = (schluessel, label, opt = {}) => {
    const [gruppe, name] = schluessel.split('.');
    f[schluessel] = feld({ label, wert: e[gruppe][name], ...opt });
    return f[schluessel];
  };
  const p = (schluessel, label, opt = {}) => {
    const [gruppe, name] = schluessel.split('.');
    f[schluessel] = feld({ label, art: 'zahl', wert: zahlZeigen(e[gruppe][name] * 100), einheit: '%', ...opt });
    return f[schluessel];
  };

  wurzel.append(
    el('h1', { text: 'Einstellungen' }),

    el('h2', { text: 'Büro' }),
    t('buero.name', 'Name des Büros'),
    el('div', { class: 'feldreihe' }, t('buero.inhaber', 'Inhaber'), t('buero.kuerzel', 'Kürzel (Bearbeiter)')),
    t('buero.funktion', 'Funktion', { platzhalter: 'z. B. M.A. Architektur · Freier Architekt' }),
    // Anschrift in Einzelfeldern — zusammengesetzte Felder laden dazu ein, Straße
    // und Hausnummer zu vertauschen; das faellt erst auf dem Beleg auf.
    el('div', { class: 'anschrift-reihe' },
      t('buero.strasse', 'Straße'),
      t('buero.hausnummer', 'Nr.')),
    el('div', { class: 'anschrift-reihe' },
      t('buero.plz', 'PLZ', { inputmode: 'numeric' }),
      t('buero.ort', 'Ort')),
    t('buero.land', 'Länderkürzel', {
      platzhalter: 'D', hinweis: 'Erscheint nur auf dem Beleg, wenn es nicht D ist.',
    }),
    el('div', { class: 'telefon-reihe' },
      t('buero.telefonLand', 'Vorwahl', { platzhalter: '+49' }),
      t('buero.telefon', 'Telefon', { platzhalter: '6236 478999-9' })),
    t('buero.mail', 'E-Mail', { art: 'email' }),
    t('buero.web', 'Web'),

    el('h2', { text: 'Bank und Steuer' }),
    t('buero.bank', 'Bank'),
    t('buero.iban', 'IBAN', {
      formatieren: ibanFormatieren, pruefen: ibanPruefen,
      platzhalter: 'DE00 0000 0000 0000 0000 00',
      attr: { autocapitalize: 'characters', spellcheck: 'false' },
    }),
    t('buero.bic', 'BIC', {
      formatieren: bicFormatieren, pruefen: bicPruefen,
      platzhalter: 'ABCDDEFFXXX',
      attr: { autocapitalize: 'characters', spellcheck: 'false' },
    }),
    el('div', { class: 'feldreihe' },
      t('buero.steuernummer', 'Steuernummer', {
        formatieren: (w) => steuernummerFormatieren(w, e.buero.steuernummerMuster || 'auto'),
        pruefen: steuernummerPruefen,
        platzhalter: '00/000/00000',
        attr: { inputmode: 'numeric' },
      }),
      t('buero.ustId', 'USt-IdNr.', {
        formatieren: ustIdFormatieren, pruefen: ustIdPruefen,
        platzhalter: 'DE000000000',
        attr: { autocapitalize: 'characters', spellcheck: 'false' },
      })),
    (f['buero.steuernummerMuster'] = feld({
      label: 'Schreibweise der Steuernummer', art: 'auswahl',
      wert: e.buero.steuernummerMuster || 'auto',
      optionen: [
        { wert: 'auto', text: 'automatisch (10 Ziffern → 00/000/00000)' },
        { wert: '2/3/5', text: '00/000/00000 — RLP, BW, Berlin, Bremen, HH, MV, NDS, SL, SN, ST, SH, TH' },
        { wert: '3/3/5', text: '000/000/00000 — Bayern, Brandenburg' },
        { wert: '3/4/4', text: '000/0000/0000 — Nordrhein-Westfalen' },
      ],
      hinweis: 'Die Schreibweise hängt vom Finanzamt des Landes ab, sie ist nicht bundeseinheitlich.',
    })),
    el('p', { class: 'hinweis', text: 'Steuernummer oder USt-IdNr. ist Pflichtangabe nach § 14 Abs. 4 Nr. 2 UStG — ohne sie ist die Rechnung nicht zum Vorsteuerabzug geeignet.' }),
    (f['buero.kleinunternehmer'] = feld({
      label: 'Besteuerung', art: 'schalter', wert: e.buero.kleinunternehmer,
      schaltertext: 'Kleinunternehmer nach § 19 UStG',
      hinweis: 'Dann darf keine Umsatzsteuer ausgewiesen werden.',
    })),

    el('h2', { text: 'Auftritt' }),
    el('p', { class: 'klein', text: 'Die Wortmarke wird aus drei Teilen gesetzt: mager, fett, mager. Für „kreativLABOR42“ also kreativ · LABOR · 42.' }),
    el('div', { class: 'feldreihe-3' },
      t('cd.wortmarkeMager', 'mager'),
      t('cd.wortmarkeFett', 'fett'),
      t('cd.wortmarkeEnde', 'mager')),
    t('cd.disziplin', 'Disziplinzeile', { platzhalter: 'ARCHITEKTUR · STADTENTWICKLUNG' }),
    t('cd.akzent', 'Akzentfarbe', { art: 'color' }),

    el('h2', { text: 'Vorgaben für neue Belege' }),
    el('div', { class: 'feldreihe' },
      (f['vorgaben.fassung'] = feld({
        label: 'HOAI-Fassung', art: 'auswahl', wert: e.vorgaben.fassung,
        optionen: [{ wert: 2021, text: 'HOAI 2021' }, { wert: 2013, text: 'HOAI 2013' }],
      })),
      (f['vorgaben.leistungsbild'] = feld({
        label: 'Leistungsbild', art: 'auswahl', wert: e.vorgaben.leistungsbild,
        optionen: Object.entries(LEISTUNGSBILDER).map(([k, lb]) => ({ wert: k, text: lb.bezeichnung })),
      }))),
    el('div', { class: 'feldreihe' },
      (f['vorgaben.honorarzone'] = feld({
        label: 'Honorarzone', art: 'auswahl', wert: e.vorgaben.honorarzone,
        optionen: [1, 2, 3, 4, 5].map((z) => ({ wert: z, text: ['I', 'II', 'III', 'IV', 'V'][z - 1] })),
      })),
      (f['vorgaben.honorarsatz'] = feld({
        label: 'Honorarsatz', art: 'auswahl', wert: e.vorgaben.honorarsatz,
        optionen: HONORARSAETZE[2021].map((s) => ({ wert: s.anteil, text: `${s.bezeichnung} (${prozent(s.anteil)})` })),
      }))),
    el('div', { class: 'feldreihe-3' },
      p('vorgaben.ustSatz', 'Umsatzsteuer'),
      p('vorgaben.nebenkostenProzent', 'Nebenkosten'),
      p('vorgaben.umbauzuschlag', 'Umbauzuschlag')),
    el('div', { class: 'feldreihe' },
      (f['vorgaben.stundensatz'] = feld({
        label: 'Stundensatz', art: 'zahl', einheit: '€', wert: zahlZeigen(e.vorgaben.stundensatz),
      })),
      (f['vorgaben.zahlungsziel'] = feld({
        label: 'Zahlungsziel', art: 'zahl', einheit: 'Tage', wert: String(e.vorgaben.zahlungsziel),
      }))),
    (f['vorgaben.nummernschema'] = feld({
      label: 'Nummernschema', wert: e.vorgaben.nummernschema,
      hinweis: 'Bausteine: {art} {projekt} {kuerzel} {jahr} {jj} {lfd} {lfd3}. '
        + 'Vorgabe {art}-{projekt}-{lfd} ergibt AR-2601-04.',
    })),
    (f['vorgaben.ablageschema'] = feld({
      label: 'Ablageschema (Dateiname)', wert: e.vorgaben.ablageschema,
      hinweis: 'Bausteine: {datum} {jahr} {projekt} {kuerzel} {nummer} {art} {empfaenger}. '
        + 'Vorgabe {datum}_{projekt}_{nummer}_{art} ergibt 20260908_1701_AR-1701-04_AR.pdf.',
    })),

    el('div', { class: 'knopfreihe fest' },
      el('button', { class: 'knopf akzent', onclick: speichern }, 'Speichern'),
    ),

    el('h2', { text: 'Sicherung' }),
    el('p', { class: 'klein', text: 'Die Daten liegen auf diesem Gerät. Eine Sicherung enthält Einstellungen, Stammdaten, Verträge und alle Belege.' }),
    el('div', { class: 'knopfreihe' },
      el('button', { class: 'knopf zweit', onclick: sichern }, 'Sicherung ablegen'),
      el('button', { class: 'knopf zweit', onclick: einspielen }, 'Sicherung einspielen'),
    ),
  );

  async function speichern() {
    const neu = {
      buero: {}, cd: {}, vorgaben: {},
    };
    for (const [schluessel, box] of Object.entries(f)) {
      const [gruppe, name] = schluessel.split('.');
      const eing = box.eingabe;
      if (eing.type === 'checkbox') neu[gruppe][name] = eing.checked;
      else if (['ustSatz', 'nebenkostenProzent', 'umbauzuschlag'].includes(name)) {
        neu[gruppe][name] = (zahlAus(eing.value) ?? 0) / 100;
      } else if (['stundensatz', 'zahlungsziel', 'honorarzone', 'fassung'].includes(name)) {
        neu[gruppe][name] = zahlAus(eing.value) ?? 0;
      } else if (name === 'honorarsatz') {
        neu[gruppe][name] = Number(eing.value);
      } else neu[gruppe][name] = eing.value;
    }
    await einstellungenSchreiben(neu);
    melden('Einstellungen gespeichert.');
  }

  async function sichern() {
    const daten = await sicherungErstellen();
    const stand = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    dateiSpeichern(`${stand}_HonorarApp_Sicherung.json`,
      JSON.stringify(daten, null, 1), 'application/json');
    melden('Sicherung abgelegt.');
  }

  async function einspielen() {
    const datei = await dateiLaden('.json');
    if (!datei) return;
    if (!await bestaetigen('Sicherung einspielen?',
      'Vorhandene Belege bleiben erhalten; gleichnamige werden überschrieben.')) return;
    try {
      const zahl = await sicherungEinspielen(JSON.parse(datei.text));
      melden(`Eingespielt: ${zahl.belege} Belege, ${zahl.projekte} Projekte, ${zahl.adressen} Adressen.`);
      setTimeout(() => location.reload(), 1200);
    } catch (fehler) {
      melden(fehler.message, 'fehler');
    }
  }
}

function zahlAus(text) {
  let t = String(text ?? '').trim().replace(/\s|€|%/g, '');
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const z = Number(t);
  return Number.isFinite(z) ? z : null;
}
