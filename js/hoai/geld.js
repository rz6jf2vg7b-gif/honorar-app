// Geldbetraege: Rundung und Formatierung.
//
// Warum eine eigene Rundung noetig ist:
// Der naheliegende Weg `Math.round(x * 100) / 100` rechnet in echten Rechnungen
// falsch. Beispiel aus der Referenzpruefung: Leistungsphase 2 ergibt
// 495.457,81 € x 5,25 % = 26.011,535 €. Kaufmaennisch gerundet sind das 26.011,54 €
// — und genau das steht in der Vergleichsrechnung aus HOAI-Pro. Der naive Weg liefert 26.011,53 €,
// weil 26011.535 * 100 im Gleitkommaformat als 2601153.4999999995 dargestellt wird
// und dann abgerundet wird. Ein Cent Abweichung, aber in einer Rechnung, die im
// Streitfall nachgerechnet wird, ist das einer zu viel.
//
// Loesung: vor dem Runden auf 15 signifikante Stellen normalisieren. Damit
// verschwindet der Darstellungsfehler, die echte Dezimalzahl bleibt erhalten.
// Zusaetzlich wird — anders als bei Math.round — von der Null weg gerundet, damit
// eine Gutschrift ueber -26.011,535 € denselben Cent ergibt wie die Rechnung darueber.

/** Kaufmaennisch auf zwei Nachkommastellen runden (von der Null weg bei genau 0,5). */
export function runde2(x) {
  if (typeof x !== 'number' || !Number.isFinite(x)) {
    throw new TypeError(`runde2: Zahl erwartet, bekommen: ${x}`);
  }
  if (x === 0) return 0;
  const skaliert = Number((Math.abs(x) * 100).toPrecision(15));
  return Math.sign(x) * Math.round(skaliert) / 100;
}

/** Auf beliebig viele Stellen runden — fuer Prozentsaetze und Zwischenwerte. */
export function runde(x, stellen) {
  if (typeof x !== 'number' || !Number.isFinite(x)) {
    throw new TypeError(`runde: Zahl erwartet, bekommen: ${x}`);
  }
  if (x === 0) return 0;
  const f = 10 ** stellen;
  const skaliert = Number((Math.abs(x) * f).toPrecision(15));
  return Math.sign(x) * Math.round(skaliert) / f;
}

const EUR = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});

/** 4566976.25 -> "4.566.976,25 €" */
export function eur(x) {
  return EUR.format(runde2(x)) + ' €';
}

/** 4566976.25 -> "4.566.976,25" (ohne Waehrung, fuer Tabellenspalten) */
export function zahl2(x) {
  return EUR.format(runde2(x));
}

const PROZENT = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 0, maximumFractionDigits: 2,
});

/** 0.0175 -> "1,75 %" ; 0.5 -> "50 %" */
export function prozent(anteil, minStellen = 0) {
  const f = new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: minStellen, maximumFractionDigits: 2,
  });
  return f.format(runde(anteil * 100, 4)) + ' %';
}

export { PROZENT };
