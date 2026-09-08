// Bausteine der Oberflaeche.
//
// Bewusst ohne Framework und ohne innerHTML fuer Nutzerdaten: Projektnamen und
// Adressen kommen aus untermStrich oder von Hand und koennen alles enthalten.
// Alles Dynamische wird ueber textContent gesetzt.

/** Element erzeugen: el('div', {class:'x'}, kind1, kind2) */
export function el(tag, attr = {}, ...kinder) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attr || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;          // nur fuer eigene Vorlagen
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kind of kinder.flat()) {
    if (kind === null || kind === undefined || kind === false) continue;
    n.append(kind instanceof Node ? kind : document.createTextNode(String(kind)));
  }
  return n;
}

export const leeren = (n) => { while (n.firstChild) n.removeChild(n.firstChild); return n; };

/** Kurze Rueckmeldung am unteren Rand. */
export function melden(text, art = '') {
  document.querySelectorAll('.meldung').forEach((m) => m.remove());
  const m = el('div', { class: `meldung ${art}`, role: 'status', text });
  document.body.append(m);
  setTimeout(() => m.remove(), art === 'fehler' ? 6000 : 3200);
}

// ————————————————————————————————————————————————————————————————
// Formularfelder
// ————————————————————————————————————————————————————————————————

/**
 * Ein Eingabefeld mit Beschriftung.
 * @param {object} o {label, wert, art, einheit, hinweis, schritt, optionen, onEingabe, attr}
 */
export function feld(o) {
  const id = `f_${Math.random().toString(36).slice(2, 9)}`;
  let eingabe;

  if (o.art === 'auswahl') {
    eingabe = el('select', { id });
    for (const opt of o.optionen || []) {
      const w = typeof opt === 'object' ? opt.wert : opt;
      const t = typeof opt === 'object' ? opt.text : opt;
      eingabe.append(el('option', { value: w, selected: String(w) === String(o.wert) }, t));
    }
  } else if (o.art === 'mehrzeilig') {
    eingabe = el('textarea', { id, rows: o.zeilen || 3 });
    eingabe.value = o.wert ?? '';
  } else if (o.art === 'schalter') {
    eingabe = el('input', { id, type: 'checkbox' });
    eingabe.checked = !!o.wert;
  } else {
    eingabe = el('input', {
      id,
      type: o.art === 'zahl' ? 'text' : (o.art || 'text'),
      inputmode: o.art === 'zahl' ? 'decimal' : (o.inputmode || null),
      class: o.art === 'zahl' ? 'zahl' : null,
      placeholder: o.platzhalter || null,
      autocomplete: o.autocomplete || 'off',
    });
    eingabe.value = o.wert ?? '';
  }

  for (const [k, v] of Object.entries(o.attr || {})) eingabe.setAttribute(k, v);

  // Schreibweise beim Tippen herstellen und die Angabe pruefen. Beides optional;
  // die Pruefung schreibt ihr Ergebnis in die Hinweiszeile unter dem Feld.
  let hinweisBox = null;
  const pruefen = () => {
    if (!o.pruefen || !hinweisBox) return;
    const e = o.pruefen(eingabe.value);
    if (e.ok === null) {
      hinweisBox.textContent = o.hinweis || '';
      hinweisBox.className = 'hinweis';
    } else {
      hinweisBox.textContent = e.text;
      hinweisBox.className = `hinweis ${e.ok ? 'gut' : 'fehler'}`;
    }
  };
  if (o.formatieren) {
    eingabe.addEventListener('input', () => {
      import('./format.js').then(({ feldFormatieren }) => {
        feldFormatieren(eingabe, o.formatieren);
        pruefen();
      });
    });
    eingabe.addEventListener('blur', () => {
      import('./format.js').then(({ feldFormatieren }) => {
        feldFormatieren(eingabe, o.formatieren);
        pruefen();
      });
    });
  } else if (o.pruefen) {
    eingabe.addEventListener('input', pruefen);
  }

  if (o.onEingabe) eingabe.addEventListener('input', () => o.onEingabe(wertVon(eingabe, o.art), eingabe));
  if (o.onAenderung) eingabe.addEventListener('change', () => o.onAenderung(wertVon(eingabe, o.art), eingabe));

  const huelle = o.einheit
    ? el('div', { class: 'mitEinheit' }, eingabe, el('span', { class: 'einheit', text: o.einheit }))
    : eingabe;

  const box = el('div', { class: 'feld' },
    o.label ? el('label', { for: id, text: o.label }) : null,
    o.art === 'schalter'
      ? el('div', { class: 'mitEinheit' }, eingabe, el('span', { text: o.schaltertext || '' }))
      : huelle,
    (o.hinweis || o.pruefen)
      ? (hinweisBox = el('div', { class: `hinweis ${o.hinweisArt || ''}`, text: o.hinweis || '' }))
      : null,
  );
  box.eingabe = eingabe;
  if (o.pruefen && eingabe.value) pruefen();
  return box;
}

function wertVon(eingabe, art) {
  if (art === 'schalter') return eingabe.checked;
  if (art === 'zahl') return zahlLesen(eingabe.value);
  return eingabe.value;
}

/** "1.234,56" oder "1234.56" -> 1234.56 ; leer -> null */
export function zahlLesen(text) {
  if (text === null || text === undefined) return null;
  let t = String(text).trim().replace(/\s|€|%/g, '');
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const z = Number(t);
  return Number.isFinite(z) ? z : null;
}

const FMT = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const zahlZeigen = (z) => (Number.isFinite(z) ? FMT.format(z) : '');
export const eurZeigen = (z) => (Number.isFinite(z) ? FMT.format(z) + ' €' : '—');

/** Datum von "2026-09-07" nach "07.09.2026" und zurueck. */
export const isoNachDe = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${m[3]}.${m[2]}.${m[1]}` : (iso || '');
};
export const deNachIso = (de) => {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec((de || '').trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : (de || '');
};
export const heuteIso = () => new Date().toISOString().slice(0, 10);

// ————————————————————————————————————————————————————————————————
// Auswahl mit Suche — fuer Projekte und Empfaenger
// ————————————————————————————————————————————————————————————————

/**
 * @param {object} o
 *   {label, eintraege, textVon, nebenVon, onWahl, platzhalter, leerHinweis, onNeu}
 */
export function suchauswahl(o) {
  const treffer = el('div', { class: 'trefferliste' });

  const zeichnen = (suche) => {
    leeren(treffer);
    const s = (suche || '').trim().toLowerCase();
    const liste = (o.eintraege || []).filter((e) => {
      if (!s) return true;
      return `${o.textVon(e)} ${o.nebenVon ? o.nebenVon(e) : ''}`.toLowerCase().includes(s);
    }).slice(0, 40);

    if (!liste.length) {
      treffer.append(el('div', { class: 'leer' },
        el('p', { class: 'klein', text: o.leerHinweis || 'Kein Treffer.' }),
        o.onNeu ? el('button', {
          class: 'knopf zweit', type: 'button',
          onclick: () => o.onNeu(suche),
        }, 'Neu anlegen') : null,
      ));
      return;
    }
    for (const e of liste) {
      treffer.append(el('button', { type: 'button', onclick: () => o.onWahl(e) },
        el('div', { text: o.textVon(e) }),
        o.nebenVon ? el('div', { class: 'neben', text: o.nebenVon(e) }) : null,
      ));
    }
  };

  const suche = feld({
    label: o.label,
    platzhalter: o.platzhalter || 'Suchen …',
    art: 'search',
    onEingabe: (w) => zeichnen(w),
  });
  zeichnen('');

  return el('div', { class: 'suchfeld' },
    suche,
    treffer,
    o.onNeu ? el('div', { class: 'knopfreihe' },
      el('button', { class: 'knopf zweit', type: 'button', onclick: () => o.onNeu('') }, 'Neu anlegen'),
    ) : null,
  );
}

// ————————————————————————————————————————————————————————————————
// Bestaetigung
// ————————————————————————————————————————————————————————————————

export function bestaetigen(frage, details = '') {
  return new Promise((res) => {
    const dlg = el('dialog', { class: 'karte', style: 'max-width:420px;border-radius:2px;' },
      el('h3', { text: frage }),
      details ? el('p', { class: 'klein', text: details }) : null,
      el('div', { class: 'knopfreihe' },
        el('button', { class: 'knopf zweit', onclick: () => { dlg.close(); res(false); } }, 'Abbrechen'),
        el('button', { class: 'knopf', onclick: () => { dlg.close(); res(true); } }, 'Ja'),
      ),
    );
    document.body.append(dlg);
    dlg.addEventListener('close', () => dlg.remove());
    dlg.showModal();
  });
}

/** Datei zum Speichern anbieten. */
export function dateiSpeichern(name, inhalt, typ = 'application/octet-stream') {
  const blob = inhalt instanceof Blob ? inhalt : new Blob([inhalt], { type: typ });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
}

/** Datei vom Nutzer einlesen. */
export function dateiLaden(endungen = '.json') {
  return new Promise((res) => {
    const inp = el('input', { type: 'file', accept: endungen, style: 'display:none' });
    inp.addEventListener('change', async () => {
      const d = inp.files?.[0];
      inp.remove();
      res(d ? { name: d.name, text: await d.text() } : null);
    });
    document.body.append(inp);
    inp.click();
  });
}

/** Symbole der Navigation — schlichte Strichzeichnungen. */
export const SYMBOL = {
  belege: 'M6 3h9l5 5v13H6zM15 3v5h5M9 13h7M9 17h7',
  neu: 'M12 5v14M5 12h14',
  stammdaten: 'M4 6h16M4 12h16M4 18h10',
  einstellungen: 'M12 15a3 3 0 100-6 3 3 0 000 6z M19 12a7 7 0 00-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 00-1.7-1L14.5 3h-4l-.4 2.6a7 7 0 00-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 000 2l-2 1.5 2 3.4 2.3-1a7 7 0 001.7 1l.4 2.6h4l.4-2.6a7 7 0 001.7-1l2.3 1 2-3.4-2-1.5c.1-.3.1-.7.1-1z',
};

export function symbol(pfad) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', pfad);
  svg.append(p);
  return svg;
}
