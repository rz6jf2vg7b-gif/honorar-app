// Synopse — was sich zwischen zwei Fassungen der HOAI geändert hat.
//
// Wozu: Ein Vertrag richtet sich nach der Fassung, die bei Auftragserteilung
// galt (§ 57). Wer heute eine Rechnung zu einem Altvertrag schreibt, muss
// wissen, was damals anders war — bei der Novelle 2021 war das der Kern:
// Mindest- und Höchstsätze wurden zu Orientierungswerten.
//
// Verglichen werden nur Fassungen, die tatsächlich vorliegen. Es wird nichts
// aus Sekundärquellen ergänzt und nichts geschätzt: Eine Synopse, die eine
// Änderung erfindet oder übersieht, ist schlimmer als gar keine.

import { el, leeren, feld } from '../ui.js';
import { FASSUNGEN } from '../hoai/fassungen.js';
import { synopse } from '../hoai/synopse.js';

const ART_TEXT = {
  neu: 'neu',
  entfallen: 'entfallen',
  geaendert: 'geändert',
  gleich: 'unverändert',
};

export async function synopseZeigen(wurzel) {
  wurzel.append(
    el('div', { class: 'seitenkopf' },
      el('h1', { text: 'Synopse' }),
      el('button', { class: 'knopf leise', onclick: () => { location.hash = '#hoai'; } }, 'Zum Volltext'),
    ),
    el('p', { class: 'unterzeile', text: 'Was sich zwischen zwei Fassungen der HOAI geändert hat — Vorschrift für Vorschrift, Wort für Wort.' }),
  );

  if (FASSUNGEN.length < 2) {
    wurzel.append(
      el('div', { class: 'karte hinweiskarte' },
        el('h3', { text: 'Es liegt nur eine Fassung vor' }),
        el('p', { class: 'fliess', text: `Vorhanden ist der Stand vom ${FASSUNGEN[0]?.kennung || '—'}. `
          + 'Zum Vergleichen braucht es einen zweiten.' }),
        el('p', { class: 'fliess', text: 'Ab der nächsten Novelle geschieht das von selbst: Bevor der neue Text '
          + 'übernommen wird, sichert tools/hoai_ziehen.py den bisherigen als Vorfassung. Danach steht die Synopse hier.' }),
        el('p', { class: 'fliess', text: 'Rückwirkend fehlt die Ursprungsfassung von 2013 — gesetze-im-internet.de '
          + 'führt immer nur den geltenden Stand, und sie war dort schon nicht mehr abrufbar, als diese App entstand. '
          + 'Liegt ihr Wortlaut vor, lässt sie sich nachtragen: tools/hoai_ziehen.py --einlesen <datei> --kennung 2013-07-10.' }),
      ),
      el('div', { class: 'abschnitt' }, el('h2', { text: 'Vorhandene Fassungen' })),
      fassungsliste(),
    );
    return;
  }

  // Vorgabe: die beiden jüngsten Stände
  let altKennung = FASSUNGEN[FASSUNGEN.length - 2].kennung;
  let neuKennung = FASSUNGEN[FASSUNGEN.length - 1].kennung;

  const ergebnis = el('div');
  const zeichnen = async () => {
    leeren(ergebnis);
    ergebnis.append(el('p', { class: 'klein', text: 'Wird verglichen …' }));
    try {
      const [a, n] = await Promise.all([fassungLaden(altKennung), fassungLaden(neuKennung)]);
      leeren(ergebnis);
      ergebnis.append(vergleichZeichnen(synopse(a, n), a, n));
    } catch (fehler) {
      console.error(fehler);
      leeren(ergebnis);
      ergebnis.append(el('p', { class: 'hinweis fehler', text: `Vergleich nicht möglich: ${fehler.message}` }));
    }
  };

  const optionen = FASSUNGEN.map((f) => ({
    wert: f.kennung,
    text: `${f.kennung}${f.geltend ? ' — geltende Fassung' : ''}`,
  }));

  wurzel.append(
    el('div', { class: 'feldreihe' },
      feld({ label: 'Frühere Fassung', art: 'auswahl', wert: altKennung, optionen,
        onAenderung: (w) => { altKennung = w; zeichnen(); } }),
      feld({ label: 'Spätere Fassung', art: 'auswahl', wert: neuKennung, optionen,
        onAenderung: (w) => { neuKennung = w; zeichnen(); } }),
    ),
    ergebnis,
  );
  await zeichnen();
}

function fassungsliste() {
  return el('ul', { class: 'liste schlicht' }, ...FASSUNGEN.map((f) => el('li', {},
    el('div', { class: 'zeile' },
      el('span', { text: f.kennung + (f.geltend ? ' — geltende Fassung' : '') }),
      el('span', { class: 'mono klein', text: `${f.normen} Vorschriften` })))));
}

/** Lädt eine Fassung. Erst hier, weil jede rund 670 KB wiegt. */
async function fassungLaden(kennung) {
  const eintrag = FASSUNGEN.find((f) => f.kennung === kennung);
  if (!eintrag) throw new Error(`Fassung ${kennung} ist nicht verzeichnet.`);
  if (eintrag.geltend) {
    const { VERORDNUNG } = await import('../hoai/verordnung.js');
    return { ...VERORDNUNG, kennung };
  }
  const modul = await import(`../hoai/${eintrag.datei}`);
  return modul.FASSUNG;
}

function vergleichZeichnen(s, alt, neu) {
  const z = s.zusammenfassung;
  const box = el('div');

  box.append(
    el('div', { class: 'kennzahlen' },
      kachel('Geändert', String(z.geaendert), `von ${z.gesamt} Vorschriften`,
        z.geaendert ? 'warnung' : ''),
      kachel('Neu', String(z.neu), z.neu ? 'hinzugekommen' : 'keine'),
      kachel('Entfallen', String(z.entfallen), z.entfallen ? 'weggefallen' : 'keine'),
    ),
    el('p', { class: 'klein', text: `${alt.kennung || 'früher'} → ${neu.kennung || 'später'}. `
      + `${z.gleich} Vorschriften sind unverändert und werden nicht aufgeführt.` }),
  );

  const geaendert = s.eintraege.filter((e) => e.art !== 'gleich');
  if (!geaendert.length) {
    box.append(el('div', { class: 'leer' },
      el('p', { text: 'Kein Unterschied zwischen diesen Fassungen.' })));
    return box;
  }

  box.append(el('div', { class: 'abschnitt' }, el('h2', { text: 'Die Unterschiede' })));
  for (const e of geaendert) {
    const d = el('details', { class: 'norm', open: geaendert.length <= 8 });
    d.append(
      el('summary', {},
        el('span', { class: 'fund mono', text: e.bezug }),
        el('span', { text: e.titel || '' }),
        el('span', { class: `marke ${e.art}`, text: ART_TEXT[e.art] })),
      el('div', { class: 'normtext' },
        e.titelAlt
          ? el('p', { class: 'klein' },
            el('span', { text: 'Überschrift vorher: ' }),
            el('span', { class: 'raus', text: e.titelAlt }))
          : null,
        ...(e.absaetze
          ? e.absaetze.filter((a) => a.art !== 'gleich').map(absatzZeichnen)
          : [el('p', { class: 'klein', text: e.art === 'neu'
            ? 'Diese Vorschrift gab es in der früheren Fassung nicht.'
            : 'Diese Vorschrift ist in der späteren Fassung weggefallen.' })]),
      ),
    );
    box.append(d);
  }
  return box;
}

function absatzZeichnen(a) {
  const kopf = el('div', { class: 'absatzkopf mono klein',
    text: `Absatz ${a.nr ? `(${a.nr})` : '—'} · ${ART_TEXT[a.art] || a.art}` });

  if (a.art === 'neu') {
    return el('div', { class: 'absatz' }, kopf, el('p', { class: 'rein', text: a.neu }));
  }
  if (a.art === 'entfallen') {
    return el('div', { class: 'absatz' }, kopf, el('p', { class: 'raus', text: a.alt }));
  }
  if (!a.teile) {
    // Zu lang für einen Wortvergleich — dann beide Fassungen nebeneinander.
    return el('div', { class: 'absatz' }, kopf,
      el('p', { class: 'raus', text: a.alt }),
      el('p', { class: 'rein', text: a.neu }));
  }
  return el('div', { class: 'absatz' }, kopf,
    el('p', { class: 'diff' }, ...a.teile.map((t) =>
      (t.art === 'gleich'
        ? document.createTextNode(t.text)
        : el('span', { class: t.art, text: t.text })))),
  );
}

function kachel(titel, wert, neben, art = '') {
  return el('div', { class: `kachel ${art}` },
    el('div', { class: 'kacheltitel', text: titel }),
    el('div', { class: 'kachelwert', text: wert }),
    el('div', { class: 'kachelneben', text: neben }),
  );
}
