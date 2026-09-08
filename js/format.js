// Schreibweisen für Bank- und Steuerangaben.
//
// Zwei Aufgaben, die auseinandergehalten gehoeren:
//   formatieren — bringt die Eingabe in die uebliche Schreibweise, waehrend getippt
//                 wird. Das ist Bequemlichkeit.
//   pruefen     — sagt, ob die Angabe ueberhaupt stimmen kann. Das ist der
//                 eigentliche Gewinn: Eine IBAN mit Zahlendreher sieht formatiert
//                 genauso ordentlich aus wie eine richtige, aber der Kunde kann
//                 nicht zahlen und die Rechnung kommt zurueck.

// ————————————————————————————————————————————————————————————————
// IBAN
// ————————————————————————————————————————————————————————————————

/** Musterwert der Bundesbank, keine echte Verbindung:
 *  "de02120300000000202051" -> "DE02 1203 0000 0000 2020 51" */
export function ibanFormatieren(text) {
  const roh = String(text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return roh.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Pruefsumme nach ISO 13616 (Modulo 97). Faengt Zahlendreher und Tippfehler —
 * genau die Fehler, die man beim Abschreiben macht und die sonst erst auffallen,
 * wenn die Zahlung nicht ankommt.
 */
export function ibanPruefen(text) {
  const iban = String(text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!iban) return { ok: null };
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) {
    return { ok: false, text: 'Eine IBAN beginnt mit zwei Buchstaben und zwei Prüfziffern.' };
  }
  const LAENGE = {
    DE: 22, AT: 20, CH: 21, FR: 27, IT: 27, NL: 18, BE: 16, LU: 20,
    ES: 24, PL: 28, CZ: 24, DK: 18, GB: 22, SE: 24,
  };
  const land = iban.slice(0, 2);
  const soll = LAENGE[land];
  if (soll && iban.length !== soll) {
    return { ok: false, text: `Eine ${land}-IBAN hat ${soll} Zeichen, diese hat ${iban.length}.` };
  }
  // Die ersten vier Zeichen ans Ende, Buchstaben zu Zahlen (A=10 … Z=35)
  const umgestellt = iban.slice(4) + iban.slice(0, 4);
  const ziffern = umgestellt.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  // Stueckweise rechnen, weil die Zahl fuer Number zu gross waere
  let rest = 0;
  for (const z of ziffern) rest = (rest * 10 + Number(z)) % 97;
  return rest === 1
    ? { ok: true, text: 'Prüfsumme stimmt.' }
    : { ok: false, text: 'Die Prüfsumme stimmt nicht — vermutlich ein Zahlendreher.' };
}

// ————————————————————————————————————————————————————————————————
// BIC
// ————————————————————————————————————————————————————————————————

/** BIC steht immer in Großbuchstaben, ohne Leerzeichen. */
export function bicFormatieren(text) {
  return String(text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function bicPruefen(text) {
  const bic = bicFormatieren(text);
  if (!bic) return { ok: null };
  if (!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic)) {
    return { ok: false, text: 'Ein BIC hat 8 oder 11 Stellen: 4 Bank, 2 Land, 2 Ort, optional 3 Filiale.' };
  }
  return { ok: true, text: `${bic.length} Stellen — Aufbau stimmt.` };
}

// ————————————————————————————————————————————————————————————————
// Steuernummer
// ————————————————————————————————————————————————————————————————

/**
 * Die Schreibweise der Steuernummer ist NICHT bundeseinheitlich — sie haengt am
 * Finanzamt des Landes:
 *   10 Ziffern, 2/3/5   Rheinland-Pfalz, Baden-Württemberg, Berlin, Bremen,
 *                       Hamburg, Mecklenburg-Vorpommern, Niedersachsen,
 *                       Saarland, Sachsen, Sachsen-Anhalt, Schleswig-Holstein,
 *                       Thüringen
 *   11 Ziffern, 3/3/5   Bayern, Brandenburg
 *   11 Ziffern, 3/4/4   Nordrhein-Westfalen
 *   11 Ziffern, 0FF/BBB/UUUUP  Hessen (führende Null)
 *
 * Deshalb wird nur gruppiert, was eindeutig ist. Bei elf Ziffern kann die App
 * nicht wissen, ob 3/3/5 oder 3/4/4 gemeint ist — dort bleibt die Eingabe, wie
 * sie getippt wurde, und der Hinweis nennt den Grund. Selbst gesetzte Schrägstriche
 * werden immer respektiert.
 */
export function steuernummerFormatieren(text, muster = 'auto') {
  const roh = String(text || '');
  const ziffern = roh.replace(/\D/g, '');
  if (!ziffern) return '';

  const gruppieren = (a, b) => [
    ziffern.slice(0, a),
    ziffern.slice(a, a + b),
    ziffern.slice(a + b),
  ].filter(Boolean).join('/');

  if (muster === '2/3/5') return gruppieren(2, 3);
  if (muster === '3/3/5') return gruppieren(3, 3);
  if (muster === '3/4/4') return gruppieren(3, 4);

  // auto: nur gruppieren, wo es eindeutig ist
  if (ziffern.length <= 10) return gruppieren(2, 3);
  return roh.replace(/[^\d/ ]/g, '');
}

export function steuernummerPruefen(text) {
  const ziffern = String(text || '').replace(/\D/g, '');
  if (!ziffern) return { ok: null };
  if (ziffern.length < 10) return { ok: false, text: `Noch ${10 - ziffern.length} Ziffer(n) — eine Steuernummer hat 10 oder 11.` };
  if (ziffern.length > 11) return { ok: false, text: 'Mehr als 11 Ziffern — das ist keine Steuernummer.' };
  return { ok: true, text: `${ziffern.length} Ziffern.` };
}

// ————————————————————————————————————————————————————————————————
// Umsatzsteuer-Identifikationsnummer
// ————————————————————————————————————————————————————————————————

/** "de 123 456 789" -> "DE123456789" */
export function ustIdFormatieren(text) {
  return String(text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Laenge je Land nach der EU-Systematik. */
const USTID_MUSTER = {
  DE: /^DE\d{9}$/, AT: /^ATU\d{8}$/, BE: /^BE0\d{9}$/, DK: /^DK\d{8}$/,
  ES: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/, FR: /^FR[A-Z0-9]{2}\d{9}$/, IT: /^IT\d{11}$/,
  LU: /^LU\d{8}$/, NL: /^NL\d{9}B\d{2}$/, PL: /^PL\d{10}$/, CZ: /^CZ\d{8,10}$/,
  SE: /^SE\d{12}$/,
};

export function ustIdPruefen(text) {
  const id = ustIdFormatieren(text);
  if (!id) return { ok: null };
  if (!/^[A-Z]{2}/.test(id)) return { ok: false, text: 'Beginnt mit dem Länderkürzel, z. B. DE.' };
  const land = id.slice(0, 2);
  const muster = USTID_MUSTER[land];
  if (!muster) return { ok: true, text: `Länderkürzel ${land} — Aufbau wird nicht geprüft.` };
  return muster.test(id)
    ? { ok: true, text: 'Aufbau stimmt.' }
    : { ok: false, text: land === 'DE'
      ? 'Eine deutsche USt-IdNr. lautet DE und neun Ziffern.'
      : `Der Aufbau passt nicht zum Länderkürzel ${land}.` };
}

// ————————————————————————————————————————————————————————————————

/**
 * Formatiert ein Eingabefeld beim Tippen, ohne den Schreibfluss zu stoeren.
 *
 * Der Trick ist die Cursorposition: Wird beim Formatieren ein Leerzeichen oder
 * Schraegstrich eingefuegt, springt der Cursor sonst ans Ende und man tippt
 * mitten in die eigene Eingabe hinein. Deshalb wird gezaehlt, wie viele
 * bedeutungstragende Zeichen links vom Cursor stehen, und diese Stelle nach dem
 * Formatieren wieder aufgesucht.
 */
export function feldFormatieren(eingabe, formatierer) {
  const vorher = eingabe.value;
  const pos = eingabe.selectionStart ?? vorher.length;
  const bedeutend = (s) => s.replace(/[^A-Za-z0-9]/g, '').length;
  const zeichenLinks = bedeutend(vorher.slice(0, pos));

  const nachher = formatierer(vorher);
  if (nachher === vorher) return;
  eingabe.value = nachher;

  let neu = 0, gezaehlt = 0;
  while (neu < nachher.length && gezaehlt < zeichenLinks) {
    if (/[A-Za-z0-9]/.test(nachher[neu])) gezaehlt++;
    neu++;
  }
  // Trennzeichen direkt links vom Cursor mitnehmen, damit man nicht davor landet
  while (neu < nachher.length && !/[A-Za-z0-9]/.test(nachher[neu])) neu++;
  try { eingabe.setSelectionRange(neu, neu); } catch { /* bei type=email nicht erlaubt */ }
}
