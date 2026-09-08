// Honorarzone ermitteln statt eintippen.
//
// Die Zone ist der größte Hebel auf das Honorar und im Streitfall der häufigste
// Angriffspunkt. Die HOAI gibt einen Weg vor, den man von Hand selten geht —
// dieser Dialog geht ihn in der Reihenfolge der Verordnung:
//
//   1. Objektliste (§ 35 Abs. 7): Steht das Vorhaben dort, ist die Zone
//      benannt. Das ist der Regelfall und die beste Begründung, weil sie
//      wörtlich aus der Anlage stammt.
//   2. Bewertungsmerkmale (§ 35 Abs. 2): wenn kein Regelbeispiel passt.
//   3. Punktbewertung (§ 35 Abs. 4–6): erst, wenn Merkmale aus MEHREREN Zonen
//      zutreffen. Die Verordnung sagt das ausdrücklich — die Punkte sind die
//      Feinbewertung, nicht der Einstieg. Deshalb steht die Objektliste hier
//      oben und die Schieber darunter, nicht umgekehrt.
//
// Ergebnis sind Zone UND Begründung. Die Begründung ist kein Beiwerk: Sie
// erscheint auf dem Beleg und ist das, was im Streitfall zählt.

import { el, leeren, feld, melden } from '../ui.js';
import { HONORARZONEN_BEWERTUNG, zoneAusPunkten, vorbelegung } from '../hoai/honorarzonen.js';
import { OBJEKTLISTEN } from '../hoai/objektlisten.js';
import { ZONE_ROEMISCH, HONORARZONEN, LEISTUNGSBILDER } from '../hoai/leistungsbilder.js';

/**
 * Öffnet den Dialog.
 * @param {object} o {leistungsbild, zone, begruendung, onUebernehmen(zone, begruendung)}
 */
export function honorarzoneErmitteln(o) {
  const b = HONORARZONEN_BEWERTUNG[o.leistungsbild];
  const lb = LEISTUNGSBILDER[o.leistungsbild];
  if (!b) { melden('Für dieses Leistungsbild ist keine Bewertung hinterlegt.', 'fehler'); return; }

  // Zustand des Dialogs
  let zone = o.zone || 3;
  let begruendung = o.begruendung || '';
  let punkte = vorbelegung(o.leistungsbild);

  const inhalt = el('div', { class: 'dialoginhalt' });
  const dlg = el('dialog', { class: 'karte dialog', style: 'max-width:680px;width:94%;' },
    el('h3', { text: `Honorarzone ermitteln — ${lb.bezeichnung}` }),
    inhalt,
    el('div', { class: 'knopfreihe' },
      el('button', { class: 'knopf zweit', type: 'button', onclick: () => dlg.close() }, 'Abbrechen'),
      el('button', {
        class: 'knopf akzent', type: 'button',
        onclick: () => {
          o.onUebernehmen(zone, begruendung.trim());
          dlg.close();
        },
      }, 'Übernehmen'),
    ),
  );

  const ergebnisZeile = el('div', { class: 'karte gefuellt zonenergebnis' });
  const zeichneErgebnis = () => {
    leeren(ergebnisZeile);
    ergebnisZeile.append(
      el('div', { class: 'zonenwert' },
        el('span', { class: 'roemisch', text: ZONE_ROEMISCH[zone] }),
        el('span', { class: 'klein', text: HONORARZONEN[zone] })),
      el('div', { class: 'klein', text: begruendung || 'Noch keine Begründung — sie erscheint auf dem Beleg.' }),
    );
  };

  // ── 1. Objektliste ──────────────────────────────────
  const liste = OBJEKTLISTEN[o.leistungsbild];
  const trefferBox = el('div', { class: 'objekttreffer' });

  const zeichneTreffer = (suche) => {
    leeren(trefferBox);
    const s = (suche || '').trim().toLowerCase();
    if (!s) {
      trefferBox.append(el('p', { class: 'klein', text:
        `${liste.eintraege.length} Regelbeispiele in ${b.objektliste}. Suchbegriff eingeben — etwa „Schule“, „Wohnhaus“, „Halle“.` }));
      return;
    }
    const treffer = liste.eintraege.filter((e) =>
      `${e.objekt} ${e.gruppe}`.toLowerCase().includes(s)).slice(0, 12);
    if (!treffer.length) {
      trefferBox.append(el('p', { class: 'klein', text:
        'Kein Regelbeispiel. Dann über die Bewertungsmerkmale weiter — genau dafür sind sie da.' }));
      return;
    }
    trefferBox.append(el('ul', { class: 'liste' }, ...treffer.map((e) => el('li', {},
      el('button', {
        class: 'eintrag', type: 'button',
        onclick: () => {
          // Bei mehreren Zonen die niedrigere vorschlagen — sie ist die
          // vorsichtigere Annahme; heraufsetzen kann man immer noch.
          zone = e.zonen[0];
          begruendung = `${e.objekt} (Objektliste ${b.objektliste})`;
          zeichneErgebnis();
          zeichneBegruendung();
          melden(`Honorarzone ${ZONE_ROEMISCH[zone]} übernommen.`);
        },
      },
        el('div', { class: 'haupt' },
          el('div', { class: 'titel', text: e.objekt }),
          el('div', { class: 'neben', text: e.gruppe })),
        el('span', { class: 'marke', text: e.zonen.map((z) => ZONE_ROEMISCH[z]).join(' / ') }),
      )))));
    if (treffer.some((e) => e.zonen.length > 1)) {
      trefferBox.append(el('p', { class: 'klein', text:
        'Mehrere Zonen bei einem Beispiel heißt: die Liste grenzt ein, entschieden wird über die Merkmale unten.' }));
    }
  };

  // ── 2./3. Merkmale und Punkte ───────────────────────
  const merkmalBox = el('div');
  const zeichneMerkmale = () => {
    leeren(merkmalBox);
    if (!b.punkte) {
      merkmalBox.append(
        el('p', { class: 'fliess', text: b.hinweis }),
        b.merkmale.length
          ? el('ul', { class: 'liste schlicht' }, ...b.merkmale.map((m) =>
            el('li', {}, el('div', { class: 'zeile' }, el('span', { text: m.text })))))
          : null,
        feld({
          label: 'Honorarzone', art: 'auswahl', wert: zone,
          optionen: [1, 2, 3, 4, 5].map((n) => ({ wert: n, text: `${ZONE_ROEMISCH[n]} — ${HONORARZONEN[n]}` })),
          onAenderung: (w) => { zone = Number(w); zeichneErgebnis(); },
        }),
      );
      return;
    }

    const summeZeile = el('p', { class: 'trefferzahl' });
    const nachrechnen = () => {
      const summe = punkte.reduce((s, p) => s + p, 0);
      const erg = zoneAusPunkten(o.leistungsbild, summe);
      zone = erg.zone;
      summeZeile.textContent = `${summe} von ${erg.maxPunkte} Punkten → Honorarzone ${ZONE_ROEMISCH[erg.zone]} (${erg.spanne})`;
      zeichneErgebnis();
    };

    for (let i = 0; i < b.merkmale.length; i++) {
      const m = b.merkmale[i];
      const schieber = el('input', {
        type: 'range', min: '0', max: String(m.max), step: '1', value: String(punkte[i]),
        'aria-label': m.text,
      });
      const wertAnzeige = el('span', { class: 'mono punktwert', text: `${punkte[i]} / ${m.max}` });
      schieber.addEventListener('input', () => {
        punkte[i] = Number(schieber.value);
        wertAnzeige.textContent = `${punkte[i]} / ${m.max}`;
        nachrechnen();
      });
      merkmalBox.append(el('div', { class: 'merkmal' },
        el('div', { class: 'merkmaltext' }, el('span', { text: m.text }), wertAnzeige),
        schieber));
    }
    merkmalBox.append(
      summeZeile,
      el('div', { class: 'knopfreihe' },
        el('button', {
          class: 'knopf leise', type: 'button',
          onclick: () => {
            begruendung = b.merkmale
              .map((m, i) => `${m.text}: ${punkte[i]} von ${m.max}`)
              .join('; ')
              + ` — zusammen ${punkte.reduce((s, p) => s + p, 0)} Punkte (${b.fundstelle})`;
            zeichneBegruendung();
            zeichneErgebnis();
          },
        }, 'Punktbewertung als Begründung übernehmen')),
    );
    nachrechnen();
  };

  // ── Begründung ──────────────────────────────────────
  const begruendungBox = el('div');
  const zeichneBegruendung = () => {
    leeren(begruendungBox);
    begruendungBox.append(feld({
      label: 'Begründung der Honorarzone', art: 'mehrzeilig', zeilen: 3, wert: begruendung,
      hinweis: 'Erscheint auf dem Beleg. Im Streitfall ist sie das, was zählt.',
      onEingabe: (w) => { begruendung = w; zeichneErgebnis(); },
    }));
  };

  inhalt.append(
    ergebnisZeile,
    el('div', { class: 'abschnitt' }, el('h2', { text: '1 · Objektliste' })),
    el('p', { class: 'klein', text: `${b.fundstelle} — Regelbeispiele nach ${b.objektliste}. Passt eines, ist die Zone begründet.` }),
    feld({ label: 'Regelbeispiel suchen', art: 'search', platzhalter: 'Schule, Wohnhaus, Halle …',
      onEingabe: (w) => zeichneTreffer(w) }),
    trefferBox,
    el('div', { class: 'abschnitt' }, el('h2', { text: b.punkte ? '2 · Bewertungsmerkmale' : '2 · Bewertungsmerkmale' } )),
    el('p', { class: 'klein', text: b.punkte
      ? 'Nach der HOAI erst heranzuziehen, wenn kein Regelbeispiel passt — und die Punktbewertung erst, wenn Merkmale mehrerer Zonen zutreffen.'
      : 'Für dieses Leistungsbild sieht die HOAI keine Punktbewertung vor.' }),
    merkmalBox,
    el('div', { class: 'abschnitt' }, el('h2', { text: '3 · Begründung' })),
    begruendungBox,
  );

  zeichneErgebnis();
  zeichneTreffer('');
  zeichneMerkmale();
  zeichneBegruendung();

  document.body.append(dlg);
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
}
