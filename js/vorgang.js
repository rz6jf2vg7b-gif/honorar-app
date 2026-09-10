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

import { SPEICHER, alle, lesen, schreiben, loeschen, neueId } from './db.js';
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

/** Belegarten, die ein Angebot sind — sie werden angenommen, nicht bezahlt. */
export const IST_ANGEBOT = (art) => ['AN', 'NA'].includes(art);

/**
 * Wie der Bauherr auf ein Angebot geantwortet hat.
 *
 * Der praktisch wichtigste Fall ist GEAENDERT: Der Bauherr streicht
 * Leistungsphasen oder Positionen und unterschreibt. Das ist nach
 * § 150 Abs. 2 BGB keine Annahme, sondern eine Ablehnung verbunden mit einem
 * neuen Antrag — angenommen wird er dadurch, dass beide weiterarbeiten. Fuer
 * die Abrechnung zaehlt deshalb nicht, was angeboten war, sondern was
 * tatsaechlich beauftragt wurde. Genau das haelt die Annahme fest.
 */
export const ANNAHME = {
  VOLL: 'voll',           // wie angeboten
  GEAENDERT: 'geaendert', // mit Streichungen, Ergaenzungen oder anderem Betrag
  ABGELEHNT: 'abgelehnt',
};

/**
 * Verwaltungsdaten eines Belegs aendern — auch wenn er festgeschrieben ist.
 *
 * Die GoBD verlangt, dass der *Rechnungsinhalt* nach dem Festschreiben
 * unveraenderlich ist: Betraege, Leistungen, Nummer, Datum. Wann die Rechnung
 * zur Post ging und wann sie bezahlt wurde, gehoert nicht dazu — das entsteht
 * erst danach und muss nachtragbar sein, sonst waere die App im Alltag
 * unbrauchbar. Die Weissliste zieht diese Grenze und macht sie pruefbar:
 * Alles, was hier nicht steht, laesst sich an einem festen Beleg nicht aendern.
 */
const VERWALTUNGSFELDER = new Set([
  'gestelltAm',      // wann versandt
  'zahlungszielTage',
  'annahme',         // {am, art, bemerkung, positionen, phasen}
  'bezugBelegId',    // Rechnung -> Angebot/Nachtrag
  'zahlungen', 'gezahlt',
  'mahnungen',       // [{stufe, datum, zinsen, gesamt}] — was wann rausging
  'notiz',
]);

export async function verwaltungsdatenSetzen(belegId, felder) {
  const b = await lesen(SPEICHER.BELEGE, belegId);
  if (!b) throw new Error('Beleg nicht gefunden.');
  const fremd = Object.keys(felder).filter((k) => !VERWALTUNGSFELDER.has(k));
  if (fremd.length) {
    throw new Error(`Am festgeschriebenen Beleg nicht änderbar: ${fremd.join(', ')}. `
      + 'Der Rechnungsinhalt bleibt, wie er gestellt wurde (GoBD).');
  }
  const satz = { ...b, ...felder };
  await schreiben(SPEICHER.BELEGE, satz);
  return satz;
}

/** Versand vermerken. Das Datum ist frei — nachgetragen wird oefter als gleich. */
export const belegGestellt = (belegId, datum) =>
  verwaltungsdatenSetzen(belegId, { gestelltAm: datum || heute() });

/**
 * Faelligkeit einer Rechnung. Gerechnet ab Versand, nicht ab Belegdatum: Eine
 * Rechnung, die zwei Wochen liegen blieb, ist nicht zwei Wochen frueher faellig.
 * Ohne Versanddatum bleibt das Belegdatum die einzige Grundlage.
 */
export function faelligAm(beleg, zahlungszielVorgabe = 30) {
  const ab = beleg.gestelltAm || beleg.datum;
  if (!ab) return null;
  const tage = Number.isFinite(beleg.zahlungszielTage) ? beleg.zahlungszielTage : zahlungszielVorgabe;
  return tageDazu(ab, tage);
}

const heute = () => new Date().toISOString().slice(0, 10);

/** Tage auf ein ISO-Datum addieren — in UTC, sonst kostet die Sommerzeit einen Tag. */
export function tageDazu(iso, tage) {
  if (!iso) return null;
  const [j, m, t] = iso.split('-').map(Number);
  return new Date(Date.UTC(j, m - 1, t + (tage || 0))).toISOString().slice(0, 10);
}

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
  // Die Ordnungsfelder stehen NACH den Daten, nicht davor.
  //
  // Sonst bringt ein aus dem Vorgaenger uebernommener Entwurf dessen `id` und
  // `version` mit — und der neue Vertragsstand ueberschreibt beim Speichern den
  // alten. Der urspruengliche Auftrag waere weg, die Historie dahinter auch, und
  // jeder Beleg mit dieser vertragId zeigte plötzlich auf den geaenderten Stand.
  // Gefunden am 10.09.2026 beim Bau der Teilbeauftragung.
  const vertrag = {
    ...daten,
    id: neueId('v'),
    projektId,
    version: bisher.length + 1,
    grund: grund || (bisher.length ? 'Nachtrag' : 'Auftrag'),
    gueltigAb: gueltigAb || new Date().toISOString().slice(0, 10),
    angelegt: new Date().toISOString(),
  };
  await schreiben(SPEICHER.VERTRAEGE, vertrag);
  return vertrag;
}

// ————————————————————————————————————————————————————————————————
// Rechnen
// ————————————————————————————————————————————————————————————————

/**
 * Der Bruttobetrag eines Belegs fuer Listen.
 *
 * Festgeschriebene Belege tragen ihn. Entwuerfe aus der Zeit vor dem 11.09.2026
 * nicht — dort entstanden die Summen erst beim Festschreiben, und in jeder Liste
 * stand "0,00 €". Fuer sie wird aus den Positionen gerechnet.
 *
 * Ein HOAI-Entwurf ohne gespeicherte Summe bleibt ohne Betrag (null): Ihn hier
 * nachzurechnen hiesse, Vertragsstand und Honorartafeln zu laden — fuer eine
 * Listenzeile zu viel. Und eine falsche Zahl waere schlimmer als keine.
 */
export function belegBrutto(b) {
  if (Number.isFinite(b?.brutto)) return b.brutto;
  if (Number.isFinite(b?.zahlbetrag)) return b.zahlbetrag;
  const posten = b?.positionen || [];
  if (!posten.length) return null;
  const netto = posten.reduce((s, p) => s
    + (p.art === 'zeit' ? (p.stunden || 0) * (p.satz || 0) : (p.betrag || 0)), 0);
  return runde2(netto * (1 + (b.ustSatz || 0)));
}

/** Alle Belege eines Projekts, juengste zuerst — ohne Grabsteine. */
export async function belegeZuProjekt(projektId) {
  const belege = await alle(SPEICHER.BELEGE);
  return belege.filter((b) => b.projektId === projektId)
    .sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
}

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
  // Ohne Kostenermittlung gibt es keine anrechenbaren Kosten und damit kein
  // Honorar nach HOAI. Ohne diese Pruefung kam aus dem Rechenkern ein
  // "Cannot read properties of undefined", mit dem niemand etwas anfangen kann.
  if (!vertrag?.kostenermittlung && !vertrag?.flaecheHektar && !vertrag?.verrechnungseinheiten) {
    throw new Error('Dem Vertragsstand fehlt die Kostenermittlung. '
      + 'Ohne anrechenbare Kosten lässt sich das Honorar nicht ermitteln.');
  }
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

/**
 * Eine Rechnung uebernehmen, die in einem anderen Programm gestellt wurde.
 *
 * Der Fall, an dem sich das entschied: Ein Projekt wurde ueber Jahre in einem
 * anderen Honorarprogramm abgerechnet, die Schlussrechnung soll hier entstehen.
 * Dazu muss die App die frueheren Abschlagsrechnungen kennen — sonst zieht sie
 * nichts ab und fordert das Gesamthonorar ein zweites Mal.
 *
 * Bewusst kein eigener Mechanismus: Der uebernommene Beleg ist ein
 * festgeschriebener Beleg wie jeder andere und laeuft dadurch von selbst in den
 * kumulativen Abzug und in den Zahlungsstand. Er traegt nur kein eigenes Blatt —
 * das Original liegt im Ordner oder als Anlage daran.
 *
 * Was NICHT passiert: Es wird nichts nachgerechnet. Was damals gestellt wurde,
 * gilt, auch wenn die App es heute anders ermitteln wuerde. Alles andere waere
 * eine nachtraegliche Aenderung einer gestellten Rechnung.
 */
export async function belegUebernehmen({
  projektId, adresseId = null, art = BELEGART.ABSCHLAG, nummer, datum,
  summeNetto, ustSatz, gezahlt = 0, gezahltAm = null, bemerkung = '',
}) {
  if (!nummer) throw new Error('Die Rechnungsnummer der übernommenen Rechnung fehlt.');
  if (!datum) throw new Error('Das Datum der übernommenen Rechnung fehlt.');
  if (!Number.isFinite(summeNetto)) throw new Error('Der Nettobetrag fehlt.');
  if (!Number.isFinite(ustSatz) || ustSatz < 0 || ustSatz > 0.3) {
    throw new Error('Der Umsatzsteuersatz ist unplausibel.');
  }

  const ust = runde2(summeNetto * ustSatz);
  const brutto = runde2(summeNetto + ust);
  const satz = {
    id: neueId('b'),
    uebernommen: true,          // kein eigenes Blatt, nur Zahlenwerk
    art,
    projektId,
    adresseId,
    nummer,
    datum,
    datumDe: datum.split('-').reverse().join('.'),
    ustSatz,
    kumulativ: true,
    status: STATUS.FEST,
    festgeschrieben: new Date().toISOString(),
    angelegt: new Date().toISOString(),
    summeNetto: runde2(summeNetto),
    ust,
    brutto,
    zahlbetrag: brutto,
    gezahlt: runde2(gezahlt),
    zahlungen: gezahlt ? [{ betrag: runde2(gezahlt), datum: gezahltAm || datum }] : [],
    gestelltAm: datum,
    notiz: bemerkung,
  };
  await schreiben(SPEICHER.BELEGE, satz);
  return satz;
}

/**
 * Eine verschickte Mahnung am Beleg vermerken.
 *
 * Ohne diesen Vermerk weiss beim naechsten Mal niemand, ob und wann Stufe 1
 * rausging — und das ist keine Ordnungsfrage: Wer gerichtlich vorgehen will,
 * muss den Verzug belegen koennen, und wer versehentlich zweimal die erste
 * Mahnung schickt, verliert beim Bauherrn an Ernsthaftigkeit.
 *
 * Vermerkt wird beim Drucken, nicht beim Rechnen: Was nur angesehen wurde, ist
 * nicht verschickt.
 */
export async function mahnungVermerken(belegIds, { stufe, datum, zinsen = 0, gesamt = 0 }) {
  const vermerkt = [];
  for (const id of belegIds) {
    const b = await lesen(SPEICHER.BELEGE, id);
    if (!b) continue;
    const bisher = b.mahnungen || [];
    const satz = await verwaltungsdatenSetzen(id, {
      mahnungen: [...bisher, { stufe, datum: datum || heute(), zinsen, gesamt }],
    });
    vermerkt.push(satz);
  }
  return vermerkt;
}

/** Hoechste bisher verschickte Mahnstufe eines Belegs. */
export const letzteMahnung = (beleg) => (beleg?.mahnungen || [])
  .reduce((h, m) => (m.stufe > (h?.stufe ?? 0) ? m : h), null);

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

  // Die Skontofrist laeuft ab Rechnungsdatum. Waere sie ab Versand zu rechnen,
  // stuende auf dem Blatt ein Datum, das sich nach dem Druck noch aendert.
  const skonto = (entwurf.skontoProzent > 0 && IST_RECHNUNG(entwurf.art))
    ? {
      prozent: entwurf.skontoProzent,
      tage: entwurf.skontoTage ?? 14,
      bis: tageDazu(entwurf.datum, entwurf.skontoTage ?? 14),
    }
    : null;

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
    skonto,
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
  // Die Belegnummer muss einmalig sein (§ 14 Abs. 4 Nr. 4 UStG) — und zwei
  // Belege mit derselben Nummer sind auch praktisch ein Problem: In der Liste
  // sind sie nicht auseinanderzuhalten. Am 11.09.2026 lag ein Angebot deshalb
  // zweimal im Bestand. Die Ursache war eine andere (die Kennung wurde nach dem
  // Sichern nicht zurueckgeschrieben), aber der Riegel gehoert hierher: Der
  // Assistent prueft nur beim Weiterklicken, gespeichert wird auch anderswo.
  if (beleg.nummer) {
    const belegt = (await alle(SPEICHER.BELEGE))
      .find((b) => b.nummer === beleg.nummer && b.id !== beleg.id);
    if (belegt) {
      throw new Error(`Die Belegnummer ${beleg.nummer} ist bereits vergeben. `
        + 'Jede Nummer darf nur einmal vorkommen (§ 14 Abs. 4 Nr. 4 UStG).');
    }
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

/**
 * Die Antwort des Bauherrn auf ein Angebot oder einen Nachtrag festhalten.
 *
 * Was hier entsteht, ist der Massstab fuer alles Weitere: Abschlags- und
 * Schlussrechnungen rechnen gegen den *beauftragten* Umfang, nicht gegen den
 * angebotenen. Deshalb zieht eine Annahme mit Aenderungen einen eigenen
 * Vertragsstand nach sich — das Angebot selbst bleibt unangetastet, es ist ein
 * festgeschriebener Beleg.
 *
 * @param {string} belegId
 * @param {object} a
 * @param {string} a.am          Datum der Annahme (frei, wird oft nachgetragen)
 * @param {string} a.art         ANNAHME.VOLL | GEAENDERT | ABGELEHNT
 * @param {string} [a.bemerkung] z. B. "LPh 5-9 zurückgestellt"
 * @param {Array}  [a.positionen] beauftragte Positionen (Pauschale/Zeit)
 * @param {Array}  [a.phasen]     beauftragte Leistungsphasen [{nr, vereinbart}]
 */
export async function annahmeVermerken(belegId, a) {
  const beleg = await lesen(SPEICHER.BELEGE, belegId);
  if (!beleg) throw new Error('Beleg nicht gefunden.');
  if (!IST_ANGEBOT(beleg.art)) {
    throw new Error('Nur Angebote und Nachträge werden angenommen. '
      + 'Eine Rechnung wird bezahlt.');
  }
  const art = a.art || ANNAHME.VOLL;
  const am = a.am || heute();

  const annahme = {
    am, art,
    bemerkung: a.bemerkung || '',
    positionen: art === ANNAHME.GEAENDERT ? (a.positionen || null) : null,
    phasen: art === ANNAHME.GEAENDERT ? (a.phasen || null) : null,
    vermerktAm: new Date().toISOString(),
  };
  const satz = await verwaltungsdatenSetzen(belegId, { annahme });

  if (art === ANNAHME.ABGELEHNT) return { beleg: satz, vertrag: null };

  // Der Vertragsstand: bei unveraenderter Annahme wird der vorhandene wirksam,
  // bei Aenderungen entsteht ein neuer mit dem tatsaechlich beauftragten Umfang.
  const vorhanden = beleg.vertragId ? await lesen(SPEICHER.VERTRAEGE, beleg.vertragId) : null;
  let vertrag = null;

  if (art === ANNAHME.VOLL && vorhanden) {
    vertrag = { ...vorhanden, beauftragt: true, beauftragtAm: am };
    await schreiben(SPEICHER.VERTRAEGE, vertrag);
  } else if (art === ANNAHME.GEAENDERT && vorhanden && (a.phasen || []).length) {
    vertrag = await vertragAnlegen({
      projektId: beleg.projektId,
      daten: { ...vorhanden, phasen: a.phasen, beauftragt: true, beauftragtAm: am },
      grund: `Auftrag nach ${BELEGART_TEXT[beleg.art]} ${beleg.nummer}, geändert`,
      gueltigAb: am,
    });
  }
  return { beleg: satz, vertrag };
}

/**
 * Was aus einem angenommenen Angebot tatsaechlich geschuldet ist.
 * Ohne Aenderungen ist das der Angebotsinhalt, sonst der der Annahme.
 */
export function beauftragtePositionen(beleg) {
  if (beleg?.annahme?.art === ANNAHME.GEAENDERT && beleg.annahme.positionen) {
    return beleg.annahme.positionen;
  }
  return beleg?.positionen || [];
}

/**
 * Einen Entwurf loeschen.
 *
 * Nur Entwuerfe: Ein festgeschriebener Beleg wird storniert, nicht entfernt —
 * eine Rechnung, die es gab, verschwindet nicht aus der Buchhaltung. Ein
 * Entwurf dagegen ist nie nach draussen gegangen; ihn behalten zu muessen,
 * waere Ordnungswahn, und in der Belegliste stuende auf Dauer Ausschuss.
 *
 * Geloescht wird als Grabstein (siehe db.js), damit der Abgleich die Loeschung
 * auf die anderen Geraete traegt, statt den Beleg von dort zurueckzuholen.
 */
export async function belegLoeschen(belegId) {
  const b = await lesen(SPEICHER.BELEGE, belegId);
  if (!b) throw new Error('Beleg nicht gefunden.');
  if (b.status === STATUS.FEST) {
    throw new Error('Ein festgeschriebener Beleg wird nicht gelöscht, sondern storniert. '
      + 'Was einmal gestellt wurde, bleibt nachvollziehbar (GoBD).');
  }
  const anlagen = await anlagenZuBeleg(belegId);
  for (const a of anlagen) await loeschen(SPEICHER.ANLAGEN, a.id);
  await loeschen(SPEICHER.BELEGE, belegId);
  return true;
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
export async function zahlungErfassen(belegId, betrag, datum, art = 'zahlung') {
  const b = await lesen(SPEICHER.BELEGE, belegId);
  if (!b) throw new Error('Beleg nicht gefunden.');
  const zahlungen = [...(b.zahlungen || []), {
    betrag: runde2(betrag),
    datum: datum || heute(),
    // 'skonto' ist keine Zahlung, sondern der gewaehrte Nachlass. Er schliesst
    // die Forderung mit ab, gehoert aber getrennt ausgewiesen: Nach § 17 Abs. 1
    // UStG ist die Umsatzsteuer im Zeitpunkt der Inanspruchnahme zu berichtigen,
    // und der Steuerberater muss sehen, um welchen Betrag.
    art,
  }];
  const gezahlt = runde2(zahlungen.reduce((s, z) => s + z.betrag, 0));
  await schreiben(SPEICHER.BELEGE, { ...b, zahlungen, gezahlt });
  return gezahlt;
}

/**
 * Skonto abrechnen: Der Auftraggeber hat fristgerecht gezahlt und den
 * vereinbarten Abzug genommen.
 *
 * Der Nachlass wird als eigener Posten gefuehrt, nicht als Zahlung — sonst
 * stuende in der Buchhaltung ein Geldeingang, den es nie gab. Aus dem gebuchten
 * Bruttobetrag ergibt sich die Berichtigung: Entgelt und Steuer mindern sich im
 * selben Verhaeltnis.
 */
export async function skontoGewaehren(belegId, betrag, datum) {
  const b = await lesen(SPEICHER.BELEGE, belegId);
  if (!b) throw new Error('Beleg nicht gefunden.');
  const satz = b.ustSatz || 0;
  const gezahlt = await zahlungErfassen(belegId, betrag, datum, 'skonto');
  return {
    gezahlt,
    // Fuer die Umsatzsteuer-Berichtigung nach § 17 Abs. 1 UStG.
    minderungNetto: runde2(betrag / (1 + satz)),
    minderungUst: runde2(betrag - betrag / (1 + satz)),
  };
}

// ————————————————————————————————————————————————————————————————
// Anlagen — das unterschriebene Original
// ————————————————————————————————————————————————————————————————
//
// Das gegengezeichnete Angebot ist im Streitfall das wichtigste Blatt der Akte:
// Es beweist, was vereinbart wurde. Es gehoert deshalb an den Beleg und nicht in
// einen Ordner daneben, wo es beim naechsten Aufraeumen verlorengeht.
//
// Datenschutz: Die Datei liegt in der Datenbank des Geraets. Sie wird beim
// Abgleich NICHT in die gemeinsame Datei geschrieben — ein Scan wiegt Megabyte
// und haette honorar.json unbrauchbar gross gemacht. Der Abgleich legt Anlagen
// stattdessen einzeln in OneDrive ab (js/sync/anlagen.js).

/** Groesste Datei, die sinnvoll in der Datenbank liegt. Darueber wird gewarnt. */
export const ANLAGE_GRENZE = 20 * 1024 * 1024;

export async function anlageSpeichern(belegId, datei) {
  if (!datei) throw new Error('Keine Datei gewählt.');
  if (datei.size > ANLAGE_GRENZE) {
    throw new Error(`Die Datei ist ${(datei.size / 1024 / 1024).toFixed(1)} MB groß. `
      + `Mehr als ${ANLAGE_GRENZE / 1024 / 1024} MB je Anlage nimmt die App nicht an — `
      + 'scanne das Blatt in geringerer Auflösung oder als PDF.');
  }
  const anlage = {
    id: neueId('a'),
    belegId,
    name: datei.name || 'Anlage',
    typ: datei.type || 'application/octet-stream',
    groesse: datei.size,
    daten: await datei.arrayBuffer(),
    angelegt: new Date().toISOString(),
  };
  await schreiben(SPEICHER.ANLAGEN, anlage);
  return anlage;
}

export async function anlagenZuBeleg(belegId) {
  const a = await alle(SPEICHER.ANLAGEN);
  return a.filter((x) => x.belegId === belegId)
    .sort((x, y) => (x.angelegt || '').localeCompare(y.angelegt || ''));
}

export async function anlageLesen(id) {
  return lesen(SPEICHER.ANLAGEN, id);
}

export { ART_BEZEICHNUNG };
