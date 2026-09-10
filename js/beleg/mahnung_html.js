// Das Mahnschreiben als Blatt.
//
// Bewusst dasselbe Briefbild wie die Rechnung — Stil und CD kommen aus
// rechnung_html.js. Eine Mahnung, die anders aussieht als die Rechnung, wirkt
// wie von einem Inkassobuero und beschaedigt genau das Verhaeltnis, das man beim
// Bauherrn noch braucht.
//
// Der Ton steigt mit der Stufe, die Form bleibt hoeflich. Der Zweck ist Geld,
// nicht Recht behalten.

import { STIL } from './rechnung_html.js';
import { cdVervollstaendigen, cdAlsCssVariablen, CD_KREATIVLABOR42 } from './cd.js';
import { eur, prozent } from '../hoai/geld.js';

const h = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const deDatum = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(String(d || ''))
  ? String(d).split('-').reverse().join('.') : (d || ''));

/**
 * Der Vortag — fuer die Anzeige der Zinsabschnitte.
 *
 * Gerechnet wird von Tagesbeginn zu Tagesbeginn, der letzte Tag zaehlt also
 * nicht mit. Auf dem Blatt stuende sonst "12.03. – 01.07." und direkt darunter
 * "01.07. – 10.09.": derselbe Tag zweimal, was nach Doppelberechnung aussieht.
 * Die Tageszahl daneben bleibt unveraendert.
 */
function vortag(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return iso;
  const [j, m, t] = iso.split('-').map(Number);
  return new Date(Date.UTC(j, m - 1, t - 1)).toISOString().slice(0, 10);
}

/**
 * @param {object} d
 * @param {object} d.mahnung     Ergebnis aus mahnungAufstellen()
 * @param {object} d.buero
 * @param {object} d.empfaenger
 * @param {object} [d.projekt]
 * @param {string} d.zahlbarBis  Datum der gesetzten Frist
 * @param {object} [d.cd]
 */
export function mahnungHtml(d) {
  const m = d.mahnung;
  const cd = cdVervollstaendigen(d.cd || CD_KREATIVLABOR42);
  const b = d.buero || {};
  const e = d.empfaenger || {};

  const posten = m.zeilen.map((z) => `
    <tr>
      <td>${h(z.nummer)}${z.datum ? `<span class="klein">vom ${h(deDatum(z.datum))}</span>` : ''}</td>
      <td>${z.faelligAm ? h(deDatum(z.faelligAm)) : '—'}</td>
      <td class="num">${h(eur(z.offen))}</td>
      <td class="num">${h(eur(z.zinsen))}</td>
    </tr>`).join('');

  // Die Zinsstaffel gehoert auf das Blatt, sonst ist die Forderung nicht
  // pruefbar — und eine unpruefbare Zinsforderung wird bestritten.
  const staffel = m.zeilen.flatMap((z) => z.abschnitte.map((a) => `
    <tr>
      <td>${h(z.nummer)}</td>
      <td>${h(deDatum(a.von))} – ${h(deDatum(vortag(a.bis)))}</td>
      <td class="num">${h(a.tage)}</td>
      <td class="num">${h(prozent(a.satz))}</td>
      <td class="num">${h(eur(a.betrag))}</td>
    </tr>`)).join('');

  const zinsfuss = m.zeilen[0]?.abschnitte[0];

  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<title>${h(m.titel)}${d.projekt?.nummer ? ` ${h(d.projekt.nummer)}` : ''}</title>
<style>${cdAlsCssVariablen(cd)}
${STIL}
.mahntabelle{ width:100%; border-collapse:collapse; font-size:var(--pt-text); margin-top:2mm; }
.mahntabelle th{ text-align:left; font:var(--pt-mono-klein)/1 var(--mono); letter-spacing:.08em;
  text-transform:uppercase; color:var(--grey-2); border-bottom:.5pt solid var(--hair);
  padding:1mm 1.5mm 1mm 0; }
.mahntabelle th.num{ text-align:right; }
.mahntabelle td{ padding:1mm 1.5mm 1mm 0; border-bottom:.3pt solid var(--hair); vertical-align:top; }
.mahntabelle td .klein{ display:block; }
.mahntabelle tr.summe td{ background:var(--flaeche); border-top:1pt solid var(--ink);
  border-bottom:1pt solid var(--ink); font-weight:600; color:var(--ink); font-size:9pt;
  padding:2mm 1.5mm; }
.staffel{ margin-top:4mm; font-size:var(--pt-folgeseite); }
.rechtshinweis{ margin-top:4mm; font:var(--pt-mono-klein)/1.5 var(--mono); color:var(--grey-2); }
</style></head>
<body>
<section class="seite">
  <div class="falz f1"></div><div class="loch"></div><div class="falz f2"></div><div class="akzentstrich"></div>

  <header class="briefkopf">
    <span class="wortmarke">${h(b.name || '')}</span>
    ${cd.disziplin ? `<span class="disziplin">${h(cd.disziplin)}</span>` : ''}
  </header>

  <div class="anschriftfeld">
    <div class="ruecksendeangabe">${[b.name, b.strasse, b.plzOrt].filter(Boolean).map(h).join(' · ')}</div>
    <address>
      ${h(e.name || '')}<br>
      ${e.ansprechpartner ? `${h(e.ansprechpartner)}<br>` : ''}
      ${h(e.strasse || '')}<br>
      ${h(e.plzOrt || '')}
    </address>
  </div>

  <aside class="sidebar">
    <div class="studio">
      <div class="label ink">STUDIO</div>
      <div class="studiodaten">${[b.name, b.strasse, b.plzOrt].filter(Boolean).map(h).join('<br>')}</div>
    </div>
    <div class="projektmeta">
      ${d.projekt?.nummer ? `<div class="meta"><div class="label">PROJEKTNUMMER</div>
        <div class="wert akzent">${h(d.projekt.nummer)}</div></div>` : ''}
      <div class="meta"><div class="label">DATUM</div>
        <div class="wert">${h(deDatum(m.datum))}</div></div>
      <div class="meta"><div class="label">ZAHLBAR BIS</div>
        <div class="wert akzent">${h(deDatum(d.zahlbarBis))}</div></div>
    </div>
  </aside>

  <div class="titelblock">
    <div class="kicker">
      <span class="akzent">${h(m.titel.toUpperCase())}</span>
      <span class="rechts">${h(m.stufe)}. STUFE</span>
    </div>
    <h1>${h(m.titel)}${d.projekt?.name ? ` — ${h(d.projekt.name)}` : ''}</h1>
    <div class="titelhair"></div>
  </div>

  <main class="brieftext">
    <p>${h(d.anrede || 'Sehr geehrte Damen und Herren,')}</p>
    <p>${h(m.text.replace('{frist}', deDatum(d.zahlbarBis)))}</p>

    <h2>Offene Forderungen</h2>
    <table class="mahntabelle">
      <thead><tr>
        <th>Rechnung</th><th>fällig seit</th>
        <th class="num">offen</th><th class="num">Verzugszinsen</th>
      </tr></thead>
      <tbody>
        ${posten}
        ${m.pauschale ? `<tr><td colspan="3">Verzugspauschale (§ 288 Abs. 5 BGB)</td>
          <td class="num">${h(eur(m.pauschale))}</td></tr>` : ''}
        <tr class="summe">
          <td colspan="3">Gesamtforderung</td>
          <td class="num">${h(eur(m.gesamt))}</td>
        </tr>
      </tbody>
    </table>

    <div class="betrag">
      <div class="betraglabel">Zu zahlen bis ${h(deDatum(d.zahlbarBis))}</div>
      <div class="betragwert">${h(eur(m.gesamt))}</div>
    </div>

    ${b.bank ? `<p class="zahlungshinweis"><span class="bank">${h(b.bank)} · IBAN ${h(b.iban || '')}
      · BIC ${h(b.bic || '')}</span></p>` : ''}

    ${staffel ? `<h2>Zinsberechnung</h2>
    <table class="mahntabelle staffel">
      <thead><tr><th>Rechnung</th><th>Zeitraum</th><th class="num">Tage</th>
        <th class="num">Zinssatz</th><th class="num">Betrag</th></tr></thead>
      <tbody>${staffel}</tbody>
    </table>
    <p class="rechtshinweis">Verzugszinsen nach ${h(zinsfuss?.fundstelle || '§ 288 BGB')},
      ${h(prozent(zinsfuss?.satz || 0))} p. a. (Basiszinssatz nach § 247 BGB
      ${h(prozent(zinsfuss?.basis || 0))} zuzüglich
      ${m.istVerbraucher ? 'fünf' : 'neun'} Prozentpunkten), taggenau berechnet.</p>` : ''}

    <p class="gruss">Mit freundlichen Grüßen</p>
    <p class="signatur"><b>${h(b.inhaber || b.name || '')}</b>${b.funktion ? `<br>${h(b.funktion)}` : ''}</p>
  </main>

  <div class="fusszeile">
    <span class="akzent">${h(m.titel)}</span>
    <span>${h(deDatum(m.datum))}</span>
  </div>
</section>
</body></html>`;
}
