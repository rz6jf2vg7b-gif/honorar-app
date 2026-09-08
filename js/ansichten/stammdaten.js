// Stammdaten: Projekte und Kontakte — zwei getrennte Seiten.
//
// Zusammen auf einer Seite waren sie unuebersichtlich: 157 Projekte und 1.149
// Kontakte untereinander, jeweils mit eigenem Suchfeld, dazwischen die
// Import-Knoepfe. Getrennt hat jede Seite genau eine Aufgabe.
//
// Zwei Quellen, bewusst gleichberechtigt:
//   untermStrich — ueber die Datei, die tools/ustrich_export.py erzeugt. Ein
//     Direktzugriff scheitert an Mixed Content (die App laeuft ueber HTTPS, der
//     Server ueber HTTP) und daran, dass der Server nur im Heimnetz steht.
//   eigene Eingabe — fuer Bueros ohne untermStrich und fuer alles, was dort
//     nicht gepflegt ist.
//
// Eingespielte Datensaetze ueberschreiben gleichnamige aus derselben Quelle,
// eigene bleiben immer erhalten.

import { el, leeren, melden, feld, dateiLaden, bestaetigen } from '../ui.js';
import { SPEICHER, alle, schreiben, schreibeViele, loeschen, neueId, personName } from '../db.js';

// ————————————————————————————————————————————————————————————————
// Projekte
// ————————————————————————————————————————————————————————————————

export async function projekteZeigen(wurzel) {
  const zeichnen = async () => {
    leeren(wurzel);
    const projekte = await alle(SPEICHER.PROJEKTE);
    const eigene = projekte.filter((p) => p.quelle === 'eigen').length;

    wurzel.append(
      el('h1', { text: 'Projekte' }),
      el('p', { class: 'unterzeile', text: herkunft(projekte.length, eigene, 'Projekt', 'Projekte') }),
      listenSeite({
        eintraege: projekte,
        suchLabel: 'Projekt suchen',
        platzhalter: 'Nummer, Name, Kürzel …',
        neuText: 'Projekt anlegen',
        onNeu: () => projektBearbeiten(null, zeichnen),
        onLaden: () => einspielen('projekte', zeichnen),
        suchtextVon: (p) => `${p.nummer} ${p.name} ${p.kuerzel || ''}`,
        titelVon: (p) => p.name,
        nebenVon: (p) => [
          p.nummer,
          p.kuerzel,
          p.aktiv ? 'aktiv' : null,
          p.quelle === 'eigen' ? 'eigen' : null,
        ].filter(Boolean).join(' · '),
        onKlick: (p) => { location.hash = `#projekt/${p.id}`; },
        leerText: 'Noch keine Projekte.',
      }),
    );
  };
  await zeichnen();
}

// ————————————————————————————————————————————————————————————————
// Kontakte
// ————————————————————————————————————————————————————————————————

export async function kontakteZeigen(wurzel) {
  const zeichnen = async () => {
    leeren(wurzel);
    const adressen = await alle(SPEICHER.ADRESSEN);
    const eigene = adressen.filter((a) => a.quelle === 'eigen').length;

    wurzel.append(
      el('h1', { text: 'Kontakte' }),
      el('p', { class: 'unterzeile', text: herkunft(adressen.length, eigene, 'Kontakt', 'Kontakte') }),
      listenSeite({
        eintraege: adressen,
        suchLabel: 'Kontakt suchen',
        platzhalter: 'Name, Ansprechpartner, Ort, Notiz …',
        neuText: 'Kontakt anlegen',
        onNeu: () => adresseBearbeiten(null, zeichnen),
        onLaden: () => einspielen('adressen', zeichnen),
        // Gesucht wird ueber alles, was einen Kontakt wiederfindbar macht — nicht
        // nur ueber den Firmennamen. Wer "Hanz" sucht, meint den
        // Ansprechpartner; wer "Insolvenz" sucht, meint die Notiz.
        suchtextVon: (a) => [
          a.name, a.zusatz, a.vorname, a.ansprechpartner, a.titel,
          a.strasse, a.adresszeile2, a.plz, a.ort,
          a.mail, a.telefon, a.telefon2, a.mobil, a.web, a.notiz,
          ...(a.kategorien || []),
        ].filter(Boolean).join(' '),
        titelVon: (a) => a.name,
        nebenVon: (a) => [
          personName(a) || null,
          a.zusatz,
          `${a.plz || ''} ${a.ort || ''}`.trim() || null,
          a.quelle === 'eigen' ? 'eigen' : null,
        ].filter(Boolean).join(' · '),
        markeVon: (a) => (a.kategorien || [])[0] || null,
        onKlick: (a) => { location.hash = `#adresse/${a.id}`; },
        leerText: 'Noch keine Kontakte.',
      }),
    );
  };
  await zeichnen();
}

const herkunft = (gesamt, eigene, ein, viele) => {
  if (!gesamt) return `Noch keine ${viele} — aus untermStrich laden oder selbst anlegen.`;
  const ausUs = gesamt - eigene;
  const teile = [];
  if (ausUs) teile.push(`${ausUs} aus untermStrich`);
  if (eigene) teile.push(`${eigene} selbst angelegt`);
  return `${gesamt} ${gesamt === 1 ? ein : viele} — ${teile.join(' · ')}.`;
};

// ————————————————————————————————————————————————————————————————
// Gemeinsame Liste
// ————————————————————————————————————————————————————————————————

/**
 * Suchfeld, Knoepfe und Trefferliste als ein Block.
 *
 * Bei ueber tausend Kontakten ist Blaettern keine Option — und eine auf 60
 * gekuerzte Liste ohne Suche laesst den Rest unauffindbar. Deshalb steht die
 * Suche oben und die Knoepfe daneben statt darunter: Man sucht viel oefter, als
 * man anlegt.
 */
function listenSeite(o) {
  const MAX = 60;
  const box = el('div');

  const zeichnen = (suche) => {
    leeren(box);
    const s = (suche || '').trim().toLowerCase();
    const treffer = s
      ? o.eintraege.filter((e) => o.suchtextVon(e).toLowerCase().includes(s))
      : o.eintraege;

    if (!o.eintraege.length) {
      box.append(el('div', { class: 'leer' }, el('p', { class: 'klein', text: o.leerText })));
      return;
    }
    if (!treffer.length) {
      box.append(el('div', { class: 'leer' },
        el('p', { text: 'Kein Treffer.' }),
        el('p', { class: 'klein', text: 'Gesucht wird über alle Felder — auch Ansprechpartner, Notiz und Kategorie.' })));
      return;
    }

    box.append(
      el('p', { class: 'trefferzahl', text: treffer.length > MAX
        ? `${treffer.length} Treffer — die ersten ${MAX}. Suche verfeinern.`
        : `${treffer.length} ${treffer.length === 1 ? 'Treffer' : 'Treffer'}` }),
      el('ul', { class: 'liste' }, ...treffer.slice(0, MAX).map((e) => el('li', {},
        el('button', { class: 'eintrag', type: 'button', onclick: () => o.onKlick(e) },
          el('div', { class: 'haupt' },
            el('div', { class: 'titel', text: o.titelVon(e) }),
            el('div', { class: 'neben', text: o.nebenVon(e) })),
          o.markeVon?.(e) ? el('span', { class: 'marke', text: o.markeVon(e) }) : null,
          el('span', { class: 'pfeil', text: '›' }),
        )))),
    );
  };
  zeichnen('');

  return el('div', {},
    el('div', { class: 'listenkopf' },
      feld({ label: o.suchLabel, art: 'search', platzhalter: o.platzhalter, onEingabe: (w) => zeichnen(w) }),
      el('button', { class: 'knopf zweit', type: 'button', onclick: o.onNeu }, o.neuText),
      el('button', { class: 'knopf leise', type: 'button', onclick: o.onLaden }, 'Aus Datei laden'),
    ),
    box);
}

// ————————————————————————————————————————————————————————————————
// Einspielen
// ————————————————————————————————————————————————————————————————

async function einspielen(art, danach) {
  const datei = await dateiLaden('.json');
  if (!datei) return;
  let daten;
  try { daten = JSON.parse(datei.text); } catch { melden('Die Datei ist kein gültiges JSON.', 'fehler'); return; }

  const liste = daten[art] || (Array.isArray(daten) ? daten : null);
  if (!Array.isArray(liste)) { melden(`In der Datei stehen keine ${art}.`, 'fehler'); return; }

  const speicher = art === 'projekte' ? SPEICHER.PROJEKTE : SPEICHER.ADRESSEN;
  const vorhanden = await alle(speicher);
  const nachSchluessel = new Map(vorhanden.map((v) => [schluessel(v, art), v]));

  const zuSchreiben = [];
  for (const roh of liste) {
    const s = schluessel(roh, art);
    const alt = nachSchluessel.get(s);
    if (alt && alt.quelle === 'eigen') continue;          // eigene Eintraege nie ueberschreiben
    zuSchreiben.push({
      ...roh,
      id: alt?.id || `${art === 'projekte' ? 'p' : 'a'}_us_${roh.id || neueId('')}`,
      quelle: 'untermstrich',
    });
  }
  await schreibeViele(speicher, zuSchreiben);
  melden(`${zuSchreiben.length} ${art === 'projekte' ? 'Projekte' : 'Kontakte'} übernommen.`);
  danach();
}

const schluessel = (e, art) => (art === 'projekte'
  ? `${e.nummer || ''}|${e.name || ''}`
  : `${e.name || ''}|${e.plz || ''}|${e.strasse || ''}|${e.vorname || ''}|${e.ansprechpartner || ''}`);

// ————————————————————————————————————————————————————————————————
// Bearbeiten
// ————————————————————————————————————————————————————————————————

export function projektBearbeiten(projekt, danach) {
  const f = {
    nummer: feld({ label: 'Projektnummer', wert: projekt?.nummer || '' }),
    name: feld({ label: 'Projektname', wert: projekt?.name || '' }),
    kuerzel: feld({ label: 'Kürzel', wert: projekt?.kuerzel || '' }),
    aktiv: feld({ label: 'Status', art: 'schalter', wert: projekt?.aktiv ?? true, schaltertext: 'aktives Projekt' }),
  };
  dialog(projekt ? 'Projekt bearbeiten' : 'Projekt anlegen', [f.nummer, f.name, f.kuerzel, f.aktiv],
    async () => {
      const name = f.name.eingabe.value.trim();
      if (!name) { melden('Der Projektname fehlt.', 'fehler'); return false; }
      await schreiben(SPEICHER.PROJEKTE, {
        ...(projekt || {}),
        id: projekt?.id || neueId('p'),
        nummer: f.nummer.eingabe.value.trim() || '—',
        name, kuerzel: f.kuerzel.eingabe.value.trim(),
        aktiv: f.aktiv.eingabe.checked,
        quelle: projekt?.quelle || 'eigen',
      });
      melden('Gespeichert.'); danach(); return true;
    },
    projekt ? async () => {
      if (!await bestaetigen('Projekt entfernen?', 'Belege bleiben erhalten, verlieren aber die Zuordnung.')) return false;
      await loeschen(SPEICHER.PROJEKTE, projekt.id);
      melden('Entfernt.'); danach(); return true;
    } : null);
}

export function adresseBearbeiten(adresse, danach) {
  // Die Strasse bleibt bewusst EIN Feld, anders als beim eigenen Buero: In
  // untermStrich steht die Hausnummer bei 1.074 von 1.149 Kontakten mit in der
  // Strasse. Sie beim Einspielen abzutrennen hiesse raten — und ein falsch
  // geratener Trenner faellt erst auf dem Briefumschlag auf.
  const f = {
    name: feld({ label: 'Name / Firma', wert: adresse?.name || '' }),
    zusatz: feld({ label: 'Firmenzusatz', wert: adresse?.zusatz || '', hinweis: 'z. B. Rechtsanwälte, Steuerberatung' }),
    anrede: feld({ label: 'Anrede', art: 'auswahl', wert: adresse?.anrede || '',
      optionen: [{ wert: '', text: '—' }, 'Herr', 'Frau', 'Firma'] }),
    titel: feld({ label: 'Titel', wert: adresse?.titel || '', platzhalter: 'Dr., Dipl.-Ing.' }),
    vorname: feld({ label: 'Vorname', wert: adresse?.vorname || '' }),
    ansprechpartner: feld({ label: 'Nachname', wert: adresse?.ansprechpartner || '' }),
    strasse: feld({ label: 'Straße und Nr.', wert: adresse?.strasse || '' }),
    zeile2: feld({ label: 'Zweite Adresszeile', wert: adresse?.adresszeile2 || '', hinweis: 'z. B. c/o, Gebäude, Zimmer' }),
    plz: feld({ label: 'PLZ', wert: adresse?.plz || '', inputmode: 'numeric' }),
    ort: feld({ label: 'Ort', wert: adresse?.ort || '' }),
    mail: feld({ label: 'E-Mail', art: 'email', wert: adresse?.mail || '' }),
    telefon: feld({ label: 'Telefon', wert: adresse?.telefon || '' }),
    mobil: feld({ label: 'Mobil', wert: adresse?.mobil || '' }),
    web: feld({ label: 'Web', wert: adresse?.web || '' }),
    notiz: feld({ label: 'Interne Notiz', art: 'mehrzeilig', zeilen: 2, wert: adresse?.notiz || '',
      hinweis: 'Nur zum Wiederfinden — steht nie auf einem Beleg.' }),
    leitweg: feld({
      label: 'Leitweg-ID', wert: adresse?.leitwegId || '',
      hinweis: 'Nur bei öffentlichen Auftraggebern — ohne sie wird eine XRechnung abgewiesen.',
    }),
  };
  dialog(adresse ? 'Kontakt bearbeiten' : 'Kontakt anlegen',
    [f.name, f.zusatz,
      el('div', { class: 'reihe-plzort' }, f.anrede, f.titel),
      el('div', { class: 'feldreihe' }, f.vorname, f.ansprechpartner),
      f.strasse, f.zeile2,
      el('div', { class: 'reihe-plzort' }, f.plz, f.ort),
      f.mail, el('div', { class: 'feldreihe' }, f.telefon, f.mobil), f.web,
      f.notiz, f.leitweg],
    async () => {
      const name = f.name.eingabe.value.trim();
      if (!name) { melden('Der Name fehlt.', 'fehler'); return false; }
      await schreiben(SPEICHER.ADRESSEN, {
        ...(adresse || {}),
        id: adresse?.id || neueId('a'),
        name,
        zusatz: f.zusatz.eingabe.value.trim(),
        anrede: f.anrede.eingabe.value,
        titel: f.titel.eingabe.value.trim(),
        vorname: f.vorname.eingabe.value.trim(),
        ansprechpartner: f.ansprechpartner.eingabe.value.trim(),
        strasse: f.strasse.eingabe.value.trim(),
        adresszeile2: f.zeile2.eingabe.value.trim(),
        plz: f.plz.eingabe.value.trim(),
        ort: f.ort.eingabe.value.trim(),
        mail: f.mail.eingabe.value.trim(),
        telefon: f.telefon.eingabe.value.trim(),
        mobil: f.mobil.eingabe.value.trim(),
        web: f.web.eingabe.value.trim(),
        notiz: f.notiz.eingabe.value.trim(),
        leitwegId: f.leitweg.eingabe.value.trim(),
        quelle: adresse?.quelle || 'eigen',
      });
      melden('Gespeichert.'); danach(); return true;
    },
    adresse ? async () => {
      if (!await bestaetigen('Kontakt entfernen?')) return false;
      await loeschen(SPEICHER.ADRESSEN, adresse.id);
      melden('Entfernt.'); danach(); return true;
    } : null);
}

function dialog(titel, felder, onSpeichern, onLoeschen) {
  const dlg = el('dialog', { class: 'karte dialog', style: 'max-width:520px;width:92%;' },
    el('h3', { text: titel }),
    el('div', { class: 'dialoginhalt' }, ...felder),
    el('div', { class: 'knopfreihe' },
      el('button', { class: 'knopf zweit', type: 'button', onclick: () => dlg.close() }, 'Abbrechen'),
      onLoeschen ? el('button', {
        class: 'knopf leise', type: 'button',
        onclick: async () => { if (await onLoeschen()) dlg.close(); },
      }, 'Entfernen') : null,
      el('button', {
        class: 'knopf', type: 'button',
        onclick: async () => { if (await onSpeichern()) dlg.close(); },
      }, 'Speichern'),
    ),
  );
  document.body.append(dlg);
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
}
