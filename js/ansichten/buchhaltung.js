// Belegliste über alle Projekte, mit Zeitraum — und die Übergabe an die Buchhaltung.
//
// Warum eine eigene Ansicht: Das Dashboard gruppiert nach Projekt, weil man so
// arbeitet. Für die Umsatzsteuer-Voranmeldung und für den Steuerberater braucht
// es die andere Sicht — alle Rechnungen eines Zeitraums, in zeitlicher Folge.
// Bei einer Betriebsprüfung ist das die erste Frage.

import {
  el, leeren, eurZeigen, isoNachDe, feld, melden, dateiSpeichern, heuteIso,
} from '../ui.js';
import { SPEICHER, alle } from '../db.js';
import { BELEGART_TEXT, IST_RECHNUNG, STATUS, faelligAm } from '../vorgang.js';
import { buchhaltungCsv, buchhaltungSummen } from '../beleg/buchhaltung.js';

const jahrVon = (iso) => Number(String(iso || '').slice(0, 4));

export async function buchhaltungZeigen(wurzel) {
  const [belege, projekte, adressen] = await Promise.all([
    alle(SPEICHER.BELEGE), alle(SPEICHER.PROJEKTE), alle(SPEICHER.ADRESSEN),
  ]);
  const projektNach = new Map(projekte.map((p) => [p.id, p]));
  const adressNach = new Map(adressen.map((a) => [a.id, a]));

  wurzel.append(el('h1', { text: 'Belege und Buchhaltung' }));

  const jahre = [...new Set(belege.map((b) => jahrVon(b.datum)).filter(Boolean))]
    .sort((a, b) => b - a);
  const jetzt = new Date().getFullYear();
  if (!jahre.includes(jetzt)) jahre.unshift(jetzt);

  const vonF = feld({ label: 'von', art: 'date', wert: `${jahre[0]}-01-01` });
  const bisF = feld({ label: 'bis', art: 'date', wert: heuteIso() });
  const artF = feld({
    label: 'Belege', art: 'auswahl', wert: 'rechnungen',
    optionen: [
      { wert: 'rechnungen', text: 'nur Rechnungen (festgeschrieben)' },
      { wert: 'alle', text: 'alle Belege' },
    ],
  });

  // Schnellwahl: Die Voranmeldung läuft quartalsweise, das Jahr für den Abschluss.
  const schnellwahl = el('div', { class: 'knopfreihe' });
  const setzen = (von, bis) => {
    vonF.eingabe.value = von; bisF.eingabe.value = bis; zeichnen();
  };
  const q = Math.floor(new Date().getMonth() / 3);
  schnellwahl.append(
    el('button', { class: 'knopf leise', onclick: () => {
      const m = q * 3 + 1;
      setzen(`${jetzt}-${String(m).padStart(2, '0')}-01`,
        `${jetzt}-${String(m + 2).padStart(2, '0')}-${['31', '30', '30', '31'][q]}`);
    } }, 'laufendes Quartal'),
    el('button', { class: 'knopf leise', onclick: () => setzen(`${jetzt}-01-01`, `${jetzt}-12-31`) },
      `Jahr ${jetzt}`),
    el('button', { class: 'knopf leise', onclick: () => setzen(`${jetzt - 1}-01-01`, `${jetzt - 1}-12-31`) },
      `Jahr ${jetzt - 1}`),
  );

  const box = el('div');
  wurzel.append(el('div', { class: 'karte' },
    el('div', { class: 'feldreihe' }, vonF, bisF), artF, schnellwahl), box);

  function auswahl() {
    const von = vonF.eingabe.value || '0000-01-01';
    const bis = bisF.eingabe.value || '9999-12-31';
    return belege
      .filter((b) => (b.datum || '') >= von && (b.datum || '') <= bis)
      .filter((b) => (artF.eingabe.value === 'alle'
        ? true
        : IST_RECHNUNG(b.art) && b.status === STATUS.FEST))
      .sort((a, b) => (a.datum || '').localeCompare(b.datum || '')
        || String(a.nummer).localeCompare(String(b.nummer)));
  }

  function zeichnen() {
    leeren(box);
    const liste = auswahl();
    const s = buchhaltungSummen(liste);

    box.append(el('div', { class: 'kennzahlen' },
      kachel('Netto', eurZeigen(s.netto), `${s.anzahl} Belege`),
      kachel('Umsatzsteuer', eurZeigen(s.ust), 'im Zeitraum'),
      kachel('Brutto', eurZeigen(s.brutto), ''),
      kachel('Noch offen', eurZeigen(s.offen), s.offen > 0.005 ? 'nicht bezahlt' : 'alles bezahlt'),
    ));

    box.append(el('div', { class: 'knopfreihe' }, el('button', {
      class: 'knopf akzent',
      onclick: () => {
        if (!liste.length) { melden('Im Zeitraum liegt kein Beleg.', 'fehler'); return; }
        const csv = buchhaltungCsv(liste, { projekte: projektNach, adressen: adressNach });
        const name = `Belege_${vonF.eingabe.value}_bis_${bisF.eingabe.value}.csv`;
        dateiSpeichern(name, csv, 'text/csv;charset=utf-8');
        melden(`${liste.length} Belege gesichert — enthält Kundennamen und alle Beträge.`);
      },
    }, 'Für den Steuerberater sichern (CSV)')));

    if (!liste.length) {
      box.append(el('div', { class: 'leer' },
        el('p', { class: 'klein', text: 'Im gewählten Zeitraum liegt kein Beleg.' })));
      return;
    }

    box.append(el('ul', { class: 'liste' }, ...liste.map((b) => {
      const p = projektNach.get(b.projektId);
      const a = adressNach.get(b.adresseId);
      const offen = Math.round(((b.brutto || 0) - (b.gezahlt || 0)) * 100) / 100;
      const f = IST_RECHNUNG(b.art) ? faelligAm(b, 30) : null;
      const ueber = f && Math.abs(offen) > 0.005
        && Date.now() > new Date(`${f}T23:59:59`).getTime();
      return el('li', {}, el('button', {
        class: 'eintrag', type: 'button', onclick: () => { location.hash = `#beleg/${b.id}`; },
      },
        el('div', { class: 'haupt' },
          el('div', { class: 'titel', text: `${b.nummer} · ${BELEGART_TEXT[b.art] || 'Beleg'}` }),
          el('div', { class: ueber ? 'neben warnung' : 'neben', text: [
            isoNachDe(b.datum),
            p ? `${p.nummer} ${p.name}` : null,
            a?.name,
            b.uebernommen ? 'übernommen' : null,
            Math.abs(offen) < 0.005 ? 'bezahlt' : (ueber ? 'überfällig' : `${eurZeigen(offen)} offen`),
          ].filter(Boolean).join(' · ') })),
        el('div', { class: 'betrag', text: eurZeigen(b.brutto ?? 0) }),
      ));
    })));
  }

  for (const f of [vonF, bisF, artF]) f.eingabe.addEventListener('change', zeichnen);
  zeichnen();
}

function kachel(titel, wert, neben) {
  return el('div', { class: 'kachel' },
    el('div', { class: 'kacheltitel', text: titel }),
    el('div', { class: 'kachelwert', text: wert }),
    neben ? el('div', { class: 'kachelneben', text: neben }) : null);
}
