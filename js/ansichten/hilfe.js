// Hilfe — was die App tut und warum sie es so tut.
//
// Bewusst keine Bedienanleitung fuer jeden Knopf: Was offensichtlich ist, muss
// nicht erklaert werden. Erklaert wird, was man nicht sehen kann — woher die
// Zahlen kommen, was beim Festschreiben passiert, wo die Daten liegen und was
// zu tun ist, wenn etwas schiefging.

import { el } from '../ui.js';

const ABSCHNITTE = [
  {
    titel: 'Der Weg zu einer Rechnung',
    absaetze: [
      'Einmalig: unter Einstellungen die Bürodaten erfassen — Name, Anschrift, Bankverbindung und die Steuernummer oder USt-IdNr. Ohne eine der beiden ist die Rechnung nach § 14 Abs. 4 Nr. 2 UStG nicht zum Vorsteuerabzug geeignet.',
      'Dann unter Projekte und Kontakte die Stammdaten laden oder von Hand anlegen.',
      'Für jeden Beleg: Neu → Art wählen (Angebot, Rechnung, Nachtrag) → Projekt und Empfänger → Vertragsdaten → prüfen → festschreiben.',
    ],
  },
  {
    titel: 'Woher die Zahlen kommen',
    absaetze: [
      'Das Honorar wird nicht geschätzt, sondern nach der HOAI gerechnet: anrechenbare Kosten nach § 4 und den Vorschriften des jeweiligen Leistungsbildes, Einordnung in die Honorartafel, lineare Interpolation zwischen den Stützstellen nach § 13, Bewertung der Leistungsphasen, Umbauzuschlag nach § 36, Nebenkosten nach § 14.',
      'Jeder dieser Schritte steht mit Formel und Zwischenwert auf dem Beleg. Eine Rechnung, deren Herleitung man nicht nachrechnen kann, ist im Streitfall wertlos.',
      'Der Rechenkern ist gegen zwei echte Schlussrechnungen aus HOAI-Pro geprüft — auf den Cent gleich, einschließlich der kaufmännischen Rundung.',
    ],
    verweis: { text: 'HOAI nachschlagen', weg: '#hoai' },
  },
  {
    titel: 'Entwurf und Festschreiben',
    absaetze: [
      'Solange ein Beleg Entwurf ist, lässt sich alles ändern. Beim Festschreiben wird der gesamte Rechenstand als Momentaufnahme gespeichert — auch dann, wenn später die Vertragsdaten korrigiert werden, zeigt der Beleg unverändert das, was verschickt wurde.',
      'Ein festgeschriebener Beleg lässt sich nicht mehr bearbeiten und nicht löschen, nur stornieren. Das entspricht den GoBD: eine ausgegangene Rechnung verschwindet nicht, sie wird storniert.',
    ],
  },
  {
    titel: 'Wo die Daten liegen',
    absaetze: [
      'Vollständig auf diesem Gerät, in der Datenbank des Browsers. Die App baut zu keinem Zeitpunkt eine Verbindung nach außen auf — keine Schriften von fremden Servern, kein Analysedienst, keine Fehlerberichte, kein Rechnen in der Cloud.',
      'Das heißt auch: Was auf dem Mac erfasst wurde, steht nicht von selbst auf dem iPad. Der Weg dorthin ist die Sicherung unter Einstellungen.',
      'Und es heißt: Wird der Browserspeicher gelöscht, sind die Daten weg. Regelmäßig sichern.',
    ],
  },
  {
    titel: 'Wenn eine Änderung nicht ankommt',
    absaetze: [
      'Die App hält sich für den Betrieb ohne Netz eine Kopie ihrer Programmdateien vor. Sollte nach einer Aktualisierung noch der alte Stand erscheinen, hilft einmal neu laden — auf dem Mac mit Cmd+R, auf iPhone und iPad die App schließen und wieder öffnen.',
    ],
  },
  {
    titel: 'Was die App nicht kann',
    absaetze: [
      'Keine Buchhaltung: Zahlungseingänge werden erfasst, aber nicht verbucht, und es gibt keine Umsatzsteuervoranmeldung.',
      'Kein Zugriff auf untermStrich im laufenden Betrieb — Projekte und Kontakte kommen über eine Exportdatei. Der Grund ist technisch: Die App läuft über HTTPS, der untermStrich-Server über HTTP; der Browser lässt diese Verbindung nicht zu. Davon abgesehen steht der Server nur im Heimnetz, die App soll aber auch auf der Baustelle rechnen.',
      'Noch keine XRechnung und kein ZUGFeRD. Für öffentliche Auftraggeber ist das Pflicht — die Leitweg-ID lässt sich bereits am Kontakt hinterlegen, damit sie später vorliegt.',
    ],
  },
];

export async function hilfeZeigen(wurzel) {
  wurzel.append(
    el('h1', { text: 'Hilfe' }),
    el('p', { class: 'unterzeile', text: 'Was die App tut, woher die Zahlen kommen und wo die Daten liegen.' }),
    ...ABSCHNITTE.flatMap((a) => [
      el('div', { class: 'abschnitt' }, el('h2', { text: a.titel })),
      ...a.absaetze.map((s) => el('p', { class: 'fliess', text: s })),
      a.verweis
        ? el('div', { class: 'knopfreihe' },
          el('button', { class: 'knopf zweit', type: 'button',
            onclick: () => { location.hash = a.verweis.weg; } }, a.verweis.text))
        : null,
    ]),
    el('div', { class: 'abschnitt' }, el('h2', { text: 'Weiter' })),
    el('div', { class: 'knopfreihe' },
      el('button', { class: 'knopf zweit', onclick: () => { location.hash = '#hoai'; } }, 'HOAI'),
      el('button', { class: 'knopf zweit', onclick: () => { location.hash = '#vorlagen'; } }, 'Dokumentvorlagen'),
      el('button', { class: 'knopf leise', onclick: () => { location.hash = '#einstellungen'; } }, 'Einstellungen'),
    ),
  );
}
