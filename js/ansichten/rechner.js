// HOAI-Rechner — Testrechnungen ohne Beleg.
//
// Zweck: durchspielen, was ein Vorhaben nach HOAI trägt, bevor man ein Angebot
// schreibt. Alle Parameter sind einstellbar, das Ergebnis erscheint sofort mit
// vollständiger Herleitung.
//
// Gerechnet wird mit demselben Kern wie eine echte Rechnung (js/hoai/rechnen.js).
// Ein eigener "Überschlagsrechner" mit vereinfachter Formel wäre die falsche
// Hilfe: Man würde eine Zahl bekommen, die die Rechnung später nicht bestätigt.
//
// Teilleistungen: Die HOAI bewertet die Leistungsphasen (§ 34 Abs. 3: LPh 5 =
// 25 %), sagt aber nichts darüber, wie sich das auf die Grundleistungen a) bis
// n) verteilt. Die verbreiteten Bewertungstabellen sind urheberrechtlich
// geschützte Fachliteratur und dürfen hier nicht hinterlegt werden. Die App
// liefert die amtliche Struktur aus den Anlagen 10 bis 15 und lässt die
// Bewertung eintragen — einmal, danach ist sie gespeichert.

import {
  el, leeren, melden, feld, zahlLesen, zahlZeigen, eurZeigen,
} from '../ui.js';
import { einstellungenLesen, einstellungenSchreiben } from '../db.js';
import { honorarermittlung, ANRECHNUNG } from '../hoai/rechnen.js';
import {
  LEISTUNGSBILDER, HONORARZONEN, ZONE_ROEMISCH, HONORARSAETZE,
} from '../hoai/leistungsbilder.js';
import { GRUNDLEISTUNGEN } from '../hoai/grundleistungen.js';
import { prozent, runde2 } from '../hoai/geld.js';
import { herleitungZeichnen } from './herleitung.js';

const ANRECHNUNG_TEXT = {
  [ANRECHNUNG.VOLL]: 'voll anrechenbar',
  [ANRECHNUNG.KEINE]: 'nicht anrechenbar',
  [ANRECHNUNG.TECHNIK_33_2]: 'Technische Anlagen § 33 Abs. 2',
  [ANRECHNUNG.HALB]: 'zur Hälfte',
};

/** Ausgangslage eines neuen Rechenblatts. */
const VORGABE = () => ({
  fassung: 2021,
  leistungsbild: 'gebaeude',
  honorarzone: 3,
  honorarsatz: 0.5,
  gruppen: [
    { nr: '300', bezeichnung: 'Bauwerk – Baukonstruktionen', betrag: 1000000, anrechnung: ANRECHNUNG.VOLL },
    { nr: '400', bezeichnung: 'Bauwerk – Technische Anlagen', betrag: 250000, anrechnung: ANRECHNUNG.TECHNIK_33_2 },
  ],
  umbauzuschlag: 0,
  nebenkosten: 0.05,
  ustSatz: 0.19,
  // je Phase: { an: bool, anteil: Zahl|null, teil: {buchstabe: bool} }
  phasen: {},
});

export async function rechnerZeigen(wurzel) {
  const einst = await einstellungenLesen();
  const z = VORGABE();
  z.fassung = einst.vorgaben.fassung;
  z.leistungsbild = einst.vorgaben.leistungsbild;
  z.honorarzone = einst.vorgaben.honorarzone;
  z.honorarsatz = einst.vorgaben.honorarsatz;
  z.nebenkosten = einst.vorgaben.nebenkostenProzent;
  z.ustSatz = einst.vorgaben.ustSatz;

  // Bewertung der Teilleistungen: was der Nutzer eingetragen hat, sonst leer.
  // Liegt in den Einstellungen, damit sie nur einmal eingetragen werden muss.
  const bewertung = einst.teilleistungen || {};

  phasenZuruecksetzen(z);

  wurzel.append(
    el('div', { class: 'seitenkopf' },
      el('h1', { text: 'HOAI-Rechner' }),
      el('button', { class: 'knopf leise', onclick: () => { location.hash = '#hoai'; } }, 'HOAI nachschlagen'),
    ),
    el('p', { class: 'unterzeile', text: 'Testrechnung mit demselben Rechenweg wie eine echte Rechnung — es entsteht kein Beleg.' }),
  );

  const ergebnisBox = el('div');
  const phasenBox = el('div');
  const grundhonorarZeile = el('p', { class: 'trefferzahl' });

  const neuRechnen = () => {
    // Erst rechnen, dann zeichnen: Die Phasentabelle weist die Beträge aus und
    // braucht dafür das Grundhonorar. Schlägt die Rechnung fehl (etwa weil
    // keine Phase gewählt ist), wird ohne Beträge gezeichnet.
    let ergebnis = null;
    let fehlertext = null;
    try {
      ergebnis = rechne(z);
    } catch (fehler) {
      fehlertext = fehler.message;
    }
    zeichnePhasen(ergebnis);
    leeren(ergebnisBox);
    ergebnisBox.append(ergebnis
      ? ergebnisZeichnen(ergebnis, z)
      : el('div', { class: 'karte hinweiskarte' },
        el('h3', { text: 'So lässt sich nicht rechnen' }),
        el('p', { class: 'hinweis fehler', text: fehlertext })));
  };

  // ── Grundlagen ────────────────────────────────────────
  const fLeistungsbild = feld({
    label: 'Leistungsbild', art: 'auswahl', wert: z.leistungsbild,
    optionen: Object.entries(LEISTUNGSBILDER).map(([k, lb]) =>
      ({ wert: k, text: `${lb.leistungsbildParagraf} — ${lb.bezeichnung}` })),
    onAenderung: (w) => {
      z.leistungsbild = w;
      phasenZuruecksetzen(z);
      zeichneZuschlaege();       // Obergrenze des Umbauzuschlags hängt daran
      neuRechnen();
    },
  });
  const fFassung = feld({
    label: 'HOAI-Fassung', art: 'auswahl', wert: z.fassung,
    optionen: [{ wert: 2021, text: 'HOAI 2021' }, { wert: 2013, text: 'HOAI 2013' }],
    onAenderung: (w) => { z.fassung = Number(w); zeichneSatz(); neuRechnen(); },
  });
  const fZone = feld({
    label: 'Honorarzone', art: 'auswahl', wert: z.honorarzone,
    optionen: [1, 2, 3, 4, 5].map((n) =>
      ({ wert: n, text: `${ZONE_ROEMISCH[n]} — ${HONORARZONEN[n]}` })),
    onAenderung: (w) => { z.honorarzone = Number(w); neuRechnen(); },
  });
  const satzBox = el('div');
  const zeichneSatz = () => {
    leeren(satzBox);
    satzBox.append(feld({
      label: 'Honorarsatz', art: 'auswahl', wert: z.honorarsatz,
      optionen: HONORARSAETZE[z.fassung].map((s) =>
        ({ wert: s.anteil, text: `${s.bezeichnung} (${prozent(s.anteil)})` })),
      onAenderung: (w) => { z.honorarsatz = Number(w); neuRechnen(); },
    }));
  };
  zeichneSatz();

  wurzel.append(
    el('div', { class: 'abschnitt' }, el('h2', { text: 'Grundlagen' })),
    fLeistungsbild,
    el('div', { class: 'feldreihe' }, fFassung, fZone),
    satzBox,
  );

  // ── Anrechenbare Kosten ───────────────────────────────
  const gruppenBox = el('div');
  const zeichneGruppen = () => {
    leeren(gruppenBox);
    z.gruppen.forEach((g, i) => {
      gruppenBox.append(el('div', { class: 'kostengruppe' },
        feld({ label: 'KG', wert: g.nr, onEingabe: (w) => { g.nr = w; } }),
        feld({ label: 'Bezeichnung', wert: g.bezeichnung, onEingabe: (w) => { g.bezeichnung = w; } }),
        feld({
          label: 'Betrag', art: 'zahl', einheit: '€', wert: zahlZeigen(g.betrag),
          onEingabe: (w) => { g.betrag = w ?? 0; neuRechnen(); },
        }),
        feld({
          label: 'Anrechnung', art: 'auswahl', wert: g.anrechnung,
          optionen: Object.entries(ANRECHNUNG_TEXT).map(([w, t]) => ({ wert: w, text: t })),
          onAenderung: (w) => { g.anrechnung = w; neuRechnen(); },
        }),
        el('button', {
          class: 'knopf leise schmal', type: 'button', 'aria-label': 'Kostengruppe entfernen',
          onclick: () => { z.gruppen.splice(i, 1); zeichneGruppen(); neuRechnen(); },
        }, '×'),
      ));
    });
    gruppenBox.append(el('div', { class: 'knopfreihe' },
      el('button', {
        class: 'knopf zweit', type: 'button',
        onclick: () => {
          z.gruppen.push({ nr: '', bezeichnung: '', betrag: 0, anrechnung: ANRECHNUNG.VOLL });
          zeichneGruppen();
        },
      }, 'Kostengruppe hinzufügen')));
  };
  zeichneGruppen();

  wurzel.append(
    el('div', { class: 'abschnitt' }, el('h2', { text: 'Anrechenbare Kosten' })),
    el('p', { class: 'klein', text: 'Nach DIN 276. Technische Anlagen werden nach § 33 Abs. 2 behandelt: voll anrechenbar bis 25 % der übrigen anrechenbaren Kosten, darüber zur Hälfte.' }),
    gruppenBox,
  );

  // ── Leistungsphasen ───────────────────────────────────
  function zeichnePhasen(ergebnis) {
    leeren(phasenBox);
    const lb = LEISTUNGSBILDER[z.leistungsbild];
    const gl = GRUNDLEISTUNGEN[z.leistungsbild];

    // Das Grundhonorar bei 100 % — die Bezugsgröße beider Euro-Spalten.
    // Zuschläge und Nebenkosten stehen bewusst nicht darin: Sie beziehen sich
    // auf die Summe, nicht auf die einzelne Phase.
    const gh = ergebnis?.grundhonorar100 ?? null;
    const eur = (anteil) => (gh === null ? '—' : eurZeigen(runde2(gh * anteil)));
    grundhonorarZeile.textContent = gh === null
      ? 'Grundhonorar noch nicht berechenbar'
      : `Grundhonorar bei 100 %: ${eurZeigen(gh)}`;

    const kopf = el('tr', {},
      el('th', { text: '' }), el('th', { text: 'LPh' }), el('th', { text: 'Leistungsphase' }),
      el('th', { class: 'r', text: 'HOAI' }), el('th', { class: 'r', text: 'HOAI €' }),
      el('th', { class: 'r', text: 'gewählt' }), el('th', { class: 'r', text: 'gewählt €' }),
    );
    const koerper = el('tbody');

    let summeHoai = 0;
    let summeGewaehlt = 0;

    for (const [nrText, hoaiAnteil] of Object.entries(lb.phasen)) {
      const nr = Number(nrText);
      const p = z.phasen[nr];
      summeHoai += hoaiAnteil;
      if (p.an) summeGewaehlt += (p.anteil ?? hoaiAnteil);

      const schalter = el('input', { type: 'checkbox' });
      schalter.checked = p.an;
      schalter.addEventListener('change', () => { p.an = schalter.checked; neuRechnen(); });

      const anteilFeld = el('input', {
        type: 'text', inputmode: 'decimal', class: 'zahl schmal',
        value: zahlZeigen((p.anteil ?? hoaiAnteil) * 100),
      });
      anteilFeld.addEventListener('change', () => {
        const w = zahlLesen(anteilFeld.value);
        p.anteil = w === null ? null : w / 100;
        p.teil = {};                       // Handeingabe schlägt die Teilleistungen
        neuRechnen();
      });

      const teilOffen = el('tr', { class: 'teilzeile', hidden: !p.offen });
      const zelleAufklappen = gl?.phasen?.[nr]?.leistungen?.length
        ? el('button', {
          class: 'aufklapp', type: 'button',
          'aria-expanded': String(!!p.offen), 'aria-label': `Teilleistungen LPh ${nr}`,
          onclick: () => { p.offen = !p.offen; zeichnePhasen(); },
        }, p.offen ? '▾' : '▸')
        : el('span', { class: 'klein', text: '' });

      const gewaehltAnteil = p.an ? (p.anteil ?? hoaiAnteil) : 0;
      koerper.append(el('tr', { class: p.an ? '' : 'aus' },
        el('td', {}, zelleAufklappen),
        el('td', { class: 'mono' }, schalter, el('span', { text: ` ${nr}` })),
        el('td', { text: lb.namen[nr] || '' }),
        el('td', { class: 'r mono grau', text: prozent(hoaiAnteil) }),
        el('td', { class: 'r mono grau', text: eur(hoaiAnteil) }),
        el('td', { class: 'r' }, el('div', { class: 'mitEinheit eng' }, anteilFeld, el('span', { class: 'einheit', text: '%' }))),
        el('td', { class: `r mono ${p.an ? '' : 'grau'}`, text: p.an ? eur(gewaehltAnteil) : '—' }),
      ));

      if (p.offen && gl?.phasen?.[nr]) {
        const zelle = el('td', { colspan: 7 });
        zelle.append(teilleistungenZeichnen(nr, gl.phasen[nr], hoaiAnteil, p, bewertung, z, () => {
          neuRechnen();
        }));
        teilOffen.append(zelle);
        koerper.append(teilOffen);
      }
    }

    phasenBox.append(
      el('div', { class: 'tabellenrolle' },
        el('table', { class: 'tabelle phasentabelle' },
          el('thead', {}, kopf), koerper,
          el('tfoot', {}, el('tr', {},
            el('td', { text: '' }), el('td', { text: '' }), el('td', { text: 'Summe' }),
            el('td', { class: 'r mono grau', text: prozent(summeHoai) }),
            el('td', { class: 'r mono grau', text: eur(summeHoai) }),
            el('td', { class: 'r mono', text: prozent(summeGewaehlt) }),
            el('td', { class: 'r mono', text: eur(summeGewaehlt) }),
          )),
        )),
      el('div', { class: 'knopfreihe' },
        el('button', { class: 'knopf leise', type: 'button',
          onclick: () => { phasenZuruecksetzen(z); neuRechnen(); } }, 'Auf HOAI-Bewertung zurücksetzen'),
        el('button', { class: 'knopf leise', type: 'button',
          onclick: () => { alleAus(z); neuRechnen(); } }, 'Alle abwählen'),
      ),
    );
  }

  wurzel.append(
    el('div', { class: 'abschnitt' }, el('h2', { text: 'Leistungsphasen' })),
    el('p', { class: 'klein', text: 'Die Spalte HOAI zeigt die Bewertung der Verordnung, die Spalte gewählt den vereinbarten Anteil — beides zusätzlich in Euro. '
      + 'Die Beträge sind reines Grundhonorar; Umbauzuschlag, Nebenkosten und Umsatzsteuer kommen darauf, weil sie sich auf die Summe beziehen, nicht auf die einzelne Phase. '
      + 'Das Dreieck öffnet die Grundleistungen der Phase für eine Teilleistungsabrechnung.' }),
    grundhonorarZeile,
    phasenBox,
  );

  // ── Zuschläge ─────────────────────────────────────────
  // Der Block wird bei jedem Wechsel des Leistungsbilds neu gezeichnet: Die
  // Obergrenze des Umbauzuschlags haengt daran (Gebaeude 33 %, Innenraeume
  // 50 %, Freianlagen gar keiner), und ein stehengebliebener Hinweis waere eine
  // falsche Auskunft.
  const zuschlagBox = el('div');
  const zeichneZuschlaege = () => {
    leeren(zuschlagBox);
    const lbA = LEISTUNGSBILDER[z.leistungsbild];
    const erlaubt = !!lbA.umbauzuschlagBis;
    if (!erlaubt) z.umbauzuschlag = 0;

    const fUmbau = feld({
      label: 'Umbauzuschlag', art: 'zahl', einheit: '%',
      wert: zahlZeigen(z.umbauzuschlag * 100),
      hinweis: erlaubt
        ? `${lbA.umbauzuschlagFundstelle} — bis ${prozent(lbA.umbauzuschlagBis)}`
        : `Für ${lbA.bezeichnung} sieht die HOAI keinen Umbauzuschlag vor.`,
      onEingabe: (w) => {
        z.umbauzuschlag = (w ?? 0) / 100;
        pruefeGrenze();
        neuRechnen();
      },
    });
    if (!erlaubt) fUmbau.eingabe.disabled = true;

    const pruefeGrenze = () => {
      if (!erlaubt) return;
      const h = fUmbau.querySelector('.hinweis');
      if (z.umbauzuschlag > lbA.umbauzuschlagBis + 0.0001) {
        h.textContent = `Über der Obergrenze von ${prozent(lbA.umbauzuschlagBis)} nach `
          + `${lbA.umbauzuschlagFundstelle}. So vereinbart wäre der übersteigende Teil angreifbar.`;
        h.className = 'hinweis fehler';
      } else {
        h.textContent = `${lbA.umbauzuschlagFundstelle} — bis ${prozent(lbA.umbauzuschlagBis)}`;
        h.className = 'hinweis';
      }
    };
    pruefeGrenze();

    zuschlagBox.append(el('div', { class: 'feldreihe-3' },
      fUmbau,
      feld({
        label: 'Nebenkosten', art: 'zahl', einheit: '%', wert: zahlZeigen(z.nebenkosten * 100),
        hinweis: '§ 14 — pauschal',
        onEingabe: (w) => { z.nebenkosten = (w ?? 0) / 100; neuRechnen(); },
      }),
      feld({
        label: 'Umsatzsteuer', art: 'zahl', einheit: '%', wert: zahlZeigen(z.ustSatz * 100),
        onEingabe: (w) => { z.ustSatz = (w ?? 0) / 100; neuRechnen(); },
      }),
    ));
  };

  wurzel.append(
    el('div', { class: 'abschnitt' }, el('h2', { text: 'Zuschläge und Nebenkosten' })),
    zuschlagBox,
  );
  zeichneZuschlaege();

  // ── Ergebnis ──────────────────────────────────────────
  wurzel.append(
    el('div', { class: 'abschnitt' }, el('h2', { text: 'Ergebnis' })),
    ergebnisBox,
  );

  neuRechnen();

  // Die eingetragene Bewertung der Teilleistungen sichern
  wurzel.append(el('div', { class: 'knopfreihe' },
    el('button', {
      class: 'knopf zweit', type: 'button',
      onclick: async () => {
        const e2 = await einstellungenLesen();
        e2.teilleistungen = bewertung;
        await einstellungenSchreiben(e2);
        melden('Bewertung der Teilleistungen gespeichert.');
      },
    }, 'Bewertung der Teilleistungen speichern'),
  ));
}

// ————————————————————————————————————————————————————————————————

function phasenZuruecksetzen(z) {
  const lb = LEISTUNGSBILDER[z.leistungsbild];
  z.phasen = {};
  for (const nr of Object.keys(lb.phasen)) {
    z.phasen[Number(nr)] = { an: true, anteil: null, teil: {}, offen: false };
  }
}

function alleAus(z) {
  for (const p of Object.values(z.phasen)) p.an = false;
}

/**
 * Grundleistungen einer Phase mit eigener Bewertung.
 *
 * Die Bewertung in Prozent bezieht sich auf die Phase (Summe = 100 %). Wer
 * einzelne Leistungen abwählt, bekommt den Rest als gewählten Anteil der Phase.
 */
function teilleistungenZeichnen(nr, phase, hoaiAnteil, p, bewertung, z, danach) {
  const lbSchluessel = z.leistungsbild;
  bewertung[lbSchluessel] = bewertung[lbSchluessel] || {};
  const gespeichert = bewertung[lbSchluessel][nr] || {};
  const anzahl = phase.leistungen.length;
  const gleich = anzahl ? 1 / anzahl : 0;
  const eigeneBewertung = Object.keys(gespeichert).length > 0;

  const anteilVon = (b) => (gespeichert[b] ?? gleich);

  const summeGewaehlt = () => phase.leistungen
    .reduce((s, l) => s + (p.teil[l.buchstabe] === false ? 0 : anteilVon(l.buchstabe)), 0);

  // Summe ueber ALLE Grundleistungen, unabhaengig von der Auswahl. Sie muss
  // 100 % ergeben — sonst ist die Bewertung selbst falsch, und die Phase wird
  // mit mehr oder weniger als ihrem HOAI-Anteil abgerechnet. Das faellt sonst
  // niemandem auf, weil die Einzelwerte plausibel aussehen.
  const summeBewertung = () => phase.leistungen
    .reduce((s, l) => s + anteilVon(l.buchstabe), 0);

  const uebernehmen = () => {
    const s = summeGewaehlt();
    // Nichts abgewählt und nichts umbewertet -> die Phase zählt voll
    p.anteil = Math.abs(s - 1) < 0.0001 ? null : runde2(hoaiAnteil * s * 10000) / 10000;
    danach();   // zeichnet die Phasen und damit auch diesen Block neu
  };

  const liste = el('div', { class: 'teilleistungen' });
  for (const l of phase.leistungen) {
    const anKasten = el('input', { type: 'checkbox' });
    anKasten.checked = p.teil[l.buchstabe] !== false;
    anKasten.addEventListener('change', () => {
      p.teil[l.buchstabe] = anKasten.checked;
      uebernehmen();
    });

    const wertFeld = el('input', {
      type: 'text', inputmode: 'decimal', class: 'zahl schmal',
      value: zahlZeigen(anteilVon(l.buchstabe) * 100),
    });
    wertFeld.addEventListener('change', () => {
      const w = zahlLesen(wertFeld.value);
      gespeichert[l.buchstabe] = (w ?? 0) / 100;
      bewertung[lbSchluessel][nr] = gespeichert;
      uebernehmen();
    });

    liste.append(el('div', { class: 'teilzeile-inhalt' },
      anKasten,
      el('span', { class: 'mono buchstabe', text: `${l.buchstabe})` }),
      el('span', { class: 'teiltext', text: l.text }),
      el('div', { class: 'mitEinheit eng' }, wertFeld, el('span', { class: 'einheit', text: '%' })),
    ));
  }

  return el('div', {},
    el('p', { class: 'klein' },
      el('strong', { text: `${phase.bezeichnung} — ${anzahl} Grundleistungen nach ${GRUNDLEISTUNGEN[lbSchluessel].anlage}. ` }),
      eigeneBewertung
        ? 'Eigene Bewertung hinterlegt.'
        : 'Voreinstellung: gleichmäßig verteilt. Das ist KEINE fachliche Bewertung — Tabellen dazu (etwa nach Siemon) sind Fachliteratur und dürfen hier nicht hinterlegt werden. Eigene Werte eintragen und speichern.'),
    liste,
    fuss(),
  );

  function fuss() {
    const bew = summeBewertung();
    const gew = summeGewaehlt();
    const stimmt = Math.abs(bew - 1) < 0.0005;
    return el('div', { class: 'teilfuss' },
      el('p', { class: `klein mono ${stimmt ? '' : 'fehler'}`,
        text: `Bewertung insgesamt: ${prozent(bew)}${stimmt ? '' : ' — muss 100 % ergeben'}` }),
      el('p', { class: 'klein mono', text: `davon gewählt: ${prozent(gew)} der Phase `
        + `= ${prozent(hoaiAnteil * gew)} des Grundhonorars` }),
      stimmt ? null : el('p', { class: 'hinweis fehler',
        text: bew > 1
          ? 'Die Bewertung übersteigt 100 %. Damit würde diese Leistungsphase mit mehr abgerechnet, '
            + 'als die HOAI ihr zuweist — in einer echten Rechnung wäre das angreifbar. '
            + 'Die übrigen Grundleistungen entsprechend verringern.'
          : 'Die Bewertung bleibt unter 100 %. Ein Teil des Honorars der Phase ist damit keiner '
            + 'Grundleistung zugeordnet und fällt bei einer Teilabrechnung weg.' }),
    );
  }
}

/** Baut die Eingaben in einen Aufruf des Rechenkerns um. */
function rechne(z) {
  const lb = LEISTUNGSBILDER[z.leistungsbild];
  const phasen = Object.entries(lb.phasen)
    .map(([nrText]) => Number(nrText))
    .filter((nr) => z.phasen[nr]?.an)
    .map((nr) => {
      const p = z.phasen[nr];
      return p.anteil === null ? { nr } : { nr, vereinbart: p.anteil };
    });

  if (!phasen.length) throw new Error('Keine Leistungsphase gewählt.');

  const zuschlaege = z.umbauzuschlag > 0
    ? [{ art: 'umbau', bezeichnung: 'Umbauzuschlag', prozent: z.umbauzuschlag, fundstelle: '§ 36 HOAI' }]
    : [];

  return honorarermittlung({
    fassung: z.fassung,
    leistungsbild: z.leistungsbild,
    bezeichnung: `${lb.leistungsbildParagraf} HOAI: Leistungsbild ${lb.bezeichnung}`,
    kostenermittlung: {
      grundlage: 'Testrechnung',
      datum: new Date().toLocaleDateString('de-DE'),
      dinFassung: 'DIN 276',
      gruppen: z.gruppen.filter((g) => g.betrag > 0),
    },
    honorarzone: z.honorarzone,
    honorarsatz: z.honorarsatz,
    phasen,
    zuschlaege,
    nebenkosten: { art: 'pauschal', prozent: z.nebenkosten },
  });
}

function ergebnisZeichnen(e, z) {
  const ust = runde2(e.netto * z.ustSatz);
  const brutto = runde2(e.netto + ust);

  return el('div', {},
    el('div', { class: 'karte gefuellt' }, el('dl', { class: 'werte' },
      ...e.zusammenstellung.map((s) => el('div', { class: s.summe ? 'summe' : '' },
        el('dt', { text: s.bez }), el('dd', { text: eurZeigen(s.betrag) }))),
      el('div', {}, el('dt', { text: `+ Umsatzsteuer ${prozent(z.ustSatz)}` }), el('dd', { text: eurZeigen(ust) })),
      el('div', { class: 'summe' }, el('dt', { text: '= Gesamt brutto' }), el('dd', { text: eurZeigen(brutto) })),
    )),
    el('details', { class: 'herleitungsklapp' },
      el('summary', { text: 'Herleitung im Einzelnen' }),
      herleitungZeichnen(e.herleitung)),
  );
}
