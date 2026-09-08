// Darstellung einer HOAI-Herleitung in der Oberflaeche.
//
// Der Rechenkern liefert die Herleitung als Datenstruktur — dieselbe, aus der
// auch der Beleg gesetzt wird. Hier wird sie fuer den Bildschirm gezeichnet.
// Bewusst dieselbe Quelle: Was der Rechner zeigt, muss dem entsprechen, was
// spaeter auf der Rechnung steht. Zwei getrennte Darstellungen wuerden
// irgendwann auseinanderlaufen, und der Unterschied fiele erst dem
// Auftraggeber auf.

import { el } from '../ui.js';

export function herleitungZeichnen(herleitung) {
  const box = el('div', { class: 'herleitung' });
  for (const teil of herleitung || []) {
    if (teil.art === 'tabelle') box.append(tabelle(teil));
    else if (teil.art === 'werte') box.append(werte(teil));
    else if (teil.art === 'formel') box.append(formel(teil));
    else if (teil.art === 'hinweis') box.append(el('p', { class: 'klein', text: teil.text }));
  }
  return box;
}

function tabelle(t) {
  const rechtsbuendig = (s) => /€|%|Betrag|Kosten|anrechenbar|vereinbart|erbracht|Bewertung/i.test(s);
  return el('div', {},
    t.titel ? el('h3', { text: t.titel }) : null,
    el('div', { class: 'tabellenrolle' },
      el('table', { class: 'tabelle schmal' },
        el('thead', {}, el('tr', {}, ...t.spalten.map((s) =>
          el('th', { class: rechtsbuendig(s) ? 'r' : '', text: s })))),
        el('tbody', {}, ...t.zeilen.map((z) => el('tr', {}, ...z.map((w, i) =>
          el('td', { class: rechtsbuendig(t.spalten[i] || '') ? 'r mono' : '', text: String(w ?? '') })))),
        ),
        t.fuss ? el('tfoot', {}, el('tr', {}, ...t.fuss.map((w, i) =>
          el('td', { class: rechtsbuendig(t.spalten[i] || '') ? 'r mono' : '', text: String(w ?? '') })))) : null,
      )),
    ...(t.anmerkungen || []).map((a) => el('p', { class: 'klein', text: a })),
  );
}

function werte(w) {
  return el('div', {},
    w.titel ? el('h3', { text: w.titel }) : null,
    el('dl', { class: 'werte' }, ...w.zeilen.flatMap((z) => [
      el('dt', { text: z.bez }), el('dd', { class: 'mono', text: z.wert }),
    ])),
  );
}

function formel(f) {
  return el('div', { class: 'formelblock' },
    el('div', { class: 'formel mono', text: f.formel }),
    f.eingesetzt ? el('div', { class: 'eingesetzt mono', text: f.eingesetzt }) : null,
    el('div', { class: 'ergebnis mono', text: `= ${f.ergebnis}` }),
  );
}
