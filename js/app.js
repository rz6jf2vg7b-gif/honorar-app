// Einstieg und Wegweiser.
//
// Die Ansichten werden erst geladen, wenn sie gebraucht werden — auf dem Telefon
// startet die App dadurch schneller, und der Assistent mit seinem grossen
// Vertragsformular liegt beim ersten Blick auf die Belegliste noch gar nicht im
// Speicher.

import { el, leeren, symbol, SYMBOL, melden, navigationZaehlen } from './ui.js';
import { einstellungenLesen } from './db.js';

// `kurz` ist die Beschriftung der Tab-Leiste auf dem Telefon — dort ist neben
// drei weiteren Zielen kein Platz fuer "Einstellungen".
const ANSICHTEN = [
  { weg: 'dashboard', text: 'Dashboard', kurz: 'Übersicht', symbol: SYMBOL.dashboard },
  { weg: 'neu', text: 'Neu', kurz: 'Neu', symbol: SYMBOL.neu },
  { weg: 'projekte', text: 'Projekte', kurz: 'Projekte', symbol: SYMBOL.projekte },
  { weg: 'kontakte', text: 'Kontakte', kurz: 'Kontakte', symbol: SYMBOL.kontakte },
  { weg: 'einstellungen', text: 'Einstellungen', kurz: 'Mehr', symbol: SYMBOL.einstellungen },
];

// Steht abgesetzt am Fuss der Seitenleiste, nicht in der Tab-Leiste: Auf dem
// Telefon waere ein sechstes Ziel zu viel, und die Hilfe schlaegt man nach —
// man arbeitet nicht darin.
const NEBENANSICHTEN = [
  { weg: 'rechner', text: 'Rechner', symbol: SYMBOL.rechner },
  { weg: 'hoai', text: 'HOAI', symbol: SYMBOL.buch },
  { weg: 'lernen', text: 'Lernen', symbol: SYMBOL.hilfe },
  { weg: 'hilfe', text: 'Hilfe', symbol: SYMBOL.hilfe },
];

const inhalt = document.getElementById('inhalt');
const seitenleiste = document.getElementById('seitenleiste');
const tableiste = document.getElementById('tableiste');

function navigationBauen(aktiv) {
  leeren(seitenleiste);
  leeren(tableiste);
  seitenleiste.append(el('div', { class: 'marke', id: 'marke' }, 'HonorarApp'));
  for (const a of ANSICHTEN) {
    const auswahl = { onclick: () => { location.hash = `#${a.weg}`; } };
    const dran = aktiv === a.weg;
    seitenleiste.append(el('button', { ...auswahl, 'aria-current': dran ? 'page' : null },
      symbol(a.symbol), el('span', { text: a.text })));
    tableiste.append(el('button', {
      ...auswahl, 'aria-current': dran ? 'page' : null, 'aria-label': a.text,
    }, symbol(a.symbol), el('span', { text: a.kurz || a.text })));
  }
  seitenleiste.append(el('div', { class: 'leistenfuss' }, ...NEBENANSICHTEN.map((a) =>
    el('button', {
      class: 'leise', onclick: () => { location.hash = `#${a.weg}`; },
      'aria-current': aktiv === a.weg ? 'page' : null,
    }, symbol(a.symbol), el('span', { text: a.text })))));
}

async function markeSetzen() {
  const e = await einstellungenLesen();
  const m = document.getElementById('marke');
  if (m && e.buero.name) m.textContent = e.buero.name;
}

async function leiten() {
  navigationZaehlen();
  const roh = (location.hash || '#dashboard').slice(1);
  const [weg, wert] = roh.split('/');
  const bereich = {
    beleg: 'dashboard', belege: 'dashboard',
    projekt: 'projekte', adresse: 'kontakte', stammdaten: 'projekte', unterlagen: 'projekte',
    vorlagen: 'einstellungen', synopse: 'hoai', rechtliches: 'einstellungen',
    buchhaltung: 'dashboard', lernen: 'hilfe',
  }[weg] || weg;
  navigationBauen(bereich);
  leeren(inhalt);
  inhalt.scrollTop = 0;
  window.scrollTo(0, 0);

  try {
    if (weg === 'dashboard' || weg === 'belege' || weg === '') {
      const { dashboardZeigen } = await import('./ansichten/dashboard.js');
      await dashboardZeigen(inhalt);
    } else if (weg === 'neu') {
      const { assistentZeigen } = await import('./ansichten/assistent.js');
      // "#neu/<projekt>?aus=<beleg>" — aus einem angenommenen Angebot heraus.
      const [projektId, anhang] = (wert || '').split('?');
      const ausBelegId = new URLSearchParams(anhang || '').get('aus');
      await assistentZeigen(inhalt, {
        ...(projektId ? { projektId } : {}),
        ...(ausBelegId ? { ausBelegId } : {}),
      });
    } else if (weg === 'beleg') {
      const { belegAnsehen } = await import('./ansichten/belegansicht.js');
      await belegAnsehen(inhalt, wert);
    } else if (weg === 'projekt') {
      const { projektAnsehen } = await import('./ansichten/stammdatenDetail.js');
      await projektAnsehen(inhalt, wert);
    } else if (weg === 'adresse') {
      const { adresseAnsehen } = await import('./ansichten/stammdatenDetail.js');
      await adresseAnsehen(inhalt, wert);
    } else if (weg === 'projekte' || weg === 'stammdaten') {
      const { projekteZeigen } = await import('./ansichten/stammdaten.js');
      await projekteZeigen(inhalt);
    } else if (weg === 'kontakte') {
      const { kontakteZeigen } = await import('./ansichten/stammdaten.js');
      await kontakteZeigen(inhalt);
    } else if (weg === 'lernen') {
      const { lernenZeigen } = await import('./ansichten/lernen.js');
      await lernenZeigen(inhalt);
    } else if (weg === 'hilfe') {
      const { hilfeZeigen } = await import('./ansichten/hilfe.js');
      await hilfeZeigen(inhalt);
    } else if (weg === 'rechner') {
      const { rechnerZeigen } = await import('./ansichten/rechner.js');
      await rechnerZeigen(inhalt);
    } else if (weg === 'hoai') {
      const { hoaiZeigen } = await import('./ansichten/hoai.js');
      await hoaiZeigen(inhalt, wert);
    } else if (weg === 'unterlagen') {
      const { unterlagenZeigen } = await import('./ansichten/unterlagen.js');
      await unterlagenZeigen(inhalt, wert);
    } else if (weg === 'buchhaltung') {
      const { buchhaltungZeigen } = await import('./ansichten/buchhaltung.js');
      await buchhaltungZeigen(inhalt);
    } else if (weg === 'rechtliches') {
      const { rechtlichesZeigen } = await import('./ansichten/rechtliches.js');
      await rechtlichesZeigen(inhalt);
    } else if (weg === 'synopse') {
      const { synopseZeigen } = await import('./ansichten/synopse.js');
      await synopseZeigen(inhalt);
    } else if (weg === 'vorlagen') {
      const { vorlagenZeigen } = await import('./ansichten/vorlagen.js');
      await vorlagenZeigen(inhalt);
    } else if (weg === 'einstellungen') {
      const { einstellungenZeigen } = await import('./ansichten/einstellungen.js');
      await einstellungenZeigen(inhalt);
    } else {
      location.hash = '#dashboard';
      return;
    }
  } catch (fehler) {
    console.error(fehler);
    inhalt.append(el('div', { class: 'karte' },
      el('h3', { text: 'Diese Ansicht ließ sich nicht öffnen' }),
      el('p', { class: 'hinweis fehler', text: fehler.message }),
    ));
  }
  markeSetzen();
}

window.addEventListener('hashchange', leiten);

/**
 * Start: erst zeichnen, dann abgleichen.
 *
 * Umgekehrt saehe man beim Oeffnen eine leere Seite, solange das Netz braucht —
 * und ohne Netz gar keine. Die App gehoert dem Geraet; der Abgleich ist eine
 * Zutat, die auch ausbleiben darf.
 */
async function starten() {
  // Kommen wir gerade von der Microsoft-Anmeldung zurueck? Das muss vor allem
  // anderen geschehen, weil der Code in der Adresszeile steht und dort nicht
  // stehen bleiben darf.
  const zurueckVonAnmeldung = /[?&](code|error)=/.test(location.search);
  if (zurueckVonAnmeldung) {
    const ms = await import('./sync/microsoft.js');
    const r = await ms.rueckkehrPruefen();
    if (r && !r.ok && r.meldung) melden(r.meldung, 'fehler');
  }

  leiten();

  try {
    const e = await einstellungenLesen();
    if (!e.abgleich?.an || !navigator.onLine) return;

    const ms = await import('./sync/microsoft.js');
    if (!ms.angemeldet() || ms.anmeldungNoetig()) return;
    // Naht Entras 24-Stunden-Grenze, wird still erneuert — die Seite laedt
    // dabei neu, der Abgleich kommt danach.
    if (ms.erneuerungFaellig() && await ms.stillErneuern()) return;

    const { abgleichen } = await import('./sync/abgleich.js');
    const r = await abgleichen();
    if (r.hereingekommen || r.aktualisiert) {
      melden(`Abgeglichen: ${r.hereingekommen} neu, ${r.aktualisiert} aktualisiert.`);
      leiten();
    }
    if (r.konflikte.length) {
      melden(`${r.konflikte.length} Fall/Fälle konnte der Abgleich nicht entscheiden — `
        + 'siehe Einstellungen.', 'fehler');
    }
  } catch (fehler) {
    // Ein misslungener Abgleich darf den Start nie aufhalten.
    console.warn('Abgleich beim Start:', fehler);
  }
}

starten();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* ohne Offline-Betrieb weiterarbeiten */ });
  });
}
