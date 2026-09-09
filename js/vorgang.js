// Fachlogik zwischen Datenhaltung und Oberflaeche.
//
// Hier liegt alles, was ein Beleg ueber das reine Rechnen hinaus braucht:
// Nummernvergabe, Vertragsversionen, Abzug der Vorrechnungen, Festschreiben.
//
// Zwei Regeln aus dem Konzept, die hier durchgesetzt werden:
//   1. Ein festgeschriebener Beleg wird nie veraendert — nur storniert.
//   2. Beim Festschreiben wird der komplette Rechenstand als Kopie im Beleg
//      abgelegt. Nur so bleibt er reproduzierbar, wenn der Vertrag spaeter
//      durch Nachtraege weitergezogen wird.

import { SPEICHER, alle, lesen, schreiben, neueId } from './db.js';
import { honorarermittlung } from './hoai/rechnen.js';
import { erstelleAbrechnung, ART_BEZEICHNUNG } from './hoai/abrechnung.js';
import { runde2 } from './hoai/geld.js';

export const BELEGART = {
  ANGEBOT: 'AN',
  NACHTRAG: 'NA',
  ABSCHLAG: 'AR',
  TEILSCHLUSS: 'TS',
  SCHLUSS: 'SR',
  EINZEL: 'ER',
};

export const BELEGART_TEXT = {
  AN: 'Angebot',
  NA: 'Nachtrag',
  AR: 'Abschlagsrechnung',
  TS: 'Teilschlussrechnung',
  SR: 'Schlussrechnung',
  ER: 'Einzelrechnung',
};

/** Belegarten, die Geld fordern — nur sie ziehen Vorrechnungen ab. */
export const IST_RECHNUNG = (art) => ['AR', 'TS', 'SR', 'ER'].includes(art);

export const STATUS = { ENTWURF: 'entwurf', FEST: 'fest', STORNIERT: 'storniert' };

// ————————————————————————————————————————————————————————————————
// Nummernvergabe
// ————————————————————————————————————————————————————————————————

/**
 * Schlaegt die naechste Belegnummer vor. Schema aus den Einstellungen,
 * Vorgabe `{art}-{projekt}-{lfd}` — also AR-2601-04.
 *
 * Die laufende Nummer zaehlt ueber ALLE Belegarten eines Projekts, nicht je Art.
 * So macht es der gewachsene Bestand (AR-2601-04 folgt auf TS-2601-03) und so
 * bleibt die Reihenfolge im Projekt eindeutig ablesbar.
 *
 * Der Vorschlag ist nur ein Vorschlag — das Feld bleibt in der Oberflaeche
 * aenderbar, weil Altprojekte eigene Nummernkreise mitbringen.
 */
export async function nummerVorschlagen({ art, projekt, schema, datum }) {
  const belege = await alle(SPEICHER.BELEGE);
  const imProjekt = belege.filter((b) => b.projektId === projekt?.id && b.status !== STATUS.STORNIERT);

  let hoechste = 0;
  for (const b of imProjekt) {
    const m = /(\d+)\s*$/.exec(b.nummer || '');
    if (m) hoechste = Math.max(hoechste, Number(m[1]));
  }
  const lfd = hoechste + 1;
  const jahr = (datum || new Date().toISOString().slice(0, 10)).slice(0, 4);

  return (schema || '{art}-{projekt}-{lfd}')
    .replace('{art}', art)
    .replace('{projekt}', projekt?.nummer || '0000')
    .replace('{kuerzel}', projekt?.kuerzel || '')
    .replace('{jahr}', jahr)
    .replace('{jj}', jahr.slice(2))
    .replace('{lfd}', String(lfd).padStart(2, '0'))
    .replace('{lfd3}', String(lfd).padStart(3, '0'));
}

/** Prueft, ob die Nummer im Bestand schon vergeben ist. */
export async function nummerFrei(nummer, eigeneId = null) {
  const belege = await alle(SPEICHER.BELEGE);
  return !belege.some((b) => b.nummer === nummer && b.id !== eigeneId && b.status !== STATUS.STORNIERT);
}

// ————————————————————————————————————————————————————————————————
// Vertraege
// ————————————————————————————————————————————————————————————————

/** Alle Vertragsversionen eines Projekts, aelteste zuerst. */
export async function vertraegeZuProjekt(projektId) {
  const v = await alle(SPEICHER.VERTRAEGE);
  return v.filter((x) => x.projektId === projektId).sort((a, b) => (a.version || 0) - (b.version || 0));
}

/** Der aktuelle Vertragsstand eines Projekts. */
export async function aktuellerVertrag(projektId) {
  const v = await vertraegeZuProjekt(projektId);
  return v.length ? v[v.length - 1] : null;
}

/**
 * Legt eine neue Vertragsversion an. Version 1 ist der Auftrag, jede weitere
 * ein Nachtrag. Alte Versionen bleiben unangetastet — sie sind die Grundlage
 * bereits gestellter Rechnungen.
 */
export async function vertragAnlegen({ projektId, daten, grund, gueltigAb }) {
  const bisher = await vertraegeZuProjekt(projektId);
  const vertrag = {
    id: neueId('v'),
    projektId,
    version: bisher.length + 1,
    grund: grund || (bisher.length ? 'Nachtrag' : 'Auftrag'),
    gueltigAb: gueltigAb || new Date().toISOString().slice(0, 10),
    angelegt: new Date().toISOString(),
    ...daten,
  };
  await schreiben(SPEICHER.VERTRAEGE, vertrag);
  return vertrag;
}

// ————————————————————————————————————————————————————————————————
// Rechnen
// ————————————————————————————————————————————————————————————————

/** Hat der Beleg einen tragfaehigen Vertragsstand, oder steht er fuer sich? */
export const ohneVertrag = (entwurf) =>
  entwurf.art === BELEGART.EINZEL || (entwurf.positionen || []).length > 0;

/**
 * Leistungsaufstellung fuer Belege ohne Vertragsstand. Baut dieselbe Form wie
 * honorarermittlung(), damit Beleg und Abrechnung nicht unterscheiden muessen.
 */
export function ermittlungAusPositionen(entwurf) {
  const posten = (entwurf.positionen || []).map((p) => {
    const betrag = p.art === 'zeit'
      ? runde2((p.stunden || 0) * (p.satz || 0))
      : runde2(p.betrag || 0);
    return { ...p, betrag };
  });
  const netto = runde2(posten.reduce((s, p) => s + p.betrag, 0));

  return {
    bezeichnung: entwurf.leistungsbezeichnung || 'Erbrachte Leistungen',
    // Merkmal fuer das Blatt: Hier gibt es keine anrechenbaren Kosten und kein
    // Grundhonorar. Ohne dieses Kennzeichen druckte der Beleg bis 09.09.2026
    // "Anrechenbare Kosten 0,00 EUR" auf ein frei vereinbartes Angebot.
    ausPositionen: true,
    anrechenbareKosten: 0,
    grundhonorar100: 0,
    grundleistungenVereinbart: 0,
    grundleistungen: netto,
    zuschlaege: [],
    weiterePositionen: posten.map((p) => ({
      bezeichnung: p.art === 'zeit'
        ? `${p.bezeichnung} (${p.stunden} h à ${p.satz} €)`
        : p.bezeichnung,
      betrag: p.betrag,
    })),
    nebenkosten: 0,
    netto,
    phasen: [],
    zusammenstellung: [
      ...posten.map((p) => ({ bez: p.bezeichnung, betrag: p.betrag })),
      { bez: '= Gesamt netto', betrag: netto, summe: true },
    ],
    herleitung: posten.some((p) => p.art === 'zeit') ? [{
      art: 'tabelle',
      titel: 'Zeithonorar',
      spalten: ['Leistung', 'Stunden', 'Satz', 'Betrag'],
      zeilen: posten.filter((p) => p.art === 'zeit').map((p) => [
        p.bezeichnung, String(p.stunden || 0), `${p.satz || 0} €`, eurText(p.betrag),
      ]),
    }] : [],
  };
}

const eurText = (z) => new Intl.NumberFormat('de-DE',
  { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(z) + ' €';

/** Vertragsdaten in die Form bringen, die honorarermittlung() erwartet. */
export function ermittlungAusVertrag(vertrag, leistungsstand = null) {
  const phasen = (vertrag.phasen || []).map((p) => ({
    nr: p.nr,
    vereinbart: p.vereinbart,
    erbracht: leistungsstand ? (leistungsstand[p.nr] ?? 0) : 1,
  }));
  return honorarermittlung({
    fassung: vertrag.fassung,
    leistungsbild: vertrag.leistungsbild,
    bezeichnung: vertrag.bezeichnung,
    kostenermittlung: vertrag.kostenermittlung,
    honorarzone: vertrag.honorarzone,
    honorarzoneBegruendung: vertrag.honorarzoneBegruendung,
    honorarsatz: vertrag.honorarsatz,
    // Art der Maßnahme und die Erhöhung nach § 12 Abs. 2 gehören zum
    // Vertragsstand — ohne sie käme der Zuschlag im Beleg nie an.
    massnahme: vertrag.massnahme,
    objektueberwachungZuschlag: vertrag.objektueberwachungZuschlag,
    wiederholungen: vertrag.wiederholungen,
    phasen,
    zuschlaege: vertrag.zuschlaege || [],
    weiterePositionen: vertrag.weiterePositionen || [],
    nebenkosten: vertrag.nebenkosten,
  });
}

/**
 * Bereits gestellte Rechnungen eines Projekts, die von einer kumulativen
 * Rechnung abzuziehen sind. Stornierte bleiben aussen vor, Angebote und
 * Nachtraege ohnehin — sie fordern kein Geld.
 */
export async function vorrechnungen(projektId, eigeneId = null) {
  const belege = await alle(SPEICHER.BELEGE);
  return belege
    .filter((b) => b.projektId === projektId
      && b.id !== eigeneId
      && b.status === STATUS.FEST
      && IST_RECHNUNG(b.art)
      && b.kumulativ !== false)
    .sort((a, b) => (a.datum || '').localeCompare(b.datum || ''))
    .map((b) => ({
      art: b.art,
      nummer: b.nummer,
      datum: b.datumDe || b.datum,
      netto: runde2(b.summeNetto || 0),
    }));
}

/** Offene Posten eines Projekts fuer die Zahlungsuebersicht. */
export async function offenePosten(projektId, eigeneId = null) {
  const belege = await alle(SPEICHER.BELEGE);
  return belege
    .filter((b) => b.projektId === projektId && b.id !== eigeneId
      && b.status === STATUS.FEST && IST_RECHNUNG(b.art))
    .filter((b) => Math.abs((b.brutto || 0) - (b.gezahlt || 0)) > 0.005)
    .map((b) => ({
      bezeichnung: `${BELEGART_TEXT[b.art]} Nr. ${b.nummer}${b.datumDe ? ` vom ${b.datumDe}` : ''}`,
      gestellt: runde2(b.brutto || 0),
      gezahlt: runde2(b.gezahlt || 0),
    }));
}

/**
 * Rechnet einen Belegentwurf durch und liefert Ermittlung und Abrechnung.
 * Wird bei jeder Aenderung im Assistenten aufgerufen — deshalb ohne Seiteneffekte.
 */
export async function belegRechnen(entwurf, vertrag) {
  // Einzelrechnungen haben keinen Vertragsstand — ihre Positionen stehen direkt
  // am Beleg. Sie durch den Honorarkern zu schicken waere falsch: es gibt keine
  // anrechenbaren Kosten, keine Honorarzone und nichts zu interpolieren.
  if (!ohneVertrag(entwurf) && !vertrag) {
    throw new Error('Diesem Beleg fehlt der Vertragsstand: Ohne Leistungsbild, '
      + 'anrechenbare Kosten und Honorarzone lässt sich kein Honorar ermitteln. '
      + 'Trage die Vertragsdaten nach oder erfasse den Betrag als freie Position.');
  }
  const ermittlung = ohneVertrag(entwurf)
    ? ermittlungAusPositionen(entwurf)
    : ermittlungAusVertrag(vertrag, entwurf.leistungsstand);

  const abzuege = (IST_RECHNUNG(entwurf.art) && entwurf.kumulativ !== false)
    ? await vorrechnungen(entwurf.projektId, entwurf.id)
    : [];
  const zahlungsstand = entwurf.zahlungsstandZeigen
    ? await offenePosten(entwurf.projektId, entwurf.id)
    : [];

  const abrechnung = erstelleAbrechnung({
    // Die Belegart wird durchgereicht, nicht auf "Einzelrechnung" abgebildet:
    // Sonst stand auf einem Angebot "Einzelrechnung".
    art: entwurf.art,
    nummer: entwurf.nummer || '—',
    datum: entwurf.datumDe,
    leistungen: [ermittlung],
    ustSatz: entwurf.ustSatz,
    einbehalt: entwurf.einbehaltBrutto
      ? { bezeichnung: entwurf.einbehaltText || 'Rechnungseinbehalt', brutto: entwurf.einbehaltBrutto }
      : null,
    bisherigeRechnungen: abzuege,
    zahlungsstand,
    zahlungsstandVerrechnen: !!entwurf.zahlungsstandVerrechnen,
  });

  return { ermittlung, abrechnung, abzuege };
}

// ————————————————————————————————————————————————————————————————
// Speichern und Festschreiben
// ————————————————————————————————————————————————————————————————

export async function belegSpeichern(beleg) {
  const vorher = beleg.id ? await lesen(SPEICHER.BELEGE, beleg.id) : null;
  if (vorher && vorher.status === STATUS.FEST) {
    throw new Error('Dieser Beleg ist festgeschrieben und kann nicht mehr geändert werden. '
      + 'Erzeuge stattdessen eine Stornorechnung.');
  }
  const satz = {
    ...beleg,
    id: beleg.id || neueId('b'),
    status: beleg.status || STATUS.ENTWURF,
    geaendert: new Date().toISOString(),
    angelegt: vorher?.angelegt || new Date().toISOString(),
  };
  await schreiben(SPEICHER.BELEGE, satz);
  return satz;
}

/**
 * Beleg festschreiben: Rechenstand einfrieren, ab hier unveraenderlich.
 * Das entspricht der Anforderung der GoBD an die Unveraenderbarkeit — und ist
 * die Voraussetzung dafuer, dass eine Rechnung Jahre spaeter nachrechenbar ist.
 */
export async function belegFestschreiben(beleg, vertrag) {
  if (beleg.status === STATUS.FEST) return beleg;
  // Ein Beleg aus freien Positionen hat keinen Vertragsstand -- ein Angebot ueber
  // eine Pauschale etwa. belegRechnen() kennt diesen Fall (ohneVertrag), das
  // Einfrieren verlangte bis 09.09.2026 trotzdem einen Vertrag und scheiterte
  // beim Festschreiben mit "vertrag.version".
  const { ermittlung, abrechnung } = await belegRechnen(beleg, vertrag || null);

  const satz = {
    ...beleg,
    status: STATUS.FEST,
    festgeschrieben: new Date().toISOString(),
    vertragVersion: vertrag?.version ?? null,
    summeNetto: abrechnung.rechnungsbetragNetto,
    ust: abrechnung.ust,
    brutto: abrechnung.brutto,
    zahlbetrag: abrechnung.zahlbetrag,
    gezahlt: beleg.gezahlt || 0,
    // Der eingefrorene Rechenstand. Alles, was der Beleg spaeter zum
    // Wiederherstellen braucht, ohne auf Vertrag oder Vorrechnungen zuzugreifen.
    snapshot: {
      vertrag: vertrag ? JSON.parse(JSON.stringify(vertrag)) : null,
      ermittlung: JSON.parse(JSON.stringify(ermittlung)),
      abrechnung: JSON.parse(JSON.stringify(abrechnung)),
    },
  };
  await schreiben(SPEICHER.BELEGE, satz);
  return satz;
}

/** Storno: hebt einen festgeschriebenen Beleg auf, ohne ihn zu loeschen. */
export async function belegStornieren(beleg, grund) {
  if (beleg.status !== STATUS.FEST) throw new Error('Nur festgeschriebene Belege werden storniert.');
  const storno = {
    ...beleg,
    id: neueId('b'),
    nummer: `${beleg.nummer}-S`,
    art: beleg.art,
    storniertBeleg: beleg.id,
    stornogrund: grund || '',
    status: STATUS.FEST,
    datum: new Date().toISOString().slice(0, 10),
    summeNetto: -(beleg.summeNetto || 0),
    ust: -(beleg.ust || 0),
    brutto: -(beleg.brutto || 0),
    zahlbetrag: -(beleg.zahlbetrag || 0),
    angelegt: new Date().toISOString(),
    festgeschrieben: new Date().toISOString(),
  };
  await schreiben(SPEICHER.BELEGE, storno);
  await schreiben(SPEICHER.BELEGE, { ...beleg, status: STATUS.STORNIERT, storniertDurch: storno.id });
  return storno;
}

/** Zahlungseingang erfassen — auch bei festgeschriebenen Belegen zulaessig. */
export async function zahlungErfassen(belegId, betrag, datum) {
  const b = await lesen(SPEICHER.BELEGE, belegId);
  if (!b) throw new Error('Beleg nicht gefunden.');
  const zahlungen = [...(b.zahlungen || []), { betrag: runde2(betrag), datum: datum || new Date().toISOString().slice(0, 10) }];
  const gezahlt = runde2(zahlungen.reduce((s, z) => s + z.betrag, 0));
  await schreiben(SPEICHER.BELEGE, { ...b, zahlungen, gezahlt });
  return gezahlt;
}

export { ART_BEZEICHNUNG };
