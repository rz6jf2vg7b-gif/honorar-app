// Zusammenfuehren des Stands auf diesem Geraet mit dem in OneDrive.
//
// GRUNDREGEL: Je Datensatz gewinnt der juengere Zeitstempel (Feld `geaendert`).
// Grabsteine spielen dabei mit — ohne das kaeme ein auf dem iPhone geloeschter
// Kontakt vom iPad zurueck.
//
// AUSNAHME, UND SIE IST DER GRUND FUER DIESE DATEI:
// Ein festgeschriebener Beleg wird nie mehr veraendert. Diese Zusage traegt die
// ganze App — sie ist der Grund, warum eine Rechnung Jahre spaeter noch
// nachrechenbar ist, und sie ist die Anforderung der GoBD an die
// Unveraenderbarkeit. Ein Abgleich, der stillschweigend "der juengere gewinnt"
// anwendet, koennte eine gestellte Rechnung durch eine andere Fassung
// derselben Nummer ersetzen. Das darf nicht passieren, auch nicht einmal.
// Deshalb:
//   * Ist ein Beleg auf einer Seite festgeschrieben und auf der anderen noch
//     Entwurf, gewinnt der festgeschriebene — unabhaengig vom Zeitstempel.
//     Festschreiben ist ein Endzustand; ein juengerer Entwurf ist eine
//     Aenderung, die es nach dem Festschreiben nicht mehr geben durfte.
//   * Sind beide festgeschrieben und tragen unterschiedliche Betraege, wird
//     NICHTS entschieden: der eigene Stand bleibt, und der Fall wird gemeldet.
//     Zwei verschiedene Rechnungen unter einer Nummer sind ein Vorgang fuer
//     einen Menschen, nicht fuer eine Zusammenfuehrungsregel.
//
// Ausserdem gemeldet, aber nicht angetastet: zwei Belege verschiedener Herkunft
// mit derselben Nummer. Das entsteht, wenn auf zwei Geraeten ohne Netz je eine
// Rechnung geschrieben wird — beide bekommen dieselbe naechste Nummer
// vorgeschlagen. Erst beim Abgleich faellt es auf, und nur dort kann es auffallen.

import {
  SPEICHER, alle, schreibeViele, einstellungenLesen, einstellungenSchreiben,
} from '../db.js';
import * as onedrive from './onedrive.js';

export const FORMAT = 1;

const juenger = (a, b) => ((a?.geaendert || '') >= (b?.geaendert || '') ? a : b);

/** Verschmilzt zwei Listen nach der Grundregel. */
export function verschmelzen(lokal, fern) {
  const nachId = new Map((lokal || []).map((x) => [x.id, x]));
  let neu = 0; let aktualisiert = 0;
  for (const f of fern || []) {
    const l = nachId.get(f.id);
    if (!l) { nachId.set(f.id, f); neu += 1; continue; }
    const sieger = juenger(l, f);
    if (sieger !== l) { nachId.set(f.id, sieger); aktualisiert += 1; }
  }
  return { liste: [...nachId.values()], neu, aktualisiert };
}

/** Kennzeichen eines festgeschriebenen Belegs. Zwei Belege mit gleichem
 *  Kennzeichen sind derselbe — bei ungleichem liegt ein echter Konflikt vor. */
const kennzeichen = (b) => [
  b.nummer, b.status, b.festgeschrieben || '', b.summeNetto ?? '', b.brutto ?? '',
].join('|');

const istFest = (b) => b?.status === 'fest';

/** Verschmilzt Belege nach der Grundregel samt der Ausnahme fuer Festgeschriebene. */
export function belegeVerschmelzen(lokal, fern) {
  const nachId = new Map((lokal || []).map((b) => [b.id, b]));
  const konflikte = [];
  let neu = 0; let aktualisiert = 0;

  for (const f of fern || []) {
    const l = nachId.get(f.id);
    if (!l) { nachId.set(f.id, f); neu += 1; continue; }

    if (istFest(l) && istFest(f)) {
      if (kennzeichen(l) !== kennzeichen(f)) {
        konflikte.push({
          art: 'festgeschrieben',
          id: f.id,
          nummer: l.nummer,
          text: `Der festgeschriebene Beleg ${l.nummer} liegt in zwei Fassungen vor. `
            + 'Der Stand dieses Geräts bleibt unverändert.',
        });
      }
      continue;                       // in beiden Faellen bleibt der eigene Stand
    }
    if (istFest(l)) continue;         // fest schlaegt Entwurf
    if (istFest(f)) { nachId.set(f.id, f); aktualisiert += 1; continue; }

    const sieger = juenger(l, f);
    if (sieger !== l) { nachId.set(f.id, sieger); aktualisiert += 1; }
  }

  return { liste: [...nachId.values()], neu, aktualisiert, konflikte };
}

/** Dieselbe Belegnummer an zwei verschiedenen Belegen. */
export function nummernkonflikte(belege) {
  const nachNummer = new Map();
  for (const b of belege) {
    if (!b.nummer || b.status === 'storniert' || b.geloescht) continue;
    const liste = nachNummer.get(b.nummer) || [];
    liste.push(b);
    nachNummer.set(b.nummer, liste);
  }
  return [...nachNummer.entries()]
    .filter(([, liste]) => liste.length > 1)
    .map(([nummer, liste]) => ({
      art: 'nummer',
      nummer,
      ids: liste.map((b) => b.id),
      text: `Die Belegnummer ${nummer} ist ${liste.length}-mal vergeben — vermutlich `
        + 'auf zwei Geräten ohne Netz entstanden. Eine davon muss umbenannt werden.',
    }));
}

// ————————————————————————————————————————————————————————————————

/**
 * Einmal abgleichen: laden, verschmelzen, zurueckschreiben.
 *
 * Bewusst nicht im Hintergrund und nicht im Takt: Ein Abgleich, der laeuft,
 * waehrend jemand im Assistenten eine Rechnung schreibt, ist ein
 * Ueberraschungsangriff auf den eigenen Entwurf. Er laeuft beim Start und auf
 * Knopfdruck.
 */
export async function abgleichen() {
  const fern = await onedrive.laden();

  const [einst, projekte, adressen, vertraege, belege] = await Promise.all([
    einstellungenLesen(),
    alle(SPEICHER.PROJEKTE, { mitGeloeschten: true }),
    alle(SPEICHER.ADRESSEN, { mitGeloeschten: true }),
    alle(SPEICHER.VERTRAEGE, { mitGeloeschten: true }),
    alle(SPEICHER.BELEGE, { mitGeloeschten: true }),
  ]);

  if (fern && fern.format !== FORMAT) {
    throw new Error(`Der Stand in OneDrive ist im Format ${fern.format}, diese App erwartet `
      + `${FORMAT}. Bitte zuerst die App auf allen Geräten aktualisieren.`);
  }

  const p = verschmelzen(projekte, fern?.projekte);
  const a = verschmelzen(adressen, fern?.adressen);
  const v = verschmelzen(vertraege, fern?.vertraege);
  const b = belegeVerschmelzen(belege, fern?.belege);

  await Promise.all([
    schreibeViele(SPEICHER.PROJEKTE, p.liste),
    schreibeViele(SPEICHER.ADRESSEN, a.liste),
    schreibeViele(SPEICHER.VERTRAEGE, v.liste),
    schreibeViele(SPEICHER.BELEGE, b.liste),
  ]);

  // Einstellungen als Ganzes, nicht feldweise: ein halb uebernommenes
  // Briefkopf-Logo neben einer fremden Bankverbindung waere schlimmer als
  // beides zusammen von einem Geraet.
  let einstellungen = einst;
  const fernE = fern?.einstellungen;
  if (fernE && (fernE.geaendert || '') > (einst.geaendert || '')) {
    // `abgleich` bleibt beim eigenen Geraet — ob dieses Geraet abgleicht und
    // wann zuletzt, ist keine Eigenschaft der Daten.
    einstellungen = { ...fernE, abgleich: einst.abgleich };
    await einstellungenSchreiben(einstellungen, { stempeln: false });
  }

  const konflikte = [...b.konflikte, ...nummernkonflikte(b.liste)];

  await onedrive.speichern({
    art: 'honorarapp-abgleich',
    format: FORMAT,
    geschriebenAm: new Date().toISOString(),
    geraet: navigator.userAgent.slice(0, 80),
    einstellungen,
    projekte: p.liste,
    adressen: a.liste,
    vertraege: v.liste,
    belege: b.liste,
  });

  const jetzt = new Date().toISOString();
  await einstellungenSchreiben(
    { ...einstellungen, abgleich: { ...einstellungen.abgleich, letzter: jetzt } },
    { stempeln: false },
  );

  return {
    erster: !fern,
    hereingekommen: p.neu + a.neu + v.neu + b.neu,
    aktualisiert: p.aktualisiert + a.aktualisiert + v.aktualisiert + b.aktualisiert,
    belege: b.liste.filter((z) => !z.geloescht).length,
    konflikte,
    letzter: jetzt,
  };
}
