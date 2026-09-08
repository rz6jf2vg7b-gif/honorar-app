# HonorarApp

Honorarermittlung, Angebote, Nachträge und Rechnungen nach HOAI — als installierbare
Web-App für Mac, iPad und iPhone. Ohne Server, ohne Konto: Die Daten bleiben auf dem
Gerät.

Entstanden als Ersatz für ein Windows-Honorarprogramm, das mit dem Rechner
verschwindet, auf dem es läuft.

---

## Was sie kann

**Honorar nach HOAI 2013 und 2021.** Anrechenbare Kosten nach DIN 276 mit der
25-Prozent-Regel für Technische Anlagen (§ 33 Abs. 2), Honorarzone, Interpolation
zwischen den Tafelwerten, Leistungsphasen einzeln beauftragbar in Prozentpunkten,
Umbauzuschlag, Nebenkosten pauschal oder auf Einzelnachweis.

**Sieben Leistungsbilder** mit ihren Honorartafeln: Gebäude, Innenräume,
Freianlagen, Ingenieurbauwerke, Verkehrsanlagen, Tragwerksplanung, Technische
Ausrüstung.

**Kumulative Abrechnung.** Jede Abschlagsrechnung weist das bis dahin insgesamt
verdiente Honorar aus und zieht die bisherigen Rechnungen ab. Ein Nachtrag erzeugt
eine neue Vertragsversion; bereits gestellte Rechnungen bleiben unberührt.

**Die Herleitung steht auf der Rechnung.** Kostenermittlung, Honorarzone, die
Interpolationsformeln mit eingesetzten Werten, die Leistungsphasen-Tabelle. Der
Empfänger kann jede Zahl nachrechnen, ohne dieses Programm zu haben — bei einer
Honorarrechnung ist das die Voraussetzung ihrer Prüfbarkeit.

**Belegformen:** Angebot, Nachtrag, Abschlags-, Teilschluss-, Schluss- und
Einzelrechnung (Zeithonorar oder Pauschale).

**Nachgehalten** wird über Belegstatus, Zahlungseingänge und eine
Offene-Posten-Liste. Festgeschriebene Belege sind unveränderlich und tragen ihren
Rechenstand als Kopie in sich; aufgehoben werden sie durch Storno, nicht durch
Löschen.

**Pflichtangaben nach § 14 Abs. 4 UStG** werden vor der Ausgabe geprüft — auf den
Daten, nicht auf dem Layout, damit keine Gestaltung sie aushebeln kann.

---

## Starten

```bash
python3 -m http.server 8765
```

Dann `http://localhost:8765` öffnen. Auf iPhone und iPad über „Zum Home-Bildschirm"
installieren; danach läuft sie offline.

**Erste Schritte:** Einstellungen → Bürodaten und Auftritt · Stammdaten → Projekte
und Empfänger anlegen · Neu → erster Beleg.

Nach jeder Programmänderung `FASSUNG` in `sw.js` hochzählen — sonst liefert der
Service Worker die alte Fassung aus dem Zwischenspeicher.

---

## Aufbau

| Ordner | Inhalt |
|---|---|
| `js/hoai/` | Rechenkern: Honorartafeln, Leistungsbilder, Geldrundung, Ermittlung, Abrechnung |
| `js/beleg/` | Beleg als druckfertiges HTML, Corporate Design, Pflichtangabenprüfung |
| `js/ansichten/` | Oberfläche: Belegliste, Assistent, Vertragsformular, Stammdaten, Einstellungen |
| `js/db.js` | IndexedDB und Sicherung |
| `js/vorgang.js` | Nummernvergabe, Vertragsversionen, Festschreiben, Storno |

Kein Framework, keine Abhängigkeiten, keine Bauwerkzeuge — reine ES-Module.

### Corporate Design

Anpassbar ist die Erscheinung, nicht die Struktur: Wortmarke, Disziplinzeile,
Farben, Schriftfamilien, Satzspiegel — alles in `js/beleg/cd.js`. Wer einzelne
Felder frei positionieren könnte, erzeugte früher oder später eine Rechnung, der
eine Pflichtangabe fehlt.

Der Beleg folgt DIN 5008 Form B: Anschriftfeld ab 45 mm, Falzmarken bei 105 und
210 mm, Lochmarke bei 148,5 mm.

### Fachliche Festlegungen

- **Die Honorartafeln sind in HOAI 2013 und 2021 wertgleich** — geändert hat die
  Novelle ihre Verbindlichkeit, nicht die Zahlen.
- **Gerundet wird je Position auf Cent, dann summiert.** Und kaufmännisch korrekt:
  `Math.round(x*100)/100` rundet 26.011,535 auf 26.011,53 statt 26.011,54 ab.
- **Ein Rechnungseinbehalt wird brutto vereinbart und netto abgezogen.**
- **Über die Honorartafel hinaus wird nicht extrapoliert.** Unter 25.000 € und über
  25.000.000 € anrechenbarer Kosten gibt die Verordnung nichts vor; dort ist das
  Honorar frei zu vereinbaren. Die App verweigert die Rechnung und sagt warum.
- **Abweichende Phasenbewertungen werden nicht automatisch angesetzt.** Ob ein Fall
  nach § 43 Abs. 2/3, § 51 Abs. 2–4 oder § 55 Abs. 2 vorliegt, weiß nur der Planer.

---

## Grenzen

- Angebot und Nachtrag werden noch im Rechnungslayout gesetzt; beide brauchen ein
  eigenes Blatt.
- ZUGFeRD und XRechnung fehlen.
- Kein Abgleich zwischen Geräten — die Sicherung wird von Hand übertragen.
- Mailversand kann aus dem Browser keinen Anhang mitgeben: Die App sichert die
  Datei und öffnet den Entwurf, anhängen muss der Mensch.

---

*Keine Rechtsberatung. Honorarrechnungen sollten fachlich geprüft werden;
steuerliche Fragen gehören zum Steuerberater.*
