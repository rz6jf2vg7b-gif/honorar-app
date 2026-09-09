// Ablage des Datenstands in OneDrive. Anmeldung siehe microsoft.js.
//
// Eine einzige Datei fuer alles. Der naheliegende Gegenentwurf — eine Datei je
// Beleg — waere beim Abgleich sparsamer, aber jeder Abgleich braeuchte dann
// Dutzende Aufrufe, und ein halb uebertragener Stand liesse Vertrag und Beleg
// auseinanderfallen. Eine Datei ist entweder ganz da oder gar nicht.
//
// ⚠️ Was in dieser Datei steht: Bankverbindung, Steuernummer, Kundenanschriften
// und alle Rechnungsbetraege. Sie liegt in Steffens eigenem OneDrive unter
// Apps/HonorarApp und wird mit niemandem geteilt. Wer sie freigibt, gibt seine
// Buchhaltung frei.

import { graph } from './microsoft.js';

const ORDNER = '/me/drive/root:/Apps/HonorarApp';
const DATEI = `${ORDNER}/honorar.json`;

/** Bis hierher genuegt ein einfaches PUT; darueber verlangt Graph eine
 *  Uebertragung in Abschnitten. Belege tragen ihren eingefrorenen Rechenstand
 *  mit sich — die Grenze wird schneller erreicht, als man denkt. */
const EINFACH_BIS = 4 * 1024 * 1024;
const ABSCHNITT = 3276800;   // 3,125 MiB — Graph verlangt ein Vielfaches von 320 KiB

export async function laden() {
  const d = await graph(`${DATEI}:/content`);
  return d?._nichtGefunden ? null : d;
}

export async function speichern(daten) {
  const text = JSON.stringify(daten);
  const bytes = new TextEncoder().encode(text);

  if (bytes.length <= EINFACH_BIS) {
    return graph(`${DATEI}:/content`, {
      methode: 'PUT', roh: text, kopf: { 'Content-Type': 'application/json' },
    });
  }
  return inAbschnitten(bytes);
}

/**
 * Grosse Staende in Abschnitten hochladen.
 *
 * Graph verlangt dafuer eine Sitzung und je Abschnitt einen Content-Range-Kopf.
 * Bricht die Uebertragung ab, bleibt die alte Datei stehen — die Sitzung wird
 * erst mit dem letzten Abschnitt wirksam. Das ist die wichtigste Eigenschaft
 * hier: ein halb hochgeladener Datenstand darf nie der neue Stand werden.
 */
async function inAbschnitten(bytes) {
  const sitzung = await graph(`${DATEI}:/createUploadSession`, {
    methode: 'POST',
    koerper: { item: { '@microsoft.graph.conflictBehavior': 'replace' } },
  });
  const url = sitzung.uploadUrl;

  let letzte = null;
  for (let von = 0; von < bytes.length; von += ABSCHNITT) {
    const bis = Math.min(von + ABSCHNITT, bytes.length);
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Length': String(bis - von),
        'Content-Range': `bytes ${von}-${bis - 1}/${bytes.length}`,
      },
      body: bytes.slice(von, bis),
    });
    if (!res.ok) {
      // Die Sitzung aufraeumen, sonst blockiert sie die naechste Uebertragung.
      await fetch(url, { method: 'DELETE' }).catch(() => {});
      throw new Error(`Abgleich abgebrochen bei Byte ${von} (${res.status}).`);
    }
    if (res.status === 200 || res.status === 201) letzte = await res.json();
  }
  return letzte;
}

export const dateiPfadAnzeige = () => 'OneDrive → Apps → HonorarApp → honorar.json';
