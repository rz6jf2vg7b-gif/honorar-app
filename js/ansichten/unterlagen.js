// Vertragsdatenblatt und Abnahmeprotokoll zu einem Projekt.
//
// ⚠️ WARUM HIER KEIN VERTRAGSTEXT STEHT
//
// Die Orientierungshilfe der Architektenkammer ist ein urheberrechtlich
// geschütztes Sprachwerk. Sie zu nutzen und auszufüllen ist ihr Zweck; ihren
// Wortlaut in eine App zu übernehmen, die weitergegeben oder verkauft werden
// soll, wäre eine Vervielfältigung. Und eigene Vertragsklauseln zu formulieren
// wäre eine Rechtsdienstleistung (§ 2 RDG), die ein Programm nicht erbringen
// darf.
//
// Deshalb erzeugt diese Ansicht kein Vertragswerk, sondern ein
// DATENBLATT: alle Angaben, die in einen Vertrag einzusetzen sind, in der
// Gliederung der Kammervorlage und mit deren Ziffern. Wer die Vorlage vor sich
// hat, arbeitet sie damit von oben nach unten durch — ohne etwas zu suchen und
// ohne eine Zahl abzutippen, die die App bereits kennt.
//
// Das Abnahmeprotokoll ist ein anderer Fall: Es ist der Sache nach ein
// Formular — wer, wann, was, welche Vorbehalte. Es steht deshalb vollständig
// hier, in eigener Formulierung und mit den Fundstellen des BGB.

import { el, leeren, feld, eurZeigen, isoNachDe, heuteIso, melden, dateiSpeichern, zurueck } from '../ui.js';
import {
  SPEICHER, lesen, alle, einstellungenLesen, anschriftZeilen, telefonZeigen, personName,
} from '../db.js';
import { vertraegeZuProjekt, ermittlungAusVertrag } from '../vorgang.js';
import { LEISTUNGSBILDER, ZONE_ROEMISCH, HONORARZONEN } from '../hoai/leistungsbilder.js';
import { MASSNAHME_TEXT } from '../hoai/rechnen.js';
import { prozent } from '../hoai/geld.js';

const UMFANG = {
  vollstaendig: {
    bezeichnung: 'Vertragsdatenblatt — vollständig',
    beschreibung: 'In der Gliederung der Kammervorlage, § 1 bis § 12 samt Anlage 1. '
      + 'Für den ausführlichen Architektenvertrag.',
  },
  klein: {
    bezeichnung: 'Vertragsdatenblatt — kleine Maßnahme',
    beschreibung: 'Nur das Nötigste: Parteien, Leistung, Honorar, Termine, Abnahme. '
      + 'Für Aufträge, bei denen ein zwölfseitiger Vertrag außer Verhältnis stünde.',
  },
  fremd: {
    bezeichnung: 'Honoraranlage zu fremdem Vertrag',
    beschreibung: 'Wenn der Auftraggeber sein eigenes Vertragswerk stellt: nur die '
      + 'Honorarermittlung als Anlage, ohne eigene Regelungen.',
  },
  abnahme: {
    bezeichnung: 'Abnahmeprotokoll — vollständig',
    beschreibung: 'Förmliche Abnahme mit Mängelliste, Vorbehalten und Verjährungsbeginn.',
  },
  abnahmeKlein: {
    bezeichnung: 'Abnahmeprotokoll — kleine Maßnahme',
    beschreibung: 'Kurzfassung auf einer Seite.',
  },
  teilabnahme: {
    bezeichnung: 'Teilabnahme nach § 650s BGB',
    beschreibung: 'Ab der Abnahme der letzten Leistung des bauausführenden Unternehmers '
      + 'kann der Architekt eine Teilabnahme seiner bis dahin erbrachten Leistungen verlangen. '
      + 'Sie setzt die Verjährung für diesen Teil in Gang.',
  },
};

export async function unterlagenZeigen(wurzel, projektId) {
  const projekt = await lesen(SPEICHER.PROJEKTE, projektId);
  if (!projekt) {
    wurzel.append(el('div', { class: 'leer' }, el('p', { text: 'Dieses Projekt wurde nicht gefunden.' })));
    return;
  }
  const [einst, adressen, vertraege] = await Promise.all([
    einstellungenLesen(), alle(SPEICHER.ADRESSEN), vertraegeZuProjekt(projektId),
  ]);
  const auftraggeber = adressen.find((a) => a.id === projekt.auftraggeberId) || null;
  const vertrag = vertraege[vertraege.length - 1] || null;

  wurzel.append(
    el('div', { class: 'schrittkopf' },
      el('span', { class: 'kicker', text: `${projekt.nummer} ${projekt.name}` }),
      el('button', {
        class: 'knopf leise', type: 'button', style: 'min-height:34px;padding:0 12px;',
        onclick: () => zurueck(`#projekt/${projektId}`),
      }, 'Zurück'),
    ),
    el('h1', { text: 'Unterlagen' }),
    el('div', { class: 'karte hinweiskarte' },
      el('h3', { text: 'Datenblätter, keine Verträge' }),
      el('p', { class: 'fliess', text: 'Die App erzeugt kein Vertragswerk. Die Orientierungshilfe der '
        + 'Architektenkammer ist urheberrechtlich geschützt, und eigene Klauseln zu formulieren wäre '
        + 'Rechtsdienstleistung. Was hier entsteht, sind die Angaben zum Einsetzen — in der Gliederung '
        + 'der Kammervorlage, mit deren Ziffern.' }),
      el('p', { class: 'fliess', text: 'Das Abnahmeprotokoll ist der Sache nach ein Formular und steht '
        + 'deshalb vollständig hier. Auch dafür gilt: Entwurf, kein Rechtsrat.' }),
      el('p', { class: 'fliess', text: 'Die Kammervorlagen liegen als ausfüllbare Formulare unter '
        + '03_RESOURCES/Fachgrundlagen/Architektenkammer-RLP/Formulare. „Vertragsdaten (JSON)" legt '
        + 'die Angaben dieses Projekts so ab, dass tools/vertrag_ausfuellen.py sie dort einsetzt.' }),
    ),
  );

  if (!auftraggeber) {
    wurzel.append(el('div', { class: 'karte hinweiskarte' },
      el('h3', { text: 'Kein Auftraggeber zugeordnet' }),
      el('p', { class: 'klein', text: 'Ohne ihn bleiben die Felder der Vertragsparteien leer.' }),
      el('div', { class: 'knopfreihe' },
        el('button', { class: 'knopf zweit', onclick: () => { location.hash = `#projekt/${projektId}`; } },
          'Im Projekt zuordnen'))));
  }
  if (!vertrag) {
    wurzel.append(el('div', { class: 'karte hinweiskarte' },
      el('h3', { text: 'Noch kein Vertragsstand' }),
      el('p', { class: 'klein', text: 'Honorarangaben bleiben leer. Ein Vertragsstand entsteht beim ersten Angebot oder der ersten Rechnung.' })));
  }

  let art = 'vollstaendig';
  const box = el('div');
  const zeichnen = () => {
    leeren(box);
    const daten = { projekt, auftraggeber, vertrag, einst };
    let text;
    try {
      text = ({
        vollstaendig: () => datenblattVoll(daten),
        klein: () => datenblattKlein(daten),
        fremd: () => honoraranlage(daten),
        abnahme: () => abnahmeprotokoll(daten, 'voll'),
        abnahmeKlein: () => abnahmeprotokoll(daten, 'klein'),
        teilabnahme: () => abnahmeprotokoll(daten, 'teil'),
      })[art]();
    } catch (fehler) {
      console.error(fehler);
      box.append(el('p', { class: 'hinweis fehler', text: `Nicht erzeugbar: ${fehler.message}` }));
      return;
    }
    const name = `${projekt.nummer}_${art}.txt`.replace(/[^\wÄÖÜäöüß.-]/g, '_');
    box.append(
      el('p', { class: 'klein', text: UMFANG[art].beschreibung }),
      el('pre', { class: 'rechtstext', text }),
      el('div', { class: 'knopfreihe' },
        el('button', {
          class: 'knopf zweit', type: 'button',
          onclick: async () => {
            try { await navigator.clipboard.writeText(text); melden('In die Zwischenablage kopiert.'); }
            catch { melden('Kopieren nicht möglich — Text markieren und selbst kopieren.', 'fehler'); }
          },
        }, 'Kopieren'),
        el('button', {
          class: 'knopf leise', type: 'button',
          onclick: () => dateiSpeichern(name, text, 'text/plain;charset=utf-8'),
        }, 'Als Datei ablegen'),
        el('button', {
          class: 'knopf leise', type: 'button',
          onclick: () => {
            const daten2 = vertragsdaten({ projekt, auftraggeber, vertrag, einst });
            dateiSpeichern(`${projekt.nummer}_Vertragsdaten.json`.replace(/[^\wÄÖÜäöüß.-]/g, '_'),
              JSON.stringify(daten2, null, 1), 'application/json');
            melden('Vertragsdaten abgelegt — für tools/vertrag_ausfuellen.py.');
          },
        }, 'Vertragsdaten (JSON)'),
      ),
    );
  };

  wurzel.append(
    feld({
      label: 'Unterlage', art: 'auswahl', wert: art,
      optionen: Object.entries(UMFANG).map(([w, u]) => ({ wert: w, text: u.bezeichnung })),
      onAenderung: (w) => { art = w; zeichnen(); },
    }),
    box,
  );
  zeichnen();
}

// ————————————————————————————————————————————————————————————————
// Bausteine
// ————————————————————————————————————————————————————————————————

const strich = '─'.repeat(72);
const feldZeile = (bez, wert) => `${bez.padEnd(34, '.')} ${wert || '.'.repeat(28)}`;

function parteien({ auftraggeber, einst }) {
  const b = einst.buero;
  const a = anschriftZeilen(b);
  const ag = auftraggeber;
  return `BAUHERR (Auftraggeber)
${feldZeile('Name / Firma', ag?.name)}
${feldZeile('vertreten durch', ag ? personName(ag) : '')}
${feldZeile('Anschrift', ag ? [ag.strasse, ag.adresszeile2].filter(Boolean).join(', ') : '')}
${feldZeile('PLZ, Ort', ag ? `${ag.plz || ''} ${ag.ort || ''}`.trim() : '')}
${feldZeile('Telefon', ag?.telefon)}
${feldZeile('E-Mail', ag?.mail)}

ARCHITEKT (Auftragnehmer)
${feldZeile('Name / Büro', b.name)}
${feldZeile('Inhaber', b.inhaber)}
${feldZeile('Anschrift', a.strasse)}
${feldZeile('PLZ, Ort', a.plzOrt)}
${feldZeile('Telefon', telefonZeigen(b))}
${feldZeile('E-Mail', b.mail)}
${feldZeile('Kammer, Eintragungsnummer', [b.kammer, b.eintragungsnummer].filter(Boolean).join(', '))}`;
}

function honorarteil(vertrag) {
  if (!vertrag) {
    return `${feldZeile('Leistungsbild', '')}
${feldZeile('HOAI-Fassung', '')}
${feldZeile('Honorarzone', '')}
${feldZeile('Honorarsatz', '')}
${feldZeile('anrechenbare Kosten', '')}

  (Noch kein Vertragsstand erfasst — die Werte entstehen mit dem ersten
   Angebot oder der ersten Rechnung.)`;
  }

  const lb = LEISTUNGSBILDER[vertrag.leistungsbild];
  let e = null;
  try { e = ermittlungAusVertrag(vertrag, null); } catch { /* unvollständig */ }

  const phasen = (vertrag.phasen || [])
    .filter((p) => (p.vereinbart ?? 0) > 0)
    .map((p) => `    LPh ${String(p.nr).padEnd(2)} ${(lb?.namen?.[p.nr] || '').padEnd(46)} `
      + `${prozent(p.vereinbart).padStart(7)}`)
    .join('\n');

  const zuschlaege = (vertrag.zuschlaege || [])
    .map((z) => `    ${z.bezeichnung} ${prozent(z.prozent)}${z.fundstelle ? ` (${z.fundstelle})` : ''}`)
    .join('\n');

  return `${feldZeile('Leistungsbild', `${lb?.bezeichnung || vertrag.leistungsbild} (${lb?.leistungsbildParagraf || ''})`)}
${feldZeile('HOAI-Fassung', String(vertrag.fassung))}
${feldZeile('Art der Maßnahme', MASSNAHME_TEXT[vertrag.massnahme] || '')}
${feldZeile('Honorarzone', vertrag.honorarzone
    ? `${ZONE_ROEMISCH[vertrag.honorarzone]} — ${HONORARZONEN[vertrag.honorarzone]}`
    : '')}
${vertrag.honorarzoneBegruendung ? `    Begründung: ${vertrag.honorarzoneBegruendung}\n` : ''}${feldZeile('Honorarsatz', prozent(vertrag.honorarsatz))}
${feldZeile('Grundlage der Kosten', [vertrag.kostenermittlung?.grundlage,
    vertrag.kostenermittlung?.datum ? `vom ${vertrag.kostenermittlung.datum}` : null]
    .filter(Boolean).join(' '))}
${feldZeile('DIN-Fassung', vertrag.kostenermittlung?.dinFassung)}
${feldZeile('anrechenbare Kosten', e ? eurZeigen(e.anrechenbareKosten) : '')}
${feldZeile('Grundhonorar (100 %)', e ? eurZeigen(e.grundhonorar100) : '')}

  BEAUFTRAGTE LEISTUNGSPHASEN
${phasen || '    (keine)'}
${zuschlaege ? `\n  ZUSCHLÄGE\n${zuschlaege}` : ''}
${vertrag.nebenkosten?.prozent
    ? `\n  NEBENKOSTEN\n    pauschal ${prozent(vertrag.nebenkosten.prozent)} (§ 14 HOAI)`
    : ''}

${feldZeile('Honorar netto', e ? eurZeigen(e.netto) : '')}`;
}

function kopf(titel, { projekt, einst }) {
  return `${titel}
${strich}
Projekt      ${projekt.nummer} ${projekt.name}
${projekt.ort ? `Ort          ${projekt.ort}\n` : ''}Erstellt     ${new Date().toLocaleDateString('de-DE')} · ${einst.buero.name || ''}
${strich}`;
}

// ————————————————————————————————————————————————————————————————
// Vertragsdatenblätter
// ————————————————————————————————————————————————————————————————

function datenblattVoll(d) {
  const { projekt, vertrag } = d;
  return `${kopf('VERTRAGSDATENBLATT — ARCHITEKTENVERTRAG GEBÄUDE', d)}

Diese Aufstellung folgt der Gliederung der Orientierungshilfe der
Architektenkammer. Sie enthält die Angaben zum Einsetzen — den Vertragstext
selbst nicht.

${strich}
VERTRAGSPARTEIEN

${parteien(d)}

${strich}
§ 1  GEGENSTAND DES VERTRAGES UND LEISTUNGEN DES ARCHITEKTEN

1.1.1  Art des Objektes und der Maßnahme
${feldZeile('Objekt', projekt.name)}
${feldZeile('Art der Maßnahme', MASSNAHME_TEXT[vertrag?.massnahme] || '')}
${feldZeile('Baurecht', projekt.baurecht)}
${feldZeile('Verfahren', projekt.verfahren)}
${feldZeile('Baubehörde', projekt.baubehoerde)}

1.1.2  Planungs- und Überwachungsziele
       ${'.'.repeat(60)}
       ${'.'.repeat(60)}

1.2 bis 1.4  Übertragene Leistungen
       Siehe die beauftragten Leistungsphasen unter § 3.

${strich}
§ 2  AUFGABEN DES BAUHERRN

       Mitwirkungspflichten, Vorleistungen, beizustellende Unterlagen:
       ${'.'.repeat(60)}

${strich}
§ 3  GRUNDLAGEN DES HONORARS

${honorarteil(vertrag)}

${feldZeile('Umsatzsteuer', vertrag ? prozent(0.19) : '')}
${feldZeile('Zahlungsziel', '')}
${feldZeile('Abschlagszahlungen', 'in angemessenen Abständen (§ 15 Abs. 2 HOAI)')}

${strich}
§ 4  SCHUTZ DES ARCHITEKTENWERKES UND DES VERFASSERS
§ 5  VERLÄNGERUNG DER DURCHFÜHRUNG UND UNTERBRECHUNG
§ 7  MÄNGELANSPRÜCHE UND HAFTUNG
§ 9  VORZEITIGE AUFLÖSUNG DES VERTRAGES
§ 10 HERAUSGABE- UND AUFBEWAHRUNGSPFLICHTEN
§ 10a HÖHERE GEWALT
§ 11 SCHLUSSBESTIMMUNG

       Diese Regelungen sind aus der Vorlage zu übernehmen; die App hält dazu
       keine Angaben.

${strich}
§ 6  ABNAHME UND VERJÄHRUNG

${feldZeile('Abnahme förmlich vereinbart', '')}
${feldZeile('Teilabnahme nach § 650s BGB', '')}
       Ein Abnahmeprotokoll erzeugt diese App unter derselben Auswahl.

${strich}
§ 8  HAFTPFLICHTVERSICHERUNG

${feldZeile('Versicherer', d.einst.buero.haftpflichtVersicherer)}
${feldZeile('Anschrift', d.einst.buero.haftpflichtAnschrift)}
${feldZeile('Geltungsbereich', d.einst.buero.haftpflichtGeltungsbereich)}
${feldZeile('Deckungssumme Personenschäden', '')}
${feldZeile('Deckungssumme Sonstige', '')}

${strich}
§ 12  ZUSÄTZLICHE VEREINBARUNGEN

       ${'.'.repeat(60)}
       ${'.'.repeat(60)}

${strich}
ANLAGE 1  MITZUVERARBEITENDE BAUSUBSTANZ (§ 2 Abs. 7, § 4 Abs. 3 HOAI)

${feldZeile('Umfang und Wert', vertrag?.kostenermittlung?.mitzuverarbeitendeBausubstanz
    ? eurZeigen(vertrag.kostenermittlung.mitzuverarbeitendeBausubstanz) : '')}
       Umfang und Wert sind zum Zeitpunkt der Kostenberechnung objektbezogen
       zu ermitteln und in Textform zu vereinbaren.

${strich}
BEI VERBRAUCHERN ZUSÄTZLICH

       Widerrufsbelehrung und Muster-Widerrufsformular beifügen
       (§§ 355, 356 BGB, Art. 246a EGBGB). Ohne sie läuft die Widerrufsfrist
       nicht an. Die Vorlage der Kammer enthält beides.

${strich}
Entwurf zum Einsetzen. Kein Rechtsrat.`;
}

function datenblattKlein(d) {
  const { projekt, vertrag } = d;
  return `${kopf('VERTRAGSDATENBLATT — KLEINE MASSNAHME', d)}

Für Aufträge, bei denen ein ausführlicher Vertrag außer Verhältnis stünde.
Die Punkte unten sind das, was auch dann geregelt sein muss.

${parteien(d)}

${strich}
LEISTUNG

${feldZeile('Objekt', projekt.name)}
${feldZeile('Art der Maßnahme', MASSNAHME_TEXT[vertrag?.massnahme] || '')}
       Was genau geschuldet ist:
       ${'.'.repeat(60)}
       ${'.'.repeat(60)}

${strich}
HONORAR

${honorarteil(vertrag)}

${feldZeile('Umsatzsteuer', '19 %')}
${feldZeile('Zahlungsziel', '')}

${strich}
TERMINE

${feldZeile('Beginn', '')}
${feldZeile('Fertigstellung', '')}

${strich}
ABNAHME UND VERJÄHRUNG

       Abnahme nach § 640 BGB. Mängelansprüche verjähren in fünf Jahren ab
       Abnahme (§ 634a Abs. 1 Nr. 2 BGB).

${strich}
HAFTPFLICHT

${feldZeile('Versicherer', d.einst.buero.haftpflichtVersicherer)}

${strich}
BEI VERBRAUCHERN

       Widerrufsbelehrung beifügen — auch bei kleinen Aufträgen. Fehlt sie,
       läuft die Widerrufsfrist nicht an und der Vertrag bleibt widerruflich.

${strich}
Entwurf zum Einsetzen. Kein Rechtsrat.`;
}

function honoraranlage(d) {
  const { vertrag } = d;
  return `${kopf('ANLAGE ZUM VERTRAG — HONORARERMITTLUNG NACH HOAI', d)}

Der Auftraggeber stellt das Vertragswerk. Diese Anlage beschreibt allein, wie
sich das Honorar ermittelt.

${strich}
${honorarteil(vertrag)}

${strich}
GRUNDLAGEN

  Die Ermittlung folgt der HOAI in der Fassung ${vertrag?.fassung || '….'}:
  anrechenbare Kosten nach § 4, Honorarzone nach § 5 und den
  Bewertungsmerkmalen des Leistungsbildes, Honorartafel und Interpolation
  nach § 13, Bewertung der Leistungsphasen nach dem jeweiligen Leistungsbild,
  Nebenkosten nach § 14.

  Die vollständige Herleitung mit allen Zwischenschritten steht auf jedem
  Beleg, der aus diesem Vertragsstand erzeugt wird.

${strich}
Entwurf. Kein Rechtsrat.`;
}

// ————————————————————————————————————————————————————————————————
// Abnahmeprotokolle
// ————————————————————————————————————————————————————————————————

function abnahmeprotokoll(d, umfang) {
  const { projekt, auftraggeber, einst } = d;
  const b = einst.buero;
  const titel = umfang === 'teil'
    ? 'PROTOKOLL ÜBER DIE TEILABNAHME (§ 650s BGB)'
    : 'ABNAHMEPROTOKOLL';

  const beteiligte = `${feldZeile('Bauherr', auftraggeber?.name)}
${feldZeile('vertreten durch', auftraggeber ? personName(auftraggeber) : '')}
${feldZeile('Architekt', b.name)}
${feldZeile('vertreten durch', b.inhaber)}
${feldZeile('weitere Anwesende', '')}`;

  const maengel = `MÄNGEL UND OFFENE PUNKTE

  Nr.  Beschreibung                                    Frist zur Beseitigung
  ${'─'.repeat(68)}
  1    ${'.'.repeat(46)}  ${'.'.repeat(12)}
  2    ${'.'.repeat(46)}  ${'.'.repeat(12)}
  3    ${'.'.repeat(46)}  ${'.'.repeat(12)}

  [ ] Es wurden keine Mängel festgestellt.`;

  const rechtsfolgen = `RECHTSFOLGEN DER ABNAHME

  Mit der Abnahme
    beginnt die Verjährung der Mängelansprüche — fünf Jahre
    (§ 634a Abs. 1 Nr. 2 BGB),
    geht die Gefahr über (§ 644 BGB),
    wird das Honorar fällig, soweit eine prüffähige Schlussrechnung
    vorliegt (§ 15 Abs. 1 HOAI),
    trägt für Mängel, die nicht vorbehalten wurden, der Auftraggeber die
    Beweislast.

  Wer einen erkannten Mangel bei der Abnahme nicht vorbehält, verliert
  insoweit seine Rechte (§ 640 Abs. 3 BGB). Deshalb ist die Liste oben
  auszufüllen, bevor unterschrieben wird.`;

  const unterschriften = `${strich}

  Ort, Datum ${'.'.repeat(40)}


  ${'_'.repeat(30)}          ${'_'.repeat(30)}
  Bauherr                          Architekt
  ${(auftraggeber ? personName(auftraggeber, { mitAnrede: false }) : '').padEnd(30)}   ${b.inhaber || ''}`;

  if (umfang === 'klein') {
    return `${kopf(titel + ' — KLEINE MASSNAHME', d)}

${beteiligte}
${feldZeile('Abnahmetermin', '')}
${feldZeile('Gegenstand', projekt.name)}

${strich}
${maengel}

${strich}
  [ ] Die Leistung wird abgenommen.
  [ ] Die Abnahme wird verweigert, Begründung:
      ${'.'.repeat(58)}

  Verjährung der Mängelansprüche: fünf Jahre ab heute (§ 634a BGB).

${unterschriften}

${strich}
Entwurf. Kein Rechtsrat.`;
  }

  const teilHinweis = umfang === 'teil' ? `
${strich}
GRUNDLAGE DER TEILABNAHME

  Nach § 650s BGB kann der Architekt ab der Abnahme der letzten Leistung des
  bauausführenden Unternehmers eine Teilabnahme der von ihm bis dahin
  erbrachten Leistungen verlangen.

  Das ist keine Förmelei: Ohne Teilabnahme beginnt die Verjährung der
  Architektenleistungen erst mit der Abnahme der gesamten Leistung —
  einschließlich der Objektbetreuung nach LPh 9, also unter Umständen erst
  Jahre später.

${feldZeile('Letzte Unternehmerleistung abgenommen am', '')}
${feldZeile('Umfang der Teilabnahme (Leistungsphasen)', '')}
` : '';

  return `${kopf(titel, d)}

${beteiligte}

${feldZeile('Abnahmetermin', '')}
${feldZeile('Ort der Abnahme', projekt.ort)}
${feldZeile('Gegenstand', projekt.name)}
${feldZeile('Umfang der abgenommenen Leistung', '')}
${teilHinweis}
${strich}
FESTSTELLUNGEN

  Die Leistung wurde gemeinsam begangen und geprüft.

  [ ] Die Leistung wird abgenommen.
  [ ] Die Leistung wird unter den unten aufgeführten Vorbehalten abgenommen.
  [ ] Die Abnahme wird wegen wesentlicher Mängel verweigert (§ 640 Abs. 1
      Satz 2 BGB).

  Begründung bei Verweigerung:
      ${'.'.repeat(58)}
      ${'.'.repeat(58)}

${strich}
${maengel}

${strich}
VORBEHALTE

  [ ] Vorbehalt wegen der oben aufgeführten Mängel.
  [ ] Vorbehalt einer Vertragsstrafe (§ 341 Abs. 3 BGB) — ohne Vorbehalt bei
      der Abnahme entfällt der Anspruch.
  [ ] Keine Vorbehalte.

${strich}
${rechtsfolgen}

${strich}
ÜBERGEBENE UNTERLAGEN

  [ ] Bestandsunterlagen        [ ] Bedienungsanleitungen
  [ ] Prüfprotokolle            [ ] Wartungsverträge
  [ ] Gewährleistungsurkunden   [ ] ${'.'.repeat(30)}

${unterschriften}

${strich}
Entwurf. Kein Rechtsrat. Bei streitigen Abnahmen anwaltlich prüfen lassen.`;
}

// ————————————————————————————————————————————————————————————————
// Vertragsdaten fuer das maschinelle Ausfuellen
// ————————————————————————————————————————————————————————————————

/**
 * Alle Angaben eines Projekts in einer festen Form — die Schnittstelle zu
 * tools/vertrag_ausfuellen.py, das damit die Formularfelder der Kammervorlage
 * fuellt.
 *
 * WARUM DIESER UMWEG UND NICHT DIREKT AUS DER APP
 * Die Vorlage der Kammer ist urheberrechtlich geschuetzt; sie auszufuellen ist
 * erlaubt und ihr Zweck, sie in die App aufzunehmen waere es nicht. Die App
 * gibt deshalb nur die Angaben aus, das Ausfuellen geschieht am Rechner an der
 * Vorlage, die dort ohnehin liegt. Nebenbei bleibt die App frei von einer
 * PDF-Bibliothek, die sie sonst bei jedem Start mitschleppen muesste.
 *
 * Die Werte sind fertig geschrieben, nicht roh: Wer eine Zahl in einen Vertrag
 * setzt, will "154.807,52 €" und nicht "154807.52". Das Werkzeug formatiert
 * nichts nach — was hier steht, steht so im Vertrag.
 */
export function vertragsdaten({ projekt, auftraggeber, vertrag, einst }) {
  const b = einst.buero;
  const anschriftB = anschriftZeilen(b);
  const ag = auftraggeber;
  const lb = vertrag ? LEISTUNGSBILDER[vertrag.leistungsbild] : null;

  let e = null;
  if (vertrag) { try { e = ermittlungAusVertrag(vertrag, null); } catch { /* unvollständig */ } }

  const heute = new Date();
  const eur = (z) => (Number.isFinite(z)
    ? new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(z) + ' €'
    : '');

  const phasen = (e?.phasen || []).filter((p) => p.vereinbart > 0);

  return {
    art: 'honorarapp-vertragsdaten',
    fassung: 1,
    erzeugt: heute.toISOString(),

    projekt: {
      nummer: projekt.nummer || '',
      name: projekt.name || '',
      kuerzel: projekt.kuerzel || '',
      vorhaben: projekt.vorhaben || projekt.name || '',
      ort: projekt.ort || '',
      strasse: projekt.strasse || '',
      flurstueck: projekt.flurstueck || '',
      anschrift: [projekt.strasse, [projekt.plz, projekt.ort].filter(Boolean).join(' ')]
        .filter(Boolean).join(', '),
    },

    bauherr: {
      name: ag?.name || '',
      zusatz: ag?.zusatz || '',
      vertretenDurch: ag ? personName(ag) : '',
      strasse: ag?.strasse || '',
      plzOrt: ag ? `${ag.plz || ''} ${ag.ort || ''}`.trim() : '',
      anschrift: ag ? [ag.strasse, `${ag.plz || ''} ${ag.ort || ''}`.trim()].filter(Boolean).join(', ') : '',
      telefon: ag?.telefon || '',
      mail: ag?.mail || '',
    },

    architekt: {
      name: b.name || '',
      inhaber: b.inhaber || '',
      funktion: b.funktion || '',
      strasse: anschriftB.strasse,
      plzOrt: anschriftB.plzOrt,
      anschrift: [anschriftB.strasse, anschriftB.plzOrt].filter(Boolean).join(', '),
      telefon: telefonZeigen(b),
      mail: b.mail || '',
      kammer: b.kammer || '',
      eintragungsnummer: b.eintragungsnummer || '',
      haftpflichtVersicherer: b.haftpflichtVersicherer || '',
      haftpflichtAnschrift: b.haftpflichtAnschrift || '',
      haftpflichtGeltungsbereich: b.haftpflichtGeltungsbereich || '',
    },

    honorar: vertrag ? {
      fassung: `HOAI ${vertrag.fassung}`,
      leistungsbild: lb?.bezeichnung || vertrag.leistungsbild || '',
      leistungsbildParagraf: lb?.leistungsbildParagraf || '',
      honorarzone: ZONE_ROEMISCH[vertrag.honorarzone] || '',
      honorarzoneBegruendung: vertrag.honorarzoneBegruendung || '',
      honorarsatz: satzText(vertrag.honorarsatz),
      massnahme: MASSNAHME_TEXT[vertrag.massnahme] || '',
      kostenermittlungGrundlage: vertrag.kostenermittlung?.grundlage || '',
      kostenermittlungDatum: isoNachDe(vertrag.kostenermittlung?.datum || ''),
      anrechenbareKosten: eur(e?.anrechenbareKosten),
      grundhonorar100: eur(e?.grundhonorar100),
      grundleistungen: eur(e?.grundleistungenVereinbart),
      nebenkosten: vertrag.nebenkosten?.art === 'pauschal'
        ? `pauschal ${prozent(vertrag.nebenkosten.prozent)}`
        : (vertrag.nebenkosten?.art === 'einzeln' ? 'auf Einzelnachweis' : ''),
      nebenkostenBetrag: eur(e?.nebenkosten),
      // Ohne Wort und ohne Zeichen: Die Kammervorlage schreibt "eine Pauschale
      // von ......... % des Nettohonorars" — dort gehoert die nackte Zahl hin.
      nebenkostenProzentZahl: vertrag.nebenkosten?.art === 'pauschal'
        ? prozent(vertrag.nebenkosten.prozent).replace(/\s*%$/, '') : '',
      netto: eur(e?.netto),
      ustSatz: prozent(einst.vorgaben.ustSatz),
      stundensatz: eur(einst.vorgaben.stundensatz),
      zahlungsziel: `${einst.vorgaben.zahlungsziel} Tage`,
    } : {},

    // Die beauftragten Leistungsphasen einzeln und als eine Zeile — je nachdem,
    // ob die Vorlage eine Tabelle oder einen Satz vorsieht.
    phasen: phasen.map((p) => ({
      nr: String(p.nr),
      bezeichnung: p.bezeichnung,
      bewertung: prozent(p.bewertung),
      vereinbart: prozent(p.vereinbart),
      honorar: eur(p.betragVereinbart),
    })),
    phasenZeile: phasen.length
      ? `Leistungsphasen ${phasen.map((p) => p.nr).join(', ')} (${prozent(
        phasen.reduce((sum, p) => sum + p.vereinbart, 0))} des Grundhonorars)`
      : '',

    datum: (() => {
      // Zweistellig: In einem Vertrag steht "09.09.2026", nicht "9.9.2026".
      const de = heute.toLocaleDateString('de-DE',
        { day: '2-digit', month: '2-digit', year: 'numeric' });
      return {
        heute: heute.toISOString().slice(0, 10),
        heuteDe: de,
        ort: b.ort || '',
        ortDatum: [b.ort, de].filter(Boolean).join(', den '),
      };
    })(),
  };
}

const satzText = (s) => {
  if (!Number.isFinite(s)) return '';
  if (s <= 0) return 'Basissatz';
  if (s >= 1) return 'Höchstsatz';
  if (Math.abs(s - 0.5) < 1e-9) return 'Mittelsatz';
  return `${prozent(s)} zwischen Basis- und Höchstsatz`;
};
