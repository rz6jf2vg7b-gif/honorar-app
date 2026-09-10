// Einstellungen: alles, was fuer jeden Beleg gleich ist.
//
// Drei Bloecke:
//   Büro     — die Pflichtangaben nach § 14 UStG und die Bankverbindung.
//   Auftritt — Wortmarke, Disziplinzeile, Akzentfarbe. Mehr ist nicht einstellbar:
//              Struktur und Satz des Belegs sind fest, damit keine Rechnung
//              entsteht, der eine Pflichtangabe fehlt.
//   Startwerte — womit ein neuer Beleg beginnt. Ausdruecklich KEINE Festlegung:
//              jeder Wert ist im Beleg aenderbar. Der frueher hier stehende
//              Titel "Vorgaben fuer neue Belege" las sich wie eine zentrale
//              Vorschrift und hat genau diesen Eindruck erweckt.

import { el, anfuegen, leeren, melden, feld, farbfeld, bildLaden, zahlZeigen, dateiSpeichern, dateiLaden, bestaetigen } from '../ui.js';
import { einstellungenLesen, einstellungenSchreiben, sicherungErstellen, sicherungEinspielen } from '../db.js';
import { LEISTUNGSBILDER, HONORARSAETZE } from '../hoai/leistungsbilder.js';
import { SCHRIFTEN } from '../beleg/cd.js';
import {
  ibanFormatieren, ibanPruefen, bicFormatieren, bicPruefen,
  steuernummerFormatieren, steuernummerPruefen, ustIdFormatieren, ustIdPruefen,
} from '../format.js';
import { prozent } from '../hoai/geld.js';
import * as ms from '../sync/microsoft.js';
import { dateiPfadAnzeige } from '../sync/onedrive.js';

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
    el('div', { class: 'reihe-strasse' },
      t('buero.strasse', 'Straße'),
      t('buero.hausnummer', 'Nr.')),
    el('div', { class: 'reihe-plzort' },
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

    el('h2', { text: 'Berufsangaben' }),
    el('p', { class: 'klein', text: 'Pflichtangaben für das Impressum (§ 5 DDG) und die Dienstleisterinformation '
      + '(§ 2 DL-InfoV). Sie erscheinen nicht auf dem Beleg, sondern unter Rechtliches.' }),
    el('div', { class: 'feldreihe' },
      t('buero.berufsbezeichnung', 'Berufsbezeichnung', { platzhalter: 'Architekt' }),
      t('buero.verleihenderStaat', 'Verliehen in', { platzhalter: 'Bundesrepublik Deutschland' })),
    t('buero.kammer', 'Zuständige Kammer', { platzhalter: 'Architektenkammer Rheinland-Pfalz' }),
    el('div', { class: 'feldreihe' },
      t('buero.kammerAnschrift', 'Anschrift der Kammer', { platzhalter: 'Hindenburgplatz 6, 55118 Mainz' }),
      t('buero.eintragungsnummer', 'Eintragungsnummer', { platzhalter: 'Nummer in der Architektenliste' })),
    el('div', { class: 'feldreihe' },
      t('buero.kammerWeb', 'Web der Kammer', { platzhalter: 'www.diearchitekten.org' }),
      t('buero.berufsordnungWeb', 'Berufsordnung einsehbar unter', { platzhalter: 'Adresse der Berufsordnung' })),
    el('h3', { text: 'Berufshaftpflicht' }),
    el('p', { class: 'klein', text: 'Nach § 2 Abs. 1 Nr. 11 DL-InfoV mit Name, Anschrift und räumlichem Geltungsbereich anzugeben.' }),
    el('div', { class: 'feldreihe' },
      t('buero.haftpflichtVersicherer', 'Versicherer'),
      t('buero.haftpflichtAnschrift', 'Anschrift des Versicherers')),
    t('buero.haftpflichtGeltungsbereich', 'Räumlicher Geltungsbereich', { platzhalter: 'Europäische Union' }),

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

    (f['cd.akzent'] = farbfeld({
      label: 'Akzentfarbe', wert: e.cd.akzent,
      hinweis: 'Kicker, Belegnummer und Summenzeile. Als Hexwert eingebbar — die Hausfarbe steht im Styleguide, nicht im Farbkreis.',
    })),

    (f['cd.schrift'] = feld({
      label: 'Schriftart', art: 'auswahl', wert: e.cd.schrift,
      optionen: Object.entries(SCHRIFTEN).map(([k, s]) => ({ wert: k, text: s.bezeichnung })),
      hinweis: SCHRIFTEN[e.cd.schrift]?.hinweis || '',
      onAenderung: (w) => {
        const box = f['cd.schrift'];
        const h = box.querySelector('.hinweis');
        if (h) h.textContent = SCHRIFTEN[w]?.hinweis || '';
        const probe = document.getElementById('schriftprobe');
        if (probe) probe.style.fontFamily = SCHRIFTEN[w]?.familie || '';
      },
    })),
    el('div', { class: 'schriftprobe', id: 'schriftprobe',
      style: `font-family:${SCHRIFTEN[e.cd.schrift]?.familie || ''}` },
      el('div', { class: 'probe-gross', text: 'Honorarrechnung' }),
      el('div', { class: 'probe-klein', text: 'Grundhonorar nach § 35 HOAI · Leistungsphasen 1–8 · 549.363,61 €' })),
    el('p', { class: 'klein', text: 'Nur Schriften, die auf dem Gerät bereits vorhanden sind. Eine Schrift von Google Fonts nachzuladen würde bei jedem Öffnen eines Belegs die IP-Adresse des Empfängers an Google übertragen — das LG München I hat das am 20.01.2022 als DSGVO-Verstoß gewertet.' }),

    el('h3', { text: 'Logo' }),
    el('p', { class: 'klein', text: 'Ein Logo ersetzt die Wortmarke im Belegkopf. Es wird in den Beleg eingebettet und liegt nur auf diesem Gerät — nichts wird nachgeladen. PNG, SVG, JPEG oder WebP, höchstens 400 KB.' }),
    logoBlock(),

    el('h2', { text: 'Startwerte für neue Belege' }),
    el('p', { class: 'klein', text: 'Womit ein neuer Beleg beginnt — nichts davon ist festgelegt. '
      + 'Jeder Wert lässt sich beim Erstellen ändern, ohne dass sich hier etwas ändert. '
      + 'Der Sinn ist nur, das Übliche nicht jedes Mal neu einzutragen.' }),
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
        label: 'Stundensatz', art: 'geld', einheit: '€', wert: zahlZeigen(e.vorgaben.stundensatz),
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

    el('h2', { text: 'Nachschlagen' }),
    el('p', { class: 'klein', text: 'Auf dem Mac stehen diese drei auch unten in der Seitenleiste.' }),
    el('div', { class: 'knopfreihe' },
      el('button', { class: 'knopf zweit', onclick: () => { location.hash = '#hilfe'; } }, 'Hilfe'),
      el('button', { class: 'knopf zweit', onclick: () => { location.hash = '#hoai'; } }, 'HOAI'),
      el('button', { class: 'knopf zweit', onclick: () => { location.hash = '#synopse'; } }, 'Synopse'),
      el('button', { class: 'knopf zweit', onclick: () => { location.hash = '#vorlagen'; } }, 'Dokumentvorlagen'),
      el('button', { class: 'knopf zweit', onclick: () => { location.hash = '#rechtliches'; } }, 'Rechtliches'),
    ),

    el('h2', { text: 'Abgleich über OneDrive' }),
    abgleichBlock(),

    el('h2', { text: 'Sicherung' }),
    el('p', { class: 'klein', text: 'Die Daten liegen auf diesem Gerät. Eine Sicherung enthält Einstellungen, Stammdaten, Verträge und alle Belege.' }),
    el('div', { class: 'knopfreihe' },
      el('button', { class: 'knopf zweit', onclick: sichern }, 'Sicherung ablegen'),
      el('button', { class: 'knopf zweit', onclick: einspielen }, 'Sicherung einspielen'),
    ),
  );

  /**
   * Anmeldung und Abgleich mit OneDrive.
   *
   * Der Abgleich ist ausgeschaltet, solange ihn niemand einschaltet. Das ist
   * keine Vorsicht um ihrer selbst willen: Mit dem Einschalten verlaesst der
   * Datenstand dieses Geraet — mit Bankverbindung, Steuernummer,
   * Kundenanschriften und allen Betraegen. Wer das nicht will, verliert nichts;
   * die App arbeitet ohne Netz vollstaendig.
   */
  function abgleichBlock() {
    const box = el('div');

    const zeichnen = () => {
      leeren(box);
      const an = e.abgleich?.an;
      const angemeldet = ms.angemeldet();

      box.append(el('p', { class: 'klein', text:
        'Legt den Datenstand als eine Datei in deinem OneDrive ab und holt ihn auf '
        + 'jedem Gerät wieder. Sie enthält Bankverbindung, Steuernummer, '
        + 'Kundenanschriften und alle Beträge — sie gehört in kein geteiltes Verzeichnis.' }));
      box.append(el('p', { class: 'klein', text: `Ablageort: ${dateiPfadAnzeige()}` }));

      box.append(feld({
        label: '', art: 'schalter', wert: !!an, schaltertext: 'Abgleich über OneDrive nutzen',
        onAenderung: async (w) => {
          e.abgleich = { ...e.abgleich, an: w };
          await einstellungenSchreiben(e, { stempeln: false });
          zeichnen();
        },
      }));

      if (!an) return;

      if (ms.anmeldungNoetig()) {
        box.append(el('p', { class: 'hinweis fehler', text:
          'Die Anmeldung bei Microsoft ist abgelaufen. Sie hält aus technischen Gründen '
          + 'höchstens 24 Stunden; die App erneuert sie sonst still im Hintergrund.' }));
      }

      box.append(el('p', { class: 'klein', text: angemeldet
        ? `Angemeldet als ${ms.konto() || '—'}`
        : 'Noch nicht bei Microsoft angemeldet.' }));

      if (e.abgleich?.letzter) {
        box.append(el('p', { class: 'klein', text:
          `Zuletzt abgeglichen: ${new Date(e.abgleich.letzter).toLocaleString('de-DE')}` }));
      }

      const meldung = el('div');
      box.append(el('div', { class: 'knopfreihe' },
        angemeldet ? el('button', {
          class: 'knopf akzent',
          onclick: async (ev) => {
            const knopf = ev.currentTarget;
            knopf.disabled = true;
            leeren(meldung);
            try {
              const { abgleichen } = await import('../sync/abgleich.js');
              const r = await abgleichen();
              e.abgleich = { ...e.abgleich, letzter: r.letzter };
              melden(r.erster
                ? `Erster Abgleich — ${r.belege} Belege abgelegt.`
                : `Abgeglichen: ${r.hereingekommen} neu, ${r.aktualisiert} aktualisiert.`);
              if (r.konflikte.length) {
                meldung.append(el('div', { class: 'karte' },
                  el('h3', { text: 'Der Abgleich hat nichts entschieden' }),
                  el('p', { class: 'klein', text:
                    'Diese Fälle braucht ein Mensch. Der Stand dieses Geräts blieb unverändert.' }),
                  el('ul', { class: 'liste' }, ...r.konflikte.map((k) => el('li', {},
                    el('div', { class: 'eintrag' }, el('div', { class: 'haupt' },
                      el('div', { class: 'titel', text: k.nummer || k.id }),
                      el('div', { class: 'neben', text: k.text }))))),
                  ),
                ));
              }
              zeichnen();
            } catch (fehler) {
              meldung.append(el('p', { class: 'hinweis fehler', text: fehler.message }));
              knopf.disabled = false;
            }
          },
        }, 'Jetzt abgleichen') : el('button', {
          class: 'knopf akzent', onclick: () => ms.anmelden(),
        }, 'Bei Microsoft anmelden'),
        angemeldet ? el('button', {
          class: 'knopf leise',
          onclick: async () => {
            if (!await bestaetigen('Von Microsoft abmelden?',
              'Die Daten auf diesem Gerät bleiben unverändert. Der Abgleich ruht, bis du '
              + 'dich wieder anmeldest.')) return;
            ms.abmelden();
            zeichnen();
          },
        }, 'Abmelden') : null,
      ), meldung);
    };

    zeichnen();
    return box;
  }

  /**
   * Zeigt das hinterlegte Logo und erlaubt Austausch und Entfernen.
   *
   * Das Bild wird als Data-URL in den Einstellungen gehalten. 400 KB sind die
   * Grenze: Darueber blaeht es jede Sicherung und jeden Beleg auf, und ein
   * Briefkopflogo braucht nicht mehr.
   */
  function logoBlock() {
    const box = el('div', { class: 'logoblock' });
    const zeichnen = () => {
      leeren(box);
      const hat = !!e.cd.logo;
      anfuegen(box,
        el('div', { class: `logovorschau ${hat ? '' : 'leer'}` },
          hat ? el('img', { src: e.cd.logo, alt: 'Hinterlegtes Logo' })
            : el('span', { class: 'klein', text: 'Kein Logo — der Belegkopf nutzt die Wortmarke.' })),
        el('div', { class: 'knopfreihe' },
          el('button', { class: 'knopf zweit', type: 'button', onclick: waehlen },
            hat ? 'Logo austauschen' : 'Logo hochladen'),
          hat ? el('button', { class: 'knopf leise', type: 'button', onclick: entfernen }, 'Entfernen') : null,
        ),
        hat && e.cd.logoName
          ? el('p', { class: 'klein mono', text: `${e.cd.logoName} · ${Math.round(e.cd.logo.length / 1366)} KB` })
          : null,
      );
    };
    async function waehlen() {
      const d = await bildLaden();
      if (!d) return;
      if (d.groesse > 400 * 1024) {
        melden(`Das Bild ist ${Math.round(d.groesse / 1024)} KB groß — höchstens 400 KB.`, 'fehler');
        return;
      }
      e.cd.logo = d.datenUrl;
      e.cd.logoName = d.name;
      zeichnen();
      melden('Logo übernommen — noch nicht gespeichert.');
    }
    async function entfernen() {
      if (!await bestaetigen('Logo entfernen?', 'Der Belegkopf nutzt danach wieder die Wortmarke.')) return;
      e.cd.logo = ''; e.cd.logoName = '';
      zeichnen();
    }
    zeichnen();
    return box;
  }

  async function speichern() {
    // Alles uebernehmen, was hier gar nicht bearbeitet wird, und nur die drei
    // Gruppen neu aus den Feldern aufbauen.
    //
    // Bis zum 09.09.2026 stand hier `{ buero:{}, cd:{}, vorgaben:{} }` — damit
    // loeschte jedes Speichern der Einstellungen stillschweigend die eigene
    // Bewertung der Teilleistungen, die im Rechner eingetragen wird. Sie steht
    // in derselben Einstellungsdatei, kommt aber in keinem Feld dieser Ansicht
    // vor. Mit dem OneDrive-Abgleich waere derselbe Fehler auch dem Zustand des
    // Abgleichs passiert.
    const neu = {
      ...e,
      buero: {}, cd: {}, vorgaben: {},
    };
    // Logo und Logoname haengen an keinem Eingabefeld, sondern am Block darueber.
    neu.cd.logo = e.cd.logo || '';
    neu.cd.logoName = e.cd.logoName || '';
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
