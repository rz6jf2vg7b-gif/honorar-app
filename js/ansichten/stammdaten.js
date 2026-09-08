// Stammdaten: Projekte und Empfaenger.
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
import { SPEICHER, alle, schreiben, schreibeViele, loeschen, neueId } from '../db.js';

export async function stammdatenZeigen(wurzel) {
  const zeichnen = async () => {
    leeren(wurzel);
    const [projekte, adressen] = await Promise.all([alle(SPEICHER.PROJEKTE), alle(SPEICHER.ADRESSEN)]);

    wurzel.append(
      el('h1', { text: 'Stammdaten' }),
      el('p', { class: 'unterzeile', text: 'Projekte und Empfänger — aus untermStrich geladen oder selbst angelegt.' }),

      el('h2', { text: 'Aus untermStrich laden' }),
      el('p', { class: 'klein', text: 'Zuerst auf dem Mac ausführen: python3 tools/ustrich_export.py — das schreibt projekte.json und adressen.json nach OneDrive/Apps/HonorarApp/stammdaten/. Danach die Datei hier laden.' }),
      el('div', { class: 'knopfreihe' },
        el('button', { class: 'knopf zweit', onclick: () => einspielen('projekte', zeichnen) }, 'Projekte laden'),
        el('button', { class: 'knopf zweit', onclick: () => einspielen('adressen', zeichnen) }, 'Adressen laden'),
      ),

      el('h2', { text: `Projekte (${projekte.length})` }),
      projekte.length
        ? suchbareListe(projekte, 'Projekt suchen',
          (p) => `${p.nummer} ${p.name} ${p.kuerzel || ''}`,
          (p) => p.name,
          (p) => `${p.nummer}${p.kuerzel ? ` · ${p.kuerzel}` : ''}${p.aktiv ? ' · aktiv' : ''}${p.quelle === 'eigen' ? ' · eigen' : ''}`,
          (p) => { location.hash = `#projekt/${p.id}`; })
        : el('div', { class: 'leer' }, el('p', { class: 'klein', text: 'Noch keine Projekte.' })),
      el('div', { class: 'knopfreihe' },
        el('button', { class: 'knopf leise', onclick: () => projektBearbeiten(null, zeichnen) }, 'Projekt anlegen'),
      ),

      el('h2', { text: `Empfänger (${adressen.length})` }),
      adressen.length
        ? suchbareListe(adressen, 'Empfänger suchen',
          (a) => `${a.name} ${a.zusatz || ''} ${a.ort || ''} ${a.plz || ''}`,
          (a) => a.name,
          (a) => [a.zusatz, `${a.plz || ''} ${a.ort || ''}`.trim(), a.quelle === 'eigen' ? 'eigen' : null].filter(Boolean).join(' · '),
          (a) => { location.hash = `#adresse/${a.id}`; })
        : el('div', { class: 'leer' }, el('p', { class: 'klein', text: 'Noch keine Empfänger.' })),
      el('div', { class: 'knopfreihe' },
        el('button', { class: 'knopf leise', onclick: () => adresseBearbeiten(null, zeichnen) }, 'Empfänger anlegen'),
      ),
    );
  };
  await zeichnen();
}

/**
 * Liste mit Suchfeld. Bei ueber tausend Adressen ist Blaettern keine Option —
 * und eine auf 200 gekuerzte Liste ohne Suche laesst den Rest unauffindbar.
 */
function suchbareListe(eintraege, suchLabel, suchtextVon, titelVon, nebenVon, onKlick) {
  const MAX = 60;
  const box = el('div');
  const zeichnen = (suche) => {
    leeren(box);
    const s = (suche || '').trim().toLowerCase();
    const treffer = s
      ? eintraege.filter((e) => suchtextVon(e).toLowerCase().includes(s))
      : eintraege;
    box.append(el('ul', { class: 'liste' }, ...treffer.slice(0, MAX).map((e) => el('li', {},
      el('button', { class: 'eintrag', type: 'button', onclick: () => onKlick(e) },
        el('div', { class: 'haupt' },
          el('div', { class: 'titel', text: titelVon(e) }),
          el('div', { class: 'neben', text: nebenVon(e) })),
        el('div', { class: 'neben', text: '›' }),
      )))));
    if (!treffer.length) box.append(el('div', { class: 'leer' }, el('p', { class: 'klein', text: 'Kein Treffer.' })));
    else if (treffer.length > MAX) {
      box.append(el('p', { class: 'klein', text: `${treffer.length} Treffer — die ersten ${MAX} werden gezeigt. Suche verfeinern.` }));
    }
  };
  zeichnen('');
  return el('div', {},
    feld({ label: suchLabel, art: 'search', platzhalter: 'Suchen …', onEingabe: (w) => zeichnen(w) }),
    box);
}

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
  melden(`${zuSchreiben.length} ${art === 'projekte' ? 'Projekte' : 'Adressen'} übernommen.`);
  danach();
}

const schluessel = (e, art) => (art === 'projekte'
  ? `${e.nummer || ''}|${e.name || ''}`
  : `${e.name || ''}|${e.plz || ''}|${e.strasse || ''}`);

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
  const f = {
    name: feld({ label: 'Name / Firma', wert: adresse?.name || '' }),
    zusatz: feld({ label: 'Zusatz / z. Hd.', wert: adresse?.zusatz || '' }),
    strasse: feld({ label: 'Straße', wert: adresse?.strasse || '' }),
    plz: feld({ label: 'PLZ', wert: adresse?.plz || '' }),
    ort: feld({ label: 'Ort', wert: adresse?.ort || '' }),
    mail: feld({ label: 'E-Mail', art: 'email', wert: adresse?.mail || '' }),
    leitweg: feld({
      label: 'Leitweg-ID', wert: adresse?.leitwegId || '',
      hinweis: 'Nur bei öffentlichen Auftraggebern — ohne sie wird eine XRechnung abgewiesen.',
    }),
  };
  dialog(adresse ? 'Empfänger bearbeiten' : 'Empfänger anlegen',
    [f.name, f.zusatz, f.strasse, el('div', { class: 'feldreihe' }, f.plz, f.ort), f.mail, f.leitweg],
    async () => {
      const name = f.name.eingabe.value.trim();
      if (!name) { melden('Der Name fehlt.', 'fehler'); return false; }
      await schreiben(SPEICHER.ADRESSEN, {
        ...(adresse || {}),
        id: adresse?.id || neueId('a'),
        name,
        zusatz: f.zusatz.eingabe.value.trim(),
        strasse: f.strasse.eingabe.value.trim(),
        plz: f.plz.eingabe.value.trim(),
        ort: f.ort.eingabe.value.trim(),
        mail: f.mail.eingabe.value.trim(),
        leitwegId: f.leitweg.eingabe.value.trim(),
        quelle: adresse?.quelle || 'eigen',
      });
      melden('Gespeichert.'); danach(); return true;
    },
    adresse ? async () => {
      if (!await bestaetigen('Empfänger entfernen?')) return false;
      await loeschen(SPEICHER.ADRESSEN, adresse.id);
      melden('Entfernt.'); danach(); return true;
    } : null);
}

function dialog(titel, felder, onSpeichern, onLoeschen) {
  const dlg = el('dialog', { class: 'karte', style: 'max-width:480px;width:92%;' },
    el('h3', { text: titel }),
    ...felder,
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
