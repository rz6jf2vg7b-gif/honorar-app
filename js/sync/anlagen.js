// Anlagen ueber die Geraete hinweg: das unterschriebene Original.
//
// Warum eine eigene Datei je Anlage und nicht der gemeinsame Stand?
// honorar.json wird bei jedem Abgleich vollstaendig geschrieben und gelesen. Ein
// eingescanntes Angebot wiegt leicht zwei Megabyte; drei davon, und der Abgleich
// ueber Mobilfunk dauert laenger als die Arbeit, die er sichern soll. Anlagen
// liegen deshalb einzeln in OneDrive; der gemeinsame Stand traegt nur ihr
// Verzeichnis (Kennung, Name, Groesse, zu welchem Beleg).
//
// Die Regel ist einfach, weil eine Anlage sich nie aendert: Was das eine Geraet
// hat und das andere nicht, wird uebertragen. Geloescht wird nur, was der Nutzer
// selbst loescht — und das nur auf seinem Geraet, damit ein Abgleich niemals
// einen Beleg um seinen Nachweis bringt.
//
// ⚠️ Eine Anlage kann alles enthalten, was auf einem Bauherrenschreiben steht:
// Namen, Anschriften, Unterschriften. Sie liegt in Steffens eigenem OneDrive
// unter Apps/HonorarApp/anlagen und wird mit niemandem geteilt.

import { graph } from './microsoft.js';
import { SPEICHER, alle, schreiben } from '../db.js';

const ORDNER = '/me/drive/root:/Apps/HonorarApp/anlagen';

/** Nur das Verzeichnis wandert im gemeinsamen Stand mit, nicht der Inhalt. */
export const verzeichnisAus = (anlagen) => (anlagen || []).map((a) => ({
  id: a.id, belegId: a.belegId, name: a.name, typ: a.typ,
  groesse: a.groesse, angelegt: a.angelegt,
}));

/**
 * Anlagen abgleichen. Laeuft nach dem Stand-Abgleich und darf scheitern, ohne
 * ihn zu gefaehrden — der Aufrufer faengt das ab.
 *
 * @param {Array} fernVerzeichnis  das Verzeichnis aus dem gemeinsamen Stand
 * @returns {{hoch: number, runter: number, fehler: Array}}
 */
export async function anlagenAbgleichen(fernVerzeichnis = []) {
  const lokal = await alle(SPEICHER.ANLAGEN);
  const lokalIds = new Set(lokal.map((a) => a.id));
  const fernIds = new Set((fernVerzeichnis || []).map((a) => a.id));
  const fehler = [];
  let hoch = 0; let runter = 0;

  // Was hier liegt und dort fehlt: hochladen.
  for (const a of lokal) {
    if (fernIds.has(a.id)) continue;
    try {
      await graph(`${ORDNER}/${dateiname(a)}:/content`, {
        methode: 'PUT', roh: a.daten, kopf: { 'Content-Type': a.typ || 'application/octet-stream' },
      });
      hoch += 1;
    } catch (f) {
      fehler.push(`${a.name}: ${f.message}`);
    }
  }

  // Was dort liegt und hier fehlt: holen.
  for (const a of fernVerzeichnis || []) {
    if (lokalIds.has(a.id)) continue;
    try {
      const daten = await graph(`${ORDNER}/${dateiname(a)}:/content`, { binaer: true });
      if (!daten || daten.byteLength === undefined) continue;
      await schreiben(SPEICHER.ANLAGEN, { ...a, daten });
      runter += 1;
    } catch (f) {
      fehler.push(`${a.name}: ${f.message}`);
    }
  }

  return { hoch, runter, fehler };
}

/**
 * Der Dateiname in OneDrive traegt die Kennung voran.
 *
 * Zwei Geraete koennen dieselbe Datei "Angebot unterschrieben.pdf" nennen; ohne
 * die Kennung ueberschriebe die eine die andere. Der Klarname bleibt trotzdem
 * darin, damit der Ordner von Hand lesbar ist.
 */
function dateiname(a) {
  const sauber = (a.name || 'anlage').replace(/[/\\?%*:|"<>]/g, '-').slice(-80);
  return `${a.id}_${sauber}`;
}
