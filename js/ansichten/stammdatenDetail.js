// Einzelansicht eines Projekts oder Empfaengers.
//
// Warum eine eigene Ansicht und kein Dialog: Ein Projekt ist mehr als seine vier
// Stammfelder. Interessant ist, was daran haengt — welche Belege gestellt wurden,
// welcher Vertragsstand gilt, was noch offen ist. Das passt in keinen Dialog und
// soll auf dem Telefon genauso lesbar sein wie am Schreibtisch.
//
// Bearbeitet wird von hier aus; die Formulare liegen weiter in stammdaten.js,
// damit es nur eine Stelle gibt, an der ein Datensatz geschrieben wird.

import { el, leeren, eurZeigen, isoNachDe, melden, bestaetigen } from '../ui.js';
import { SPEICHER, lesen, alle, loeschen } from '../db.js';
import { BELEGART_TEXT, IST_RECHNUNG, STATUS, vertraegeZuProjekt } from '../vorgang.js';
import { LEISTUNGSBILDER, ZONE_ROEMISCH } from '../hoai/leistungsbilder.js';
import { runde2, prozent } from '../hoai/geld.js';

const zeile = (bez, wert, summe = false) => (wert === null || wert === undefined || wert === ''
  ? null
  : el('div', { class: summe ? 'summe' : '' }, el('dt', { text: bez }), el('dd', { text: String(wert) })));

const kopf = (kicker, titel, unterzeile) => [
  el('div', { class: 'schrittkopf' },
    el('span', { class: 'kicker', text: kicker }),
    el('button', {
      class: 'knopf leise', type: 'button', style: 'min-height:34px;padding:0 12px;',
      onclick: () => { location.hash = '#stammdaten'; },
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

  wurzel.append(...kopf(
    `Projekt ${projekt.nummer}${projekt.kuerzel ? ` · ${projekt.kuerzel}` : ''}`,
    projekt.name,
    [projekt.aktiv ? 'aktives Projekt' : 'ruhend',
      projekt.quelle === 'untermstrich' ? 'aus untermStrich' : 'selbst angelegt'].join(' · '),
  ));

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
  wurzel.append(el('h2', { text: 'Stammdaten' }),
    el('dl', { class: 'werte' },
      zeile('Projektnummer', projekt.nummer),
      zeile('Kürzel', projekt.kuerzel),
      zeile('Bezeichnung', projekt.name),
      zeile('Status', projekt.aktiv ? 'aktiv' : 'ruhend'),
      zeile('Herkunft', projekt.quelle === 'untermstrich' ? 'untermStrich' : 'eigene Eingabe'),
      zeile('Schriftverkehr-Pfad', projekt.pfadSchriftverkehr),
    ));

  // ── Vertragsstände ───────────────────────────────────
  wurzel.append(el('h2', { text: `Vertragsstände (${vertraege.length})` }));
  if (!vertraege.length) {
    wurzel.append(el('div', { class: 'leer' },
      el('p', { class: 'klein', text: 'Noch kein Vertragsstand. Er entsteht beim ersten Angebot oder der ersten Rechnung.' })));
  } else {
    wurzel.append(el('ul', { class: 'liste' }, ...vertraege.slice().reverse().map((v) => {
      const lb = LEISTUNGSBILDER[v.leistungsbild];
      const beauftragt = (v.phasen || []).reduce((s, p) => s + (p.vereinbart || 0), 0);
      return el('li', {}, el('div', { class: 'eintrag' },
        el('div', { class: 'haupt' },
          el('div', { class: 'titel', text: `Version ${v.version} — ${v.grund}` }),
          el('div', { class: 'neben', text: [
            `HOAI ${v.fassung}`,
            lb?.bezeichnung,
            v.honorarzone ? `Zone ${ZONE_ROEMISCH[v.honorarzone]}` : null,
            `beauftragt ${prozent(beauftragt, 2)}`,
            v.gueltigAb ? `ab ${isoNachDe(v.gueltigAb)}` : null,
          ].filter(Boolean).join(' · ') }),
        ),
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
    'Empfänger',
    adresse.name,
    [adresse.zusatz, `${adresse.plz || ''} ${adresse.ort || ''}`.trim(),
      adresse.quelle === 'untermstrich' ? 'aus untermStrich' : 'selbst angelegt'].filter(Boolean).join(' · '),
  ));

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
      zeile('Name', adresse.name),
      zeile('Zusatz / z. Hd.', adresse.zusatz),
      zeile('Anrede', adresse.anrede),
      zeile('Vorname', adresse.vorname),
      zeile('Straße', adresse.strasse),
      zeile('PLZ', adresse.plz),
      zeile('Ort', adresse.ort),
      zeile('Land', adresse.land),
      zeile('E-Mail', adresse.mail),
      zeile('Telefon', adresse.telefon),
      zeile('Debitorennummer', adresse.debitor),
      zeile('Leitweg-ID', adresse.leitwegId),
      zeile('Herkunft', adresse.quelle === 'untermstrich' ? 'untermStrich' : 'eigene Eingabe'),
    ));

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
