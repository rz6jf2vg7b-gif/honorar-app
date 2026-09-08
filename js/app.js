// Einstieg und Wegweiser.
//
// Die Ansichten werden erst geladen, wenn sie gebraucht werden — auf dem Telefon
// startet die App dadurch schneller, und der Assistent mit seinem grossen
// Vertragsformular liegt beim ersten Blick auf die Belegliste noch gar nicht im
// Speicher.

import { el, leeren, symbol, SYMBOL, melden } from './ui.js';
import { einstellungenLesen } from './db.js';

// `kurz` ist die Beschriftung der Tab-Leiste auf dem Telefon — dort ist neben
// drei weiteren Zielen kein Platz fuer "Einstellungen".
const ANSICHTEN = [
  { weg: 'dashboard', text: 'Dashboard', kurz: 'Übersicht', symbol: SYMBOL.belege },
  { weg: 'neu', text: 'Neu', kurz: 'Neu', symbol: SYMBOL.neu },
  { weg: 'stammdaten', text: 'Stammdaten', kurz: 'Daten', symbol: SYMBOL.stammdaten },
  { weg: 'einstellungen', text: 'Einstellungen', kurz: 'Mehr', symbol: SYMBOL.einstellungen },
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
}

async function markeSetzen() {
  const e = await einstellungenLesen();
  const m = document.getElementById('marke');
  if (m && e.buero.name) m.textContent = e.buero.name;
}

async function leiten() {
  const roh = (location.hash || '#dashboard').slice(1);
  const [weg, wert] = roh.split('/');
  const bereich = { beleg: 'dashboard', belege: 'dashboard', projekt: 'stammdaten', adresse: 'stammdaten' }[weg] || weg;
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
      await assistentZeigen(inhalt, wert ? { projektId: wert } : {});
    } else if (weg === 'beleg') {
      const { belegAnsehen } = await import('./ansichten/belegansicht.js');
      await belegAnsehen(inhalt, wert);
    } else if (weg === 'projekt') {
      const { projektAnsehen } = await import('./ansichten/stammdatenDetail.js');
      await projektAnsehen(inhalt, wert);
    } else if (weg === 'adresse') {
      const { adresseAnsehen } = await import('./ansichten/stammdatenDetail.js');
      await adresseAnsehen(inhalt, wert);
    } else if (weg === 'stammdaten') {
      const { stammdatenZeigen } = await import('./ansichten/stammdaten.js');
      await stammdatenZeigen(inhalt);
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
leiten();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* ohne Offline-Betrieb weiterarbeiten */ });
  });
}
