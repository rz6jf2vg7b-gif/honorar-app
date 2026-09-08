// Dashboard — die Startseite.
//
// Beantwortet die vier Fragen, die man taeglich hat, ohne zu rechnen:
//   Was ist raus und noch nicht bezahlt? (und davon: was ist ueberfaellig)
//   Was ist dieses Jahr eingegangen?
//   Wie viel steht je Projekt noch zur Abrechnung offen?
//   Welche Nachtraege sind beauftragt, welche stehen noch aus?
//
// Die Balken sind bewusst liegend und ohne Diagrammbibliothek: Auf dem Telefon
// bleibt vom Projektnamen sonst nichts uebrig, und gezerrte Saeulen waren schon
// bei der Zeiterfassungs-App der Fehler.

import { el, leeren, eurZeigen, isoNachDe, feld } from '../ui.js';
import { SPEICHER, alle, einstellungenLesen } from '../db.js';
import { BELEGART, BELEGART_TEXT, IST_RECHNUNG, STATUS, ermittlungAusVertrag } from '../vorgang.js';
import { runde2, prozent } from '../hoai/geld.js';

const TAG = 86400000;

export async function dashboardZeigen(wurzel) {
  const [belege, projekte, vertraege, adressen, einst] = await Promise.all([
    alle(SPEICHER.BELEGE), alle(SPEICHER.PROJEKTE), alle(SPEICHER.VERTRAEGE),
    alle(SPEICHER.ADRESSEN), einstellungenLesen(),
  ]);

  // Das Dashboard zeigt seine Gliederung auch, wenn noch nichts erfasst ist.
  // Eine leere Seite mit einem Satz laesst offen, was hier spaeter steht — die
  // Abschnitte mit Nullwerten zeigen es. Zugleich ist ablesbar, was noch fehlt.
  const leer = !belege.length;

  wurzel.append(
    el('div', { class: 'seitenkopf' },
      el('h1', { text: 'Dashboard' }),
      el('button', { class: 'knopf akzent', onclick: () => { location.hash = '#neu'; } },
        leer ? 'Ersten Beleg anlegen' : 'Neuer Beleg'),
    ),
    leer ? el('p', { class: 'unterzeile', text: 'Noch kein Beleg erfasst — so wird die Seite aussehen, sobald der erste vorliegt.' }) : null,
  );

  if (leer) {
    // Die Schritte zeigen den tatsaechlichen Stand, nicht nur eine Anleitung:
    // Erledigtes ist abgehakt, offen bleibt sichtbar, was noch fehlt.
    const schritte = [
      { text: 'Bürodaten erfassen', weg: '#einstellungen',
        fertig: !!(einst.buero.name && einst.buero.ort),
        neben: einst.buero.name || 'Name, Anschrift, Bankverbindung' },
      { text: 'Steuernummer oder USt-IdNr. hinterlegen', weg: '#einstellungen',
        fertig: !!(einst.buero.steuernummer || einst.buero.ustId),
        neben: 'Pflichtangabe nach § 14 Abs. 4 Nr. 2 UStG' },
      { text: 'Projekte laden', weg: '#projekte',
        fertig: projekte.length > 0,
        neben: projekte.length ? `${projekte.length} vorhanden` : 'aus untermStrich oder selbst anlegen' },
      { text: 'Kontakte laden', weg: '#kontakte',
        fertig: adressen.length > 0,
        neben: adressen.length ? `${adressen.length} vorhanden` : 'Empfänger der Rechnungen' },
      { text: 'Ersten Beleg anlegen', weg: '#neu', fertig: false,
        neben: 'Angebot, Rechnung oder Nachtrag' },
    ];
    wurzel.append(el('div', { class: 'kennzahlen' },
      kachel('Offen', eurZeigen(0), 'keine Rechnung gestellt'),
      kachel('Überfällig', eurZeigen(0), 'nichts überfällig'),
      kachel(`Eingegangen ${new Date().getFullYear()}`, eurZeigen(0), 'noch kein Eingang'),
    ));
    wurzel.append(
      abschnitt('So kommen Sie zum ersten Beleg'),
      el('ol', { class: 'schrittliste' }, ...schritte.map((s) => el('li', { class: s.fertig ? 'fertig' : '' },
        el('button', { class: 'eintrag', type: 'button', onclick: () => { location.hash = s.weg; } },
          el('span', { class: 'haken', 'aria-hidden': 'true', text: s.fertig ? '✓' : '' }),
          el('div', { class: 'haupt' },
            el('div', { class: 'titel', text: s.text }),
            el('div', { class: 'neben', text: s.neben })),
          el('span', { class: 'pfeil', text: '›' }))))),
      abschnitt('Abrechnungsstand je Projekt'),
      platzhalterBalken('Sobald ein Vertrag erfasst ist, steht hier je Projekt, wie viel der Vertragssumme bereits abgerechnet ist und was noch offen bleibt.'),
      abschnitt('Nachträge'),
      el('div', { class: 'leer' }, el('p', { class: 'klein', text: 'Beauftragte und noch nicht beauftragte Nachträge erscheinen hier, sobald eine zweite Vertragsversion angelegt ist.' })),
      abschnitt('Belege'),
      el('div', { class: 'leer' }, el('p', { class: 'klein', text: 'Angebote, Rechnungen und Nachträge — nach Projekt gruppiert.' })),
    );
    return;
  }

  const heute = Date.now();
  const jahr = new Date().getFullYear();
  const rechnungen = belege.filter((b) => IST_RECHNUNG(b.art) && b.status === STATUS.FEST);

  // ── Kennzahlen ───────────────────────────────────────
  const offeneListe = rechnungen
    .map((b) => ({ b, offen: runde2((b.brutto || 0) - (b.gezahlt || 0)) }))
    .filter((x) => Math.abs(x.offen) > 0.005);
  const offen = runde2(offeneListe.reduce((s, x) => s + x.offen, 0));

  // Ueberfaellig: aelter als 30 Tage. Ein eigenes Zahlungsziel je Beleg gibt es
  // noch nicht — sobald es das tut, gehoert es hierher.
  const ueberfaellig = offeneListe.filter((x) =>
    x.b.datum && (heute - new Date(x.b.datum).getTime()) > 30 * TAG);
  const summeUeberfaellig = runde2(ueberfaellig.reduce((s, x) => s + x.offen, 0));

  const bezahltJahr = runde2(rechnungen
    .filter((b) => (b.datum || '').startsWith(String(jahr)))
    .reduce((s, b) => s + (b.gezahlt || 0), 0));

  wurzel.append(el('div', { class: 'kennzahlen' },
    kachel('Offen', eurZeigen(offen), `${offeneListe.length} Rechnung(en)`),
    kachel('Überfällig', eurZeigen(summeUeberfaellig),
      ueberfaellig.length ? `${ueberfaellig.length} älter als 30 Tage` : 'nichts überfällig',
      summeUeberfaellig > 0 ? 'warnung' : ''),
    kachel(`Eingegangen ${jahr}`, eurZeigen(bezahltJahr), `${rechnungen.length} Rechnungen gestellt`),
  ));

  // ── Abrechnungsstand je Projekt ──────────────────────
  const stand = [];
  for (const p of projekte) {
    const eigene = belege.filter((b) => b.projektId === p.id);
    if (!eigene.length) continue;

    const versionen = vertraege.filter((v) => v.projektId === p.id)
      .sort((a, b) => (a.version || 0) - (b.version || 0));
    const aktuell = versionen[versionen.length - 1];

    let vertragssumme = null;
    if (aktuell) {
      try { vertragssumme = ermittlungAusVertrag(aktuell, null).netto; } catch { /* unvollstaendig */ }
    }
    const berechnet = runde2(eigene
      .filter((b) => IST_RECHNUNG(b.art) && b.status === STATUS.FEST && b.kumulativ !== false)
      .reduce((s, b) => s + (b.summeNetto || 0), 0));

    stand.push({
      projekt: p, versionen, vertragssumme, berechnet,
      rest: vertragssumme === null ? null : runde2(vertragssumme - berechnet),
      offen: runde2(eigene.filter((b) => IST_RECHNUNG(b.art) && b.status === STATUS.FEST)
        .reduce((s, b) => s + ((b.brutto || 0) - (b.gezahlt || 0)), 0)),
      belege: eigene.sort((a, b) => (b.datum || '').localeCompare(a.datum || '')),
    });
  }
  stand.sort((a, b) => (b.offen || 0) - (a.offen || 0));

  wurzel.append(abschnitt('Abrechnungsstand je Projekt'));
  if (!stand.length) {
    wurzel.append(el('div', { class: 'leer' }, el('p', { class: 'klein', text: 'Noch keinem Projekt zugeordnet.' })));
  }
  for (const s of stand) {
    const anteil = s.vertragssumme ? Math.min(1, s.berechnet / s.vertragssumme) : 0;
    wurzel.append(el('div', { class: 'projektstand' },
      el('button', {
        class: 'projektkopf', type: 'button',
        onclick: () => { location.hash = `#projekt/${s.projekt.id}`; },
      },
        el('span', { class: 'name', text: `${s.projekt.nummer} ${s.projekt.name}` }),
        el('span', { class: 'betrag', text: s.vertragssumme === null ? '—' : eurZeigen(s.rest) }),
      ),
      s.vertragssumme === null
        ? el('div', { class: 'klein', text: 'Kein vollständiger Vertragsstand — Restbetrag nicht berechenbar.' })
        : el('div', {},
          el('div', { class: 'balken', 'aria-label': `${prozent(anteil)} abgerechnet` },
            el('div', { class: 'gefuellt', style: `width:${(anteil * 100).toFixed(1)}%` })),
          el('div', { class: 'balkenzeile' },
            el('span', { text: `${eurZeigen(s.berechnet)} von ${eurZeigen(s.vertragssumme)} netto abgerechnet` }),
            el('span', { class: 'mono', text: prozent(anteil) }),
          )),
      s.offen ? el('div', { class: 'klein', text: `offen aus gestellten Rechnungen: ${eurZeigen(s.offen)}` }) : null,
    ));
  }

  // ── Nachträge ────────────────────────────────────────
  const nachtraege = [];
  for (const s of stand) {
    for (const v of s.versionen.filter((x) => x.version > 1)) {
      nachtraege.push({ projekt: s.projekt, v });
    }
  }
  const nachtragsbelege = belege.filter((b) => b.art === BELEGART.NACHTRAG);

  if (nachtraege.length || nachtragsbelege.length) {
    wurzel.append(abschnitt('Nachträge', String(nachtraege.length)));
    wurzel.append(el('ul', { class: 'liste' }, ...nachtraege.map(({ projekt, v }) => {
      const beauftragt = v.beauftragt === true;
      return el('li', {}, el('button', {
        class: 'eintrag', type: 'button', onclick: () => { location.hash = `#projekt/${projekt.id}`; },
      },
        el('div', { class: 'haupt' },
          el('div', { class: 'titel', text: `${projekt.nummer} — Version ${v.version}: ${v.grund}` }),
          el('div', { class: 'neben', text: v.gueltigAb ? `ab ${isoNachDe(v.gueltigAb)}` : '' }),
        ),
        el('span', { class: `marke-status ${beauftragt ? 'fest' : 'entwurf'}`,
          text: beauftragt ? 'beauftragt' : 'zur Beauftragung' }),
      ));
    })));
  }

  // ── Belege nach Projekt ──────────────────────────────
  wurzel.append(abschnitt('Belege', String(belege.length)));
  const box = el('div');
  const suchF = feld({
    label: 'Suchen', art: 'search', platzhalter: 'Nummer, Projekt …',
    onEingabe: (w) => zeichnenBelege(box, stand, belege, projekte, w),
  });
  zeichnenBelege(box, stand, belege, projekte, '');
  wurzel.append(suchF, box);
}

function zeichnenBelege(box, stand, alleBelege, projekte, suche) {
  leeren(box);
  const s = (suche || '').trim().toLowerCase();
  const passt = (b) => {
    if (!s) return true;
    const p = projekte.find((x) => x.id === b.projektId);
    return `${b.nummer} ${p?.name || ''} ${p?.nummer || ''}`.toLowerCase().includes(s);
  };

  let gezeigt = 0;
  for (const gruppe of stand) {
    const treffer = gruppe.belege.filter(passt);
    if (!treffer.length) continue;
    gezeigt += treffer.length;
    box.append(
      el('h3', { text: `${gruppe.projekt.nummer} ${gruppe.projekt.name}` }),
      el('ul', { class: 'liste' }, ...treffer.map((b) => belegZeile(b))),
    );
  }
  // Belege ohne Projektzuordnung
  const ohne = alleBelege.filter((b) => !stand.some((g) => g.projekt.id === b.projektId)).filter(passt);
  if (ohne.length) {
    gezeigt += ohne.length;
    box.append(el('h3', { text: 'Ohne Projektzuordnung' }),
      el('ul', { class: 'liste' }, ...ohne.map((b) => belegZeile(b))));
  }
  if (!gezeigt) box.append(el('div', { class: 'leer' }, el('p', { text: 'Kein Treffer.' })));
}

function belegZeile(b) {
  const offen = runde2((b.brutto || 0) - (b.gezahlt || 0));
  const zustand = b.status === STATUS.ENTWURF ? 'Entwurf'
    : b.status === STATUS.STORNIERT ? 'storniert'
      : (IST_RECHNUNG(b.art) && Math.abs(offen) < 0.005 ? 'bezahlt' : null);
  return el('li', {}, el('button', {
    class: 'eintrag', type: 'button', onclick: () => { location.hash = `#beleg/${b.id}`; },
  },
    el('div', { class: 'haupt' },
      el('div', { class: 'titel', text: `${BELEGART_TEXT[b.art] || 'Beleg'} ${b.nummer}` }),
      el('div', { class: 'neben', text: [b.datumDe || isoNachDe(b.datum), zustand].filter(Boolean).join(' · ') }),
    ),
    el('div', { class: 'betrag', text: eurZeigen(b.brutto ?? b.zahlbetrag ?? 0) }),
  ));
}

/** Abschnittstrenner: Linie, Überschrift, optional eine Anzahl rechts. */
function abschnitt(titel, anzahl = null) {
  return el('div', { class: 'abschnitt' },
    el('h2', { text: titel }),
    anzahl !== null ? el('span', { class: 'anzahl mono', text: anzahl }) : null);
}

/** Andeutung eines Balkendiagramms für den leeren Zustand. */
function platzhalterBalken(text) {
  return el('div', { class: 'platzhalter' },
    el('div', { class: 'skizze' },
      ...[62, 44, 28].map((w) => el('div', { class: 'skizzenbalken', style: `width:${w}%` }))),
    el('p', { class: 'klein', text }));
}

function kachel(titel, wert, neben, art = '') {
  return el('div', { class: `kachel ${art}` },
    el('div', { class: 'kacheltitel', text: titel }),
    el('div', { class: 'kachelwert', text: wert }),
    el('div', { class: 'kachelneben', text: neben }),
  );
}
