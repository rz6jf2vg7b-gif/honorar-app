// Formular fuer den Vertragsstand: alles, woraus sich das Honorar ergibt.
//
// Es ist bewusst ein Formular und kein Assistent-Schritt je Feld: Wer einen
// Vertrag erfasst, hat die Kostenberechnung vor sich liegen und arbeitet sie
// von oben nach unten ab. Auf dem Telefon steht alles untereinander, auf
// groesseren Geraeten in zwei Spalten.

import { el, feld, leeren, zahlLesen, zahlZeigen, eurZeigen, melden } from '../ui.js';
import { LEISTUNGSBILDER, HONORARSAETZE, ZONE_ROEMISCH, HONORARZONEN } from '../hoai/leistungsbilder.js';
import {
  ANRECHNUNG, MASSNAHME_TEXT, IST_UMBAU, IST_INSTANDSETZUNG,
  UMBAUZUSCHLAG_OHNE_VEREINBARUNG, OBJEKTUEBERWACHUNG_ZUSCHLAG_MAX,
} from '../hoai/rechnen.js';
import { prozent } from '../hoai/geld.js';
import { honorarzoneErmitteln } from './honorarzone.js';

const KOSTENGRUPPEN_VORLAGE = [
  { nr: '200', bezeichnung: 'Herrichten und Erschließen', anrechnung: ANRECHNUNG.KEINE },
  { nr: '300', bezeichnung: 'Bauwerk – Baukonstruktionen', anrechnung: ANRECHNUNG.VOLL },
  { nr: '400', bezeichnung: 'Bauwerk – Technische Anlagen', anrechnung: ANRECHNUNG.TECHNIK_33_2 },
  { nr: '500', bezeichnung: 'Außenanlagen', anrechnung: ANRECHNUNG.VOLL },
  { nr: '600', bezeichnung: 'Ausstattung und Kunstwerke', anrechnung: ANRECHNUNG.VOLL },
];

const ANRECHNUNG_TEXT = [
  { wert: ANRECHNUNG.VOLL, text: '100 % anrechenbar' },
  { wert: ANRECHNUNG.TECHNIK_33_2, text: 'Technik nach § 33 Abs. 2' },
  { wert: ANRECHNUNG.ANTEILIG, text: 'anteilig …' },
  { wert: ANRECHNUNG.KEINE, text: 'nicht anrechenbar' },
];

/**
 * @param {object} o {vertrag, vorgaben, onAenderung}
 * @returns {HTMLElement} mit .lesen() -> Vertragsdaten
 */
export function vertragsformular(o) {
  const v = strukturieren(o.vertrag, o.vorgaben);
  const wurzel = el('div');
  const melden_ = () => o.onAenderung && o.onAenderung(lesen());

  // ── Leistungsbild und Fassung ────────────────────────
  const fassungF = feld({
    label: 'HOAI-Fassung', art: 'auswahl', wert: v.fassung,
    optionen: [
      { wert: 2021, text: 'HOAI 2021 — Orientierungswerte, frei vereinbar' },
      { wert: 2013, text: 'HOAI 2013 — Mindest- und Höchstsatz verbindlich' },
    ],
    onAenderung: () => { satzFeldNeu(); melden_(); },
  });

  const leistungsbildF = feld({
    label: 'Leistungsbild', art: 'auswahl', wert: v.leistungsbild,
    optionen: Object.entries(LEISTUNGSBILDER).map(([k, lb]) => ({
      wert: k, text: `${lb.bezeichnung} (${lb.leistungsbildParagraf})`,
    })),
    onAenderung: () => { phasenNeu(); zoneFeldNeu(); melden_(); },
  });

  const bezeichnungF = feld({
    label: 'Bezeichnung auf dem Beleg',
    wert: v.bezeichnung,
    platzhalter: 'z. B. Leistungsbild Gebäude, Bauteil B',
    hinweis: 'Leer lassen: Die App setzt Paragraf und Leistungsbild ein.',
    onEingabe: melden_,
  });

  // ── Kostenermittlung ─────────────────────────────────
  const grundlageF = feld({
    label: 'Grundlage', art: 'auswahl', wert: v.kostenermittlung.grundlage,
    optionen: ['Kostenberechnung', 'Kostenschätzung', 'Kostenrahmen', 'Kostenanschlag', 'Kostenfeststellung'],
    onAenderung: melden_,
  });
  const kostenDatumF = feld({ label: 'vom', type: 'date', art: 'date', wert: v.kostenermittlung.datum, onAenderung: melden_ });
  const dinF = feld({
    label: 'DIN-Fassung', art: 'auswahl', wert: v.kostenermittlung.dinFassung,
    optionen: ['DIN 276 Ausgabe Dezember 2008', 'DIN 276 Ausgabe Dezember 2018', ''],
    onAenderung: melden_,
  });

  const gruppenBox = el('div');
  const gruppenZeichnen = () => {
    leeren(gruppenBox);
    v.kostenermittlung.gruppen.forEach((g, i) => {
      const betragF = feld({
        label: `${g.nr} ${g.bezeichnung}`, art: 'zahl', wert: g.betrag ? zahlZeigen(g.betrag) : '',
        einheit: '€ netto', platzhalter: '0,00',
        onEingabe: (w) => { g.betrag = w ?? 0; melden_(); },
      });
      const artF = feld({
        art: 'auswahl', wert: g.anrechnung, optionen: ANRECHNUNG_TEXT,
        onAenderung: (w) => {
          g.anrechnung = w;
          if (w === ANRECHNUNG.ANTEILIG && g.anteil == null) g.anteil = 0.5;
          gruppenZeichnen(); melden_();
        },
      });
      const anteilF = g.anrechnung === ANRECHNUNG.ANTEILIG ? feld({
        art: 'zahl', wert: g.anteil != null ? zahlZeigen(g.anteil * 100) : '', einheit: '%',
        onEingabe: (w) => { g.anteil = (w ?? 0) / 100; melden_(); },
      }) : null;
      const bemerkungF = feld({
        wert: g.bemerkung || '', platzhalter: 'Bemerkung (erscheint als Fußnote)',
        onEingabe: (w) => { g.bemerkung = w; melden_(); },
      });

      gruppenBox.append(el('div', { class: 'karte' },
        betragF,
        el('div', { class: anteilF ? 'feldreihe' : '' }, artF, anteilF),
        bemerkungF,
      ));
    });
  };
  gruppenZeichnen();

  const mvbF = feld({
    label: 'Mitzuverarbeitende Bausubstanz (§ 4 Abs. 3)', art: 'zahl', einheit: '€ netto',
    wert: v.kostenermittlung.mitzuverarbeitendeBausubstanz ? zahlZeigen(v.kostenermittlung.mitzuverarbeitendeBausubstanz) : '',
    hinweis: 'Nur ansetzen, wenn sie im Vertrag vereinbart ist.',
    onEingabe: (w) => { v.kostenermittlung.mitzuverarbeitendeBausubstanz = w ?? 0; melden_(); },
  });

  // ── Honorarzone und -satz ────────────────────────────
  const zoneBox = el('div');
  const zoneFeldNeu = () => {
    leeren(zoneBox);
    const lb = LEISTUNGSBILDER[leistungsbildF.eingabe.value];
    const anzahl = lb?.tafel === 'technische_ausruestung' ? 3 : 5;
    if (v.honorarzone > anzahl) v.honorarzone = anzahl;
    zoneBox.append(feld({
      label: 'Honorarzone', art: 'auswahl', wert: v.honorarzone,
      optionen: Array.from({ length: anzahl }, (_, i) => ({
        wert: i + 1, text: `${ZONE_ROEMISCH[i + 1]} — ${HONORARZONEN[i + 1]}`,
      })),
      onAenderung: (w) => { v.honorarzone = Number(w); melden_(); },
    }),
    // Der Weg über Objektliste und Bewertungsmerkmale — er liefert Zone UND
    // Begründung. Von Hand tippt man die Begründung sonst frei, und genau
    // danach fragen öffentliche Auftraggeber.
    el('div', { class: 'knopfreihe', style: 'margin-top:6px' },
      el('button', {
        class: 'knopf zweit', type: 'button',
        onclick: () => honorarzoneErmitteln({
          leistungsbild: leistungsbildF.eingabe.value,
          zone: v.honorarzone,
          begruendung: zoneBegruendungF.eingabe.value,
          onUebernehmen: (zone, begruendung) => {
            v.honorarzone = zone;
            zoneBegruendungF.eingabe.value = begruendung;
            zoneFeldNeu();
            melden_();
          },
        }),
      }, 'Zone ermitteln')),
    );
  };
  zoneFeldNeu();

  const zoneBegruendungF = feld({
    label: 'Begründung der Honorarzone', wert: v.honorarzoneBegruendung,
    platzhalter: 'z. B. Schulen mit durchschnittlichen Planungsanforderungen (Objektliste)',
    hinweis: 'Erscheint in der Herleitung — bei öffentlichen Auftraggebern wird danach gefragt.',
    onEingabe: melden_,
  });

  const satzBox = el('div');
  const satzFeldNeu = () => {
    leeren(satzBox);
    const fassung = Number(fassungF.eingabe.value);
    satzBox.append(feld({
      label: 'Honorarsatz', art: 'auswahl', wert: v.honorarsatz,
      optionen: HONORARSAETZE[fassung].map((s) => ({ wert: s.anteil, text: `${s.bezeichnung} (${prozent(s.anteil)})` })),
      onAenderung: (w) => { v.honorarsatz = Number(w); melden_(); },
      hinweis: fassung === 2013
        ? 'Unter HOAI 2013 sind Mindest- und Höchstsatz verbindlich.'
        : 'Unter HOAI 2021 sind die Tafelwerte Orientierung; die Vereinbarung bedarf der Textform.',
    }));
  };
  satzFeldNeu();

  // ── Leistungsphasen ──────────────────────────────────
  const phasenBox = el('div');
  const phasenNeu = () => {
    const lb = LEISTUNGSBILDER[leistungsbildF.eingabe.value];
    const alt = new Map((v.phasen || []).map((p) => [p.nr, p.vereinbart]));
    v.phasen = Object.keys(lb.phasen).map(Number).sort((a, b) => a - b)
      .map((nr) => ({ nr, vereinbart: alt.has(nr) ? alt.get(nr) : lb.phasen[nr] }));
    phasenZeichnen();
  };

  const phasenZeichnen = () => {
    leeren(phasenBox);
    const lb = LEISTUNGSBILDER[leistungsbildF.eingabe.value];
    const summeZelle = el('td', { class: 'num' });
    const tab = el('table', { class: 'lphtabelle' },
      el('thead', {}, el('tr', {},
        el('th', { text: '' }), el('th', { text: 'Leistungsphase' }),
        el('th', { class: 'num', text: 'Verordnung' }), el('th', { class: 'num', text: 'vereinbart %' }),
      )),
    );
    const koerper = el('tbody');
    for (const p of v.phasen) {
      const voll = lb.phasen[p.nr];
      const eingabe = el('input', {
        type: 'text', inputmode: 'decimal', value: zahlZeigen(p.vereinbart * 100),
        'aria-label': `Leistungsphase ${p.nr} vereinbart in Prozent`,
      });
      eingabe.addEventListener('input', () => {
        p.vereinbart = (zahlLesen(eingabe.value) ?? 0) / 100;
        summeAktualisieren(); melden_();
      });
      koerper.append(el('tr', {},
        el('td', { class: 'nr', text: String(p.nr) }),
        el('td', { class: 'bez' }, el('span', { text: lb.namen[p.nr] })),
        el('td', { class: 'num klein', text: prozent(voll) }),
        el('td', { class: 'num' }, eingabe),
      ));
    }
    const summeAktualisieren = () => {
      const s = v.phasen.reduce((a, p) => a + (p.vereinbart || 0), 0);
      summeZelle.textContent = prozent(s, 2);
      summeZelle.style.color = s > 1.0000001 ? 'var(--fehler)' : '';
    };
    tab.append(koerper, el('tfoot', {}, el('tr', {},
      el('td', { colspan: 3, text: 'Summe' }), summeZelle,
    )));
    summeAktualisieren();

    phasenBox.append(
      tab,
      el('div', { class: 'knopfreihe' },
        el('button', {
          class: 'knopf leise', type: 'button',
          onclick: () => { for (const p of v.phasen) p.vereinbart = lb.phasen[p.nr]; phasenZeichnen(); melden_(); },
        }, 'Alle voll'),
        el('button', {
          class: 'knopf leise', type: 'button',
          onclick: () => { for (const p of v.phasen) p.vereinbart = 0; phasenZeichnen(); melden_(); },
        }, 'Alle auf null'),
      ),
    );
  };
  phasenNeu();

  // ── Zuschläge und Nebenkosten ────────────────────────
  // ── Art der Maßnahme und die daran hängenden Zuschläge ──
  // Erst die Art nach § 2, dann was daraus folgt: Umbau und Modernisierung
  // tragen einen Umbauzuschlag, Instandsetzung und Instandhaltung dagegen eine
  // Erhöhung der Objektüberwachung. Beides nebeneinander anzubieten hieße,
  // etwas anzubieten, das die Verordnung nicht kennt.
  const zuschlagBox = el('div');

  const zeichneZuschlaege = () => {
    leeren(zuschlagBox);
    const lb = LEISTUNGSBILDER[leistungsbildF.eingabe.value];
    const massnahme = v.massnahme || '';

    if (IST_UMBAU(massnahme)) {
      const grenze = lb?.umbauzuschlagBis;
      const fund = lb?.umbauzuschlagFundstelle || '§ 36';

      const vereinbartF = feld({
        label: '', art: 'schalter', wert: v.umbauzuschlagVereinbart !== false,
        schaltertext: 'Zuschlag in Textform vereinbart',
        hinweis: 'Ohne Vereinbarung gelten 20 % ab durchschnittlichem Schwierigkeitsgrad '
          + 'als vereinbart (§ 6 Abs. 2 Satz 4) — das Honorar steht dir also auch dann zu.',
        onEingabe: (w) => {
          v.umbauzuschlagVereinbart = w;
          if (!w) v.umbauzuschlag = UMBAUZUSCHLAG_OHNE_VEREINBARUNG;
          zeichneZuschlaege();
          melden_();
        },
      });

      const hoehe = feld({
        label: 'Umbau-/Modernisierungszuschlag', art: 'zahl', einheit: '%',
        wert: v.umbauzuschlag ? zahlZeigen(v.umbauzuschlag * 100) : '',
        hinweis: grenze
          ? `${fund} — bis ${prozent(grenze)}.`
          : `Für ${lb?.bezeichnung} sieht die HOAI keinen Umbauzuschlag vor.`,
        onEingabe: (w) => { v.umbauzuschlag = (w ?? 0) / 100; melden_(); },
      });
      if (!grenze) hoehe.eingabe.disabled = true;
      if (v.umbauzuschlagVereinbart === false) hoehe.eingabe.disabled = true;

      zuschlagBox.append(vereinbartF, hoehe);
      return;
    }

    if (IST_INSTANDSETZUNG(massnahme)) {
      const lph8 = lb?.phasen?.[8];
      const f = feld({
        label: `Erhöhung der ${lb?.namen?.[8] || 'Objektüberwachung'}`, art: 'zahl', einheit: '%',
        wert: v.objektueberwachungZuschlag ? zahlZeigen(v.objektueberwachungZuschlag * 100) : '',
        hinweis: lph8
          ? `§ 12 Abs. 2 — bis ${prozent(OBJEKTUEBERWACHUNG_ZUSCHLAG_MAX)} der Bewertung dieser Phase, `
            + `in Textform zu vereinbaren. ${prozent(lph8)} würden damit bis zu `
            + `${prozent(Math.round(lph8 * 1.5 * 10000) / 10000)}.`
          : `${lb?.bezeichnung} kennt keine Leistungsphase 8 — § 12 Abs. 2 greift nicht.`,
        onEingabe: (w) => { v.objektueberwachungZuschlag = (w ?? 0) / 100; melden_(); },
      });
      if (!lph8) f.eingabe.disabled = true;
      zuschlagBox.append(f);
      return;
    }

    zuschlagBox.append(el('p', { class: 'klein', text: massnahme
      ? 'Für diese Art der Maßnahme sieht die HOAI weder einen Umbauzuschlag noch eine Erhöhung der Objektüberwachung vor.'
      : 'Art der Maßnahme wählen — davon hängt ab, welcher Zuschlag in Betracht kommt.' }));
  };

  const massnahmeF = feld({
    label: 'Art der Maßnahme', art: 'auswahl', wert: v.massnahme || '',
    optionen: [{ wert: '', text: '— nicht angegeben —' },
      ...Object.entries(MASSNAHME_TEXT).map(([w, text]) => ({ wert: w, text }))],
    hinweis: 'Nach § 2 HOAI. Bestimmt, welcher Zuschlag zulässig ist.',
    onAenderung: (w) => {
      v.massnahme = w;
      // Was zur alten Art gehörte, gilt für die neue nicht.
      if (!IST_UMBAU(w)) v.umbauzuschlag = 0;
      if (!IST_INSTANDSETZUNG(w)) v.objektueberwachungZuschlag = 0;
      zeichneZuschlaege();
      melden_();
    },
  });
  zeichneZuschlaege();

  const nkArtF = feld({
    label: 'Nebenkosten', art: 'auswahl', wert: v.nebenkosten?.art || 'pauschal',
    optionen: [
      { wert: 'pauschal', text: 'pauschal in Prozent (§ 14)' },
      { wert: 'einzeln', text: 'auf Einzelnachweis' },
      { wert: 'keine', text: 'keine' },
    ],
    onAenderung: () => { nkZeichnen(); melden_(); },
  });
  const nkBox = el('div');
  const nkZeichnen = () => {
    leeren(nkBox);
    const art = nkArtF.eingabe.value;
    if (art === 'pauschal') {
      nkBox.append(feld({
        art: 'zahl', einheit: '% auf Honorar und Zuschläge',
        wert: zahlZeigen((v.nebenkosten?.prozent ?? 0.05) * 100),
        onEingabe: (w) => { v.nebenkosten = { art: 'pauschal', prozent: (w ?? 0) / 100 }; melden_(); },
      }));
      if (v.nebenkosten?.art !== 'pauschal') v.nebenkosten = { art: 'pauschal', prozent: v.nebenkosten?.prozent ?? 0.05 };
    } else if (art === 'einzeln') {
      if (v.nebenkosten?.art !== 'einzeln') v.nebenkosten = { art: 'einzeln', posten: [] };
      const liste = el('div');
      const zeichnen = () => {
        leeren(liste);
        v.nebenkosten.posten.forEach((p, i) => {
          liste.append(el('div', { class: 'feldreihe' },
            feld({ wert: p.bezeichnung, platzhalter: 'Bezeichnung', onEingabe: (w) => { p.bezeichnung = w; melden_(); } }),
            feld({
              art: 'zahl', einheit: '€', wert: p.betrag ? zahlZeigen(p.betrag) : '',
              onEingabe: (w) => { p.betrag = w ?? 0; melden_(); },
            }),
          ));
        });
        liste.append(el('div', { class: 'knopfreihe' },
          el('button', {
            class: 'knopf leise', type: 'button',
            onclick: () => { v.nebenkosten.posten.push({ bezeichnung: '', betrag: 0 }); zeichnen(); },
          }, 'Posten hinzufügen'),
        ));
      };
      zeichnen();
      nkBox.append(liste);
    } else {
      v.nebenkosten = null;
    }
  };
  nkZeichnen();

  // ── Zusammenbau ──────────────────────────────────────
  wurzel.append(
    el('h2', { text: 'Leistung' }),
    el('div', { class: 'feldreihe' }, fassungF, leistungsbildF),
    bezeichnungF,

    el('h2', { text: 'Anrechenbare Kosten' }),
    el('div', { class: 'feldreihe-3' }, grundlageF, kostenDatumF, dinF),
    gruppenBox,
    mvbF,

    el('h2', { text: 'Honorarzone und Honorarsatz' }),
    zoneBox, zoneBegruendungF, satzBox,

    el('h2', { text: 'Beauftragte Leistungsphasen' }),
    phasenBox,

    el('h2', { text: 'Zuschläge und Nebenkosten' }),
    massnahmeF, zuschlagBox, nkArtF, nkBox,
  );

  function lesen() {
    return {
      fassung: Number(fassungF.eingabe.value),
      leistungsbild: leistungsbildF.eingabe.value,
      bezeichnung: bezeichnungF.eingabe.value.trim() || undefined,
      kostenermittlung: {
        grundlage: grundlageF.eingabe.value,
        datum: kostenDatumF.eingabe.value,
        dinFassung: dinF.eingabe.value || undefined,
        gruppen: v.kostenermittlung.gruppen
          .filter((g) => Number.isFinite(g.betrag) && g.betrag > 0)
          .map((g) => ({ ...g })),
        mitzuverarbeitendeBausubstanz: v.kostenermittlung.mitzuverarbeitendeBausubstanz || 0,
      },
      honorarzone: v.honorarzone,
      honorarzoneBegruendung: zoneBegruendungF.eingabe.value.trim() || undefined,
      honorarsatz: v.honorarsatz,
      phasen: v.phasen.filter((p) => p.vereinbart > 0).map((p) => ({ nr: p.nr, vereinbart: p.vereinbart })),
      massnahme: v.massnahme || undefined,
      objektueberwachungZuschlag: v.objektueberwachungZuschlag || undefined,
      zuschlaege: v.umbauzuschlag > 0
        ? [{
          art: 'umbau',
          bezeichnung: v.umbauzuschlagVereinbart === false
            ? 'Umbauzuschlag (§ 6 Abs. 2 Satz 4 — ohne Vereinbarung als vereinbart geltend)'
            : 'Umbauzuschlag',
          prozent: v.umbauzuschlag,
          fundstelle: LEISTUNGSBILDER[v.leistungsbild]?.umbauzuschlagFundstelle
            ? `${LEISTUNGSBILDER[v.leistungsbild].umbauzuschlagFundstelle} HOAI`
            : '§ 36 HOAI',
        }]
        : [],
      nebenkosten: v.nebenkosten,
    };
  }

  wurzel.lesen = lesen;
  return wurzel;
}

/** Vorhandene Vertragsdaten oder Vorgaben in die Arbeitsform bringen. */
function strukturieren(vertrag, vorgaben = {}) {
  const v = vertrag ? JSON.parse(JSON.stringify(vertrag)) : {};
  const lbSchluessel = v.leistungsbild || vorgaben.leistungsbild || 'gebaeude';
  const lb = LEISTUNGSBILDER[lbSchluessel];
  return {
    fassung: v.fassung || vorgaben.fassung || 2021,
    leistungsbild: lbSchluessel,
    bezeichnung: v.bezeichnung || '',
    kostenermittlung: {
      grundlage: v.kostenermittlung?.grundlage || 'Kostenberechnung',
      datum: v.kostenermittlung?.datum || '',
      dinFassung: v.kostenermittlung?.dinFassung || 'DIN 276 Ausgabe Dezember 2018',
      gruppen: v.kostenermittlung?.gruppen?.length
        ? JSON.parse(JSON.stringify(v.kostenermittlung.gruppen))
        : KOSTENGRUPPEN_VORLAGE.map((g) => ({ ...g, betrag: 0 })),
      mitzuverarbeitendeBausubstanz: v.kostenermittlung?.mitzuverarbeitendeBausubstanz || 0,
    },
    honorarzone: v.honorarzone || vorgaben.honorarzone || 3,
    honorarzoneBegruendung: v.honorarzoneBegruendung || '',
    honorarsatz: v.honorarsatz ?? vorgaben.honorarsatz ?? 0.5,
    phasen: v.phasen?.length
      ? JSON.parse(JSON.stringify(v.phasen))
      : Object.keys(lb.phasen).map(Number).sort((a, b) => a - b).map((nr) => ({ nr, vereinbart: lb.phasen[nr] })),
    umbauzuschlag: v.zuschlaege?.find((z) => z.art === 'umbau')?.prozent ?? 0,
    umbauzuschlagVereinbart: v.umbauzuschlagVereinbart !== false,
    massnahme: v.massnahme || '',
    objektueberwachungZuschlag: v.objektueberwachungZuschlag || 0,
    nebenkosten: v.nebenkosten !== undefined
      ? v.nebenkosten
      : { art: 'pauschal', prozent: vorgaben.nebenkostenProzent ?? 0.05 },
  };
}
