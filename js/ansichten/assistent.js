// Geführte Erstellung von Angebot, Nachtrag und Rechnung.
//
// Ein Schritt je Bildschirm, weil die App auf dem Telefon bedienbar sein muss.
// Die Schrittfolge haengt von der Belegart ab: Ein Angebot braucht keinen
// Leistungsstand, eine Rechnung ohne Vertrag kann es nicht geben.
//
// Durchgehend sichtbar: die Summe. Wer eine Kostengruppe aendert, sieht sofort,
// was das mit dem Honorar macht — das ist der eigentliche Gewinn gegenueber
// einem Formular, das erst am Ende rechnet.

import {
  el, feld, leeren, melden, suchauswahl, eurZeigen, zahlLesen, zahlZeigen,
  heuteIso, isoNachDe, bestaetigen,
} from '../ui.js';
import { SPEICHER, alle, schreiben, neueId, einstellungenLesen, kontaktSuchtext, projektSuchtext, personName } from '../db.js';
import {
  BELEGART, BELEGART_TEXT, IST_RECHNUNG,
  nummerVorschlagen, nummerFrei, aktuellerVertrag, vertraegeZuProjekt,
  vertragAnlegen, belegRechnen, belegSpeichern, belegFestschreiben,
  ermittlungAusVertrag,
} from '../vorgang.js';
import { LEISTUNGSBILDER } from '../hoai/leistungsbilder.js';
import { vertragsformular } from './vertragsformular.js';
import { prozent } from '../hoai/geld.js';

export async function assistentZeigen(wurzel, vorgabe = {}) {
  const einst = await einstellungenLesen();
  const projekte = await alle(SPEICHER.PROJEKTE);
  const adressen = await alle(SPEICHER.ADRESSEN);

  const entwurf = {
    id: null,
    art: vorgabe.art || BELEGART.ABSCHLAG,
    projektId: vorgabe.projektId || null,
    adresseId: null,
    vertragId: null,
    datum: heuteIso(),
    datumDe: isoNachDe(heuteIso()),
    nummer: '',
    ustSatz: einst.vorgaben.ustSatz,
    kumulativ: true,
    zahlungsstandZeigen: false,
    zahlungsstandVerrechnen: false,
    einbehaltBrutto: 0,
    einbehaltText: '',
    leistungszeitraum: '',
    leistungsdatum: '',
    anrede: '',
    anschreiben: '',
    // Angebot und Nachtrag
    bindefrist: '',
    grundleistungenZeigen: true,
    leistungsstand: {},
  };

  let vertragEntwurf = null;      // Vertragsdaten, solange nicht gespeichert
  let vertragBestand = null;      // vorhandener Vertrag aus der Datenbank
  let schritt = 0;
  let formular = null;

  // Belegarten, bei denen die Art des Honorars offen ist. Abschlags-,
  // Teilschluss- und Schlussrechnung rechnen kumulativ gegen den Vertragsstand
  // — dort ist die HOAI-Ermittlung nicht wählbar, sondern zwingend.
  const HONORARART_WAEHLBAR = [BELEGART.ANGEBOT, BELEGART.NACHTRAG, BELEGART.EINZEL];

  const schritte = () => {
    const s = ['art', 'projekt', 'empfaenger'];
    if (HONORARART_WAEHLBAR.includes(entwurf.art)) s.push('honorarart');
    if (entwurf.honorarart === 'positionen') {
      s.push('positionen');
    } else {
      s.push('vertrag');
      if (IST_RECHNUNG(entwurf.art)) s.push('stand');
    }
    s.push('beleg', 'pruefen');
    return s;
  };

  const projektVon = () => projekte.find((p) => p.id === entwurf.projektId) || null;
  const adresseVon = () => adressen.find((a) => a.id === entwurf.adresseId) || null;
  const vertragDaten = () => vertragEntwurf || vertragBestand;

  // ————————————————————————————————————————————————————
  function zeichnen() {
    leeren(wurzel);
    const namen = schritte();
    const name = namen[schritt];

    wurzel.append(
      el('div', { class: 'schrittkopf' },
        el('span', { class: 'kicker', text: `Schritt ${schritt + 1} von ${namen.length}` }),
        el('button', {
          class: 'knopf leise', type: 'button', style: 'min-height:34px;padding:0 12px;',
          onclick: abbrechen,
        }, 'Abbrechen'),
      ),
      el('div', { class: 'schrittleiste' },
        ...namen.map((_, i) => el('span', { class: i < schritt ? 'erledigt' : (i === schritt ? 'aktiv' : '') })),
      ),
    );

    const inhalt = el('div');
    wurzel.append(inhalt);

    ({
      art: schrittArt, projekt: schrittProjekt, empfaenger: schrittEmpfaenger,
      honorarart: schrittHonorarart,
      vertrag: schrittVertrag, stand: schrittStand, positionen: schrittPositionen,
      beleg: schrittBeleg, pruefen: schrittPruefen,
    })[name](inhalt);
  }

  async function abbrechen() {
    if (await bestaetigen('Erstellung abbrechen?', 'Nicht gespeicherte Eingaben gehen verloren.')) {
      location.hash = '#dashboard';
    }
  }

  const weiterLeiste = (weiterText, weiterFn, weiterAktiv = true) => el('div', { class: 'knopfreihe fest' },
    schritt > 0 ? el('button', {
      class: 'knopf zweit', type: 'button', onclick: () => { schritt--; zeichnen(); },
    }, 'Zurück') : null,
    el('button', {
      class: 'knopf akzent', type: 'button', disabled: !weiterAktiv,
      onclick: weiterFn || (() => { schritt++; zeichnen(); }),
    }, weiterText || 'Weiter'),
  );

  // ── 1 Belegart ───────────────────────────────────────
  function schrittArt(box) {
    box.append(el('h1', { text: 'Was soll erstellt werden?' }));
    const liste = el('ul', { class: 'liste' });
    const arten = [
      [BELEGART.ANGEBOT, 'Honorarangebot — nach HOAI, als Pauschale oder nach Zeit'],
      [BELEGART.NACHTRAG, 'Änderung des Vertragsstands, z. B. geänderte anrechenbare Kosten'],
      [BELEGART.ABSCHLAG, 'Kumulativ auf den Vertragsstand, zieht bisherige Rechnungen ab'],
      [BELEGART.TEILSCHLUSS, 'Schließt einen Teil der Leistung endgültig ab'],
      [BELEGART.SCHLUSS, 'Schließt das Projekt ab'],
      [BELEGART.EINZEL, 'Ohne Vertragsbezug — Zeithonorar, Zusatzleistung, Pauschale'],
    ];
    for (const [art, beschreibung] of arten) {
      liste.append(el('li', {}, el('button', {
        class: 'eintrag', type: 'button',
        onclick: () => {
          entwurf.art = art;
          entwurf.kumulativ = art !== BELEGART.EINZEL;
          // Einzelrechnungen stehen für sich, alles andere folgt zunächst der HOAI.
          entwurf.honorarart = art === BELEGART.EINZEL ? 'positionen' : 'hoai';
          schritt++; zeichnen();
        },
      },
        el('div', { class: 'haupt' },
          el('div', { class: 'titel', text: BELEGART_TEXT[art] }),
          el('div', { class: 'neben', text: beschreibung }),
        ),
        el('div', { class: 'mono klein', text: art }),
      )));
    }
    box.append(liste);
  }

  // ── 2 Projekt ────────────────────────────────────────
  function schrittProjekt(box) {
    box.append(el('h1', { text: 'Projekt' }));
    const gewaehlt = projektVon();
    const anzeige = el('div');

    const zeigen = () => {
      leeren(anzeige);
      const p = projektVon();
      if (p) {
        anzeige.append(el('div', { class: 'karte gefuellt' },
          el('div', { class: 'kicker', text: `Projekt ${p.nummer}${p.kuerzel ? ` · ${p.kuerzel}` : ''}` }),
          el('h3', { text: p.name }),
          el('button', {
            class: 'knopf leise', type: 'button',
            onclick: () => { entwurf.projektId = null; entwurf.vertragId = null; vertragBestand = null; zeigen(); },
          }, 'Anderes Projekt'),
        ));
        box.querySelector('.knopfreihe.fest button.akzent')?.removeAttribute('disabled');
      } else {
        // Abgerechnete Projekte stehen nicht zur Wahl: Wer eine Rechnung
        // schreibt, meint ein laufendes. Sie bleiben über die Projektliste
        // erreichbar, wo sich der Haken auch wieder lösen lässt.
        const waehlbar = projekte.filter((p) => !p.abgerechnet);
        anzeige.append(suchauswahl({
          label: 'Projekt suchen',
          leerHinweis: projekte.length > waehlbar.length
            ? 'Kein Treffer. Abgerechnete Projekte werden hier nicht angeboten.'
            : 'Kein Treffer.',
          eintraege: [...waehlbar].sort((a, b) => (b.aktiv === true) - (a.aktiv === true)
            || String(a.nummer).localeCompare(String(b.nummer))),
          textVon: (p) => p.name,
          nebenVon: (p) => `${p.nummer}${p.kuerzel ? ` · ${p.kuerzel}` : ''}${p.aktiv ? ' · aktiv' : ''}`,
          suchtextVon: projektSuchtext,
          leerHinweis: projekte.length ? 'Kein Treffer.' : 'Noch keine Projekte — aus untermStrich laden oder neu anlegen.',
          onWahl: async (p) => {
            entwurf.projektId = p.id;
            // Am Projekt hinterlegter Auftraggeber wird übernommen — er ist in
            // aller Regel auch der Rechnungsempfänger. Änderbar bleibt er im
            // nächsten Schritt.
            if (p.auftraggeberId && !entwurf.adresseId) entwurf.adresseId = p.auftraggeberId;
            vertragBestand = await aktuellerVertrag(p.id);
            zeigen();
          },
          onNeu: (suche) => projektAnlegen(suche, zeigen),
        }));
      }
    };
    zeigen();
    box.append(anzeige, weiterLeiste('Weiter', null, !!gewaehlt || !!entwurf.projektId));

    // Knopf-Zustand nachziehen, wenn erst jetzt gewaehlt wird
    const beobachter = new MutationObserver(() => {
      const k = box.querySelector('.knopfreihe.fest button.akzent');
      if (k) k.disabled = !entwurf.projektId;
    });
    beobachter.observe(anzeige, { childList: true, subtree: true });
  }

  function projektAnlegen(vorschlag, danach) {
    const nummerF = feld({ label: 'Projektnummer', wert: '', platzhalter: 'z. B. 2601' });
    const nameF = feld({ label: 'Projektname', wert: vorschlag || '' });
    const kuerzelF = feld({ label: 'Kürzel (optional)', wert: '', platzhalter: 'z. B. WHS' });
    const dlg = el('dialog', { class: 'karte', style: 'max-width:460px;width:92%;' },
      el('h3', { text: 'Projekt anlegen' }), nummerF, nameF, kuerzelF,
      el('div', { class: 'knopfreihe' },
        el('button', { class: 'knopf zweit', type: 'button', onclick: () => dlg.close() }, 'Abbrechen'),
        el('button', {
          class: 'knopf', type: 'button',
          onclick: async () => {
            const name = nameF.eingabe.value.trim();
            if (!name) { melden('Der Projektname fehlt.', 'fehler'); return; }
            const p = {
              id: neueId('p'), nummer: nummerF.eingabe.value.trim() || '—',
              name, kuerzel: kuerzelF.eingabe.value.trim(), aktiv: true, quelle: 'eigen',
            };
            await schreiben(SPEICHER.PROJEKTE, p);
            projekte.push(p);
            entwurf.projektId = p.id;
            vertragBestand = null;
            dlg.close(); danach(); melden('Projekt angelegt.');
          },
        }, 'Anlegen'),
      ),
    );
    document.body.append(dlg);
    dlg.addEventListener('close', () => dlg.remove());
    dlg.showModal();
  }

  // ── 3 Empfänger ──────────────────────────────────────
  function schrittEmpfaenger(box) {
    box.append(el('h1', { text: 'Empfänger' }));
    const anzeige = el('div');
    const zeigen = () => {
      leeren(anzeige);
      const a = adresseVon();
      if (a) {
        anzeige.append(el('div', { class: 'karte gefuellt' },
          el('h3', { text: a.name }),
          el('div', { class: 'klein', text: [a.zusatz, a.strasse, `${a.plz || ''} ${a.ort || ''}`.trim()].filter(Boolean).join(' · ') }),
          el('button', {
            class: 'knopf leise', type: 'button',
            onclick: () => { entwurf.adresseId = null; zeigen(); },
          }, 'Anderer Empfänger'),
        ));
      } else {
        anzeige.append(suchauswahl({
          label: 'Empfänger suchen',
          eintraege: adressen,
          textVon: (a) => a.name,
          nebenVon: (a) => [personName(a), a.zusatz, `${a.plz || ''} ${a.ort || ''}`.trim()]
            .filter(Boolean).join(' · '),
          suchtextVon: kontaktSuchtext,
          leerHinweis: adressen.length ? 'Kein Treffer.' : 'Noch keine Adressen — aus untermStrich laden oder neu anlegen.',
          onWahl: (a) => { entwurf.adresseId = a.id; zeigen(); },
          onNeu: (suche) => adresseAnlegen(suche, zeigen),
        }));
      }
      const k = box.querySelector('.knopfreihe.fest button.akzent');
      if (k) k.disabled = !entwurf.adresseId;
    };
    zeigen();
    box.append(anzeige, weiterLeiste('Weiter', null, !!entwurf.adresseId));
    const k = box.querySelector('.knopfreihe.fest button.akzent');
    if (k) k.disabled = !entwurf.adresseId;
  }

  function adresseAnlegen(vorschlag, danach) {
    const f = {
      name: feld({ label: 'Name / Firma', wert: vorschlag || '' }),
      zusatz: feld({ label: 'Zusatz / z. Hd.', wert: '' }),
      strasse: feld({ label: 'Straße', wert: '' }),
      plz: feld({ label: 'PLZ', wert: '' }),
      ort: feld({ label: 'Ort', wert: '' }),
      mail: feld({ label: 'E-Mail', wert: '', art: 'email' }),
    };
    const dlg = el('dialog', { class: 'karte', style: 'max-width:460px;width:92%;' },
      el('h3', { text: 'Empfänger anlegen' }),
      f.name, f.zusatz, f.strasse,
      el('div', { class: 'feldreihe' }, f.plz, f.ort),
      f.mail,
      el('div', { class: 'knopfreihe' },
        el('button', { class: 'knopf zweit', type: 'button', onclick: () => dlg.close() }, 'Abbrechen'),
        el('button', {
          class: 'knopf', type: 'button',
          onclick: async () => {
            const name = f.name.eingabe.value.trim();
            if (!name) { melden('Der Name fehlt.', 'fehler'); return; }
            const a = {
              id: neueId('a'), name, quelle: 'eigen',
              zusatz: f.zusatz.eingabe.value.trim(),
              strasse: f.strasse.eingabe.value.trim(),
              plz: f.plz.eingabe.value.trim(),
              ort: f.ort.eingabe.value.trim(),
              mail: f.mail.eingabe.value.trim(),
            };
            await schreiben(SPEICHER.ADRESSEN, a);
            adressen.push(a);
            entwurf.adresseId = a.id;
            dlg.close(); danach(); melden('Empfänger angelegt.');
          },
        }, 'Anlegen'),
      ),
    );
    document.body.append(dlg);
    dlg.addEventListener('close', () => dlg.remove());
    dlg.showModal();
  }

  // ── 4 Vertrag ────────────────────────────────────────
  async function schrittVertrag(box) {
    const vorhanden = await vertraegeZuProjekt(entwurf.projektId);
    const istNachtrag = entwurf.art === BELEGART.NACHTRAG;
    // Wer über Positionen rechnet, kommt hier gar nicht mehr vorbei — die
    // Schrittfolge führt direkt zu den Positionen. Der Zweig bleibt als
    // Rückfall, falls ein alter Entwurf ohne honorarart geladen wird.
    const istEinzel = entwurf.honorarart === 'positionen';

    box.append(el('h1', {
      text: istNachtrag ? 'Neuer Vertragsstand' : (vorhanden.length ? 'Vertragsstand' : 'Vertragsdaten erfassen'),
    }));

    if (istEinzel) {
      box.append(el('p', { class: 'unterzeile', text: 'Bei Pauschale oder Zeithonorar gibt es keinen Vertragsstand. Die Positionen werden im nächsten Schritt erfasst.' }));
      box.append(weiterLeiste('Weiter'));
      return;
    }

    if (vorhanden.length && !istNachtrag && !vertragEntwurf) {
      vertragBestand = vorhanden[vorhanden.length - 1];
      box.append(el('div', { class: 'karte gefuellt' },
        el('div', { class: 'kicker', text: `Version ${vertragBestand.version} · ${vertragBestand.grund}` }),
        el('div', { class: 'klein', text: `gültig ab ${isoNachDe(vertragBestand.gueltigAb)}` }),
        el('div', { class: 'knopfreihe' },
          el('button', {
            class: 'knopf zweit', type: 'button',
            onclick: () => { vertragEntwurf = JSON.parse(JSON.stringify(vertragBestand)); zeichnen(); },
          }, 'Ansehen und ändern'),
        ),
      ));
      const zwischen = el('div');
      box.append(zwischen);
      zwischenstandZeigen(zwischen, vertragBestand);
      box.append(weiterLeiste('Weiter'));
      return;
    }

    const vorlage = istNachtrag ? (vorhanden[vorhanden.length - 1] || null) : (vertragEntwurf || vorhanden[vorhanden.length - 1] || null);
    if (istNachtrag && vorlage) {
      box.append(el('p', { class: 'unterzeile', text: `Grundlage ist Version ${vorlage.version}. Die Änderungen erzeugen eine neue Version; bereits gestellte Rechnungen bleiben unberührt.` }));
    }

    const zwischen = el('div', { class: 'karte gefuellt' });
    formular = vertragsformular({
      vertrag: vorlage,
      vorgaben: einst.vorgaben,
      onAenderung: (daten) => { vertragEntwurf = daten; zwischenstandZeigen(zwischen, daten); },
    });
    vertragEntwurf = formular.lesen();
    zwischenstandZeigen(zwischen, vertragEntwurf);

    const grundF = istNachtrag
      ? feld({ label: 'Grund des Nachtrags', wert: '', platzhalter: 'z. B. Anpassung KG 400 nach Kostenberechnung' })
      : null;

    box.append(zwischen, formular, grundF || '', weiterLeiste('Weiter', () => {
      vertragEntwurf = formular.lesen();
      if (grundF) vertragEntwurf.grund = grundF.eingabe.value.trim();
      schritt++; zeichnen();
    }));
  }

  /** Kleine Dauerauskunft: was ergibt der aktuelle Stand? */
  function zwischenstandZeigen(box, vertrag) {
    leeren(box);
    try {
      const e = rechnenStill(vertrag);
      if (!e) return;
      box.append(el('dl', { class: 'werte' },
        zeile('Anrechenbare Kosten', eurZeigen(e.anrechenbareKosten)),
        zeile('Grundhonorar für 100 %', eurZeigen(e.grundhonorar100)),
        zeile('Beauftragte Leistungen', eurZeigen(e.grundleistungenVereinbart)),
        ...e.zuschlaege.map((z) => zeile(`${z.bezeichnung} (${prozent(z.prozent)})`, eurZeigen(z.betrag))),
        e.nebenkosten ? zeile('Nebenkosten', eurZeigen(e.nebenkosten)) : null,
        zeile('Netto', eurZeigen(e.netto), true),
      ));
    } catch (fehler) {
      box.append(el('div', { class: 'hinweis warnung', text: fehler.message }));
    }
  }

  function rechnenStill(vertrag) {
    if (!vertrag?.kostenermittlung?.gruppen?.length) return null;
    if (!vertrag.phasen?.length) return null;
    // Volle Beauftragung annehmen — der Leistungsstand kommt erst im naechsten Schritt.
    return ermittlungAusVertrag(vertrag, null);
  }

  const zeile = (bez, wert, summe = false) => el('div', { class: summe ? 'summe' : '' },
    el('dt', { text: bez }), el('dd', { text: wert }));

  // ── 5 Leistungsstand ─────────────────────────────────
  function schrittStand(box) {
    const vertrag = vertragDaten();
    box.append(
      el('h1', { text: 'Leistungsstand' }),
      el('p', { class: 'unterzeile', text: 'Wie viel der beauftragten Leistung ist zum Stichtag erbracht? Die Rechnung ergibt sich daraus abzüglich der bisherigen Rechnungen.' }),
    );
    if (!vertrag?.phasen?.length) {
      box.append(el('div', { class: 'hinweis warnung', text: 'Kein Vertragsstand vorhanden.' }), weiterLeiste('Weiter'));
      return;
    }

    const lb = LEISTUNGSBILDER[vertrag.leistungsbild];
    const tab = el('table', { class: 'lphtabelle' },
      el('thead', {}, el('tr', {},
        el('th', { text: '' }), el('th', { text: 'Leistungsphase' }),
        el('th', { class: 'num', text: 'beauftragt' }), el('th', { class: 'num', text: 'erbracht %' }),
      )),
    );
    const koerper = el('tbody');
    for (const p of vertrag.phasen) {
      if (entwurf.leistungsstand[p.nr] === undefined) entwurf.leistungsstand[p.nr] = 1;
      const eingabe = el('input', {
        type: 'text', inputmode: 'decimal',
        value: zahlZeigen(entwurf.leistungsstand[p.nr] * 100),
        'aria-label': `Leistungsphase ${p.nr} erbracht in Prozent`,
      });
      eingabe.addEventListener('input', () => {
        const w = (zahlLesen(eingabe.value) ?? 0) / 100;
        entwurf.leistungsstand[p.nr] = Math.max(0, Math.min(1, w));
      });
      koerper.append(el('tr', {},
        el('td', { class: 'nr', text: String(p.nr) }),
        el('td', { class: 'bez' }, el('span', { text: lb.namen[p.nr] })),
        el('td', { class: 'num klein', text: prozent(p.vereinbart, 2) }),
        el('td', { class: 'num' }, eingabe),
      ));
    }
    tab.append(koerper);

    box.append(
      tab,
      el('div', { class: 'knopfreihe' },
        el('button', {
          class: 'knopf leise', type: 'button',
          onclick: () => { for (const p of vertrag.phasen) entwurf.leistungsstand[p.nr] = 1; zeichnen(); },
        }, 'Alle vollständig'),
        el('button', {
          class: 'knopf leise', type: 'button',
          onclick: () => { for (const p of vertrag.phasen) entwurf.leistungsstand[p.nr] = 0; zeichnen(); },
        }, 'Alle auf null'),
      ),
      weiterLeiste('Weiter'),
    );
  }

  // ── Honorarart ───────────────────────────────────────
  // Die HOAI schreibt die Honorarermittlung nicht in jedem Fall vor: Für
  // Leistungen außerhalb ihres Anwendungsbereichs (§ 1) und für Besondere
  // Leistungen ist das Honorar frei vereinbar, und seit 2021 gilt das auch für
  // Grundleistungen — die Tafelwerte sind Orientierungswerte (§ 2a, § 7).
  // Ein Angebot über eine Pauschale ist damit kein Sonderfall, sondern Alltag.
  function schrittHonorarart(box) {
    const istAngebot = entwurf.art === BELEGART.ANGEBOT;
    box.append(
      el('h1', { text: 'Wie wird das Honorar ermittelt?' }),
      el('p', { class: 'unterzeile', text: istAngebot
        ? 'Bestimmt, was im Angebot steht: die vollständige Herleitung nach HOAI oder eine Aufstellung von Positionen.'
        : 'Bestimmt, wie der Betrag zustande kommt.' }),
    );

    const arten = [
      ['hoai', 'Nach HOAI ermitteln',
        'Anrechenbare Kosten, Honorarzone, Leistungsphasen — die Herleitung steht vollständig auf dem Beleg.'],
      ['positionen', 'Pauschale oder Zeithonorar',
        'Frei vereinbarte Positionen: ein Pauschalbetrag, Stunden mal Satz, oder beides nebeneinander.'],
    ];

    const liste = el('ul', { class: 'liste' });
    for (const [wert, titel, beschreibung] of arten) {
      liste.append(el('li', {}, el('button', {
        class: 'eintrag', type: 'button',
        onclick: () => {
          entwurf.honorarart = wert;
          // Der jeweils andere Weg wird geräumt, damit nicht ein alter
          // Vertragsentwurf mitläuft, während Positionen gerechnet werden.
          if (wert === 'positionen') vertragEntwurf = null;
          else entwurf.positionen = [];
          schritt++; zeichnen();
        },
      },
        el('div', { class: 'haupt' },
          el('div', { class: 'titel', text: titel }),
          el('div', { class: 'neben', text: beschreibung })),
        entwurf.honorarart === wert ? el('span', { class: 'marke aktiv', text: 'gewählt' }) : null,
        el('span', { class: 'pfeil', text: '›' }),
      )));
    }
    box.append(liste, weiterLeiste('Weiter'));
  }

  // ── Positionen (Pauschale und Zeithonorar) ───────────
  function schrittPositionen(box) {
    if (!entwurf.positionen) entwurf.positionen = [];
    box.append(
      el('h1', { text: 'Positionen' }),
      el('p', { class: 'unterzeile', text: entwurf.art === BELEGART.ANGEBOT
        ? 'Was angeboten wird: Pauschalbeträge, Zeithonorar oder beides nebeneinander.'
        : 'Frei vereinbarte Positionen — Zeithonorar, Pauschalen oder Besondere Leistungen.' }),
      feld({
        label: 'Bezeichnung der Leistung', wert: entwurf.leistungsbezeichnung || '',
        platzhalter: 'z. B. Zusatzleistung Wasserschaden',
        onEingabe: (w) => { entwurf.leistungsbezeichnung = w; },
      }),
    );

    const liste = el('div');
    const summeZeile = el('div', { class: 'karte gefuellt' });

    const summe = () => {
      const s = entwurf.positionen.reduce((a, p) => a
        + (p.art === 'zeit' ? (p.stunden || 0) * (p.satz || 0) : (p.betrag || 0)), 0);
      leeren(summeZeile);
      summeZeile.append(el('dl', { class: 'werte' },
        el('div', { class: 'summe' }, el('dt', { text: 'Summe netto' }), el('dd', { text: eurZeigen(s) }))));
    };

    const zeichnenPos = () => {
      leeren(liste);
      entwurf.positionen.forEach((p, i) => {
        const artF = feld({
          label: `Position ${i + 1}`, art: 'auswahl', wert: p.art,
          optionen: [
            { wert: 'pauschal', text: 'Pauschalbetrag' },
            { wert: 'zeit', text: 'Zeithonorar (Stunden × Satz)' },
          ],
          onAenderung: (w) => { p.art = w; zeichnenPos(); summe(); },
        });
        const bezF = feld({
          wert: p.bezeichnung || '', platzhalter: 'Beschreibung der Leistung',
          onEingabe: (w) => { p.bezeichnung = w; },
        });
        const zahlenF = p.art === 'zeit'
          ? el('div', { class: 'feldreihe' },
            feld({
              label: 'Stunden', art: 'zahl', wert: p.stunden ? zahlZeigen(p.stunden) : '',
              onEingabe: (w) => { p.stunden = w ?? 0; summe(); },
            }),
            feld({
              label: 'Stundensatz', art: 'zahl', einheit: '€', wert: zahlZeigen(p.satz ?? einst.vorgaben.stundensatz),
              onEingabe: (w) => { p.satz = w ?? 0; summe(); },
            }))
          : feld({
            label: 'Betrag', art: 'zahl', einheit: '€ netto', wert: p.betrag ? zahlZeigen(p.betrag) : '',
            onEingabe: (w) => { p.betrag = w ?? 0; summe(); },
          });

        liste.append(el('div', { class: 'karte' }, artF, bezF, zahlenF,
          el('div', { class: 'knopfreihe' }, el('button', {
            class: 'knopf leise', type: 'button',
            onclick: () => { entwurf.positionen.splice(i, 1); zeichnenPos(); summe(); },
          }, 'Position entfernen'))));
      });
      if (!entwurf.positionen.length) {
        liste.append(el('div', { class: 'leer' }, el('p', { class: 'klein', text: 'Noch keine Position.' })));
      }
    };
    zeichnenPos(); summe();

    box.append(liste,
      el('div', { class: 'knopfreihe' }, el('button', {
        class: 'knopf zweit', type: 'button',
        onclick: () => {
          entwurf.positionen.push({ art: 'pauschal', bezeichnung: '', betrag: 0, satz: einst.vorgaben.stundensatz });
          zeichnenPos(); summe();
        },
      }, 'Position hinzufügen')),
      summeZeile,
      weiterLeiste('Weiter', () => {
        if (!entwurf.positionen.length) { melden('Mindestens eine Position erfassen.', 'fehler'); return; }
        schritt++; zeichnen();
      }));
  }

  // ── 6 Belegdaten ─────────────────────────────────────
  async function schrittBeleg(box) {
    const projekt = projektVon();
    if (!entwurf.nummer) {
      entwurf.nummer = await nummerVorschlagen({
        art: entwurf.art, projekt, schema: einst.vorgaben.nummernschema, datum: entwurf.datum,
      });
    }

    box.append(el('h1', { text: 'Belegdaten' }));

    const nummerF = feld({
      label: 'Belegnummer', wert: entwurf.nummer,
      hinweis: 'Vorschlag nach dem Schema aus den Einstellungen — änderbar.',
      onEingabe: async (w) => {
        entwurf.nummer = w.trim();
        const frei = await nummerFrei(entwurf.nummer, entwurf.id);
        const h = nummerF.querySelector('.hinweis');
        h.textContent = frei ? 'Vorschlag nach dem Schema aus den Einstellungen — änderbar.'
          : 'Diese Nummer ist im Bestand bereits vergeben.';
        h.className = `hinweis ${frei ? '' : 'fehler'}`;
      },
    });

    const datumF = feld({
      label: 'Belegdatum', art: 'date', wert: entwurf.datum,
      onAenderung: (w) => { entwurf.datum = w; entwurf.datumDe = isoNachDe(w); },
    });

    const zeitraumF = feld({
      label: 'Leistungszeitraum', wert: entwurf.leistungszeitraum,
      platzhalter: 'z. B. bis 07.09.2026',
      hinweis: 'Pflichtangabe nach § 14 Abs. 4 Nr. 6 UStG.',
      onEingabe: (w) => { entwurf.leistungszeitraum = w; },
    });

    // Die E-Rechnung braucht ein Datum, keinen Satz: BT-72 ist ein Datumsfeld.
    // Der Freitext oben bleibt trotzdem — er steht auf dem Blatt und darf mehr
    // sagen als ein Stichtag ("bis 07.09.2026, LPh 1 bis 5").
    const leistungsdatumF = feld({
      label: 'Leistungsdatum', art: 'date', wert: entwurf.leistungsdatum || entwurf.datum,
      hinweis: 'Tag, an dem die abgerechnete Leistung erbracht war. Wird für die E-Rechnung gebraucht.',
      onAenderung: (w) => { entwurf.leistungsdatum = w; },
    });

    const ustF = feld({
      label: 'Umsatzsteuer', art: 'zahl', einheit: '%', wert: zahlZeigen(entwurf.ustSatz * 100),
      onEingabe: (w) => { entwurf.ustSatz = (w ?? 0) / 100; },
    });

    const anredeF = feld({
      label: 'Anrede', wert: entwurf.anrede, platzhalter: 'Sehr geehrte Damen und Herren,',
      onEingabe: (w) => { entwurf.anrede = w; },
    });
    const textF = feld({
      label: 'Anschreiben', art: 'mehrzeilig', wert: entwurf.anschreiben,
      platzhalter: 'anbei erhalten Sie …',
      onEingabe: (w) => { entwurf.anschreiben = w; },
    });

    box.append(
      el('div', { class: 'feldreihe' }, nummerF, datumF),
      el('div', { class: 'feldreihe' }, zeitraumF, leistungsdatumF),
      ustF, anredeF, textF,
    );

    // ── Angebot und Nachtrag ───────────────────────────
    // Ohne Annahmefrist gilt § 147 Abs. 2 BGB: das Angebot erlischt, sobald die
    // Antwort "unter regelmäßigen Umständen" nicht mehr zu erwarten ist — wann
    // das ist, weiß niemand. Eine gesetzte Frist beendet den Streit darüber,
    // deshalb steht hier ein Vorschlag statt eines leeren Feldes.
    if (!IST_RECHNUNG(entwurf.art)) {
      const istNachtrag = entwurf.art === BELEGART.NACHTRAG;
      if (!entwurf.bindefrist) entwurf.bindefrist = tagePlus(entwurf.datum, 30);

      const bindeF = feld({
        label: istNachtrag ? 'Nachtragsangebot bindend bis' : 'Angebot bindend bis',
        art: 'date', wert: entwurf.bindefrist,
        hinweis: 'Bis zu diesem Tag ist das Angebot bindend (§ 148 BGB). Leer lassen heißt: '
          + 'keine Frist bestimmt, dann gilt § 147 Abs. 2 BGB.',
        onAenderung: (w) => { entwurf.bindefrist = w; },
      });

      const glF = feld({
        label: 'Grundleistungen abdrucken', art: 'auswahl',
        wert: entwurf.grundleistungenZeigen ? 'ja' : 'nein',
        optionen: [
          { wert: 'ja', text: 'ja — Wortlaut der Anlagen je Leistungsphase' },
          { wert: 'nein', text: 'nein — nur die Leistungsphasen mit ihrer Bewertung' },
        ],
        hinweis: 'Der Wortlaut macht das Angebot länger, aber prüfbar: Es steht dann fest, '
          + 'welche Leistung geschuldet ist und welche nicht.',
        onAenderung: (w) => { entwurf.grundleistungenZeigen = w === 'ja'; },
      });

      box.append(el('h2', { text: istNachtrag ? 'Nachtrag' : 'Angebot' }), bindeF, glF);
    }

    if (IST_RECHNUNG(entwurf.art)) {
      const einbehaltF = feld({
        label: 'Rechnungseinbehalt', art: 'zahl', einheit: '€ brutto',
        wert: entwurf.einbehaltBrutto ? zahlZeigen(entwurf.einbehaltBrutto) : '',
        hinweis: 'Brutto vereinbart, netto abgezogen — sonst stimmt der Steuerausweis nicht.',
        onEingabe: (w) => { entwurf.einbehaltBrutto = w ?? 0; },
      });
      const einbehaltTextF = feld({
        label: 'Grund des Einbehalts', wert: entwurf.einbehaltText,
        platzhalter: 'z. B. aus LPh 8 bis Mängelbeseitigung',
        onEingabe: (w) => { entwurf.einbehaltText = w; },
      });
      const kumulativF = feld({
        label: 'Abrechnungsart', art: 'auswahl', wert: entwurf.kumulativ ? 'ja' : 'nein',
        optionen: [
          { wert: 'ja', text: 'Kumulativ — bisherige Rechnungen werden abgezogen' },
          { wert: 'nein', text: 'Einzeln — nur diese Leistung' },
        ],
        onAenderung: (w) => { entwurf.kumulativ = w === 'ja'; },
      });
      const zahlungF = feld({
        label: 'Zahlungsstand', art: 'auswahl',
        wert: entwurf.zahlungsstandZeigen ? (entwurf.zahlungsstandVerrechnen ? 'verrechnen' : 'zeigen') : 'aus',
        optionen: [
          { wert: 'aus', text: 'nicht ausweisen' },
          { wert: 'zeigen', text: 'offene Posten anzeigen' },
          { wert: 'verrechnen', text: 'offene Posten anzeigen und verrechnen' },
        ],
        hinweis: 'Verrechnen heißt: Über- und Unterzahlungen früherer Rechnungen fließen in den Zahlbetrag ein.',
        onAenderung: (w) => {
          entwurf.zahlungsstandZeigen = w !== 'aus';
          entwurf.zahlungsstandVerrechnen = w === 'verrechnen';
        },
      });
      box.append(el('h2', { text: 'Abrechnung' }), kumulativF, einbehaltF, einbehaltTextF, zahlungF);
    }

    box.append(weiterLeiste('Weiter', async () => {
      if (!entwurf.nummer) { melden('Die Belegnummer fehlt.', 'fehler'); return; }
      if (!await nummerFrei(entwurf.nummer, entwurf.id)) {
        melden('Diese Belegnummer ist bereits vergeben.', 'fehler'); return;
      }
      schritt++; zeichnen();
    }));
  }

  // ── 7 Prüfen und speichern ───────────────────────────
  async function schrittPruefen(box) {
    box.append(el('h1', { text: 'Prüfen' }));
    const vertrag = vertragDaten();

    let ergebnis;
    try {
      ergebnis = await belegRechnen({ ...entwurf }, vertrag || leererVertrag());
    } catch (f) {
      box.append(el('div', { class: 'karte' },
        el('h3', { text: 'Die Rechnung lässt sich noch nicht erstellen' }),
        el('p', { class: 'hinweis fehler', text: f.message }),
      ), weiterLeiste('Zurück', () => { schritt--; zeichnen(); }));
      return;
    }

    const a = ergebnis.abrechnung;
    box.append(el('div', { class: 'karte gefuellt' },
      el('dl', { class: 'werte' },
        zeile('Leistungen netto', eurZeigen(a.summeLeistungen)),
        a.einbehaltNetto ? zeile('Einbehalt netto', eurZeigen(-a.einbehaltNetto)) : null,
        a.summeAbzug ? zeile('Abzug bisheriger Rechnungen', eurZeigen(-a.summeAbzug)) : null,
        zeile('Rechnungsbetrag netto', eurZeigen(a.rechnungsbetragNetto)),
        zeile(`Umsatzsteuer ${prozent(a.ustSatz)}`, eurZeigen(a.ust)),
        zeile('Betrag zur Zahlung', eurZeigen(a.zahlbetrag), true),
      ),
    ));

    if (ergebnis.abzuege.length) {
      box.append(el('h2', { text: 'Abgezogene Rechnungen' }),
        el('ul', { class: 'liste' }, ...ergebnis.abzuege.map((b) => el('li', {},
          el('div', { class: 'eintrag' },
            el('div', { class: 'haupt' },
              el('div', { class: 'titel', text: `${BELEGART_TEXT[b.art]} ${b.nummer}` }),
              el('div', { class: 'neben', text: b.datum || '' })),
            el('div', { class: 'betrag', text: eurZeigen(-b.netto) }),
          )))));
    }

    box.append(el('div', { class: 'knopfreihe fest' },
      el('button', { class: 'knopf zweit', type: 'button', onclick: () => { schritt--; zeichnen(); } }, 'Zurück'),
      el('button', {
        class: 'knopf', type: 'button',
        onclick: () => sichern(false),
      }, 'Als Entwurf sichern'),
      el('button', {
        class: 'knopf akzent', type: 'button',
        onclick: () => sichern(true),
      }, 'Festschreiben'),
    ));
  }

  async function sichern(festschreiben) {
    try {
      // Bei freien Positionen darf der Beleg auch keinen *vorhandenen* Vertrag
      // des Projekts mitnehmen. Sonst standen auf einem Pauschalangebot die
      // Honorarzone, der Honorarsatz und die Version eines HOAI-Vertrags, der
      // mit diesem Angebot nichts zu tun hat (gefunden am 09.09.2026).
      let vertrag = entwurf.honorarart === 'positionen' ? null : vertragBestand;
      // Vertragsdaten speichern, wenn neu oder geaendert
      // Kein Vertragsstand, wenn über Positionen gerechnet wird: Ein Angebot
      // über eine Pauschale legt keinen HOAI-Vertragsstand an, gegen den später
      // Abschläge liefen — das wäre ein Vertrag, den es nie gab.
      if (vertragEntwurf && entwurf.honorarart !== 'positionen') {
        const gleich = vertragBestand && JSON.stringify(vergleichbar(vertragBestand)) === JSON.stringify(vergleichbar(vertragEntwurf));
        if (!gleich) {
          vertrag = await vertragAnlegen({
            projektId: entwurf.projektId,
            daten: vertragEntwurf,
            grund: vertragEntwurf.grund || (entwurf.art === BELEGART.NACHTRAG ? 'Nachtrag' : 'Auftrag'),
            gueltigAb: entwurf.datum,
          });
        }
      }
      if (!vertrag && entwurf.honorarart !== 'positionen') vertrag = leererVertrag();

      entwurf.vertragId = vertrag?.id || null;
      let beleg = await belegSpeichern({ ...entwurf });
      if (festschreiben) beleg = await belegFestschreiben(beleg, vertrag);

      melden(festschreiben ? 'Beleg festgeschrieben.' : 'Als Entwurf gesichert.');
      location.hash = `#beleg/${beleg.id}`;
    } catch (f) {
      melden(f.message, 'fehler');
    }
  }

  const vergleichbar = (v) => ({
    fassung: v.fassung, leistungsbild: v.leistungsbild, kostenermittlung: v.kostenermittlung,
    honorarzone: v.honorarzone, honorarsatz: v.honorarsatz, phasen: v.phasen,
    zuschlaege: v.zuschlaege, nebenkosten: v.nebenkosten,
  });

  const leererVertrag = () => ({
    fassung: einst.vorgaben.fassung, leistungsbild: 'gebaeude',
    kostenermittlung: { gruppen: [] }, honorarzone: 3, honorarsatz: 0.5, phasen: [],
  });

  zeichnen();
}

/** Datum plus Tage, beides als ISO. Fuer den Vorschlag der Bindefrist. */
function tagePlus(iso, tage) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + tage);
  return d.toISOString().slice(0, 10);
}
