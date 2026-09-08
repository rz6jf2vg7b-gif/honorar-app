// Einzelansicht eines Projekts oder Empfaengers.
//
// Warum eine eigene Ansicht und kein Dialog: Ein Projekt ist mehr als seine vier
// Stammfelder. Interessant ist, was daran haengt — welche Belege gestellt wurden,
// welcher Vertragsstand gilt, was noch offen ist. Das passt in keinen Dialog und
// soll auf dem Telefon genauso lesbar sein wie am Schreibtisch.
//
// Bearbeitet wird von hier aus; die Formulare liegen weiter in stammdaten.js,
// damit es nur eine Stelle gibt, an der ein Datensatz geschrieben wird.

import { el, leeren, eurZeigen, isoNachDe, heuteIso, melden, bestaetigen, zurueck, feld, suchauswahl } from '../ui.js';
import { SPEICHER, lesen, alle, loeschen, schreiben, personName, kontaktSuchtext } from '../db.js';
import { projektStand } from './stammdaten.js';
import { BELEGART_TEXT, IST_RECHNUNG, STATUS, vertraegeZuProjekt } from '../vorgang.js';
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
      el('p', { class: 'klein', text: 'Noch kein Vertragsstand. Er entsteht beim ersten Angebot oder der ersten Rechnung.' })));
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
          ].filter(Boolean).join(' · ') }),
        ),
        el('div', { class: 'betrag', text: eurZeigen(b.brutto ?? b.zahlbetrag ?? 0) }),
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
        el('div', { class: 'betrag', text: eurZeigen(b.brutto ?? b.zahlbetrag ?? 0) }),
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
