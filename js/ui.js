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

/**
 * Kinder anhaengen und dabei null/undefined/false ueberspringen.
 *
 * `el()` tut das laengst, aber ein direktes `wurzel.append(x, bedingung ? y : null)`
 * geht an der DOM-Schnittstelle vorbei — und die macht aus einem Nullwert einen
 * sichtbaren Textknoten "null". Auf dem Dashboard stand er zwischen Ueberschrift
 * und Kennzahlen, sobald der erste Beleg erfasst war (gefunden am 10.09.2026,
 * derselbe Fehler wie seinerzeit in der Zeiterfassung).
 */
export function anfuegen(ziel, ...kinder) {
  for (const kind of kinder.flat()) {
    if (kind === null || kind === undefined || kind === false) continue;
    ziel.append(kind instanceof Node ? kind : document.createTextNode(String(kind)));
  }
  return ziel;
}

// ————————————————————————————————————————————————————————————————
// Zurueckgehen
// ————————————————————————————————————————————————————————————————

// Wie oft innerhalb dieser Sitzung navigiert wurde. Nur wenn das mindestens
// einmal geschah, fuehrt history.back() zurueck in die App statt auf die Seite,
// von der man hergekommen ist.
//
// Steht hier und nicht in app.js: Die Ansichten werden von app.js dynamisch
// geladen: importierten sie von dort zurueck, entstuende ein Zyklus.
let schritteInApp = 0;

export function navigationZaehlen() { schritteInApp++; }

/**
 * Eine Ansicht zurueck.
 *
 * Vorher sprang der Zurueck-Knopf fest auf die Stammdaten — wer aus der Suche
 * auf einen Kontakt geklickt hatte, landete danach bei den Projekten. Jetzt
 * geht es dorthin zurueck, wo man herkam; nur wenn es dort nichts gibt (die
 * Ansicht wurde ueber einen Link direkt geoeffnet), greift der Rueckfall.
 */
export function zurueck(rueckfall = '#dashboard') {
  if (schritteInApp > 1) history.back();
  else location.hash = rueckfall;
}

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
  } else if (o.art === 'geld') {
    // Eingabe wie an der Kasse: Die Ziffern schieben von rechts herein, die
    // letzten beiden sind Cent. 9 → 0,09 · 1 → 0,91 · 0 → 9,10 · 0 → 91,00.
    //
    // Warum nicht das normale Zahlenfeld? Weil dort jeder selbst entscheiden
    // muss, wo das Komma hingehoert, und auf dem Telefon das Komma auf einer
    // zweiten Tastaturebene liegt. Beim Erfassen vieler Betraege ist das die
    // Stelle, an der Zahlendreher entstehen. Hier ist die Vorgabe 0,00 und jede
    // Ziffer landet zwangslaeufig richtig.
    //
    // Umgesetzt ueber das `input`-Ereignis statt ueber Tastencodes: Nur so
    // wirken auch Einfuegen, Ruecktaste und die Bildschirmtastatur des Telefons
    // (die keine verwertbaren Tastencodes liefert). Die Ruecktaste schiebt die
    // Ziffern wieder hinaus — 91,00 wird zu 9,10.
    eingabe = el('input', {
      id, type: 'text', inputmode: 'numeric', class: 'zahl', autocomplete: 'off',
    });
    const setzen = (cent) => { eingabe.value = FMT.format(cent / 100); };
    setzen(Math.round(Math.abs(zahlLesen(String(o.wert ?? '')) || 0) * 100));
    eingabe.addEventListener('input', () => {
      setzen(centAusEingabe(eingabe.value));
      // Der Cursor gehoert ans Ende — man schreibt hier nie in die Mitte.
      const n = eingabe.value.length;
      eingabe.setSelectionRange(n, n);
    });
    eingabe.addEventListener('focus', () => {
      const n = eingabe.value.length;
      requestAnimationFrame(() => eingabe.setSelectionRange(n, n));
    });
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
    // Die Beschriftung eines Schalters ist ein <label> und kein <span>: Sonst
    // ist auf dem Telefon nur das Kaestchen selbst zu treffen, und das ist
    // kleiner als eine Fingerkuppe.
    o.art === 'schalter'
      ? el('div', { class: 'mitEinheit' }, eingabe,
          el('label', { for: id, text: o.schaltertext || '' }))
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
  if (art === 'zahl' || art === 'geld') return zahlLesen(eingabe.value);
  return eingabe.value;
}

/** "1.234,56" oder "1234.56" -> 1234.56 ; leer -> null */
/**
 * Die Kassenlogik als reine Funktion — damit sie pruefbar ist.
 *
 * Aus dem Rohtext des Feldes werden alle Ziffern genommen und als Cent gelesen.
 * Das deckt Tippen, Einfuegen und die Ruecktaste in einem ab: Loescht der
 * Browser aus "91,00" das letzte Zeichen, bleiben die Ziffern "9100" minus die
 * letzte — also 910 Cent, 9,10 €. Die Ziffern schieben wieder hinaus.
 *
 * Begrenzt auf elf Stellen (999.999.999,99). Ein Architektenhonorar darueber
 * gibt es nicht, und ohne Grenze liesse sich das Feld ins Unlesbare fuellen.
 */
export function centAusEingabe(rohtext) {
  const ziffern = String(rohtext ?? '').replace(/\D/g, '').slice(0, 11);
  return ziffern ? parseInt(ziffern, 10) : 0;
}

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
 *   {label, eintraege, textVon, nebenVon, suchtextVon?, onWahl, platzhalter,
 *    leerHinweis, onNeu}
 *
 * `suchtextVon` bestimmt, worüber gesucht wird. Ohne die Angabe wird über das
 * gesucht, was angezeigt wird — das reicht selten: Ein Kontakt wird über den
 * Namen seines Ansprechpartners gesucht, auch wenn in der Zeile die Firma steht.
 */
export function suchauswahl(o) {
  const treffer = el('div', { class: 'trefferliste' });

  const zeichnen = (suche) => {
    leeren(treffer);
    const s = (suche || '').trim().toLowerCase();
    const suchtext = o.suchtextVon
      || ((e) => `${o.textVon(e)} ${o.nebenVon ? o.nebenVon(e) : ''}`);
    const liste = (o.eintraege || []).filter((e) => {
      if (!s) return true;
      return suchtext(e).toLowerCase().includes(s);
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

/**
 * Datei vom Nutzer waehlen — als Datei, nicht als Text.
 *
 * Gegenstueck zu dateiLaden(): Ein eingescanntes Angebot ist ein PDF oder ein
 * Foto, kein Text. `capture` fehlt bewusst — auf dem Telefon soll die Wahl
 * zwischen Kamera und Dateien beim Nutzer bleiben.
 */
export function dateiWaehlen(endungen = 'application/pdf,image/*') {
  return new Promise((res) => {
    const inp = el('input', { type: 'file', accept: endungen, style: 'display:none' });
    inp.addEventListener('change', () => {
      const d = inp.files?.[0] || null;
      inp.remove();
      res(d);
    });
    document.body.append(inp);
    inp.click();
  });
}

/** Symbole der Navigation — schlichte Strichzeichnungen. */
export const SYMBOL = {
  // Dashboard: liegende Balken — dasselbe Bild wie die Balken auf der Seite
  // selbst. Vorher stand hier das Belegsymbol, was die Seite als Liste auswies.
  dashboard: 'M4 6h10M4 12h16M4 18h6M4 3v18',
  belege: 'M6 3h9l5 5v13H6zM15 3v5h5M9 13h7M9 17h7',
  neu: 'M12 5v14M5 12h14',
  projekte: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  kontakte: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  hilfe: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9.5a2.5 2.5 0 114 2c-.9.7-1.5 1.3-1.5 2.5M12 17.5v.01',
  buch: 'M4 5a2 2 0 012-2h13v18H6a2 2 0 01-2-2zM8 7h8M8 11h8M8 15h5',
  rechner: 'M6 3h12a1 1 0 011 1v16a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1zM8 7h8M8 11h2M12 11h2M16 11h.01M8 15h2M12 15h2M16 15h.01',
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

// ————————————————————————————————————————————————————————————————
// Farbfeld — Waehler und Hexwert gekoppelt
// ————————————————————————————————————————————————————————————————

/**
 * Der Farbwaehler allein genuegt nicht: Eine Hausfarbe ist als Hexwert
 * festgelegt und wird aus dem Styleguide abgeschrieben, nicht im Farbkreis
 * gesucht. Deshalb beides nebeneinander, in beide Richtungen gekoppelt.
 */
export function farbfeld(o) {
  const id = `f_${Math.random().toString(36).slice(2, 9)}`;
  const waehler = el('input', { id, type: 'color' });
  const hex = el('input', {
    type: 'text', class: 'mono hexfeld', maxlength: 7,
    spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off',
  });

  const normieren = (t) => {
    let s = String(t || '').trim().replace(/^#/, '').replace(/[^0-9a-fA-F]/g, '').toLowerCase();
    if (s.length === 3) s = s.split('').map((c) => c + c).join('');   // #abc -> #aabbcc
    return s.length === 6 ? `#${s}` : null;
  };

  const setzen = (wert) => {
    const g = normieren(wert) || '#000000';
    waehler.value = g;
    hex.value = g;
  };
  setzen(o.wert);

  waehler.addEventListener('input', () => { hex.value = waehler.value; });
  hex.addEventListener('input', () => {
    const g = normieren(hex.value);
    if (g) waehler.value = g;
  });
  // Erst beim Verlassen aufraeumen — sonst kaeme einem die Eingabe abhanden,
  // waehrend man noch tippt.
  hex.addEventListener('blur', () => setzen(hex.value || waehler.value));

  const box = el('div', { class: 'feld' },
    el('label', { for: id, text: o.label }),
    el('div', { class: 'farbreihe' }, waehler, hex),
    o.hinweis ? el('div', { class: 'hinweis', text: o.hinweis }) : null,
  );
  // Nach aussen verhaelt es sich wie ein einzelnes Feld.
  box.eingabe = waehler;
  return box;
}

/**
 * Eine Datei einlesen und als Data-URL zurueckgeben.
 * @returns {Promise<{name:string, typ:string, groesse:number, datenUrl:string}|null>}
 */
export function bildLaden(erlaubt = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']) {
  return new Promise((res) => {
    const inp = el('input', { type: 'file', accept: erlaubt.join(','), style: 'display:none' });
    inp.addEventListener('change', () => {
      const d = inp.files?.[0];
      inp.remove();
      if (!d) { res(null); return; }
      if (!erlaubt.includes(d.type)) {
        melden(`${d.type || 'Dieser Dateityp'} wird nicht unterstützt — PNG, JPEG, SVG oder WebP.`, 'fehler');
        res(null); return;
      }
      const leser = new FileReader();
      leser.onload = () => res({
        name: d.name, typ: d.type, groesse: d.size, datenUrl: String(leser.result),
      });
      leser.onerror = () => { melden('Die Datei ließ sich nicht lesen.', 'fehler'); res(null); };
      leser.readAsDataURL(d);
    });
    document.body.append(inp);
    inp.click();
  });
}
