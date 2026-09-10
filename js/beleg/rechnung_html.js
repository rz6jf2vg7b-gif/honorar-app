// Erzeugt den Rechnungsbeleg als druckfertiges HTML im CD BR·03b.
//
// Bewusst ohne Abhaengigkeiten und ohne Bezug auf die App: Der Beleg laesst sich
// dadurch ausserhalb der Oberflaeche erzeugen und ansehen, was die Entwicklung
// ueberhaupt pruefbar macht.
//
// Seitenaufteilung — briefliche Logik statt einem langen Fluss:
//   Seite 1  Brief: Anschrift, Titelblock, Anschreiben, Grundlagen des Honorars,
//            der Rechnungsbetrag, Zahlungshinweis, Gruss. Der Empfaenger sieht
//            auf einen Blick, worum es geht und was zu zahlen ist.
//   Seite 2  Zusammenstellung im Einzelnen und Zahlungsinformationen.
//   Seite 3+ Darstellung der Honorarermittlung — die Herleitung.
//
// Feste Satzentscheidungen, die nicht ueber das CD verstellbar sind, weil sie die
// Lesbarkeit einer Rechnung ausmachen:
//   - Tabellenziffern (tabular-nums), damit Betraege spaltenweise fluchten.
//   - Betraege rechtsbuendig, Bezeichnungen linksbuendig.
//   - Genau eine Hervorhebung pro Seite: der Rechnungsbetrag.

import { eur, prozent } from '../hoai/geld.js';
import { cdVervollstaendigen, cdAlsCssVariablen, CD_KREATIVLABOR42 } from './cd.js';
import { angebotsblaetter } from './angebot.js';

/**
 * Ueberschrift des Leistungsblocks auf Seite 1.
 *
 * "Grundlagen des Honorars" passt nur, wo nach HOAI hergeleitet wird. Bei freien
 * Positionen sagt sie nichts — dort heisst es "Angebotene Leistungen" auf einem
 * Angebot und "Abgerechnete Leistungen" auf einer Rechnung. Ein Angebot rechnet
 * nichts ab, und eine Rechnung bietet nichts an.
 */
function ueberschriftLeistungen(d, ermittlungen) {
  if (!ermittlungen.every((e) => e.ausPositionen)) return 'Grundlagen des Honorars';
  return ['AN', 'NA'].includes(d.belegart) ? 'Angebotene Leistungen' : 'Abgerechnete Leistungen';
}

const h = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Der Satz unter der Angebotssumme. Er tritt an die Stelle der
 * Zahlungsaufforderung — ein Angebot fordert nichts, es bindet nur.
 */
function bindetext(d) {
  const frist = deDatum(d.bindefrist);
  if (frist) {
    return `An dieses Angebot halte ich mich bis zum ${frist} gebunden. `
      + `Die Vergütung wird erst mit Auftragserteilung geschuldet.`;
  }
  return 'Dieses Angebot ist freibleibend. Die Vergütung wird erst mit Auftragserteilung geschuldet.';
}

/** ISO-Datum in die deutsche Schreibweise; alles andere bleibt, wie es kam. */
const deDatum = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(String(d || ''))
  ? String(d).split('-').reverse().join('.') : String(d || ''));

/** "29.07.2022" -> "29 · 07 · 2022" (Fusszeilenformat aus BR·03b) */
function datumGesperrt(d) {
  const m = String(d || '').match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return m ? `${m[1]} · ${m[2]} · ${m[3]}` : (d || '');
}

// ————————————————————————————————————————————————————————————————
// Bausteine der Herleitung
// ————————————————————————————————————————————————————————————————

function bausteinHtml(b) {
  if (b.art === 'werte') {
    return `<div class="block">
      ${b.titel ? `<h3>${h(b.titel)}</h3>` : ''}
      <dl class="werte">${b.zeilen.map((z) => `
        <div><dt>${h(z.bez)}</dt><dd>${h(z.wert)}</dd></div>`).join('')}
      </dl></div>`;
  }
  if (b.art === 'formel') {
    return `<div class="block formel">
      <div class="formelzeile">${h(b.formel)}</div>
      <div class="eingesetzt">${h(b.eingesetzt)} <span class="gleich">=</span> <b>${h(b.ergebnis)}</b></div>
    </div>`;
  }
  if (b.art === 'hinweis') {
    return `<div class="block hinweis">
      <p>${h(b.text)}</p>
      ${b.fundstelle ? `<p class="fundstelle">${h(b.fundstelle)}</p>` : ''}
    </div>`;
  }
  if (b.art === 'leistungsliste') {
    // Die Grundleistungen im Wortlaut der Verordnung. Der Buchstabe steht vorn,
    // damit sich eine einzelne Leistung im Streitfall benennen laesst
    // ("Anlage 10, LPh 3, Buchstabe c") statt nur beschreiben.
    return `<div class="block leistungsliste">
      ${b.titel ? `<h3>${h(b.titel)}</h3>` : ''}
      ${b.quelle ? `<p class="quelle">Grundleistungen nach ${h(b.quelle)}</p>` : ''}
      <dl class="gl">${b.eintraege.map((g) => `
        <div><dt>${h(g.marke)}</dt><dd>${h(g.text)}</dd></div>`).join('')}
      </dl></div>`;
  }
  if (b.art === 'unterschrift') {
    return `<div class="block unterschriftsblock">
      ${b.titel ? `<h3>${h(b.titel)}</h3>` : ''}
      <div class="unterschriften">${b.felder.map((f) => `
        <div class="usfeld">
          <div class="uszeile"><div class="uslinie"></div>
            <div class="uslabel">Ort, Datum</div></div>
          <div class="uszeile"><div class="uslinie"></div>
            <div class="uslabel">${h(f.rolle)}${f.name ? ` · ${h(f.name)}` : ''}</div></div>
        </div>`).join('')}
      </div></div>`;
  }
  if (b.art === 'tabelle') {
    const numAb = b.spalten.length - (b.spalten.length > 4 ? 4 : 1);
    const cls = (i) => (i >= numAb && i > 0 ? ' class="num"' : '');
    return `<div class="block">
      ${b.titel ? `<h3>${h(b.titel)}</h3>` : ''}
      <table class="daten">
        <thead><tr>${b.spalten.map((s, i) => `<th${cls(i)}>${h(s)}</th>`).join('')}</tr></thead>
        <tbody>${b.zeilen.map((z) => `<tr>${z.map((c, i) => `<td${cls(i)}>${h(c)}</td>`).join('')}</tr>`).join('')}</tbody>
        ${b.fuss ? `<tfoot><tr>${b.fuss.map((c, i) => `<td${cls(i)}>${h(c)}</td>`).join('')}</tr></tfoot>` : ''}
      </table>
      ${(b.anmerkungen || []).length ? `<ol class="anmerkungen">${b.anmerkungen
        .map((a) => `<li>${h(a)}</li>`).join('')}</ol>` : ''}
      </div>`;
  }
  return '';
}

// ————————————————————————————————————————————————————————————————
// Beleg
// ————————————————————————————————————————————————————————————————

/**
 * @param {object} d
 * @param {object} d.buero        Absenderdaten
 * @param {string} d.belegart      Belegart ("AN", "NA", "AR", "TS", "SR", "ER").
 *                                 Steuert, ob der Beleg Geld fordert.
 * @param {object} d.empfaenger   {name, zusatz?, ansprechpartner?, zeile2?, strasse, plzOrt}
 * @param {object} d.projekt      {nummer, name, kuerzel?, vorhaben?}
 * @param {object} d.abrechnung   Ergebnis aus erstelleAbrechnung()
 * @param {Array}  d.ermittlungen Ergebnisse aus honorarermittlung()
 * @param {object} [d.cd]         Corporate Design, siehe cd.js
 * @param {Array}  [d.verweise]   Freitextzeilen für den Sidebar-Block VERWEISE
 * @param {string} [d.anrede]
 * @param {string} [d.anschreiben]
 * @param {string} [d.leistungszeitraum]
 * @param {string} [d.zahlungsziel]
 * @param {object} [d.vertrag]     Vertragsstand — Grundlage der Leistungsbeschreibung
 * @param {string} [d.bindefrist]  ISO-Datum, bis zu dem das Angebot bindet
 * @param {object} [d.vergleich]   {vorher, grund, ...} fuer die Nachtragsgegenueberstellung
 */
export function rechnungHtml(d) {
  const cd = cdVervollstaendigen(d.cd || CD_KREATIVLABOR42);

  // Ein Angebot fordert kein Geld: Es traegt keine Zahlungsaufforderung und
  // keine Bankverbindung, und die Summe heisst nicht "Betrag zur Zahlung".
  // Beides auf ein Angebot zu setzen waere nicht nur unsauber — es koennte als
  // Rechnung missverstanden werden, und eine Rechnung ueber eine noch nicht
  // erbrachte Leistung ist keine.
  const fordertGeld = !['AN', 'NA'].includes(d.belegart);
  const betraglabel = { AN: 'Angebotssumme', NA: 'Nachtragssumme' }[d.belegart]
    || 'Betrag zur Zahlung';
  const a = d.abrechnung;
  const b = d.buero;
  const ermittlungen = d.ermittlungen || [];

  const wortmarke = cd.marke.logo
    ? `<img class="logo" src="${h(cd.marke.logo)}" alt="${h(cd.marke.name)}">`
    : `<span class="wortmarke">${(cd.marke.wortmarke || [{ text: cd.marke.name, gewicht: 400 }])
        .map((t) => `<span style="font-weight:${t.gewicht}">${h(t.text)}</span>`).join('')}</span>`;

  const kickerRechts = cd.beleg.kickerRechts || d.kickerRechts || '';

  // ── Sidebar ────────────────────────────────────────────
  const metaZeile = (label, wert, akzent = false) => wert
    ? `<div class="meta"><div class="label">${h(label)}</div>
       <div class="wert${akzent ? ' akzent' : ''}">${h(wert)}</div></div>` : '';

  const sidebar = (voll) => `
    <aside class="sidebar">
      ${voll ? `
      <div class="studio">
        <div class="label ink">STUDIO</div>
        <div class="studiodaten">
          ${h(b.name)}<br>${h(b.strasse)}<br>${h(b.plzOrt)}<br>
          ${b.telefon ? h(b.telefon) + '<br>' : ''}${b.mail ? h(b.mail) : ''}
        </div>
      </div>` : ''}
      <div class="projektmeta">
        ${metaZeile('PROJEKTNUMMER', d.projekt.nummer, true)}
        ${metaZeile('PROJEKTKÜRZEL', d.projekt.kuerzel, true)}
        ${metaZeile('BELEGNUMMER', a.nummer, true)}
        ${metaZeile('BELEGDATUM', a.datum)}
        ${voll ? metaZeile('LEISTUNGSZEITRAUM', d.leistungszeitraum) : ''}
        ${voll ? metaZeile('BEARBEITER', b.kuerzel || b.bearbeiter) : ''}
      </div>
      ${voll && (d.verweise || []).length ? `
      <div class="verweise">
        <div class="label">VERWEISE</div>
        ${d.verweise.map((v) => `<div class="verweis">${h(v)}</div>`).join('')}
      </div>` : ''}
      ${voll ? `
      <div class="steuer">
        <div class="label">STEUER</div>
        <div class="studiodaten">
          ${b.steuernummer ? `Steuer-Nr. ${h(b.steuernummer)}<br>` : ''}
          ${b.ustId ? `USt-IdNr. ${h(b.ustId)}` : ''}
        </div>
      </div>` : ''}
    </aside>`;

  const fusszeile = (seite, gesamt) => `
    <div class="fusszeile">
      <span class="akzent">${h(a.nummer)}</span>
      <span>${h(datumGesperrt(a.datum))}</span>
    </div>
    <div class="seitenzahl"><b>${String(seite).padStart(2, '0')}</b> / ${String(gesamt).padStart(2, '0')}</div>`;

  const marken = cd.satz.din5008
    ? '<div class="falz f1"></div><div class="loch"></div><div class="falz f2"></div><div class="akzentstrich"></div>'
    : '';

  const kopf = `
    <header class="briefkopf">
      ${wortmarke}
      ${cd.marke.disziplin ? `<span class="disziplin">${h(cd.marke.disziplin)}</span>` : ''}
    </header>`;

  const seitenkopf = `
    <div class="seitenkopf">
      <span>${h(a.artBezeichnung)} ${h(a.nummer)}</span>
      <span>${h(d.projekt.nummer)} ${h(d.projekt.name)}</span>
    </div>`;

  // ── Seite 1: Brief ─────────────────────────────────────
  const grundlagen = ermittlungen.map((e) => `
    <div class="grundlagen">
      <h3>${h(e.bezeichnung)}</h3>
      <dl class="werte">
        ${e.ausPositionen ? '' : `
        <div><dt>Anrechenbare Kosten</dt><dd>${h(eur(e.anrechenbareKosten))}</dd></div>
        <div><dt>Grundhonorar für 100 %</dt><dd>${h(eur(e.grundhonorar100))}</dd></div>
        <div><dt>Grundleistungen (erbracht)</dt><dd>${h(eur(e.grundleistungen))}</dd></div>`}
        ${e.zuschlaege.map((z) => `<div><dt>${h(z.bezeichnung)} (${h(prozent(z.prozent))})</dt>
          <dd>${h(eur(z.betrag))}</dd></div>`).join('')}
        ${e.weiterePositionen.map((p) => `<div><dt>${h(p.bezeichnung)}</dt>
          <dd>${h(eur(p.betrag))}</dd></div>`).join('')}
        ${e.nebenkosten ? `<div><dt>Nebenkosten</dt><dd>${h(eur(e.nebenkosten))}</dd></div>` : ''}
        <div class="teilsumme"><dt>Summe netto</dt><dd>${h(eur(e.netto))}</dd></div>
      </dl>
    </div>`).join('');

  const seiten = [];

  seiten.push(`
<section class="seite">
  ${marken}
  ${kopf}
  <div class="anschriftfeld">
    <div class="ruecksendeangabe">${h(b.name)} · ${h(b.strasse)} · ${h(b.plzOrt)}</div>
    <address>
      ${h(d.empfaenger.name)}<br>
      ${d.empfaenger.zusatz ? h(d.empfaenger.zusatz) + '<br>' : ''}
      ${d.empfaenger.ansprechpartner ? h(d.empfaenger.ansprechpartner) + '<br>' : ''}
      ${d.empfaenger.zeile2 ? h(d.empfaenger.zeile2) + '<br>' : ''}
      ${h(d.empfaenger.strasse)}<br>
      ${h(d.empfaenger.plzOrt)}
    </address>
  </div>
  ${sidebar(true)}

  <div class="titelblock">
    <div class="kicker">
      <span class="akzent">BETREFF — ${h(a.artBezeichnung.toUpperCase())}</span>
      <span class="rechts">${h(kickerRechts)}</span>
    </div>
    <h1>${h(a.artBezeichnung)} ${h(a.nummer)}</h1>
    <div class="titelhair"></div>
  </div>

  <main class="brieftext">
    ${d.anrede ? `<p>${h(d.anrede)}</p>` : ''}
    ${d.anschreiben ? `<p>${h(d.anschreiben)}</p>` : ''}

    <h2>${ueberschriftLeistungen(d, ermittlungen)}</h2>
    ${grundlagen}

    <div class="betrag">
      <div class="betraglabel">${h(betraglabel)}${a.ustSatz ? ` · inkl. ${h(prozent(a.ustSatz))} USt.` : ''}</div>
      <div class="betragwert">${h(eur(a.zahlbetrag))}</div>
    </div>

    ${fordertGeld ? `<p class="zahlungshinweis">${h(d.zahlungsziel
      || 'Bitte überweisen Sie den Rechnungsbetrag ohne Abzüge auf das folgende Konto.')}
      ${b.bank ? `<br><span class="bank">${h(b.bank)} · IBAN ${h(b.iban || '')} · BIC ${h(b.bic || '')}</span>` : ''}</p>`
    : `<p class="zahlungshinweis">${h(bindetext(d))}</p>`}

    <p class="gruss">Mit freundlichen Grüßen</p>
    <p class="signatur"><b>${h(b.inhaber || b.name)}</b>${b.funktion ? `<br>${h(b.funktion)}` : ''}</p>
  </main>

  __FUSS__
</section>`);

  // ── Seite 2 ff.: Zusammenstellung ──────────────────────
  // Die Positionsliste wird serverseitig auf Seiten verteilt. Ueberlaufenden
  // Inhalt zu verstecken waere bei einem Beleg der schlimmste Fehler — Positionen
  // wuerden lautlos verschwinden. Laeuft die Liste ueber, weist die Seite unten
  // einen UEBERTRAG aus und die Folgeseite nimmt ihn oben wieder auf; so bleibt
  // die Rechnung auch ueber mehrere Blaetter nachrechenbar.
  //
  // Die Spalten USt. und Brutto stehen nur im Schlussblock: In der Positionsliste
  // waeren sie durchgehend leer und wuerden 58 mm Breite verbrauchen, die den
  // Bezeichnungen fehlen. So arbeitet auch HOAI-Pro.
  const POSITIONEN_JE_SEITE = 22;

  const offen = a.offeneposten.length ? `
    <h2>Zahlungsinformationen</h2>
    <table class="daten">
      <thead><tr><th>Offene Rechnungsbeträge</th><th class="num">gestellt</th>
        <th class="num">gezahlt</th><th class="num">offen</th></tr></thead>
      <tbody>${a.offeneposten.map((z) => `<tr>
        <td>${h(z.bezeichnung)}</td>
        <td class="num">${h(eur(z.gestellt))}</td>
        <td class="num">${h(eur(z.gezahlt))}</td>
        <td class="num">${h(eur(z.offen))}</td></tr>`).join('')}
      </tbody>
      <tfoot><tr><td colspan="3">${h(betraglabel)}</td>
        <td class="num">${h(eur(a.zahlbetrag))}</td></tr></tfoot>
    </table>` : '';

  const positionen = a.zusammenstellung.filter((z) => !z.summe);
  const schluss = a.zusammenstellung.find((z) => z.summe);
  const bloecke = [];
  for (let i = 0; i < positionen.length; i += POSITIONEN_JE_SEITE) {
    bloecke.push(positionen.slice(i, i + POSITIONEN_JE_SEITE));
  }
  if (!bloecke.length) bloecke.push([]);

  const summeBis = (n) => positionen.slice(0, n)
    .filter((z) => !z.ueberschrift && !z.zwischensumme)
    .reduce((s, z) => s + (z.netto || 0), 0);

  const posZeile = (z) => {
    if (z.ueberschrift) return `<tr class="ueberschrift"><td colspan="2">${h(z.bez)}</td></tr>`;
    return `<tr class="${z.zwischensumme ? 'zwischensumme' : ''}">
      <td>${h(z.bez)}${z.hinweis ? `<span class="klein">${h(z.hinweis)}</span>` : ''}</td>
      <td class="num">${h(eur(z.netto))}</td></tr>`;
  };

  bloecke.forEach((block, i) => {
    const erste = i === 0;
    const letzte = i === bloecke.length - 1;
    seiten.push(`
<section class="seite folgeseite">
  ${marken}
  ${seitenkopf}
  ${sidebar(false)}
  <main class="folgetext">
    <h2>Zusammenstellung${bloecke.length > 1 ? ` — Blatt ${i + 1} von ${bloecke.length}` : ''}</h2>
    <table class="zusammenstellung">
      <colgroup><col><col class="geld"></colgroup>
      <thead><tr><th></th><th class="num">Nettobetrag</th></tr></thead>
      <tbody>
        ${erste ? '' : `<tr class="uebertrag"><td>Übertrag</td>
          <td class="num">${h(eur(summeBis(i * POSITIONEN_JE_SEITE)))}</td></tr>`}
        ${block.map(posZeile).join('')}
        ${letzte ? '' : `<tr class="uebertrag"><td>Übertrag</td>
          <td class="num">${h(eur(summeBis((i + 1) * POSITIONEN_JE_SEITE)))}</td></tr>`}
      </tbody>
    </table>

    ${letzte && schluss ? `
    <table class="schluss">
      <colgroup><col><col class="geld"><col class="geld"><col class="geld"></colgroup>
      <thead><tr><th></th><th class="num">Nettobetrag</th><th class="num">USt.</th>
        <th class="num">Bruttobetrag</th></tr></thead>
      <tbody><tr class="summe">
        <td>${h(schluss.bez)}</td>
        <td class="num">${h(eur(schluss.netto))}</td>
        <td class="num">${schluss.ust !== undefined ? h(eur(schluss.ust)) : ''}</td>
        <td class="num">${schluss.brutto !== undefined ? h(eur(schluss.brutto)) : ''}</td>
      </tr></tbody>
    </table>` : ''}

  </main>
  __FUSS__
</section>`);
  });

  if (offen) {
    seiten.push(`
<section class="seite folgeseite">
  ${marken}
  ${seitenkopf}
  ${sidebar(false)}
  <main class="folgetext">${offen}</main>
  <footer class="fussnoten">${cd.beleg.fussnoten.map((t) => `<p>${h(t)}</p>`).join('')}</footer>
  __FUSS__
</section>`);
  }

  // ── Herleitung ─────────────────────────────────────────
  // Auch hier wird serverseitig umbrochen. Die Hoehe jedes Bausteins wird
  // geschaetzt (Zeilen x Zeilenhoehe); die Schaetzung ist bewusst grosszuegig,
  // damit im Zweifel eine Seite frueher umbrochen wird, als dass etwas
  // ueberlaeuft. Ein Baustein wird nie zerrissen — eine Formel, deren Ergebnis
  // auf der naechsten Seite steht, waere nicht mehr nachvollziehbar.
  const NUTZHOEHE_MM = 226;   // 239 mm Satzspiegel abzueglich Sicherheitsreserve
  const KOPF_MM = 16;         // Ueberschrift und Leistungszeile der ersten Seite
  const ZEILE_MM = 4.1;       // 7 pt bei Zeilenhoehe 1,65
  const ABSTAND_MM = 4;       // margin-bottom je Baustein

  const blockHoehe = (b) => {
    if (b.art === 'werte') return (b.titel ? 6 : 0) + ZEILE_MM * b.zeilen.length + ABSTAND_MM;
    if (b.art === 'formel') return 2 * ZEILE_MM + 5 + ABSTAND_MM;
    if (b.art === 'hinweis') {
      const zeilen = Math.ceil((b.text || '').length / 95) + (b.fundstelle ? 1 : 0);
      return zeilen * ZEILE_MM + ABSTAND_MM;
    }
    if (b.art === 'leistungsliste') {
      const zeilen = b.eintraege.reduce((s2, g) =>
        s2 + Math.max(1, Math.ceil((g.text || '').length / 88)), 0);
      return (b.titel ? 6 : 0) + (b.quelle ? ZEILE_MM : 0) + zeilen * ZEILE_MM + ABSTAND_MM;
    }
    // Ein Unterschriftsblock wird nie zerrissen: eine Unterschriftslinie ohne
    // die Erklaerung darueber ist wertlos.
    if (b.art === 'unterschrift') return 34;
    if (b.art === 'tabelle') {
      const kopf = (b.titel ? 6 : 0) + 5;
      const zeilen = b.zeilen.reduce((s, z) =>
        s + Math.max(1, Math.ceil((z[0] || '').length / 55)) * (ZEILE_MM + 1), 0);
      const anm = (b.anmerkungen || []).length * ZEILE_MM;
      return kopf + zeilen + anm + (b.fuss ? 5 : 0) + ABSTAND_MM;
    }
    return 6;
  };

  /**
   * Verteilt eine Folge von Bausteinen auf Seiten und haengt sie an.
   * Wird von der Herleitung und von den Angebotsblaettern gleichermassen
   * genutzt — beide brechen nach denselben Regeln um.
   */
  const blaetternUmbrechen = (titel, bausteine, untertitel = '') => {
    const teile = [[]];
    let hoehe = KOPF_MM;
    for (const b of bausteine) {
      const bh = blockHoehe(b);
      if (hoehe + bh > NUTZHOEHE_MM && teile[teile.length - 1].length) {
        teile.push([]);
        hoehe = 0;
      }
      teile[teile.length - 1].push(b);
      hoehe += bh;
    }

    teile.forEach((block, i) => {
      seiten.push(`
<section class="seite folgeseite">
  ${marken}
  ${seitenkopf}
  ${sidebar(false)}
  <main class="folgetext">
    <h2>${h(titel)}${teile.length > 1 ? ` — Blatt ${i + 1} von ${teile.length}` : ''}</h2>
    ${i === 0 && untertitel ? `<p class="leistung">${h(untertitel)}</p>` : ''}
    ${block.map(bausteinHtml).join('')}
  </main>
  __FUSS__
</section>`);
    });
  };

  // ── Angebot und Nachtrag: eigene Blaetter ──────────────
  // Sie stehen vor der Herleitung, weil zuerst interessiert, WAS angeboten wird,
  // und erst danach, wie sich der Betrag errechnet. Die Annahmeerklaerung bleibt
  // das letzte Blatt — sie wird unterschrieben zurueckgeschickt.
  const zusatz = angebotsblaetter(d);
  const annahme = zusatz.filter((b) => /Annahme|Nachtragsvereinbarung/.test(b.titel));
  for (const blatt of zusatz.filter((b) => !annahme.includes(b))) {
    blaetternUmbrechen(blatt.titel, blatt.bausteine);
  }

  for (const e of ermittlungen) {
    // Eine Pauschale hat keine Herleitung. Ohne diese Pruefung entstand ein
    // leeres Blatt "Darstellung der Honorarermittlung" im Kundendokument.
    if (!(e.herleitung || []).length) continue;
    blaetternUmbrechen('Darstellung der Honorarermittlung', e.herleitung, e.bezeichnung);
  }

  for (const blatt of annahme) blaetternUmbrechen(blatt.titel, blatt.bausteine);

  const gesamt = seiten.length;
  const body = seiten.map((s, i) => s.replace('__FUSS__', fusszeile(i + 1, gesamt))).join('\n');

  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<title>${h(a.artBezeichnung)} ${h(a.nummer)}</title>
<style>${cdAlsCssVariablen(cd)}
${STIL}</style></head>
<body>
${body}
</body></html>`;
}

const STIL = `
*{ box-sizing:border-box; }
html{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }
body{ margin:0; background:#e8e6e1; color:var(--ink-soft);
  font:var(--pt-text)/var(--zeile) var(--schrift);
  font-variant-numeric:tabular-nums lining-nums; }

.seite{ position:relative; background:var(--paper); width:210mm; height:297mm;
  margin:10mm auto; box-shadow:0 1px 10px rgba(0,0,0,.13); }

/* ── DIN 5008 Form B: Falz 105/210 mm, Lochmarke 148,5 mm ── */
.falz,.loch,.akzentstrich{ position:absolute; left:0; }
.falz{ top:var(--falz1); width:8pt; border-top:.5pt solid var(--ink); }
.falz.f2{ top:var(--falz2); }
.loch{ top:var(--loch); width:6pt; border-top:.5pt solid var(--grey-3); }
.akzentstrich{ top:var(--akzentstrich); width:8pt; border-top:1pt solid var(--accent); }

/* ── Briefkopf ────────────────────────────────────────── */
.briefkopf{ position:absolute; left:var(--links); right:var(--rechts); top:var(--kopf-top);
  display:flex; justify-content:space-between; align-items:baseline; }
.wortmarke{ font-size:var(--pt-wortmarke); letter-spacing:-.01em; color:var(--ink); }
.logo{ width:46mm; height:auto; }
.disziplin{ font:var(--pt-mono)/1 var(--mono); letter-spacing:.1em; color:var(--grey-2); }

/* ── Anschriftfeld ────────────────────────────────────── */
.anschriftfeld{ position:absolute; left:var(--links); top:var(--anschrift-top); width:85mm; }
.ruecksendeangabe{ font:var(--pt-mono-klein)/1.4 var(--mono); letter-spacing:.06em;
  color:var(--grey-2); border-bottom:.5pt solid var(--hair); padding-bottom:1mm; margin-bottom:4mm; }
address{ font-style:normal; line-height:1.5; color:var(--ink); }

/* ── Sidebar rechts ───────────────────────────────────── */
.sidebar{ position:absolute; right:0; top:0; bottom:0; width:var(--sidebar-breite);
  padding:var(--sidebar-padding); font:var(--pt-mono-klein)/1.6 var(--mono); color:var(--grey-2); }
.sidebar .label{ font-size:var(--pt-mono); letter-spacing:.08em; color:var(--grey-2); }
.sidebar .label.ink{ color:var(--ink); }
.studiodaten{ margin-top:1.5mm; }
.projektmeta{ margin-top:9mm; }
.folgeseite .projektmeta{ margin-top:0; }
.meta{ margin-bottom:4.5mm; }
.meta .wert{ font-size:var(--pt-mono-gross); color:var(--ink); margin-top:.6mm; }
.meta .wert.akzent{ color:var(--accent); }
.verweise,.steuer{ margin-top:7mm; }
.verweis{ margin-top:2mm; font-style:italic; line-height:1.5; }
.steuer .studiodaten{ font-style:normal; }

/* ── Titelblock ───────────────────────────────────────── */
.titelblock{ position:absolute; left:var(--links); right:var(--rechts); top:var(--titel-top); }
.kicker{ display:flex; justify-content:space-between; align-items:baseline;
  padding-bottom:1.5mm; border-bottom:1pt solid var(--ink);
  font:var(--pt-mono)/1 var(--mono); letter-spacing:.14em; }
.kicker .akzent{ color:var(--accent); }
.kicker .rechts{ letter-spacing:.1em; color:var(--grey-2); }
h1{ margin:3mm 0 0; font:300 var(--pt-titel)/1.15 var(--schrift);
  letter-spacing:-.02em; color:var(--ink); }
.titelhair{ margin-top:2mm; height:0; border-top:.5pt solid var(--hair); }

/* ── Fließtext Seite 1 ────────────────────────────────── */
.brieftext{ position:absolute; left:var(--links); right:var(--rechts);
  top:var(--text-top); bottom:26mm; }
.brieftext p{ margin:0 0 3mm; }
.gruss{ margin-top:5mm; }
.signatur{ margin-top:6mm; }
.bank{ font:var(--pt-mono-klein)/1.5 var(--mono); color:var(--grey-2); }

h2{ margin:5mm 0 2mm; font:var(--pt-mono)/1 var(--mono); letter-spacing:.14em;
  text-transform:uppercase; color:var(--accent);
  padding-bottom:1.5mm; border-bottom:1pt solid var(--ink); }
h3{ margin:3mm 0 1.5mm; font-size:var(--pt-text); font-weight:600; color:var(--ink); }
.leistung{ color:var(--grey-2); margin:0 0 4mm; }

dl.werte{ margin:0; }
dl.werte div{ display:flex; align-items:baseline; gap:4mm; padding:.4mm 0; }
dl.werte dt{ flex:1 1 auto; }
dl.werte dd{ margin:0; flex:0 0 auto; text-align:right; white-space:nowrap; }
dl.werte div.teilsumme{ border-top:.5pt solid var(--ink); margin-top:1.5mm;
  padding-top:1.5mm; font-weight:600; color:var(--ink); }

/* Die eine Hervorhebung des Dokuments */
.betrag{ margin-top:5mm; padding:2.5mm 4mm; background:var(--flaeche);
  display:flex; justify-content:space-between; align-items:baseline; }
.betraglabel{ font:var(--pt-mono)/1 var(--mono); letter-spacing:.1em;
  text-transform:uppercase; color:var(--grey-2); }
.betragwert{ font-size:12pt; font-weight:600; color:var(--ink); }
.zahlungshinweis{ margin-top:3.5mm; }

/* ── Folgeseiten ──────────────────────────────────────── */
.seitenkopf{ position:absolute; left:var(--links); right:var(--rechts); top:var(--kopf-top);
  display:flex; justify-content:space-between;
  font:var(--pt-mono-klein)/1 var(--mono); letter-spacing:.1em; color:var(--grey-2);
  padding-bottom:1.5mm; border-bottom:.5pt solid var(--hair); }
.folgeseite .sidebar{ padding-top:var(--kopf-top); }
.folgetext{ position:absolute; left:var(--links); right:var(--rechts); top:32mm; bottom:26mm;
  font-size:var(--pt-folgeseite); }
.folgetext h3,.folgetext dl.werte,.folgetext .daten,.folgetext .zusammenstellung,
.folgetext .schluss,.folgetext .eingesetzt,.folgetext .hinweis p,
.folgetext .formelzeile,.folgetext .leistung{ font-size:1em; }
.folgetext h3{ font-weight:600; }
.seite:has(.fussnoten) .folgetext{ bottom:46mm; }
.folgetext h2:first-child{ margin-top:0; }

/* ── Tabellen ─────────────────────────────────────────── */
table{ border-collapse:collapse; width:100%; }
.daten{ font-size:var(--pt-folgeseite); }
.daten th{ text-align:left; font-weight:600; color:var(--ink);
  border-bottom:.5pt solid var(--ink); padding:1.2mm 1.5mm 1.2mm 0; }
.daten th.num,.zusammenstellung th.num{ text-align:right; }
.daten td{ padding:1mm 1.5mm 1mm 0; border-bottom:.3pt solid var(--hair); vertical-align:top; }
.daten tfoot td{ border-top:.5pt solid var(--ink); border-bottom:none; font-weight:600; color:var(--ink); }
.num{ text-align:right; white-space:nowrap; }
.anmerkungen{ margin:1.5mm 0 0; padding-left:5mm; font:var(--pt-mono-klein)/1.5 var(--mono);
  color:var(--grey-2); }
.anmerkungen li{ margin-bottom:.5mm; }

.zusammenstellung{ font-size:var(--pt-folgeseite); table-layout:fixed; }
.zusammenstellung col.geld{ width:29mm; }
.zusammenstellung th{ text-align:left; font:var(--pt-mono-klein)/1 var(--mono);
  letter-spacing:.08em; text-transform:uppercase; color:var(--grey-2);
  border-bottom:.5pt solid var(--hair); padding:1mm 1.5mm 1mm 0; }
.zusammenstellung td{ padding:.9mm 1.5mm .9mm 0; }
.zusammenstellung tr.ueberschrift td{ padding-top:3mm; color:var(--grey-2);
  font:var(--pt-mono-klein)/1 var(--mono); letter-spacing:.08em; text-transform:uppercase; }
.zusammenstellung tr.zwischensumme td{ border-top:.4pt solid var(--hair); font-weight:600; color:var(--ink); }
.zusammenstellung tr.summe td{ background:var(--flaeche); border-top:1pt solid var(--ink);
  border-bottom:1pt solid var(--ink); font-weight:600; color:var(--ink);
  font-size:9pt; padding:2mm 1.5mm 2mm 0; }
.klein{ display:block; font:var(--pt-mono-klein)/1.4 var(--mono); color:var(--grey-2); }
.zusammenstellung tr.uebertrag td{ border-top:.5pt solid var(--hair);
  border-bottom:.5pt solid var(--hair); font:var(--pt-mono)/1.6 var(--mono);
  letter-spacing:.08em; text-transform:uppercase; color:var(--grey-2); }
.schluss{ margin-top:5mm; font-size:var(--pt-folgeseite); table-layout:fixed; }
.schluss col.geld{ width:26mm; }
.schluss th{ text-align:left; font:var(--pt-mono-klein)/1 var(--mono);
  letter-spacing:.08em; text-transform:uppercase; color:var(--grey-2);
  border-bottom:.5pt solid var(--hair); padding:1mm 1.5mm 1mm 0; }
.schluss th.num{ text-align:right; }
.schluss tr.summe td{ background:var(--flaeche); border-top:1pt solid var(--ink);
  border-bottom:1pt solid var(--ink); font-weight:600; color:var(--ink);
  font-size:9pt; padding:2.5mm 1.5mm 2.5mm 0; }
.schluss tr.summe td:first-child{ padding-left:2mm; }

/* ── Herleitungsbausteine ─────────────────────────────── */
.block{ margin-bottom:4mm; break-inside:avoid; }
.formel{ background:var(--flaeche); border-left:1pt solid var(--accent); padding:2mm 3mm; }
.formelzeile{ font-family:var(--mono); line-height:1.4; letter-spacing:.03em; color:var(--grey-2); }
.eingesetzt{ margin-top:1mm; color:var(--ink); }
.gleich{ padding:0 1.5mm; color:var(--accent); }
.hinweis p{ margin:0; color:var(--grey-2); }
.hinweis .fundstelle{ margin-top:1mm; font:var(--pt-mono-klein)/1.4 var(--mono) !important;
  letter-spacing:.06em; }

/* ── Leistungsliste (Grundleistungen im Wortlaut) ─────── */
.leistungsliste .quelle{ margin:0 0 1.5mm; font:var(--pt-mono-klein)/1.4 var(--mono);
  letter-spacing:.06em; color:var(--grey-2); }
dl.gl{ margin:0; }
dl.gl div{ display:flex; gap:3mm; padding:.35mm 0; align-items:baseline; }
dl.gl dt{ flex:0 0 5mm; font-family:var(--mono); color:var(--accent); }
dl.gl dd{ margin:0; flex:1 1 auto; }

/* ── Unterschriften ───────────────────────────────────── */
.unterschriften{ display:flex; gap:12mm; margin-top:4mm; }
.usfeld{ flex:1 1 0; }
.uszeile{ margin-top:14mm; }
.uslinie{ border-top:.5pt solid var(--ink); }
.uslabel{ margin-top:1.2mm; font:var(--pt-mono-klein)/1.3 var(--mono); letter-spacing:.08em;
  color:var(--grey-2); }
.folgetext .uslabel,.folgetext .leistungsliste .quelle{ font-size:var(--pt-mono-klein); }

/* ── Fußbereich ───────────────────────────────────────── */
.fussnoten{ position:absolute; left:var(--links); right:var(--rechts); bottom:25mm;
  font:var(--pt-mono-klein)/1.45 var(--mono); color:var(--grey-2); }
.fussnoten p{ margin:0 0 1mm; }
.fusszeile{ position:absolute; left:var(--links); right:var(--rechts); bottom:var(--fuss-bottom);
  display:flex; justify-content:space-between;
  font:200 var(--pt-mono)/1 var(--mono); letter-spacing:.1em; color:var(--grey-2); }
.fusszeile .akzent{ color:var(--accent); }
.seitenzahl{ position:absolute; left:var(--seitenzahl-links); bottom:var(--fuss-bottom);
  font:var(--pt-mono)/1 var(--mono); letter-spacing:.1em; color:var(--grey-2); }
.seitenzahl b{ color:var(--accent); font-weight:600; }

@page{ size:A4; margin:0; }
@media print{
  body{ background:#fff; }
  .seite{ margin:0; box-shadow:none; page-break-after:always; }
  .seite:last-child{ page-break-after:auto; }
}
`;
