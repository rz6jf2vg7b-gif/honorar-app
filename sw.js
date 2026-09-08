// Service Worker: haelt die App offline verfuegbar.
//
// Strategie: Netz zuerst, Zwischenspeicher als Rueckfallebene.
//
// Die naheliegende Wahl waere umgekehrt (Zwischenspeicher zuerst, im Hintergrund
// erneuern) — das startet schneller. Sie ist hier aber falsch: Man saehe nach
// jeder Aenderung noch einmal den vorherigen Stand. Bei einer App, die Honorare
// rechnet, hiesse das im schlechtesten Fall, dass ein korrigierter Rechenweg erst
// beim uebernaechsten Oeffnen greift und in der Zwischenzeit eine Rechnung mit
// veralteter Logik entsteht. Die halbe Sekunde Startzeit ist der Preis dafuer,
// dass gilt, was auf dem Server liegt.
//
// Offline bleibt die App vollstaendig nutzbar: Ist das Netz weg oder zu langsam,
// kommt alles aus dem Zwischenspeicher.
//
// Nutzerdaten liegen in IndexedDB und werden hier nie angefasst — ein Fehler im
// Service Worker darf niemals eine Rechnung kosten.

const FASSUNG = 'honorarapp-v7';

// Wie lange auf das Netz gewartet wird, bevor der Zwischenspeicher einspringt.
// Kurz genug, dass es im Zug nicht haengt; lang genug fuer eine normale Antwort.
const ZEITGRENZE = 2500;

const KERN = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './icons/favicon.svg',
  './js/app.js', './js/ui.js', './js/db.js', './js/vorgang.js', './js/format.js',
  './js/hoai/tafeln.js', './js/hoai/leistungsbilder.js', './js/hoai/geld.js',
  './js/hoai/rechnen.js', './js/hoai/abrechnung.js',
  './js/beleg/rechnung_html.js', './js/beleg/cd.js', './js/beleg/pflichtangaben.js',
  './js/ansichten/dashboard.js', './js/ansichten/belegansicht.js',
  './js/ansichten/assistent.js', './js/ansichten/vertragsformular.js',
  './js/ansichten/stammdaten.js', './js/ansichten/stammdatenDetail.js',
  './js/ansichten/einstellungen.js', './js/ansichten/hilfe.js',
  './js/ansichten/hoai.js', './js/ansichten/vorlagen.js',
  './js/ansichten/rechner.js', './js/ansichten/herleitung.js',
  './js/hoai/grundleistungen.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(FASSUNG)
    .then((c) => c.addAll(KERN))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((namen) => Promise.all(namen.filter((n) => n !== FASSUNG).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(netzZuerst(e.request));
});

async function netzZuerst(anfrage) {
  const speicher = await caches.open(FASSUNG);

  const ausNetz = fetch(anfrage).then((antwort) => {
    if (antwort.ok) speicher.put(anfrage, antwort.clone());
    return antwort;
  });
  // Faengt die Ablehnung ab, falls die Zeitgrenze zuerst greift: sonst meldet der
  // Browser eine unbehandelte Ablehnung, obwohl der Fall sauber behandelt ist.
  ausNetz.catch(() => {});

  try {
    return await Promise.race([
      ausNetz,
      new Promise((_, ab) => setTimeout(() => ab(new Error('Zeitgrenze')), ZEITGRENZE)),
    ]);
  } catch {
    const treffer = await speicher.match(anfrage);
    if (treffer) return treffer;
    // Nichts im Zwischenspeicher — dann bleibt nur, auf das Netz zu warten.
    return ausNetz;
  }
}
