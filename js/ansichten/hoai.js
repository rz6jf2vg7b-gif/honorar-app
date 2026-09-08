// HOAI nachschlagen.
//
// Zweck ist das Nachschlagen waehrend der Arbeit: Welche Leistungsphase traegt
// wie viel? Wo liegt die Grenze der Tafel? Wie hoch darf der Umbauzuschlag sein?
// Dafuer blaettert man sonst in der Verordnung.
//
// Gezeigt werden die Daten, mit denen die App auch rechnet — Honorartafeln,
// Phasenbewertungen, Zonen. Sie stammen aus tafeln.js (maschinell aus
// gesetze-im-internet.de gezogen) und leistungsbilder.js. Damit kann hier nichts
// stehen, was der Rechenkern anders sieht: eine zweite, abweichende Quelle waere
// schlimmer als gar keine.
//
// Die Paragraphentexte sind Zusammenfassungen mit Fundstelle, kein Wortlaut.

import { el, leeren, eurZeigen, feld } from '../ui.js';
import { TAFELN } from '../hoai/tafeln.js';
import {
  LEISTUNGSBILDER, HONORARZONEN, ZONE_ROEMISCH, HONORARSAETZE,
} from '../hoai/leistungsbilder.js';
import { prozent } from '../hoai/geld.js';

const REGELN = [
  { fund: '§ 4', titel: 'Anrechenbare Kosten',
    text: 'Grundlage sind die Kosten der Baukonstruktion und der Technischen Anlagen nach DIN 276. Für die Ermittlung ist der Stand der Kostenberechnung maßgeblich, solange sie vorliegt; erst danach die Kostenfeststellung.' },
  { fund: '§ 6', titel: 'Grundlagen des Honorars',
    text: 'Das Honorar richtet sich nach den anrechenbaren Kosten, der Honorarzone, den beauftragten Leistungsphasen und der Honorartafel des jeweiligen Leistungsbildes.' },
  { fund: '§ 7', titel: 'Honorarvereinbarung',
    text: 'HOAI 2021: Die Tafelwerte sind Orientierungswerte, das Honorar ist frei vereinbar — die Vereinbarung muss aber in Textform vorliegen. HOAI 2013: Mindest- und Höchstsatz waren verbindlich. Die App rechnet in beiden Fällen mit demselben Anteil zwischen unterem und oberem Tafelwert und benennt ihn nur unterschiedlich.' },
  { fund: '§ 13', titel: 'Interpolation',
    text: 'Liegen die anrechenbaren Kosten zwischen zwei Werten der Honorartafel, wird linear interpoliert. Genau so rechnet die App — der Zwischenschritt steht auf dem Beleg.' },
  { fund: '§ 14', titel: 'Nebenkosten',
    text: 'Nebenkosten können pauschal oder nach Einzelnachweis abgerechnet werden. Die Pauschale ist ein Prozentsatz des Honorars und muss vereinbart sein.' },
  { fund: '§ 15', titel: 'Fälligkeit',
    text: 'Das Honorar wird fällig, wenn die Leistung vertragsgemäß erbracht und eine prüffähige Schlussrechnung überreicht ist. Abschlagszahlungen sind in angemessenen zeitlichen Abständen für nachgewiesene Leistungen zulässig.' },
  { fund: '§ 33 Abs. 2', titel: '25-%-Regel bei Technischen Anlagen',
    text: 'Die Kosten der Technischen Anlagen sind vollständig anrechenbar, soweit sie 25 % der sonstigen anrechenbaren Kosten nicht übersteigen; darüber hinaus nur zur Hälfte. Die App weist beide Teile getrennt aus.' },
  { fund: '§ 36', titel: 'Umbauzuschlag',
    text: 'Für Umbauten und Modernisierungen kann ein Zuschlag vereinbart werden — bei Gebäuden und Innenräumen bis 33 %. Ohne schriftliche Vereinbarung gilt ein Zuschlag von 20 % ab Honorarzone II als vereinbart.' },
];

export async function hoaiZeigen(wurzel) {
  wurzel.append(
    el('h1', { text: 'HOAI' }),
    el('p', { class: 'unterzeile', text: 'Honorarordnung für Architekten und Ingenieure — die Werte, mit denen diese App rechnet.' }),
  );

  // ── Regeln ────────────────────────────────────────────
  wurzel.append(el('div', { class: 'abschnitt' }, el('h2', { text: 'Die Vorschriften im Überblick' })));
  wurzel.append(el('dl', { class: 'regeln' }, ...REGELN.flatMap((r) => [
    el('dt', {}, el('span', { class: 'fund mono', text: r.fund }), el('span', { text: r.titel })),
    el('dd', { text: r.text }),
  ])));
  wurzel.append(el('p', { class: 'klein', text: 'Zusammenfassungen mit Fundstelle, nicht der Wortlaut. Maßgeblich ist die Verordnung selbst.' }));

  // ── Leistungsbilder und Phasen ────────────────────────
  wurzel.append(el('div', { class: 'abschnitt' }, el('h2', { text: 'Leistungsbilder und Leistungsphasen' })));
  const lbBox = el('div');
  const lbWahl = feld({
    label: 'Leistungsbild', art: 'auswahl', wert: 'gebaeude',
    optionen: Object.entries(LEISTUNGSBILDER).map(([k, lb]) => ({ wert: k, text: lb.bezeichnung })),
    onAenderung: (w) => zeichneLeistungsbild(lbBox, w),
  });
  zeichneLeistungsbild(lbBox, 'gebaeude');
  wurzel.append(lbWahl, lbBox);

  // ── Honorartafeln ─────────────────────────────────────
  wurzel.append(el('div', { class: 'abschnitt' }, el('h2', { text: 'Honorartafeln' })));
  wurzel.append(el('p', { class: 'klein', text: 'Die Tafelwerte sind in HOAI 2013 und 2021 gleich; geändert hat die Novelle nur ihre Verbindlichkeit. Je Honorarzone steht der untere und der obere Wert.' }));
  const tafelBox = el('div');
  const tafelWahl = feld({
    label: 'Tafel', art: 'auswahl', wert: 'gebaeude',
    optionen: Object.entries(TAFELN).map(([k, t]) => ({ wert: k, text: `${t.paragraf} — ${t.bezeichnung}` })),
    onAenderung: (w) => zeichneTafel(tafelBox, w),
  });
  zeichneTafel(tafelBox, 'gebaeude');
  wurzel.append(tafelWahl, tafelBox);

  // ── Honorarzonen ──────────────────────────────────────
  wurzel.append(el('div', { class: 'abschnitt' }, el('h2', { text: 'Honorarzonen' })));
  wurzel.append(el('ul', { class: 'liste schlicht' }, ...Object.entries(HONORARZONEN).map(([z, text]) =>
    el('li', {}, el('div', { class: 'zeile' },
      el('span', { class: 'mono zone', text: ZONE_ROEMISCH[z] }),
      el('span', { text }))))));

  // ── Honorarsätze ──────────────────────────────────────
  wurzel.append(el('div', { class: 'abschnitt' }, el('h2', { text: 'Honorarsätze' })));
  for (const fassung of [2021, 2013]) {
    wurzel.append(
      el('h3', { text: `HOAI ${fassung}` }),
      el('ul', { class: 'liste schlicht' }, ...HONORARSAETZE[fassung].map((s) =>
        el('li', {}, el('div', { class: 'zeile' },
          el('span', { text: s.bezeichnung }),
          el('span', { class: 'mono', text: prozent(s.anteil) }))))),
    );
  }
}

function zeichneLeistungsbild(box, schluessel) {
  leeren(box);
  const lb = LEISTUNGSBILDER[schluessel];
  if (!lb) return;

  const summe = Object.values(lb.phasen).reduce((s, x) => s + x, 0);
  box.append(
    el('p', { class: 'klein', text: `Leistungsbild ${lb.leistungsbildParagraf} · Honorartafel ${lb.tafelParagraf}`
      + (lb.umbauzuschlagBis ? ` · Umbauzuschlag bis ${prozent(lb.umbauzuschlagBis)}` : '') }),
    el('table', { class: 'tabelle' },
      el('thead', {}, el('tr', {},
        el('th', { text: 'LPh' }), el('th', { text: 'Bezeichnung' }), el('th', { class: 'r', text: 'Anteil' }))),
      el('tbody', {}, ...Object.entries(lb.phasen).map(([nr, anteil]) => el('tr', {},
        el('td', { class: 'mono', text: nr }),
        el('td', { text: lb.namen[nr] || '' }),
        el('td', { class: 'r mono', text: prozent(anteil) })))),
      el('tfoot', {}, el('tr', {},
        el('td', { text: '' }), el('td', { text: 'Summe' }),
        el('td', { class: 'r mono', text: prozent(summe) }))),
    ),
  );

  if (lb.abweichungen?.length) {
    box.append(
      el('h3', { text: 'Zulässige Abweichungen' }),
      el('ul', { class: 'liste schlicht' }, ...lb.abweichungen.map((a) =>
        el('li', {}, el('div', { class: 'zeile' }, el('span', { text: a.bezeichnung }))))),
    );
  }
}

function zeichneTafel(box, schluessel) {
  leeren(box);
  const t = TAFELN[schluessel];
  if (!t) return;

  box.append(
    el('p', { class: 'klein', text: `${t.paragraf} — ${t.bezeichnung} · ${t.zeilen.length} Stützstellen · ${t.zonen} Honorarzonen. `
      + `Gültig von ${eurZeigen(t.zeilen[0].bezug)} bis ${eurZeigen(t.zeilen[t.zeilen.length - 1].bezug)} anrechenbare Kosten.` }),
    el('div', { class: 'tabellenrolle' },
      el('table', { class: 'tabelle schmal' },
        el('thead', {}, el('tr', {},
          el('th', { class: 'r', text: 'anrechenbar' }),
          ...Array.from({ length: t.zonen }, (_, i) => el('th', { class: 'r', text: ZONE_ROEMISCH[i + 1] })))),
        el('tbody', {}, ...t.zeilen.map((z) => el('tr', {},
          el('td', { class: 'r mono', text: eurZeigen(z.bezug) }),
          ...z.zonen.map(([von, bis]) => el('td', { class: 'r mono klein' },
            el('div', { text: eurZeigen(von) }),
            el('div', { class: 'grau', text: eurZeigen(bis) }))),
        ))),
      )),
    el('p', { class: 'klein', text: 'Oben der untere, darunter der obere Tafelwert. Zwischen den Stützstellen wird nach § 13 linear interpoliert.' }),
  );
}
