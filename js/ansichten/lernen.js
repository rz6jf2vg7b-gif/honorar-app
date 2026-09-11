// Lernstrecke: die App am eigenen Vorgang lernen.
//
// Bewusst keine geführte Tour mit Sprechblasen über der Oberfläche. Solche
// Touren erklären Knöpfe — was hier zu lernen ist, sind aber keine Knöpfe,
// sondern ein Ablauf: Ein Angebot geht raus, kommt geändert zurück, wird zur
// Abrechnungsgrundlage, und daraus entstehen Rechnungen, die bezahlt werden
// oder eben nicht. Wer das einmal durchgespielt hat, findet die Knöpfe von
// selbst.
//
// Geübt wird an einem eigenen Projekt, das sich restlos entfernen lässt. Der
// Anlass ist konkret: Beim ersten Erkunden entstanden zwei Angebote im echten
// Bestand, die niemand wollte und die sich nicht löschen ließen.
//
// Der Fortschritt wird nicht abgehakt, sondern an den Daten erkannt: Ein
// Kapitel ist erledigt, wenn das Ergebnis vorliegt. Man kann deshalb auch
// mittendrin einsteigen, abbrechen und später weitermachen.

import { el, leeren, melden, bestaetigen, eurZeigen, isoNachDe } from '../ui.js';
import { SPEICHER, alle, lesen } from '../db.js';
import { BELEGART_TEXT, IST_RECHNUNG, IST_ANGEBOT, STATUS } from '../vorgang.js';
import {
  UEBUNG_PROJEKT, uebungVorhanden, uebungAnlegen, uebungEntfernen,
} from '../beleg/uebung.js';

/**
 * Die Kapitel.
 *
 * `worum` sagt, warum es den Schritt gibt — das ist der Teil, der beim zweiten
 * Lesen noch etwas wert ist. `tun` sagt, was zu klicken ist. `fertig` liest am
 * Bestand ab, ob es schon geschehen ist.
 */
const KAPITEL = [
  {
    titel: 'Das Übungsprojekt',
    worum: 'Alles Weitere geschieht an einem Projekt, das es nicht gibt: „Übung — '
      + 'Einfamilienhaus am Hang" mit einer erfundenen Bauherrschaft. Seine Belege bleiben '
      + 'aus Dashboard und Buchhaltung heraus, und am Ende lässt sich der ganze Satz in '
      + 'einem Zug entfernen.',
    tun: 'Unten „Übung starten" drücken. Danach ist das Projekt unter Projekte zu finden.',
    fertig: (d) => !!d.projekt,
  },
  {
    titel: 'Das Angebot',
    worum: 'Ein Angebot ist keine Rechnung. Es fordert kein Geld, trägt keine '
      + 'Pflichtangaben nach § 14 UStG und hat eigene Blätter: die Leistungsbeschreibung '
      + 'mit den Grundleistungen im Wortlaut der HOAI, den Zahlungsplan und die '
      + 'Annahmeerklärung zum Unterschreiben. Wer die Grundleistungen abdruckt, ist später '
      + 'gegen die Behauptung geschützt, etwas sei mitgeschuldet gewesen.',
    tun: 'Neu → Angebot → Übungsprojekt → Bauherrschaft → „Nach HOAI ermitteln" oder '
      + '„Pauschale". Dann Vertragsdaten, Belegdaten, Zahlung — und festschreiben. '
      + 'Sieh dir vorher die Blattvorschau an.',
    weg: () => `#neu/${UEBUNG_PROJEKT}`,
    knopf: 'Angebot anlegen',
    fertig: (d) => d.belege.some((b) => IST_ANGEBOT(b.art) && b.status === STATUS.FEST),
  },
  {
    titel: 'Was der Bauherr zurückschickt',
    worum: 'Der häufigste Fall ist nicht das glatte Ja, sondern das gestrichene Angebot: '
      + '„LPh 1–4 ja, der Rest später." Rechtlich ist das nach § 150 Abs. 2 BGB kein '
      + 'Ja, sondern ein neuer Antrag — und ab da gilt ein anderer Umfang als im Angebot. '
      + 'Genau das hält die App fest: Streiche Leistungsphasen oder Positionen, ändere '
      + 'einen Betrag, ergänze eine Leistung. Bei geänderten Phasen entsteht ein eigener '
      + 'Vertragsstand; das Angebot selbst bleibt unverändert.',
    tun: 'Das festgeschriebene Angebot öffnen → „Antwort des Auftraggebers" → „angenommen '
      + 'mit Änderungen" → etwas streichen → vermerken. Das unterschriebene Original '
      + 'gehört als Anlage an den Beleg.',
    fertig: (d) => d.belege.some((b) => IST_ANGEBOT(b.art) && b.annahme),
  },
  {
    titel: 'Die erste Abschlagsrechnung',
    worum: 'Abgerechnet wird gegen den beauftragten Umfang, nicht gegen den angebotenen. '
      + 'Aus dem angenommenen Angebot heraus führt „Rechnung dazu" — Empfänger, Grundlage '
      + 'und die beauftragten Positionen sind dann schon eingetragen. Das ist die Stelle, '
      + 'an der Angebot und Rechnung sonst auseinanderlaufen.',
    tun: 'Im Angebot „Rechnung dazu" → Abschlagsrechnung → Leistungsstand angeben → '
      + 'festschreiben. Auf dem Blatt steht dann der Verweis auf das Angebot.',
    fertig: (d) => d.belege.some((b) => IST_RECHNUNG(b.art) && b.status === STATUS.FEST),
  },
  {
    titel: 'Geld kommt an — oder nicht ganz',
    worum: 'Der Zahlbetrag ist mit dem offenen Betrag vorbelegt; kommt weniger, '
      + 'überschreibst du ihn. Der Rest bleibt offen und erscheint auf der nächsten '
      + 'Rechnung dieses Projekts im Zahlbetrag — nicht im Rechnungsbetrag, denn die '
      + 'Umsatzsteuer fällt auf die Leistung an, nicht auf das Zahlungsverhalten.',
    tun: 'Die Rechnung öffnen → „Versandt" mit Datum → dann unter Zahlungen einen Betrag '
      + 'erfassen, der kleiner ist als die Forderung. Sieh dir an, was das Dashboard sagt.',
    fertig: (d) => d.belege.some((b) => (b.zahlungen || []).length),
  },
  {
    titel: 'Wenn nicht gezahlt wird',
    worum: 'Gemahnt wird über alle offenen Rechnungen eines Projekts, nicht je Beleg — '
      + 'sonst bekommt der Bauherr drei Briefe, die einander widersprechen. Verzugszinsen '
      + 'rechnet die App taggenau ab Fälligkeit, mit 5 Prozentpunkten über dem '
      + 'Basiszinssatz gegenüber Verbrauchern und 9 gegenüber Unternehmern. Die Übungs-'
      + 'bauherrschaft ist als Verbraucher angelegt — deshalb keine 40-€-Pauschale.',
    tun: 'Projekte → Übungsprojekt → „Mahnung". Das Versanddatum der Rechnung muss gesetzt '
      + 'sein, sonst rechnet die App keine Zinsen (lieber keine Forderung als eine falsche).',
    fertig: (d) => d.belege.some((b) => (b.mahnungen || []).length),
  },
  {
    titel: 'Die Schlussrechnung',
    worum: 'Sie rechnet kumulativ: Das gesamte Honorar abzüglich aller bisher gestellten '
      + 'Rechnungen. Bleibt nichts übrig, ist das eine gültige Rechnung über 0,00 € — der '
      + 'Normalfall am Projektende. Wurde ein Projekt vorher in einem anderen Programm '
      + 'abgerechnet, lassen sich dessen Rechnungen unter „Frühere Rechnung übernehmen" '
      + 'nachtragen, damit der Abzug stimmt.',
    tun: 'Neu → Schlussrechnung → Übungsprojekt. Achte auf die Zeile „Abzüglich gestellte '
      + 'Rechnungen" in der Zusammenstellung.',
    weg: () => `#neu/${UEBUNG_PROJEKT}`,
    knopf: 'Schlussrechnung anlegen',
    fertig: (d) => d.belege.some((b) => b.art === 'SR' && b.status === STATUS.FEST),
  },
  {
    titel: 'Aufräumen',
    worum: 'Die Übung ist fertig, wenn du sie wegwirfst. Entfernt werden das Projekt, die '
      + 'Bauherrschaft, alle Belege samt Anlagen und die Vertragsstände — auch die '
      + 'festgeschriebenen. Das ist die einzige Stelle, an der ein festgeschriebener Beleg '
      + 'verschwinden darf: Ein Übungsbeleg ist kein Geschäftsvorfall.',
    tun: 'Unten „Übung entfernen" drücken.',
    fertig: () => false,
  },
];

export async function lernenZeigen(wurzel) {
  const zeichnen = async () => {
    leeren(wurzel);
    const d = await stand();

    wurzel.append(
      el('h1', { text: 'Die App lernen' }),
      el('p', { class: 'unterzeile', text: 'Einmal den ganzen Weg durchspielen — an einem '
        + 'Übungsprojekt, das nichts mit deiner Buchhaltung zu tun hat und sich danach '
        + 'restlos entfernen lässt.' }),
    );

    const erledigt = KAPITEL.filter((k) => k.fertig(d)).length;
    wurzel.append(el('div', { class: 'karte gefuellt' },
      el('dl', { class: 'werte' },
        el('div', {}, el('dt', { text: 'Durchgespielt' }),
          el('dd', { text: `${erledigt} von ${KAPITEL.length - 1} Schritten` })),
        d.projekt ? el('div', {}, el('dt', { text: 'Übungsbelege' }),
          el('dd', { text: String(d.belege.length) })) : null,
      )));

    for (const [i, k] of KAPITEL.entries()) {
      const fertig = k.fertig(d);
      const karte = el('div', { class: `karte ${fertig ? 'erledigt' : ''}` },
        el('div', { class: 'kicker', text: fertig ? `${i + 1} · ERLEDIGT` : `SCHRITT ${i + 1}` }),
        el('h3', { text: k.titel }),
        el('p', { class: 'fliess', text: k.worum }),
        el('p', { class: 'klein', text: k.tun }),
      );
      if (k.weg && d.projekt) {
        karte.append(el('div', { class: 'knopfreihe' }, el('button', {
          class: fertig ? 'knopf leise' : 'knopf zweit',
          onclick: () => { location.hash = k.weg(); },
        }, k.knopf)));
      }
      wurzel.append(karte);
    }

    // ── Das Übungsprojekt steuern ──
    const reihe = el('div', { class: 'knopfreihe' });
    if (!d.projekt) {
      reihe.append(el('button', {
        class: 'knopf akzent',
        onclick: async () => {
          await uebungAnlegen();
          melden('Übungsprojekt angelegt.');
          zeichnen();
        },
      }, 'Übung starten'));
    } else {
      reihe.append(
        el('button', {
          class: 'knopf zweit',
          onclick: () => { location.hash = `#projekt/${UEBUNG_PROJEKT}`; },
        }, 'Zum Übungsprojekt'),
        el('button', {
          class: 'knopf leise',
          onclick: async () => {
            if (!await bestaetigen('Übung entfernen?',
              `${d.belege.length} Beleg(e), die Vertragsstände, das Projekt und die `
              + 'Bauherrschaft werden gelöscht. Deine echten Daten bleiben unberührt.')) return;
            const weg = await uebungEntfernen();
            melden(`Übung entfernt: ${weg.belege} Belege, ${weg.vertraege} Vertragsstände.`);
            zeichnen();
          },
        }, 'Übung entfernen'),
      );
    }
    wurzel.append(reihe);

    if (d.belege.length) {
      wurzel.append(el('div', { class: 'abschnitt' }, el('h2', { text: 'Was du angelegt hast' })),
        el('ul', { class: 'liste' }, ...d.belege.map((b) => el('li', {}, el('button', {
          class: 'eintrag', type: 'button', onclick: () => { location.hash = `#beleg/${b.id}`; },
        },
          el('div', { class: 'haupt' },
            el('div', { class: 'titel', text: `${BELEGART_TEXT[b.art] || 'Beleg'} ${b.nummer}` }),
            el('div', { class: 'neben', text: [
              isoNachDe(b.datum),
              b.status === STATUS.ENTWURF ? 'Entwurf' : 'festgeschrieben',
              b.annahme ? 'beantwortet' : null,
              (b.zahlungen || []).length ? 'mit Zahlung' : null,
              (b.mahnungen || []).length ? 'gemahnt' : null,
            ].filter(Boolean).join(' · ') })),
          el('div', { class: 'betrag', text: eurZeigen(b.brutto ?? null) }),
        )))));
    }

    wurzel.append(
      el('div', { class: 'abschnitt' }, el('h2', { text: 'Weiter' })),
      el('div', { class: 'knopfreihe' },
        el('button', { class: 'knopf leise', onclick: () => { location.hash = '#hilfe'; } },
          'Hilfe — warum die App so rechnet'),
        el('button', { class: 'knopf leise', onclick: () => { location.hash = '#vorlagen'; } },
          'Dokumentvorlagen ansehen'),
      ),
    );
  };

  await zeichnen();
}

/** Was liegt vor? Der Fortschritt wird am Bestand abgelesen, nicht gespeichert. */
async function stand() {
  const projekt = await lesen(SPEICHER.PROJEKTE, UEBUNG_PROJEKT);
  const belege = projekt
    ? (await alle(SPEICHER.BELEGE))
      .filter((b) => b.projektId === UEBUNG_PROJEKT)
      .sort((a, b) => (a.datum || '').localeCompare(b.datum || ''))
    : [];
  return { projekt, belege };
}
