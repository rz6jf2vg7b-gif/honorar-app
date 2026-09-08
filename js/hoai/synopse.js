// Vergleich zweier Fassungen der HOAI.
//
// Die Aufgabe klingt einfacher, als sie ist: Zwei Verordnungstexte zu
// vergleichen heisst nicht, zwei Zeichenketten zu vergleichen. Was zaehlt, ist
// die Vorschrift — welcher Paragraph ist hinzugekommen, welcher weggefallen,
// und wo genau im Text steht jetzt etwas anderes.
//
// Deshalb in drei Stufen:
//   1. Vorschriften einander zuordnen (ueber "§ 7", "Anlage 10")
//   2. je Vorschrift die Absaetze vergleichen
//   3. in geaenderten Absaetzen die Woerter
//
// Bewusst ohne Bibliothek: Ein Diff auf Wortebene sind dreissig Zeilen, und
// eine Abhaengigkeit fuer dreissig Zeilen waere ein schlechter Tausch — die App
// laedt bis heute nichts von fremden Servern.

/**
 * Vergleicht zwei Fassungen.
 * @param {{normen: Array<{bezug,titel,text}>}} alt
 * @param {{normen: Array<{bezug,titel,text}>}} neu
 * @returns {{zusammenfassung, eintraege}}
 */
export function synopse(alt, neu) {
  const alteNormen = new Map((alt?.normen || []).map((n) => [schluessel(n), n]));
  const neueNormen = new Map((neu?.normen || []).map((n) => [schluessel(n), n]));

  const eintraege = [];

  // Reihenfolge der neuen Fassung führt; Weggefallenes wird danach angehängt,
  // damit die Liste der geltenden Verordnung folgt.
  for (const [s, n] of neueNormen) {
    const a = alteNormen.get(s);
    if (!a) {
      eintraege.push({ bezug: n.bezug, titel: n.titel, art: 'neu', absaetze: null });
      continue;
    }
    const titelGeaendert = (a.titel || '') !== (n.titel || '');
    const absaetze = absaetzeVergleichen(a.text || '', n.text || '');
    const textGeaendert = absaetze.some((x) => x.art !== 'gleich');
    eintraege.push({
      bezug: n.bezug,
      titel: n.titel,
      titelAlt: titelGeaendert ? a.titel : null,
      art: (titelGeaendert || textGeaendert) ? 'geaendert' : 'gleich',
      absaetze,
    });
  }
  for (const [s, a] of alteNormen) {
    if (!neueNormen.has(s)) {
      eintraege.push({ bezug: a.bezug, titel: a.titel, art: 'entfallen', absaetze: null });
    }
  }

  const zaehle = (art) => eintraege.filter((e) => e.art === art).length;
  return {
    zusammenfassung: {
      gesamt: eintraege.length,
      neu: zaehle('neu'),
      entfallen: zaehle('entfallen'),
      geaendert: zaehle('geaendert'),
      gleich: zaehle('gleich'),
    },
    eintraege,
  };
}

const schluessel = (n) => String(n.bezug || '').replace(/\s+/g, ' ').trim();

/**
 * Absaetze zweier Texte gegenueberstellen.
 *
 * Zugeordnet wird ueber die Absatznummer "(1)", "(2)" — das ist verlaesslicher
 * als ein Diff ueber die Reihenfolge: Wird ein Absatz eingefuegt, verschiebt
 * sich sonst alles Nachfolgende und erschiene faelschlich als geaendert.
 * Absaetze ohne Nummer werden der Reihe nach zugeordnet.
 */
export function absaetzeVergleichen(altText, neuText) {
  const alt = absaetze(altText);
  const neu = absaetze(neuText);
  const raus = [];

  const altNumeriert = new Map();
  for (const a of alt) if (a.nr) altNumeriert.set(a.nr, a);
  const altOhneNr = alt.filter((a) => !a.nr);
  let ohneNrZeiger = 0;
  const verbraucht = new Set();

  for (const n of neu) {
    const a = n.nr ? altNumeriert.get(n.nr) : altOhneNr[ohneNrZeiger++];
    if (a) verbraucht.add(a);
    if (!a) {
      raus.push({ art: 'neu', nr: n.nr, neu: n.text, alt: null, teile: null });
    } else if (a.text === n.text) {
      raus.push({ art: 'gleich', nr: n.nr, neu: n.text, alt: a.text, teile: null });
    } else {
      raus.push({ art: 'geaendert', nr: n.nr, neu: n.text, alt: a.text,
        teile: woerterVergleichen(a.text, n.text) });
    }
  }
  for (const a of alt) {
    if (!verbraucht.has(a)) raus.push({ art: 'entfallen', nr: a.nr, neu: null, alt: a.text, teile: null });
  }
  return raus;
}

function absaetze(text) {
  return String(text || '').split('\n').map((z) => z.trim()).filter(Boolean)
    .map((z) => ({ nr: (z.match(/^\((\d+[a-z]?)\)/) || [])[1] || null, text: z }));
}

/**
 * Wortweiser Vergleich zweier Absaetze.
 *
 * Laengste gemeinsame Teilfolge ueber Woerter. Der Speicherbedarf ist das
 * Produkt beider Laengen — bei Absaetzen einer Verordnung sind das einige
 * hundert Woerter, also unkritisch. Sicherheitshalber wird bei sehr langen
 * Absaetzen abgebrochen und der Absatz als Ganzes gegenuebergestellt.
 * @returns {Array<{art:'gleich'|'raus'|'rein', text:string}>}
 */
export function woerterVergleichen(altText, neuText) {
  const a = String(altText || '').split(/(\s+)/).filter((x) => x !== '');
  const b = String(neuText || '').split(/(\s+)/).filter((x) => x !== '');
  if (a.length * b.length > 400000) return null;   // zu gross: Absatz als Ganzes zeigen

  // LCS-Tabelle
  const t = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      t[i][j] = a[i] === b[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
    }
  }

  const raus = [];
  const anfuegen = (art, text) => {
    const letzter = raus[raus.length - 1];
    if (letzter && letzter.art === art) letzter.text += text;
    else raus.push({ art, text });
  };

  let i = 0; let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { anfuegen('gleich', a[i]); i++; j++; }
    else if (t[i + 1][j] >= t[i][j + 1]) { anfuegen('raus', a[i]); i++; }
    else { anfuegen('rein', b[j]); j++; }
  }
  while (i < a.length) { anfuegen('raus', a[i]); i++; }
  while (j < b.length) { anfuegen('rein', b[j]); j++; }
  return raus;
}
