// Impressum, Datenschutzerklärung, Verarbeitungsverzeichnis, Löschkonzept.
//
// ⚠️ Das sind Entwürfe, kein Rechtsrat. Sie fassen zusammen, was die App
// tatsächlich tut, und setzen die Bürodaten ein — die Prüfung, ob damit alle
// Pflichten erfüllt sind, kann nur ein Anwalt oder die Kammer leisten.
//
// Warum überhaupt in der App und nicht als Dokument nebenher:
// Impressum und Datenschutzerklärung gehören an die veröffentlichte Anwendung.
// Wer sie in einer Schublade hat, hat sie nicht bereitgestellt. Und sie müssen
// beschreiben, was DIESE App tut — jede allgemeine Vorlage aus dem Netz
// beschreibt Cookies, Analysedienste und Server-Logs, die es hier nicht gibt.
//
// Verarbeitungsverzeichnis und Löschkonzept betreffen dagegen das Büro, nicht
// die App. Sie stehen hier, weil die App die Daten kennt, um die es geht, und
// lassen sich als Datei ablegen.

import { el, leeren, feld, dateiSpeichern, melden } from '../ui.js';
import { einstellungenLesen, anschriftZeilen, telefonZeigen } from '../db.js';

export async function rechtlichesZeigen(wurzel) {
  const e = await einstellungenLesen();
  const b = e.buero;
  const a = anschriftZeilen(b);

  wurzel.append(
    el('h1', { text: 'Rechtliches' }),
    el('p', { class: 'unterzeile', text: 'Impressum und Datenschutzerklärung für die App, Verarbeitungsverzeichnis und Löschkonzept für das Büro.' }),
    el('div', { class: 'karte hinweiskarte' },
      el('h3', { text: 'Entwürfe, kein Rechtsrat' }),
      el('p', { class: 'fliess', text: 'Die Texte fassen zusammen, was die App tatsächlich tut, und setzen die '
        + 'Bürodaten ein. Ob damit alle Pflichten erfüllt sind, kann nur ein Anwalt oder die Kammer beurteilen — '
        + 'insbesondere bevor die App an Dritte weitergegeben wird.' }),
    ),
  );

  const fehlend = pflichtangabenPruefen(b);
  if (fehlend.length) {
    wurzel.append(el('div', { class: 'karte hinweiskarte' },
      el('h3', { text: `${fehlend.length} Angabe(n) fehlen` }),
      el('p', { class: 'klein', text: 'Ohne sie ist das Impressum unvollständig:' }),
      el('ul', { class: 'liste schlicht' }, ...fehlend.map((f) => el('li', {},
        el('div', { class: 'zeile' },
          el('span', { text: f.feld }),
          el('span', { class: 'mono klein', text: f.fundstelle }))))),
      el('div', { class: 'knopfreihe' },
        el('button', { class: 'knopf zweit', onclick: () => { location.hash = '#einstellungen'; } },
          'Zu den Einstellungen')),
    ));
  }

  const stuecke = [
    { schluessel: 'impressum', titel: 'Impressum', text: impressum(b, a) },
    { schluessel: 'datenschutz', titel: 'Datenschutzerklärung', text: datenschutz(b, a) },
    { schluessel: 'verzeichnis', titel: 'Verarbeitungsverzeichnis (Art. 30 DSGVO)', text: verzeichnis(b, a) },
    { schluessel: 'loeschung', titel: 'Löschkonzept', text: loeschkonzept() },
  ];

  let aktuell = stuecke[0].schluessel;
  const box = el('div');
  const zeichnen = () => {
    leeren(box);
    const s = stuecke.find((x) => x.schluessel === aktuell);
    box.append(
      el('pre', { class: 'rechtstext', text: s.text }),
      el('div', { class: 'knopfreihe' },
        el('button', {
          class: 'knopf zweit', type: 'button',
          onclick: async () => {
            try {
              await navigator.clipboard.writeText(s.text);
              melden('In die Zwischenablage kopiert.');
            } catch {
              melden('Kopieren nicht möglich — Text markieren und selbst kopieren.', 'fehler');
            }
          },
        }, 'Kopieren'),
        el('button', {
          class: 'knopf leise', type: 'button',
          onclick: () => dateiSpeichern(`${s.schluessel}.txt`, s.text, 'text/plain;charset=utf-8'),
        }, 'Als Datei ablegen'),
      ),
    );
  };

  wurzel.append(
    feld({
      label: 'Dokument', art: 'auswahl', wert: aktuell,
      optionen: stuecke.map((s) => ({ wert: s.schluessel, text: s.titel })),
      onAenderung: (w) => { aktuell = w; zeichnen(); },
    }),
    box,
  );
  zeichnen();
}

/** Was für ein vollständiges Impressum fehlt. */
function pflichtangabenPruefen(b) {
  const fehlend = [];
  const verlangt = (bedingung, feldName, fundstelle) => {
    if (!bedingung) fehlend.push({ feld: feldName, fundstelle });
  };
  verlangt(b.name, 'Name des Büros', '§ 5 Abs. 1 Nr. 1 DDG');
  verlangt(b.inhaber, 'Vertretungsberechtigte Person', '§ 5 Abs. 1 Nr. 1 DDG');
  verlangt(b.strasse && b.ort, 'Ladungsfähige Anschrift', '§ 5 Abs. 1 Nr. 1 DDG');
  verlangt(b.mail, 'E-Mail-Adresse', '§ 5 Abs. 1 Nr. 2 DDG');
  verlangt(b.telefon, 'Telefonnummer', '§ 5 Abs. 1 Nr. 2 DDG');
  verlangt(b.ustId || b.steuernummer, 'USt-IdNr. oder Steuernummer', '§ 5 Abs. 1 Nr. 6 DDG');
  verlangt(b.kammer, 'Zuständige Kammer', '§ 5 Abs. 1 Nr. 5 DDG');
  verlangt(b.eintragungsnummer, 'Eintragungsnummer in der Architektenliste', '§ 5 Abs. 1 Nr. 5 DDG');
  verlangt(b.berufsordnungWeb, 'Fundstelle der Berufsordnung', '§ 5 Abs. 1 Nr. 5 DDG');
  verlangt(b.haftpflichtVersicherer, 'Berufshaftpflichtversicherer', '§ 2 Abs. 1 Nr. 11 DL-InfoV');
  return fehlend;
}

const oderStrich = (x) => (x && String(x).trim()) || '—';

function impressum(b, a) {
  return `IMPRESSUM

Angaben nach § 5 DDG und § 2 DL-InfoV

${oderStrich(b.name)}
${oderStrich(b.inhaber)}${b.funktion ? `, ${b.funktion}` : ''}
${oderStrich(a.strasse)}
${oderStrich(a.plzOrt)}

Telefon: ${oderStrich(telefonZeigen(b))}
E-Mail:  ${oderStrich(b.mail)}${b.web ? `\nWeb:     ${b.web}` : ''}

VERTRETUNGSBERECHTIGT
${oderStrich(b.inhaber)}

UMSATZSTEUER
${b.ustId
    ? `Umsatzsteuer-Identifikationsnummer nach § 27a UStG: ${b.ustId}`
    : `Steuernummer: ${oderStrich(b.steuernummer)}`}

BERUFSRECHTLICHE ANGABEN
Berufsbezeichnung:      ${oderStrich(b.berufsbezeichnung)}
Verliehen in:           ${oderStrich(b.verleihenderStaat)}
Zuständige Kammer:      ${oderStrich(b.kammer)}
${b.kammerAnschrift ? `                        ${b.kammerAnschrift}\n` : ''}${b.kammerWeb ? `                        ${b.kammerWeb}\n` : ''}Eintragungsnummer:      ${oderStrich(b.eintragungsnummer)}

Es gelten die berufsrechtlichen Regelungen des Landes, in dem die
Berufsbezeichnung verliehen wurde (Architektengesetz, Berufsordnung,
Satzungen der Kammer). Sie sind einsehbar unter:
${oderStrich(b.berufsordnungWeb)}

BERUFSHAFTPFLICHTVERSICHERUNG (§ 2 Abs. 1 Nr. 11 DL-InfoV)
Versicherer:            ${oderStrich(b.haftpflichtVersicherer)}
${b.haftpflichtAnschrift ? `Anschrift:              ${b.haftpflichtAnschrift}\n` : ''}Räumlicher Geltungsbereich: ${oderStrich(b.haftpflichtGeltungsbereich)}

VERBRAUCHERSTREITBEILEGUNG
Zur Teilnahme an einem Streitbeilegungsverfahren vor einer
Verbraucherschlichtungsstelle bin ich weder bereit noch verpflichtet.

HAFTUNG FÜR INHALTE
Für eigene Inhalte bin ich nach den allgemeinen Gesetzen verantwortlich.
Diese Anwendung verarbeitet ausschließlich Daten, die der Nutzer selbst
eingibt; sie ruft keine fremden Inhalte ab.`;
}

function datenschutz(b, a) {
  return `DATENSCHUTZERKLÄRUNG

Diese Erklärung beschreibt, was diese Anwendung mit personenbezogenen Daten
tut. Sie ist kurz, weil die Anwendung wenig tut.

1 VERANTWORTLICHER (Art. 4 Nr. 7, Art. 13 Abs. 1 lit. a DSGVO)

${oderStrich(b.name)}
${oderStrich(b.inhaber)}
${oderStrich(a.strasse)}
${oderStrich(a.plzOrt)}
E-Mail: ${oderStrich(b.mail)}

2 WAS DIE ANWENDUNG TUT — UND WAS NICHT

Diese Anwendung läuft vollständig im Browser des jeweiligen Geräts. Sie baut
zu keinem Zeitpunkt eine Verbindung zu einem Server auf, um Daten zu
übertragen. Es gibt insbesondere:

  keine Benutzerkonten und keine Anmeldung,
  keine Cookies,
  keine Reichweitenmessung, Analyse oder Statistik,
  keine Fehlerberichte an Dritte,
  keine Schriften, Karten oder sonstigen Inhalte von fremden Servern,
  keine Weitergabe an Dritte.

Alle eingegebenen Daten — Büroangaben, Projekte, Kontakte, Verträge und
Belege — werden ausschließlich in der Datenbank des Browsers auf dem jeweiligen
Gerät gespeichert (IndexedDB). Sie verlassen das Gerät nur dann, wenn der
Nutzer selbst eine Sicherung ablegt, einen Beleg als Datei speichert oder ihn
versendet.

3 BEREITSTELLUNG DER ANWENDUNG

Die Anwendung wird über GitHub Pages bereitgestellt (GitHub Inc., 88 Colin P
Kelly Jr Street, San Francisco, CA 94107, USA). Beim Abruf der Programmdateien
verarbeitet GitHub technisch notwendige Verbindungsdaten einschließlich der
IP-Adresse. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; das berechtigte
Interesse liegt in der Bereitstellung der Anwendung. Auf diese Verarbeitung
hat der Verantwortliche keinen Einfluss; Einzelheiten in der
Datenschutzerklärung von GitHub.

Nach dem ersten Aufruf funktioniert die Anwendung ohne Netzverbindung.

4 RECHTSGRUNDLAGE DER EIGENEN VERARBEITUNG

Soweit im Rahmen eines Auftragsverhältnisses Daten von Auftraggebern und
Beteiligten verarbeitet werden, ist Rechtsgrundlage Art. 6 Abs. 1 lit. b DSGVO
(Vertragserfüllung) sowie Art. 6 Abs. 1 lit. c DSGVO (rechtliche
Verpflichtungen aus Steuer- und Handelsrecht).

5 SPEICHERDAUER

Belege und die ihnen zugrunde liegenden Daten werden aufbewahrt, solange
gesetzliche Aufbewahrungspflichten bestehen (siehe Löschkonzept), und danach
gelöscht.

6 RECHTE DER BETROFFENEN PERSONEN

Es bestehen die Rechte auf Auskunft (Art. 15), Berichtigung (Art. 16),
Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18),
Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21 DSGVO). Zur Ausübung
genügt eine Nachricht an die oben genannte Adresse.

Es besteht ferner das Recht auf Beschwerde bei einer Aufsichtsbehörde
(Art. 77 DSGVO).

7 KEINE AUTOMATISIERTE ENTSCHEIDUNGSFINDUNG

Eine automatisierte Entscheidungsfindung einschließlich Profiling nach
Art. 22 DSGVO findet nicht statt.`;
}

function verzeichnis(b, a) {
  const heute = new Date().toLocaleDateString('de-DE');
  return `VERZEICHNIS VON VERARBEITUNGSTÄTIGKEITEN
nach Art. 30 Abs. 1 DSGVO

Stand: ${heute}

VERANTWORTLICHER
${oderStrich(b.name)}, ${oderStrich(b.inhaber)}
${oderStrich(a.strasse)}, ${oderStrich(a.plzOrt)}
E-Mail: ${oderStrich(b.mail)}

Ein Datenschutzbeauftragter ist nicht benannt; die Voraussetzungen des
§ 38 Abs. 1 BDSG (in der Regel mindestens 20 ständig mit der automatisierten
Verarbeitung beschäftigte Personen) liegen nicht vor. — Bitte prüfen.

────────────────────────────────────────────────────────────────
1 · HONORARABRECHNUNG UND BELEGERSTELLUNG

Zweck
  Ermittlung des Honorars nach HOAI, Erstellung von Angeboten, Nachträgen
  und Rechnungen, Nachhalten des Zahlungsstands.

Kategorien betroffener Personen
  Auftraggeber (natürliche Personen und Ansprechpartner juristischer
  Personen), am Bau Beteiligte.

Kategorien personenbezogener Daten
  Name, Anrede, Titel, Firmenzugehörigkeit, Anschrift, Telefon, Mobil, Fax,
  E-Mail, Web, USt-IdNr., Debitorennummer, Leitweg-ID, interne Notiz zur
  Zuordnung, Projekt- und Vertragsdaten, Honorar- und Zahlungsdaten.

Empfänger
  Auftraggeber (Empfänger des Belegs), Steuerberatung, Finanzverwaltung im
  Rahmen gesetzlicher Pflichten. Keine weiteren.

Übermittlung in Drittländer
  Findet nicht statt.

Löschfristen
  Siehe Löschkonzept.

Technische und organisatorische Maßnahmen (Art. 32 DSGVO)
  Speicherung ausschließlich lokal auf den Endgeräten (Browserdatenbank).
  Festplattenverschlüsselung der Endgeräte (FileVault). Kein Serverzugriff,
  keine Übertragung an Dritte durch die Anwendung selbst. Zugang zu den
  Geräten durch Gerätesperre geschützt. Sicherungen werden verschlüsselt
  abgelegt. — Bitte auf den tatsächlichen Stand prüfen.

────────────────────────────────────────────────────────────────
2 · STAMMDATEN AUS UNTERMSTRICH

Zweck
  Übernahme vorhandener Projekt- und Kontaktdaten, um sie nicht doppelt zu
  erfassen.

Kategorien betroffener Personen und Daten
  Wie unter 1.

Herkunft
  Eigene Bürosoftware untermStrich, Übernahme über eine Exportdatei.

Empfänger
  Keine.

────────────────────────────────────────────────────────────────
HINWEIS
Dieses Verzeichnis erfasst nur die Verarbeitung im Zusammenhang mit dieser
Anwendung. Weitere Verarbeitungstätigkeiten des Büros — Bewerbungen,
Beschäftigtendaten, Schriftverkehr, Bautagebücher, Fotodokumentation — sind
gesondert aufzunehmen.`;
}

function loeschkonzept() {
  return `LÖSCHKONZEPT

Aufbewahrungspflichten gehen dem Löschanspruch vor (Art. 17 Abs. 3 lit. b
DSGVO). Gelöscht wird, sobald die längste einschlägige Frist abgelaufen ist.

────────────────────────────────────────────────────────────────
FRISTEN

Rechnungen und sonstige Buchungsbelege ................. 8 Jahre
  § 147 Abs. 3 AO, § 257 Abs. 4 HGB. Seit dem 4. Bürokratieentlastungs-
  gesetz acht statt zehn Jahre; gilt für alle Unterlagen, deren Frist am
  1. Januar 2025 noch nicht abgelaufen war.

Jahresabschlüsse, Inventare, Handelsbücher ............. 10 Jahre
  § 147 Abs. 3 AO, § 257 Abs. 4 HGB — hier ist es bei zehn Jahren geblieben.

Empfangene und abgesandte Handels- und Geschäftsbriefe ... 6 Jahre
  § 147 Abs. 3 AO, § 257 Abs. 4 HGB. Dazu zählen Angebote, die zu einem
  Auftrag geführt haben, Auftragsbestätigungen und Schriftverkehr.

Verträge und Unterlagen zur Mängelhaftung .............. 5 Jahre ab Abnahme
  § 634a Abs. 1 Nr. 2 BGB. Solange Ansprüche bestehen können, sind die
  Unterlagen zur Rechtsverteidigung erforderlich.

Der Fristlauf beginnt mit dem Schluss des Kalenderjahres, in dem die letzte
Eintragung gemacht oder der Beleg entstanden ist (§ 147 Abs. 4 AO).

────────────────────────────────────────────────────────────────
WAS DARAUS FOLGT

Ein Beleg dieser Anwendung ist ein Buchungsbeleg: 8 Jahre.
Der zugehörige Vertragsstand gehört zum Vertrag: 5 Jahre ab Abnahme —
in der Regel kürzer, deshalb ist die Belegfrist maßgeblich.
Kontaktdaten werden gelöscht, sobald zu diesem Kontakt kein Beleg mehr
aufbewahrungspflichtig ist.

────────────────────────────────────────────────────────────────
VORGEHEN

Einmal jährlich, sinnvollerweise nach dem Jahresabschluss:
  1. Belege ermitteln, deren Frist abgelaufen ist.
  2. Prüfen, ob Ansprüche noch offen sind (dann nicht löschen).
  3. Löschen — auf allen Geräten und in allen Sicherungen. Eine Sicherung,
     die gelöschte Daten weiter enthält, macht die Löschung unwirksam.
  4. Vorgang notieren: was, wann, auf welcher Grundlage.

────────────────────────────────────────────────────────────────
GRENZE DIESES KONZEPTS

Die Anwendung löscht nichts von selbst. Festgeschriebene Belege lassen sich
aus gutem Grund nicht entfernen, sondern nur stornieren (GoBD). Für die
Löschung nach Fristablauf ist deshalb der Weg über die Sicherung und das
Zurückspielen eines bereinigten Stands vorgesehen — oder das Löschen der
Browserdatenbank, wenn alle Fristen abgelaufen sind.

Entwurf, kein Rechtsrat. Vor Anwendung prüfen lassen.`;
}
