// Service Worker: haelt die App offline verfuegbar.
//
// Strategie bewusst schlicht: Programmdateien kommen aus dem Zwischenspeicher und
// werden im Hintergrund erneuert (stale-while-revalidate). Nutzerdaten liegen in
// IndexedDB und werden hier nie angefasst — ein Fehler im Service Worker darf
// niemals eine Rechnung kosten.

const FASSUNG = 'honorarapp-v4';
const KERN = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/app.js', './js/ui.js', './js/db.js', './js/vorgang.js', './js/format.js',
  './js/hoai/tafeln.js', './js/hoai/leistungsbilder.js', './js/hoai/geld.js',
  './js/hoai/rechnen.js', './js/hoai/abrechnung.js',
  './js/beleg/rechnung_html.js', './js/beleg/cd.js', './js/beleg/pflichtangaben.js',
  './js/ansichten/dashboard.js', './js/ansichten/belegansicht.js',
  './js/ansichten/assistent.js', './js/ansichten/vertragsformular.js',
  './js/ansichten/stammdaten.js', './js/ansichten/stammdatenDetail.js',
  './js/ansichten/einstellungen.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(FASSUNG).then((c) => c.addAll(KERN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((namen) => Promise.all(namen.filter((n) => n !== FASSUNG).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  e.respondWith(caches.match(e.request).then((treffer) => {
    const netz = fetch(e.request).then((antwort) => {
      if (antwort.ok) {
        const kopie = antwort.clone();
        caches.open(FASSUNG).then((c) => c.put(e.request, kopie));
      }
      return antwort;
    }).catch(() => treffer);
    return treffer || netz;
  }));
});
