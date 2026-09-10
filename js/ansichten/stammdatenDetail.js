// Einzelansicht eines Projekts oder Empfaengers.
//
// Warum eine eigene Ansicht und kein Dialog: Ein Projekt ist mehr als seine vier
// Stammfelder. Interessant ist, was daran haengt — welche Belege gestellt wurden,
// welcher Vertragsstand gilt, was noch offen ist. Das passt in keinen Dialog und
// soll auf dem Telefon genauso lesbar sein wie am Schreibtisch.
//
// Bearbeitet wird von hier aus; die Formulare liegen weiter in stammdaten.js,
// damit es nur eine Stelle gibt, an der ein Datensatz geschrieben wird.

import {
  el, leeren, eurZeigen, isoNachDe, heuteIso, melden, bestaetigen, zurueck,
  feld, suchauswahl, zahlLesen,
} from '../ui.js';
import { SPEICHER, lesen, alle, loeschen, schreiben, personName, kontaktSuchtext } from '../db.js';
import { projektStand } from './stammdaten.js';
import {
  BELEGART, BELEGART_TEXT, IST_RECHNUNG, STATUS, vertraegeZuProjekt, belegUebernehmen,
  belegBrutto,
} from '../vorgang.js';
import { LEISTUNGSBILDER, ZONE_ROEMISCH } from '../hoai/leistungsbilder.js';
import { runde2, prozent } from '../hoai/geld.js';

const zeile = (bez, wert, summe = false) => (wert === null || wert === undefined || wert === ''
  ? null
  : el('div', { class: summe ? 'summe' : '' }, el('dt', { text: bez }), el('dd', { text: String(wert) })));

const kopf = (kicker, titel, unterzeile, rueckfall = '#projekte') => [
  el('div', { class: 'schrittkopf' },
    el('span', { class: 'kicker', text: kicker }),
    el('button', {
      class: 'knopf leise', type: 'button', style: 'min-height:34px;padding:0 12px;',
      onclick: () => zurueck(rueckfall),
    }, 'Zurück'),
  ),
  el('h1', { text: titel }),
  unterzeile ? el('p', { class: 'unterzeile', text: unterzeile }) : null,
];

// ————————————————————————————————————————————————————————————————
// Projekt
// ————————————————————————————————————————————————————————————————

export async function projektAnsehen(wurzel, projektId) {
  const projekt = await lesen(SPEICHER.PROJEKTE, projektId);
  if (!projekt) {
    wurzel.append(el('div', { class: 'leer' }, el('p', { text: 'Dieses Projekt wurde nicht gefunden.' })));
    return;
  }

  const [belege, vertraege, adressen] = await Promise.all([
    alle(SPEICHER.BELEGE),
    vertraegeZuProjekt(projektId),
    alle(SPEICHER.ADRESSEN),
  ]);
  const eigene = belege
    .filter((b) => b.projektId === projektId)
    .sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));

  const stand = projektStand(projekt);
  wurzel.append(...kopf(
    `Projekt ${projekt.nummer}${projekt.kuerzel ? ` · ${projekt.kuerzel}` : ''}`,
    projekt.name,
    [stand.text || 'ohne Stand',
      projekt.ort,
      projekt.quelle === 'untermstrich' ? 'aus untermStrich' : 'selbst angelegt'].filter(Boolean).join(' · '),
    '#projekte',
  ));

  // ── Stand ────────────────────────────────────────────
  // Die beiden Haken liegen bewusst oben: Sie sind das, was man beim Öffnen
  // eines Projekts am häufigsten setzen will.
  const standBox = el('div', { class: 'standreihe' });
  const setzen = async (feldName, wert) => {
    projekt[feldName] = wert;
    await schreiben(SPEICHER.PROJEKTE, projekt);
    melden(wert ? 'Gesetzt.' : 'Zurückgenommen.');
    leeren(wurzel);
    await projektAnsehen(wurzel, projektId);
  };
  standBox.append(
    feld({
      label: '', art: 'schalter', wert: !!projekt.abgeschlossen,
      schaltertext: 'Leistung abgeschlossen',
      onEingabe: (w) => setzen('abgeschlossen', w),
    }),
    feld({
      label: '', art: 'schalter', wert: !!projekt.abgerechnet,
      schaltertext: 'vollständig abgerechnet',
      onEingabe: (w) => setzen('abgerechnet', w),
    }),
  );
  wurzel.append(standBox,
    el('p', { class: 'klein', text: 'Abgerechnete Projekte werden in der Projektliste und bei der Belegerstellung ausgeblendet. '
      + '„Aktiv“ kommt dagegen aus untermStrich (Feld „Projekt aktiv“) und lässt sich nur dort ändern.' }));

  // ── Kennzahlen ───────────────────────────────────────
  const rechnungen = eigene.filter((b) => IST_RECHNUNG(b.art) && b.status === STATUS.FEST);
  const gestellt = runde2(rechnungen.reduce((s, b) => s + (b.brutto || 0), 0));
  const gezahlt = runde2(rechnungen.reduce((s, b) => s + (b.gezahlt || 0), 0));
  const offen = runde2(gestellt - gezahlt);

  wurzel.append(el('div', { class: 'karte gefuellt' }, el('dl', { class: 'werte' },
    zeile('Belege insgesamt', String(eigene.length)),
    zeile('davon festgeschriebene Rechnungen', String(rechnungen.length)),
    zeile('Gestellt (brutto)', eurZeigen(gestellt)),
    zeile('Gezahlt', eurZeigen(gezahlt)),
    zeile('Offen', eurZeigen(offen), true),
  )));

  // ── Stammdaten ───────────────────────────────────────
  // ── Auftraggeber ─────────────────────────────────────
  // untermStrich führt über die REST-Schnittstelle keine Projektbeteiligten;
  // die Zuordnung entsteht deshalb hier und bleibt beim erneuten Einspielen
  // erhalten.
  const auftraggeber = projekt.auftraggeberId
    ? adressen.find((a) => a.id === projekt.auftraggeberId)
    : null;

  wurzel.append(el('h2', { text: 'Auftraggeber' }));
  if (auftraggeber) {
    wurzel.append(
      el('ul', { class: 'liste' }, el('li', {},
        el('button', { class: 'eintrag', type: 'button',
          onclick: () => { location.hash = `#adresse/${auftraggeber.id}`; } },
          el('div', { class: 'haupt' },
            el('div', { class: 'titel', text: auftraggeber.name }),
            el('div', { class: 'neben', text: [personName(auftraggeber), auftraggeber.zusatz,
              `${auftraggeber.plz || ''} ${auftraggeber.ort || ''}`.trim()].filter(Boolean).join(' · ') })),
          el('span', { class: 'pfeil', text: '›' }),
        ))),
      el('div', { class: 'knopfreihe' },
        el('button', { class: 'knopf leise', type: 'button', onclick: () => auftraggeberWaehlen() }, 'Anderen wählen'),
        el('button', { class: 'knopf leise', type: 'button',
          onclick: async () => { projekt.auftraggeberId = ''; await schreiben(SPEICHER.PROJEKTE, projekt);
            leeren(wurzel); await projektAnsehen(wurzel, projektId); } }, 'Zuordnung lösen'),
      ),
    );
  } else {
    wurzel.append(
      el('div', { class: 'leer' }, el('p', { class: 'klein',
        text: 'Kein Auftraggeber zugeordnet. Er wird beim Anlegen eines Belegs vorgeschlagen.' })),
      el('div', { class: 'knopfreihe' },
        el('button', { class: 'knopf zweit', type: 'button', onclick: () => auftraggeberWaehlen() }, 'Auftraggeber zuordnen')),
    );
  }

  function auftraggeberWaehlen() {
    const dlg = el('dialog', { class: 'karte dialog', style: 'max-width:520px;width:92%;' },
      el('h3', { text: 'Auftraggeber zuordnen' }),
      el('div', { class: 'dialoginhalt' }, suchauswahl({
        label: 'Kontakt suchen',
        platzhalter: 'Name, Ansprechpartner, Ort …',
        eintraege: adressen,
        textVon: (a) => a.name,
        nebenVon: (a) => [personName(a), a.zusatz, `${a.plz || ''} ${a.ort || ''}`.trim()]
          .filter(Boolean).join(' · '),
        suchtextVon: kontaktSuchtext,
        onWahl: async (a) => {
          projekt.auftraggeberId = a.id;
          await schreiben(SPEICHER.PROJEKTE, projekt);
          dlg.close();
          melden('Auftraggeber zugeordnet.');
          leeren(wurzel);
          await projektAnsehen(wurzel, projektId);
        },
      })),
      el('div', { class: 'knopfreihe' },
        el('button', { class: 'knopf zweit', type: 'button', onclick: () => dlg.close() }, 'Abbrechen')),
    );
    document.body.append(dlg);
    dlg.addEventListener('close', () => dlg.remove());
    dlg.showModal();
  }

  // ── Stammdaten ───────────────────────────────────────
  wurzel.append(el('h2', { text: 'Stammdaten' }),
    el('dl', { class: 'werte' },
      zeile('Projektnummer', projekt.nummer),
      zeile('Kürzel', projekt.kuerzel
        + (projekt.kuerzelAusUstrich ? '' : ' (abgeleitet, in untermStrich nicht gepflegt)')),
      zeile('Bezeichnung', projekt.name),
      zeile('Ort', projekt.ort),
      zeile('Landkreis', projekt.landkreis),
      zeile('Bundesland', projekt.bundesland),
      zeile('Baurecht', projekt.baurecht),
      zeile('Verfahren', projekt.verfahren),
      zeile('Baubehörde', projekt.baubehoerde),
      zeile('In untermStrich aktiv', projekt.quelle === 'untermstrich' ? (projekt.aktiv ? 'ja' : 'nein') : null),
      zeile('Herkunft', projekt.quelle === 'untermstrich' ? 'untermStrich' : 'eigene Eingabe'),
      zeile('Schriftverkehr-Pfad', projekt.pfadSchriftverkehr),
    ));

  // ── Unterlagen ───────────────────────────────────────
  wurzel.append(el('h2', { text: 'Unterlagen' }),
    el('p', { class: 'klein', text: 'Vertragsdatenblatt und Abnahmeprotokoll — mit den Angaben dieses Projekts.' }),
    el('div', { class: 'knopfreihe' },
      el('button', { class: 'knopf zweit', type: 'button',
        onclick: () => { location.hash = `#unterlagen/${projektId}`; } }, 'Unterlagen erzeugen')));

  // ── Vertragsstände ───────────────────────────────────
  wurzel.append(el('h2', { text: `Vertragsstände (${vertraege.length})` }));
  if (!vertraege.length) {
    wurzel.append(el('div', { class: 'leer' },
      el('p', { class: 'klein', text: 'Noch kein Vertragsstand. Er entsteht beim ersten Angebot '
        + 'oder der ersten Rechnung — oder du erfasst ihn hier zuerst.' })));
  } else {
    wurzel.append(el('ul', { class: 'liste' }, ...vertraege.slice().reverse().map((v) => {
      const lb = LEISTUNGSBILDER[v.leistungsbild];
      const anteil = (v.phasen || []).reduce((s, p) => s + (p.vereinbart || 0), 0);
      // Version 1 ist der Auftrag selbst — sie ist beauftragt, sonst gäbe es sie
      // nicht. Erst ab Version 2 ist die Beauftragung eine offene Frage: Ein
      // Nachtrag kann erstellt und übersandt sein, ohne dass der Auftraggeber
      // ihn schon erteilt hat. Das Dashboard zeigt beides getrennt an — bisher
      // gab es nur keine Stelle, an der man es setzt.
      const istNachtrag = v.version > 1;
      const beauftragt = !istNachtrag || v.beauftragt === true;

      return el('li', {}, el('div', { class: 'eintrag' },
        el('div', { class: 'haupt' },
          el('div', { class: 'titel', text: `Version ${v.version} — ${v.grund}` }),
          el('div', { class: 'neben', text: [
            `HOAI ${v.fassung}`,
            lb?.bezeichnung,
            v.honorarzone ? `Zone ${ZONE_ROEMISCH[v.honorarzone]}` : null,
            `${prozent(anteil, 2)} der Leistung`,
            v.gueltigAb ? `ab ${isoNachDe(v.gueltigAb)}` : null,
            v.beauftragtAm ? `beauftragt am ${isoNachDe(v.beauftragtAm)}` : null,
          ].filter(Boolean).join(' · ') }),
        ),
        istNachtrag
          ? feld({
            label: '', art: 'schalter', wert: beauftragt,
            schaltertext: beauftragt ? 'beauftragt' : 'zur Beauftragung',
            onEingabe: async (w) => {
              v.beauftragt = w;
              // Das Datum ist der eigentliche Wert: Ab wann gilt der geänderte
              // Vertragsstand? Ohne es bliebe im Streit offen, seit wann.
              v.beauftragtAm = w ? (v.beauftragtAm || heuteIso()) : '';
              await schreiben(SPEICHER.VERTRAEGE, v);
              melden(w ? 'Als beauftragt vermerkt.' : 'Beauftragung zurückgenommen.');
              leeren(wurzel);
              await projektAnsehen(wurzel, projektId);
            },
          })
          : el('span', { class: 'marke aktiv', text: 'Auftrag' }),
      ));
    })));
  }

  // ── Belege ───────────────────────────────────────────
  wurzel.append(el('h2', { text: `Belege (${eigene.length})` }));
  if (!eigene.length) {
    wurzel.append(el('div', { class: 'leer' }, el('p', { class: 'klein', text: 'Noch kein Beleg zu diesem Projekt.' })));
  } else {
    wurzel.append(el('ul', { class: 'liste' }, ...eigene.map((b) => {
      const empf = adressen.find((a) => a.id === b.adresseId);
      return el('li', {}, el('button', {
        class: 'eintrag', type: 'button', onclick: () => { location.hash = `#beleg/${b.id}`; },
      },
        el('div', { class: 'haupt' },
          el('div', { class: 'titel', text: `${BELEGART_TEXT[b.art] || 'Beleg'} ${b.nummer}` }),
          el('div', { class: 'neben', text: [
            b.datumDe || isoNachDe(b.datum),
            empf?.name,
            b.status === STATUS.ENTWURF ? 'Entwurf' : (b.status === STATUS.STORNIERT ? 'storniert' : null),
            b.uebernommen ? 'aus einem anderen Programm übernommen' : null,
          ].filter(Boolean).join(' · ') }),
        ),
        el('div', { class: 'betrag', text: eurZeigen(belegBrutto(b)) }),
      ));
    })));
  }

  // ── Aktionen ─────────────────────────────────────────
  wurzel.append(el('div', { class: 'knopfreihe' },
    el('button', {
      class: 'knopf akzent',
      onclick: () => { location.hash = `#neu/${projekt.id}`; },
    }, 'Beleg für dieses Projekt'),
    el('button', {
      class: 'knopf zweit',
      onclick: () => uebernahmeFormular(wurzel, projekt, adressen, () => {
        leeren(wurzel); projektAnsehen(wurzel, projektId);
      }),
    }, 'Frühere Rechnung übernehmen'),
    el('button', {
      class: 'knopf zweit',
      onclick: () => mahnungFormular(wurzel, projekt, adressen, eigene),
    }, 'Mahnung'),
    el('button', {
      class: 'knopf zweit',
      onclick: () => vertragFormular(wurzel, projekt, () => {
        leeren(wurzel); projektAnsehen(wurzel, projektId);
      }),
    }, vertraege.length ? 'Vertragsstand fortschreiben' : 'Vertragsdaten erfassen'),
    el('button', {
      class: 'knopf zweit',
      onclick: async () => {
        const { projektBearbeiten } = await import('./stammdaten.js');
        projektBearbeiten(projekt, () => location.reload());
      },
    }, 'Bearbeiten'),
  ));
}

// ————————————————————————————————————————————————————————————————
// Empfänger
// ————————————————————————————————————————————————————————————————

export async function adresseAnsehen(wurzel, adresseId) {
  const adresse = await lesen(SPEICHER.ADRESSEN, adresseId);
  if (!adresse) {
    wurzel.append(el('div', { class: 'leer' }, el('p', { text: 'Dieser Empfänger wurde nicht gefunden.' })));
    return;
  }

  const [belege, projekte] = await Promise.all([alle(SPEICHER.BELEGE), alle(SPEICHER.PROJEKTE)]);
  const eigene = belege
    .filter((b) => b.adresseId === adresseId)
    .sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));

  wurzel.append(...kopf(
    'Kontakt',
    adresse.name,
    [personName(adresse), adresse.zusatz, `${adresse.plz || ''} ${adresse.ort || ''}`.trim(),
      adresse.quelle === 'untermstrich' ? 'aus untermStrich' : 'selbst angelegt'].filter(Boolean).join(' · '),
    '#kontakte',
  ));

  if (adresse.kategorien?.length) {
    wurzel.append(el('div', { class: 'markenreihe' },
      ...adresse.kategorien.map((k) => el('span', { class: 'marke', text: k }))));
  }

  const rechnungen = eigene.filter((b) => IST_RECHNUNG(b.art) && b.status === STATUS.FEST);
  const gestellt = runde2(rechnungen.reduce((s, b) => s + (b.brutto || 0), 0));
  const gezahlt = runde2(rechnungen.reduce((s, b) => s + (b.gezahlt || 0), 0));

  if (rechnungen.length) {
    wurzel.append(el('div', { class: 'karte gefuellt' }, el('dl', { class: 'werte' },
      zeile('Rechnungen', String(rechnungen.length)),
      zeile('Gestellt (brutto)', eurZeigen(gestellt)),
      zeile('Gezahlt', eurZeigen(gezahlt)),
      zeile('Offen', eurZeigen(runde2(gestellt - gezahlt)), true),
    )));
  }

  wurzel.append(el('h2', { text: 'Anschrift und Kontakt' }),
    el('dl', { class: 'werte' },
      zeile('Name / Firma', adresse.name),
      zeile('Firmenzusatz', adresse.zusatz),
      zeile('Ansprechpartner', personName(adresse)),
      zeile('Straße', adresse.strasse),
      zeile('Zweite Adresszeile', adresse.adresszeile2),
      zeile('PLZ', adresse.plz),
      zeile('Ort', adresse.ort),
      zeile('Land', adresse.land),
      zeile('E-Mail', adresse.mail),
      zeile('Telefon', adresse.telefon),
      zeile('Weitere Nummer', adresse.telefon2),
      zeile('Mobil', adresse.mobil),
      zeile('Fax', adresse.fax),
      zeile('Web', adresse.web),
      zeile('USt-IdNr.', adresse.ustId),
      zeile('Debitorennummer', adresse.debitor),
      zeile('Leitweg-ID', adresse.leitwegId),
      zeile('Herkunft', adresse.quelle === 'untermstrich' ? 'untermStrich' : 'eigene Eingabe'),
    ));

  if (adresse.notiz) {
    wurzel.append(
      el('h2', { text: 'Interne Notiz' }),
      el('p', { class: 'fliess notiz', text: adresse.notiz }),
      el('p', { class: 'klein', text: 'Nur zum Wiederfinden — steht nie auf einem Beleg.' }),
    );
  }

  if (!adresse.leitwegId) {
    wurzel.append(el('p', { class: 'hinweis', text:
      'Ohne Leitweg-ID lässt sich an öffentliche Auftraggeber keine XRechnung stellen. '
      + 'Sie steht üblicherweise in der Auftragsbestätigung.' }));
  }

  wurzel.append(el('h2', { text: `Belege (${eigene.length})` }));
  if (!eigene.length) {
    wurzel.append(el('div', { class: 'leer' }, el('p', { class: 'klein', text: 'Noch kein Beleg an diesen Empfänger.' })));
  } else {
    wurzel.append(el('ul', { class: 'liste' }, ...eigene.map((b) => {
      const p = projekte.find((x) => x.id === b.projektId);
      return el('li', {}, el('button', {
        class: 'eintrag', type: 'button', onclick: () => { location.hash = `#beleg/${b.id}`; },
      },
        el('div', { class: 'haupt' },
          el('div', { class: 'titel', text: `${BELEGART_TEXT[b.art] || 'Beleg'} ${b.nummer}` }),
          el('div', { class: 'neben', text: [p ? `${p.nummer} ${p.name}` : null,
            b.datumDe || isoNachDe(b.datum)].filter(Boolean).join(' · ') }),
        ),
        el('div', { class: 'betrag', text: eurZeigen(belegBrutto(b)) }),
      ));
    })));
  }

  wurzel.append(el('div', { class: 'knopfreihe' },
    el('button', {
      class: 'knopf zweit',
      onclick: async () => {
        const { adresseBearbeiten } = await import('./stammdaten.js');
        adresseBearbeiten(adresse, () => location.reload());
      },
    }, 'Bearbeiten'),
    el('button', {
      class: 'knopf leise',
      onclick: async () => {
        if (eigene.length) {
          melden('Zu diesem Empfänger gibt es Belege — er lässt sich nicht entfernen.', 'fehler');
          return;
        }
        if (!await bestaetigen('Empfänger entfernen?')) return;
        await loeschen(SPEICHER.ADRESSEN, adresse.id);
        melden('Entfernt.');
        location.hash = '#stammdaten';
      },
    }, 'Entfernen'),
  ));
}

/**
 * Eine Rechnung erfassen, die in einem anderen Programm gestellt wurde.
 *
 * Gebaut fuer den Uebergang: Wurde ein Projekt ueber Jahre in einem anderen
 * Honorarprogramm abgerechnet und soll die Schlussrechnung hier entstehen,
 * fehlen der App die frueheren Abschlagsrechnungen — sie zieht dann nichts ab
 * und fordert das Gesamthonorar ein zweites Mal.
 *
 * Erfasst wird nur das Zahlenwerk, nicht der Rechenweg. Was damals gestellt
 * wurde, gilt — die App rechnet es nicht nach und erzeugt kein Blatt dafuer.
 * Das Original gehoert als Anlage an den Beleg oder in den Projektordner.
 */
function uebernahmeFormular(wurzel, projekt, adressen, fertig) {
  const dlg = el('dialog', { class: 'karte', style: 'max-width:520px;border-radius:2px;' });
  const artF = feld({
    label: 'Rechnungsart', art: 'auswahl', wert: BELEGART.ABSCHLAG,
    optionen: [
      { wert: BELEGART.ABSCHLAG, text: 'Abschlagsrechnung' },
      { wert: BELEGART.TEILSCHLUSS, text: 'Teilschlussrechnung' },
      { wert: BELEGART.SCHLUSS, text: 'Schlussrechnung' },
      { wert: BELEGART.EINZEL, text: 'Einzelrechnung' },
    ],
  });
  const nummerF = feld({ label: 'Rechnungsnummer', wert: '', platzhalter: 'wie im alten Programm' });
  const datumF = feld({ label: 'Rechnungsdatum', art: 'date', wert: '' });
  const nettoF = feld({ label: 'Nettobetrag', art: 'geld', einheit: '€', wert: '' });
  const ustF = feld({ label: 'Umsatzsteuer', art: 'zahl', einheit: '%', wert: '19' });
  const gezahltF = feld({ label: 'Davon gezahlt', art: 'geld', einheit: '€ brutto', wert: '' });
  const gezahltAmF = feld({ label: 'Gezahlt am', art: 'date', wert: '' });
  const bemerkungF = feld({ label: 'Bemerkung', wert: '', platzhalter: 'z. B. aus HOAI-Pro' });

  dlg.append(
    el('h3', { text: 'Frühere Rechnung übernehmen' }),
    el('p', { class: 'klein', text: 'Für Projekte, die in einem anderen Programm begonnen wurden. '
      + 'Die Rechnung wird nicht nachgerechnet — sie zählt mit ihrem gestellten Betrag in den '
      + 'kumulativen Abzug und in den Zahlungsstand. Ein Blatt entsteht dafür nicht.' }),
    el('div', { class: 'feldreihe' }, artF, nummerF),
    el('div', { class: 'feldreihe' }, datumF, ustF),
    nettoF,
    el('div', { class: 'feldreihe' }, gezahltF, gezahltAmF),
    bemerkungF,
    el('div', { class: 'knopfreihe' },
      el('button', { class: 'knopf zweit', onclick: () => dlg.close() }, 'Abbrechen'),
      el('button', {
        class: 'knopf',
        onclick: async () => {
          try {
            await belegUebernehmen({
              projektId: projekt.id,
              adresseId: projekt.adresseId || null,
              art: artF.eingabe.value,
              nummer: nummerF.eingabe.value.trim(),
              datum: datumF.eingabe.value,
              summeNetto: zahlLesen(nettoF.eingabe.value),
              ustSatz: (zahlLesen(ustF.eingabe.value) ?? 0) / 100,
              gezahlt: zahlLesen(gezahltF.eingabe.value) || 0,
              gezahltAm: gezahltAmF.eingabe.value || null,
              bemerkung: bemerkungF.eingabe.value.trim(),
            });
            melden('Rechnung übernommen.');
            dlg.close();
            fertig();
          } catch (f) { melden(f.message, 'fehler'); }
        },
      }, 'Übernehmen')),
  );
  document.body.append(dlg);
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
}

/**
 * Mahnung fuer die offenen Rechnungen eines Projekts.
 *
 * Am Projekt, nicht am einzelnen Beleg: Sind drei Abschlagsrechnungen offen,
 * schreibt man eine Mahnung ueber alle drei, nicht drei Briefe. Der Bauherr
 * bekommt sonst Post, die einander widerspricht.
 */
async function mahnungFormular(wurzel, projekt, adressen, belege) {
  const { faelligAm, IST_RECHNUNG: istR, STATUS: st } = await import('../vorgang.js');
  const { mahnungAufstellen, MAHNSTUFEN, BASISZINS_STAND } = await import('../beleg/mahnung.js');
  const { einstellungenLesen } = await import('../db.js');
  const einst = await einstellungenLesen();
  const ziel = Number.isFinite(einst.vorgaben?.zahlungsziel) ? einst.vorgaben.zahlungsziel : 30;

  const offene = belege
    .filter((b) => istR(b.art) && b.status === st.FEST
      && Math.abs((b.brutto || 0) - (b.gezahlt || 0)) > 0.005)
    .map((b) => ({
      beleg: b,
      nummer: b.nummer,
      datum: b.datum,
      faelligAm: faelligAm(b, ziel),
      offen: Math.round(((b.brutto || 0) - (b.gezahlt || 0)) * 100) / 100,
    }));

  if (!offene.length) {
    melden('Zu diesem Projekt ist keine Rechnung offen.');
    return;
  }

  const heute = heuteIso();
  const empf = adressen.find((a) => a.id === (offene[0].beleg.adresseId || projekt.adresseId));

  // Die naechste Stufe vorschlagen, nicht immer bei 1 anfangen: Wer schon
  // gemahnt hat, will die zweite Mahnung — und niemand merkt sich, wo er stand.
  const { letzteMahnung } = await import('../vorgang.js');
  const hoechste = offene
    .map((p) => letzteMahnung(p.beleg)?.stufe || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  const vorschlag = Math.min(hoechste + 1, MAHNSTUFEN.length);

  const stufeF = feld({
    label: 'Mahnstufe', art: 'auswahl', wert: String(vorschlag),
    optionen: MAHNSTUFEN.map((s) => ({ wert: String(s.nr), text: `${s.nr}. ${s.titel}` })),
  });
  const datumF = feld({ label: 'Datum der Mahnung', art: 'date', wert: heute });
  // Ist am Kontakt nie festgelegt worden, ob er Verbraucher ist, wird hier
  // einmal gefragt — und die Antwort bleibt am Kontakt. Eine stille Vorgabe
  // waere in beide Richtungen falsch: Zu hoch angesetzt ist die Zinsforderung
  // unberechtigt, zu niedrig verschenkt man Geld.
  const unbekannt = empf && empf.istVerbraucher === undefined;
  const verbraucherF = feld({
    label: '', art: 'schalter', wert: !!empf?.istVerbraucher,
    schaltertext: 'Empfänger ist Verbraucher (private Bauherrschaft)',
    hinweis: 'Verbraucher: 5 Prozentpunkte über dem Basiszinssatz (§ 288 Abs. 1 BGB) und '
      + 'keine 40-€-Pauschale. Sonst 9 Prozentpunkte (§ 288 Abs. 2 BGB).',
  });
  const frage = unbekannt ? el('div', { class: 'karte' },
    el('h3', { text: `Ist „${empf.name}" Verbraucher?` }),
    el('p', { class: 'klein', text: 'Das ist bei diesem Kontakt noch nicht festgelegt und '
      + 'entscheidet über den Verzugszins und die 40-€-Pauschale. Die Antwort wird am '
      + 'Kontakt gespeichert und hier nicht wieder gefragt.' })) : null;
  const pauschaleF = feld({
    label: '', art: 'schalter', wert: false,
    schaltertext: 'Verzugspauschale 40 € ansetzen (§ 288 Abs. 5 BGB)',
  });

  const auswahl = offene.map((p) => ({
    p, f: feld({
      label: '', art: 'schalter', wert: true,
      schaltertext: `${p.nummer} · ${eurZeigen(p.offen)} offen`
        + (p.faelligAm ? ` · fällig seit ${isoNachDe(p.faelligAm)}` : ' · ohne Fälligkeit'),
    }),
  }));

  // Was bisher rausging — damit man nicht zweimal dieselbe Stufe schickt.
  const historie = el('div');
  for (const p of offene) {
    for (const m of p.beleg.mahnungen || []) {
      historie.append(el('p', { class: 'klein', text:
        `${p.nummer}: ${m.stufe}. Mahnung am ${isoNachDe(m.datum)}` }));
    }
  }

  const vorschau = el('div', { class: 'karte' });
  const rechnen = () => {
    const gewaehlt = auswahl.filter((x) => x.f.eingabe.checked).map((x) => x.p);
    const m = mahnungAufstellen({
      stufe: Number(stufeF.eingabe.value),
      datum: datumF.eingabe.value || heute,
      posten: gewaehlt,
      istVerbraucher: verbraucherF.eingabe.checked,
      pauschale: pauschaleF.eingabe.checked,
    });
    leeren(vorschau);
    vorschau.append(el('dl', { class: 'werte' },
      el('div', {}, el('dt', { text: 'Hauptforderung' }), el('dd', { text: eurZeigen(m.hauptforderung) })),
      el('div', {}, el('dt', { text: 'Verzugszinsen' }), el('dd', { text: eurZeigen(m.zinsen) })),
      m.pauschale ? el('div', {}, el('dt', { text: 'Verzugspauschale' }), el('dd', { text: eurZeigen(m.pauschale) })) : null,
      el('div', { class: 'summe' }, el('dt', { text: 'Gesamtforderung' }), el('dd', { text: eurZeigen(m.gesamt) })),
    ));
    if (m.zinssatzUngeprueft) {
      vorschau.append(el('p', { class: 'hinweis warnung', text:
        `Der Basiszinssatz ist nur bis zum ${isoNachDe(BASISZINS_STAND)} gepflegt. `
        + 'Für spätere Zeiträume rechnet die App mit dem letzten bekannten Wert weiter — '
        + 'bitte bei der Bundesbank nachsehen, bevor die Mahnung rausgeht.' }));
    }
    if (gewaehlt.some((p) => !p.faelligAm)) {
      vorschau.append(el('p', { class: 'hinweis', text:
        'Auf Rechnungen ohne Fälligkeitsdatum werden keine Zinsen berechnet. '
        + 'Trage das Versanddatum am Beleg nach, wenn Zinsen gefordert werden sollen.' }));
    }
    return m;
  };

  for (const x of auswahl) x.f.eingabe.addEventListener('change', rechnen);
  for (const f of [stufeF, datumF, verbraucherF, pauschaleF]) {
    f.eingabe.addEventListener('change', rechnen);
  }

  const dlg = el('dialog', { class: 'karte', style: 'max-width:560px;width:94%;border-radius:2px;' },
    el('h3', { text: 'Mahnung' }),
    el('p', { class: 'klein', text: 'Eine Mahnung über alle offenen Rechnungen dieses Projekts. '
      + 'Verzugszinsen werden taggenau ab Fälligkeit gerechnet.' }),
    el('div', { class: 'feldreihe' }, stufeF, datumF),
    historie,
    frage,
    ...auswahl.map((x) => x.f),
    verbraucherF, pauschaleF,
    vorschau,
    el('div', { class: 'knopfreihe' },
      el('button', { class: 'knopf zweit', onclick: () => dlg.close() }, 'Abbrechen'),
      el('button', {
        class: 'knopf',
        onclick: async () => {
          const m = rechnen();
          if (!m.zeilen.length) { melden('Keine Rechnung gewählt.', 'fehler'); return; }
          const { mahnungHtml } = await import('../beleg/mahnung_html.js');
          const { cdVervollstaendigen } = await import('../beleg/cd.js');
          const { anschriftZeilen, personName } = await import('../db.js');
          const stufe = MAHNSTUFEN.find((s) => s.nr === m.stufe) || MAHNSTUFEN[0];
          const { tageDazu } = await import('../vorgang.js');
          const html = mahnungHtml({
            mahnung: m,
            buero: { ...einst.buero, ...anschriftZeilen(einst.buero) },
            empfaenger: empf ? {
              name: empf.name,
              ansprechpartner: personName(empf) ? `z. Hd. ${personName(empf)}` : '',
              strasse: empf.strasse,
              plzOrt: `${empf.plz || ''} ${empf.ort || ''}`.trim(),
            } : { name: '—' },
            projekt: { nummer: projekt.nummer, name: projekt.name },
            zahlbarBis: tageDazu(m.datum, stufe.frist),
            cd: cdVervollstaendigen(einst.cd || {}),
          });
          const w = window.open('', '_blank');
          if (!w) { melden('Der Browser hat das Fenster blockiert.', 'fehler'); return; }
          w.document.open(); w.document.write(html); w.document.close();
          setTimeout(() => { try { w.print(); } catch { /* egal */ } }, 700);

          // Die Antwort auf die Verbraucherfrage bleibt am Kontakt — beim
          // naechsten Mahnlauf soll sie nicht wieder gestellt werden.
          if (unbekannt && empf) {
            await schreiben(SPEICHER.ADRESSEN,
              { ...empf, istVerbraucher: verbraucherF.eingabe.checked });
          }

          // Erst jetzt vermerken: Was nur angesehen wurde, ist nicht verschickt.
          const { mahnungVermerken } = await import('../vorgang.js');
          await mahnungVermerken(m.zeilen.map((z) => z.beleg.id), {
            stufe: m.stufe, datum: m.datum, zinsen: m.zinsen, gesamt: m.gesamt,
          });
          melden(`${m.stufe}. Mahnung vermerkt.`);
          dlg.close();
        },
      }, 'Mahnung drucken')),
  );
  rechnen();
  document.body.append(dlg);
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
}

/**
 * Vertragsdaten am Projekt erfassen — der Weg, der nicht beim Beleg beginnt.
 *
 * Beide Reihenfolgen kommen in der Praxis vor (Steffens Entscheidung vom
 * 10.09.2026): Ein kleiner Auftrag entsteht als Angebot, und die Vertragsdaten
 * fallen dabei ab. Bei einem groesseren steht der Vertrag zuerst — Honorarzone,
 * anrechenbare Kosten und Leistungsphasen werden mit dem Bauherrn besprochen,
 * lange bevor ein Blatt gedruckt wird.
 *
 * Der so erfasste Stand ist noch nicht beauftragt: Er wird es mit der Annahme
 * des Angebots, das daraus entsteht.
 */
async function vertragFormular(wurzel, projekt, fertig) {
  const { vertragsformular } = await import('./vertragsformular.js');
  const { vertragAnlegen, aktuellerVertrag } = await import('../vorgang.js');
  const { einstellungenLesen } = await import('../db.js');
  const einst = await einstellungenLesen();
  const bestand = await aktuellerVertrag(projekt.id);

  const dlg = el('dialog', { class: 'karte', style: 'max-width:720px;width:96%;border-radius:2px;' });
  const grundF = feld({
    label: 'Anlass', wert: bestand ? 'Nachtrag' : 'Auftrag',
    platzhalter: 'z. B. geänderte Kostenberechnung',
  });
  const abF = feld({ label: 'Gültig ab', art: 'date', wert: heuteIso() });

  let daten = null;
  const formular = vertragsformular({
    vertrag: bestand ? JSON.parse(JSON.stringify(bestand)) : null,
    vorgaben: einst.vorgaben,
    onAenderung: (d) => { daten = d; },
  });
  daten = formular.lesen();

  dlg.append(
    el('h3', { text: bestand ? 'Vertragsstand fortschreiben' : 'Vertragsdaten erfassen' }),
    el('p', { class: 'klein', text: bestand
      ? `Ausgehend von Version ${bestand.version}. Der bisherige Stand bleibt unverändert erhalten.`
      : 'Der Stand gilt als noch nicht beauftragt, bis ein Angebot daraus angenommen wird.' }),
    el('div', { class: 'feldreihe' }, grundF, abF),
    formular,
    el('div', { class: 'knopfreihe' },
      el('button', { class: 'knopf zweit', onclick: () => dlg.close() }, 'Abbrechen'),
      el('button', {
        class: 'knopf',
        onclick: async () => {
          try {
            const v = await vertragAnlegen({
              projektId: projekt.id,
              daten: { ...formular.lesen(), beauftragt: false },
              grund: grundF.eingabe.value.trim() || (bestand ? 'Nachtrag' : 'Auftrag'),
              gueltigAb: abF.eingabe.value || heuteIso(),
            });
            melden(`Vertragsstand Version ${v.version} angelegt.`);
            dlg.close();
            fertig();
          } catch (f) { melden(f.message, 'fehler'); }
        },
      }, 'Speichern'),
      el('button', {
        class: 'knopf akzent',
        onclick: async () => {
          try {
            const v = await vertragAnlegen({
              projektId: projekt.id,
              daten: { ...formular.lesen(), beauftragt: false },
              grund: grundF.eingabe.value.trim() || (bestand ? 'Nachtrag' : 'Auftrag'),
              gueltigAb: abF.eingabe.value || heuteIso(),
            });
            melden(`Vertragsstand Version ${v.version} angelegt.`);
            dlg.close();
            // Direkt weiter zum Angebot: Der Assistent findet den Stand als
            // vorhandenen Vertrag und überspringt das Erfassen.
            location.hash = `#neu/${projekt.id}`;
          } catch (f) { melden(f.message, 'fehler'); }
        },
      }, 'Speichern und Angebot dazu')),
  );
  document.body.append(dlg);
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
}
