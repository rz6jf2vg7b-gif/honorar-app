// Grundleistungen je Leistungsphase - MASCHINELL ERZEUGT.
// Erzeugt von tools/hoai_ziehen.py aus den Anlagen 10 bis 15 der HOAI.
//
// Die HOAI bewertet die Leistungsphasen in Prozent, sagt aber nichts
// darueber, wie sich der Anteil auf die einzelnen Grundleistungen
// verteilt. Diese Bewertung stammt aus der Fachliteratur (Siemon,
// Steinfort) und ist urheberrechtlich geschuetzt - sie steht deshalb
// NICHT hier. Die App liefert die amtliche Struktur; die Bewertung
// traegt der Nutzer ein und sie wird bei ihm gespeichert.

export const GRUNDLEISTUNGEN = {
 "gebaeude": {
  "anlage": "Anlage 10",
  "phasen": {
   "1": {
    "bezeichnung": "Grundlagenermittlung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Klären der Aufgabenstellung auf Grundlage der Vorgaben oder der Bedarfsplanung des Auftraggebers"
     },
     {
      "buchstabe": "b",
      "text": "Ortsbesichtigung"
     },
     {
      "buchstabe": "c",
      "text": "Beraten zum gesamten Leistungs- und Untersuchungsbedarf"
     },
     {
      "buchstabe": "d",
      "text": "Formulieren der Entscheidungshilfen für die Auswahl anderer an der Planung fachlich Beteiligter"
     },
     {
      "buchstabe": "e",
      "text": "Zusammenfassen, Erläutern und Dokumentieren der Ergebnisse"
     }
    ]
   },
   "2": {
    "bezeichnung": "Vorplanung (Projekt- und Planungsvorbereitung)",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Analysieren der Grundlagen, Abstimmen der Leistungen mit den fachlich an der Planung Beteiligten"
     },
     {
      "buchstabe": "b",
      "text": "Abstimmen der Zielvorstellungen, Hinweisen auf Zielkonflikte"
     },
     {
      "buchstabe": "c",
      "text": "Erarbeiten der Vorplanung, Untersuchen, Darstellen und Bewerten von Varianten nach gleichen Anforderungen, Zeichnungen im Maßstab nach Art und Größe des Objekts"
     },
     {
      "buchstabe": "d",
      "text": "Klären und Erläutern der wesentlichen Zusammenhänge, Vorgaben und Bedingungen (zum Beispiel städtebauliche, gestalterische, funktionale, technische, wirtschaftliche, ökologische, bauphysikalische, energiewirtschaftliche, soziale, öffentlich-rechtliche)"
     },
     {
      "buchstabe": "e",
      "text": "Bereitstellen der Arbeitsergebnisse als Grundlage für die anderen an der Planung fachlich Beteiligten sowie Koordination und Integration von deren Leistungen"
     },
     {
      "buchstabe": "f",
      "text": "Vorverhandlungen über die Genehmigungsfähigkeit"
     },
     {
      "buchstabe": "g",
      "text": "Kostenschätzung nach DIN 276, Vergleich mit den finanziellen Rahmenbedingungen"
     },
     {
      "buchstabe": "h",
      "text": "Erstellen eines Terminplans mit den wesentlichen Vorgängen des Planungs- und Bauablaufs"
     },
     {
      "buchstabe": "i",
      "text": "Zusammenfassen, Erläutern und Dokumentieren der Ergebnisse"
     }
    ]
   },
   "3": {
    "bezeichnung": "Entwurfsplanung (System- und Integrationsplanung)",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Erarbeiten der Entwurfsplanung, unter weiterer Berücksichtigung der wesentlichen Zusammenhänge, Vorgaben und Bedingungen (zum Beispiel städtebauliche, gestalterische, funktionale, technische, wirtschaftliche, ökologische, soziale, öffentlich-rechtliche) auf der Grundlage der Vorplanung und als Grundlage für die weiteren Leistungsphasen und die erforderlichen öffentlich-rechtlichen Genehmigungen unter Verwendung der Beiträge anderer an der Planung fachlich Beteiligter. Zeichnungen nach Art und Größe des Objekts im erforderlichen Umfang und Detaillierungsgrad unter Berücksichtigung aller fachspezifischen Anforderungen, zum Beispiel bei Gebäuden im Maßstab 1:100, zum Beispiel bei Innenräumen im Maßstab 1:50 bis 1:20"
     },
     {
      "buchstabe": "b",
      "text": "Bereitstellen der Arbeitsergebnisse als Grundlage für die anderen an der Planung fachlich Beteiligten sowie Koordination und Integration von deren Leistungen"
     },
     {
      "buchstabe": "c",
      "text": "Objektbeschreibung"
     },
     {
      "buchstabe": "d",
      "text": "Verhandlungen über die Genehmigungsfähigkeit"
     },
     {
      "buchstabe": "e",
      "text": "Kostenberechnung nach DIN 276 und Vergleich mit der Kostenschätzung"
     },
     {
      "buchstabe": "f",
      "text": "Fortschreiben des Terminplans"
     },
     {
      "buchstabe": "g",
      "text": "Zusammenfassen, Erläutern und Dokumentieren der Ergebnisse"
     }
    ]
   },
   "4": {
    "bezeichnung": "Genehmigungsplanung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Erarbeiten und Zusammenstellen der Vorlagen und Nachweise für öffentlich-rechtliche Genehmigungen oder Zustimmungen einschließlich der Anträge auf Ausnahmen und Befreiungen, sowie notwendiger Verhandlungen mit Behörden unter Verwendung der Beiträge anderer an der Planung fachlich Beteiligter"
     },
     {
      "buchstabe": "b",
      "text": "Einreichen der Vorlagen"
     },
     {
      "buchstabe": "c",
      "text": "Ergänzen und Anpassen der Planungsunterlagen, Beschreibungen und Berechnungen"
     }
    ]
   },
   "5": {
    "bezeichnung": "Ausführungsplanung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Erarbeiten der Ausführungsplanung mit allen für die Ausführung notwendigen Einzelangaben (zeichnerisch und textlich) auf der Grundlage der Entwurfs- und Genehmigungsplanung bis zur ausführungsreifen Lösung, als Grundlage für die weiteren Leistungsphasen"
     },
     {
      "buchstabe": "b",
      "text": "Ausführungs-, Detail- und Konstruktionszeichnungen nach Art und Größe des Objekts im erforderlichen Umfang und Detaillierungsgrad unter Berücksichtigung aller fachspezifischen Anforderungen, zum Beispiel bei Gebäuden im Maßstab 1:50 bis 1:1, zum Beispiel bei Innenräumen im Maßstab 1:20 bis 1:1"
     },
     {
      "buchstabe": "c",
      "text": "Bereitstellen der Arbeitsergebnisse als Grundlage für die anderen an der Planung fachlich Beteiligten, sowie Koordination und Integration von deren Leistungen"
     },
     {
      "buchstabe": "d",
      "text": "Fortschreiben des Terminplans"
     },
     {
      "buchstabe": "e",
      "text": "Fortschreiben der Ausführungsplanung auf Grund der gewerkeorientierten Bearbeitung während der Objektausführung"
     },
     {
      "buchstabe": "f",
      "text": "Überprüfen erforderlicher Montagepläne der vom Objektplaner geplanten Baukonstruktionen und baukonstruktiven Einbauten auf Übereinstimmung mit der Ausführungsplanung"
     }
    ]
   },
   "6": {
    "bezeichnung": "Vorbereitung der Vergabe",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Aufstellen eines Vergabeterminplans"
     },
     {
      "buchstabe": "b",
      "text": "Aufstellen von Leistungsbeschreibungen mit Leistungsverzeichnissen nach Leistungsbereichen, Ermitteln und Zusammenstellen von Mengen auf der Grundlage der Ausführungsplanung unter Verwendung der Beiträge anderer an der Planung fachlich Beteiligter"
     },
     {
      "buchstabe": "c",
      "text": "Abstimmen und Koordinieren der Schnittstellen zu den Leistungsbeschreibungen der an der Planung fachlich Beteiligten"
     },
     {
      "buchstabe": "d",
      "text": "Ermitteln der Kosten auf der Grundlage vom Planer bepreister Leistungsverzeichnisse"
     },
     {
      "buchstabe": "e",
      "text": "Kostenkontrolle durch Vergleich der vom Planer bepreisten Leistungsverzeichnisse mit der Kostenberechnung"
     },
     {
      "buchstabe": "f",
      "text": "Zusammenstellen der Vergabeunterlagen für alle Leistungsbereiche"
     }
    ]
   },
   "7": {
    "bezeichnung": "Mitwirkung bei der Vergabe",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Koordinieren der Vergaben der Fachplaner"
     },
     {
      "buchstabe": "b",
      "text": "Einholen von Angeboten"
     },
     {
      "buchstabe": "c",
      "text": "Prüfen und Werten der Angebote einschließlich Aufstellen eines Preisspiegels nach Einzelpositionen oder Teilleistungen, Prüfen und Werten der Angebote zusätzlicher und geänderter Leistungen der ausführenden Unternehmen und der Angemessenheit der Preise"
     },
     {
      "buchstabe": "d",
      "text": "Führen von Bietergesprächen"
     },
     {
      "buchstabe": "e",
      "text": "Erstellen der Vergabevorschläge, Dokumentation des Vergabeverfahrens"
     },
     {
      "buchstabe": "f",
      "text": "Zusammenstellen der Vertragsunterlagen für alle Leistungsbereiche"
     },
     {
      "buchstabe": "g",
      "text": "Vergleichen der Ausschreibungsergebnisse mit den vom Planer bepreisten Leistungsverzeichnissen oder der Kostenberechnung"
     },
     {
      "buchstabe": "h",
      "text": "Mitwirken bei der Auftragserteilung"
     }
    ]
   },
   "8": {
    "bezeichnung": "Objektüberwachung (Bauüberwachung) und Dokumentation",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Überwachen der Ausführung des Objektes auf Übereinstimmung mit der öffentlich-rechtlichen Genehmigung oder Zustimmung, den Verträgen mit ausführenden Unternehmen, den Ausführungsunterlagen, den einschlägigen Vorschriften sowie mit den allgemein anerkannten Regeln der Technik"
     },
     {
      "buchstabe": "b",
      "text": "Überwachen der Ausführung von Tragwerken mit sehr geringen und geringen Planungsanforderungen auf Übereinstimmung mit dem Standsicherheitsnachweis"
     },
     {
      "buchstabe": "c",
      "text": "Koordinieren der an der Objektüberwachung fachlich Beteiligten"
     },
     {
      "buchstabe": "d",
      "text": "Aufstellen, Fortschreiben und Überwachen eines Terminplans (Balkendiagramm)"
     },
     {
      "buchstabe": "e",
      "text": "Dokumentation des Bauablaufs (zum Beispiel Bautagebuch)"
     },
     {
      "buchstabe": "f",
      "text": "Gemeinsames Aufmaß mit den ausführenden Unternehmen"
     },
     {
      "buchstabe": "g",
      "text": "Rechnungsprüfung einschließlich Prüfen der Aufmaße der bauausführenden Unternehmen"
     },
     {
      "buchstabe": "h",
      "text": "Vergleich der Ergebnisse der Rechnungsprüfungen mit den Auftragssummen einschließlich Nachträgen"
     },
     {
      "buchstabe": "i",
      "text": "Kostenkontrolle durch Überprüfen der Leistungsabrechnung der bauausführenden Unternehmen im Vergleich zu den Vertragspreisen"
     },
     {
      "buchstabe": "j",
      "text": "Kostenfeststellung, zum Beispiel nach DIN 276"
     },
     {
      "buchstabe": "k",
      "text": "Organisation der Abnahme der Bauleistungen unter Mitwirkung anderer an der Planung und Objektüberwachung fachlich Beteiligter, Feststellung von Mängeln, Abnahmeempfehlung für den Auftraggeber"
     },
     {
      "buchstabe": "l",
      "text": "Antrag auf öffentlich-rechtliche Abnahmen und Teilnahme daran"
     },
     {
      "buchstabe": "m",
      "text": "Systematische Zusammenstellung der Dokumentation, zeichnerischen Darstellungen und rechnerischen Ergebnisse des Objekts"
     },
     {
      "buchstabe": "n",
      "text": "Übergabe des Objekts"
     },
     {
      "buchstabe": "o",
      "text": "Auflisten der Verjährungsfristen für Mängelansprüche"
     },
     {
      "buchstabe": "p",
      "text": "Überwachen der Beseitigung der bei der Abnahme festgestellten Mängel"
     }
    ]
   },
   "9": {
    "bezeichnung": "Objektbetreuung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Fachliche Bewertung der innerhalb der Verjährungsfristen für Gewährleistungsansprüche festgestellten Mängel, längstens jedoch bis zum Ablauf von fünf Jahren seit Abnahme der Leistung, einschließlich notwendiger Begehungen"
     },
     {
      "buchstabe": "b",
      "text": "Objektbegehung zur Mängelfeststellung vor Ablauf der Verjährungsfristen für Mängelansprüche gegenüber den ausführenden Unternehmen"
     },
     {
      "buchstabe": "c",
      "text": "Mitwirken bei der Freigabe von Sicherheitsleistungen"
     }
    ]
   }
  }
 },
 "innenraeume": {
  "anlage": "Anlage 10",
  "phasen": {
   "1": {
    "bezeichnung": "Grundlagenermittlung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Klären der Aufgabenstellung auf Grundlage der Vorgaben oder der Bedarfsplanung des Auftraggebers"
     },
     {
      "buchstabe": "b",
      "text": "Ortsbesichtigung"
     },
     {
      "buchstabe": "c",
      "text": "Beraten zum gesamten Leistungs- und Untersuchungsbedarf"
     },
     {
      "buchstabe": "d",
      "text": "Formulieren der Entscheidungshilfen für die Auswahl anderer an der Planung fachlich Beteiligter"
     },
     {
      "buchstabe": "e",
      "text": "Zusammenfassen, Erläutern und Dokumentieren der Ergebnisse"
     }
    ]
   },
   "2": {
    "bezeichnung": "Vorplanung (Projekt- und Planungsvorbereitung)",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Analysieren der Grundlagen, Abstimmen der Leistungen mit den fachlich an der Planung Beteiligten"
     },
     {
      "buchstabe": "b",
      "text": "Abstimmen der Zielvorstellungen, Hinweisen auf Zielkonflikte"
     },
     {
      "buchstabe": "c",
      "text": "Erarbeiten der Vorplanung, Untersuchen, Darstellen und Bewerten von Varianten nach gleichen Anforderungen, Zeichnungen im Maßstab nach Art und Größe des Objekts"
     },
     {
      "buchstabe": "d",
      "text": "Klären und Erläutern der wesentlichen Zusammenhänge, Vorgaben und Bedingungen (zum Beispiel städtebauliche, gestalterische, funktionale, technische, wirtschaftliche, ökologische, bauphysikalische, energiewirtschaftliche, soziale, öffentlich-rechtliche)"
     },
     {
      "buchstabe": "e",
      "text": "Bereitstellen der Arbeitsergebnisse als Grundlage für die anderen an der Planung fachlich Beteiligten sowie Koordination und Integration von deren Leistungen"
     },
     {
      "buchstabe": "f",
      "text": "Vorverhandlungen über die Genehmigungsfähigkeit"
     },
     {
      "buchstabe": "g",
      "text": "Kostenschätzung nach DIN 276, Vergleich mit den finanziellen Rahmenbedingungen"
     },
     {
      "buchstabe": "h",
      "text": "Erstellen eines Terminplans mit den wesentlichen Vorgängen des Planungs- und Bauablaufs"
     },
     {
      "buchstabe": "i",
      "text": "Zusammenfassen, Erläutern und Dokumentieren der Ergebnisse"
     }
    ]
   },
   "3": {
    "bezeichnung": "Entwurfsplanung (System- und Integrationsplanung)",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Erarbeiten der Entwurfsplanung, unter weiterer Berücksichtigung der wesentlichen Zusammenhänge, Vorgaben und Bedingungen (zum Beispiel städtebauliche, gestalterische, funktionale, technische, wirtschaftliche, ökologische, soziale, öffentlich-rechtliche) auf der Grundlage der Vorplanung und als Grundlage für die weiteren Leistungsphasen und die erforderlichen öffentlich-rechtlichen Genehmigungen unter Verwendung der Beiträge anderer an der Planung fachlich Beteiligter. Zeichnungen nach Art und Größe des Objekts im erforderlichen Umfang und Detaillierungsgrad unter Berücksichtigung aller fachspezifischen Anforderungen, zum Beispiel bei Gebäuden im Maßstab 1:100, zum Beispiel bei Innenräumen im Maßstab 1:50 bis 1:20"
     },
     {
      "buchstabe": "b",
      "text": "Bereitstellen der Arbeitsergebnisse als Grundlage für die anderen an der Planung fachlich Beteiligten sowie Koordination und Integration von deren Leistungen"
     },
     {
      "buchstabe": "c",
      "text": "Objektbeschreibung"
     },
     {
      "buchstabe": "d",
      "text": "Verhandlungen über die Genehmigungsfähigkeit"
     },
     {
      "buchstabe": "e",
      "text": "Kostenberechnung nach DIN 276 und Vergleich mit der Kostenschätzung"
     },
     {
      "buchstabe": "f",
      "text": "Fortschreiben des Terminplans"
     },
     {
      "buchstabe": "g",
      "text": "Zusammenfassen, Erläutern und Dokumentieren der Ergebnisse"
     }
    ]
   },
   "4": {
    "bezeichnung": "Genehmigungsplanung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Erarbeiten und Zusammenstellen der Vorlagen und Nachweise für öffentlich-rechtliche Genehmigungen oder Zustimmungen einschließlich der Anträge auf Ausnahmen und Befreiungen, sowie notwendiger Verhandlungen mit Behörden unter Verwendung der Beiträge anderer an der Planung fachlich Beteiligter"
     },
     {
      "buchstabe": "b",
      "text": "Einreichen der Vorlagen"
     },
     {
      "buchstabe": "c",
      "text": "Ergänzen und Anpassen der Planungsunterlagen, Beschreibungen und Berechnungen"
     }
    ]
   },
   "5": {
    "bezeichnung": "Ausführungsplanung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Erarbeiten der Ausführungsplanung mit allen für die Ausführung notwendigen Einzelangaben (zeichnerisch und textlich) auf der Grundlage der Entwurfs- und Genehmigungsplanung bis zur ausführungsreifen Lösung, als Grundlage für die weiteren Leistungsphasen"
     },
     {
      "buchstabe": "b",
      "text": "Ausführungs-, Detail- und Konstruktionszeichnungen nach Art und Größe des Objekts im erforderlichen Umfang und Detaillierungsgrad unter Berücksichtigung aller fachspezifischen Anforderungen, zum Beispiel bei Gebäuden im Maßstab 1:50 bis 1:1, zum Beispiel bei Innenräumen im Maßstab 1:20 bis 1:1"
     },
     {
      "buchstabe": "c",
      "text": "Bereitstellen der Arbeitsergebnisse als Grundlage für die anderen an der Planung fachlich Beteiligten, sowie Koordination und Integration von deren Leistungen"
     },
     {
      "buchstabe": "d",
      "text": "Fortschreiben des Terminplans"
     },
     {
      "buchstabe": "e",
      "text": "Fortschreiben der Ausführungsplanung auf Grund der gewerkeorientierten Bearbeitung während der Objektausführung"
     },
     {
      "buchstabe": "f",
      "text": "Überprüfen erforderlicher Montagepläne der vom Objektplaner geplanten Baukonstruktionen und baukonstruktiven Einbauten auf Übereinstimmung mit der Ausführungsplanung"
     }
    ]
   },
   "6": {
    "bezeichnung": "Vorbereitung der Vergabe",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Aufstellen eines Vergabeterminplans"
     },
     {
      "buchstabe": "b",
      "text": "Aufstellen von Leistungsbeschreibungen mit Leistungsverzeichnissen nach Leistungsbereichen, Ermitteln und Zusammenstellen von Mengen auf der Grundlage der Ausführungsplanung unter Verwendung der Beiträge anderer an der Planung fachlich Beteiligter"
     },
     {
      "buchstabe": "c",
      "text": "Abstimmen und Koordinieren der Schnittstellen zu den Leistungsbeschreibungen der an der Planung fachlich Beteiligten"
     },
     {
      "buchstabe": "d",
      "text": "Ermitteln der Kosten auf der Grundlage vom Planer bepreister Leistungsverzeichnisse"
     },
     {
      "buchstabe": "e",
      "text": "Kostenkontrolle durch Vergleich der vom Planer bepreisten Leistungsverzeichnisse mit der Kostenberechnung"
     },
     {
      "buchstabe": "f",
      "text": "Zusammenstellen der Vergabeunterlagen für alle Leistungsbereiche"
     }
    ]
   },
   "7": {
    "bezeichnung": "Mitwirkung bei der Vergabe",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Koordinieren der Vergaben der Fachplaner"
     },
     {
      "buchstabe": "b",
      "text": "Einholen von Angeboten"
     },
     {
      "buchstabe": "c",
      "text": "Prüfen und Werten der Angebote einschließlich Aufstellen eines Preisspiegels nach Einzelpositionen oder Teilleistungen, Prüfen und Werten der Angebote zusätzlicher und geänderter Leistungen der ausführenden Unternehmen und der Angemessenheit der Preise"
     },
     {
      "buchstabe": "d",
      "text": "Führen von Bietergesprächen"
     },
     {
      "buchstabe": "e",
      "text": "Erstellen der Vergabevorschläge, Dokumentation des Vergabeverfahrens"
     },
     {
      "buchstabe": "f",
      "text": "Zusammenstellen der Vertragsunterlagen für alle Leistungsbereiche"
     },
     {
      "buchstabe": "g",
      "text": "Vergleichen der Ausschreibungsergebnisse mit den vom Planer bepreisten Leistungsverzeichnissen oder der Kostenberechnung"
     },
     {
      "buchstabe": "h",
      "text": "Mitwirken bei der Auftragserteilung"
     }
    ]
   },
   "8": {
    "bezeichnung": "Objektüberwachung (Bauüberwachung) und Dokumentation",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Überwachen der Ausführung des Objektes auf Übereinstimmung mit der öffentlich-rechtlichen Genehmigung oder Zustimmung, den Verträgen mit ausführenden Unternehmen, den Ausführungsunterlagen, den einschlägigen Vorschriften sowie mit den allgemein anerkannten Regeln der Technik"
     },
     {
      "buchstabe": "b",
      "text": "Überwachen der Ausführung von Tragwerken mit sehr geringen und geringen Planungsanforderungen auf Übereinstimmung mit dem Standsicherheitsnachweis"
     },
     {
      "buchstabe": "c",
      "text": "Koordinieren der an der Objektüberwachung fachlich Beteiligten"
     },
     {
      "buchstabe": "d",
      "text": "Aufstellen, Fortschreiben und Überwachen eines Terminplans (Balkendiagramm)"
     },
     {
      "buchstabe": "e",
      "text": "Dokumentation des Bauablaufs (zum Beispiel Bautagebuch)"
     },
     {
      "buchstabe": "f",
      "text": "Gemeinsames Aufmaß mit den ausführenden Unternehmen"
     },
     {
      "buchstabe": "g",
      "text": "Rechnungsprüfung einschließlich Prüfen der Aufmaße der bauausführenden Unternehmen"
     },
     {
      "buchstabe": "h",
      "text": "Vergleich der Ergebnisse der Rechnungsprüfungen mit den Auftragssummen einschließlich Nachträgen"
     },
     {
      "buchstabe": "i",
      "text": "Kostenkontrolle durch Überprüfen der Leistungsabrechnung der bauausführenden Unternehmen im Vergleich zu den Vertragspreisen"
     },
     {
      "buchstabe": "j",
      "text": "Kostenfeststellung, zum Beispiel nach DIN 276"
     },
     {
      "buchstabe": "k",
      "text": "Organisation der Abnahme der Bauleistungen unter Mitwirkung anderer an der Planung und Objektüberwachung fachlich Beteiligter, Feststellung von Mängeln, Abnahmeempfehlung für den Auftraggeber"
     },
     {
      "buchstabe": "l",
      "text": "Antrag auf öffentlich-rechtliche Abnahmen und Teilnahme daran"
     },
     {
      "buchstabe": "m",
      "text": "Systematische Zusammenstellung der Dokumentation, zeichnerischen Darstellungen und rechnerischen Ergebnisse des Objekts"
     },
     {
      "buchstabe": "n",
      "text": "Übergabe des Objekts"
     },
     {
      "buchstabe": "o",
      "text": "Auflisten der Verjährungsfristen für Mängelansprüche"
     },
     {
      "buchstabe": "p",
      "text": "Überwachen der Beseitigung der bei der Abnahme festgestellten Mängel"
     }
    ]
   },
   "9": {
    "bezeichnung": "Objektbetreuung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Fachliche Bewertung der innerhalb der Verjährungsfristen für Gewährleistungsansprüche festgestellten Mängel, längstens jedoch bis zum Ablauf von fünf Jahren seit Abnahme der Leistung, einschließlich notwendiger Begehungen"
     },
     {
      "buchstabe": "b",
      "text": "Objektbegehung zur Mängelfeststellung vor Ablauf der Verjährungsfristen für Mängelansprüche gegenüber den ausführenden Unternehmen"
     },
     {
      "buchstabe": "c",
      "text": "Mitwirken bei der Freigabe von Sicherheitsleistungen"
     }
    ]
   }
  }
 },
 "freianlagen": {
  "anlage": "Anlage 11",
  "phasen": {
   "1": {
    "bezeichnung": "Grundlagenermittlung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Klären der Aufgabenstellung auf Grund der Vorgaben oder der Bedarfsplanung des Auftraggebers oder vorliegender Planungs- und Genehmigungsunterlagen"
     },
     {
      "buchstabe": "b",
      "text": "Ortsbesichtigung"
     },
     {
      "buchstabe": "c",
      "text": "Beraten zum gesamten Leistungs- und Untersuchungsbedarf"
     },
     {
      "buchstabe": "d",
      "text": "Formulieren von Entscheidungshilfen für die Auswahl anderer an der Planung fachlich Beteiligter"
     },
     {
      "buchstabe": "e",
      "text": "Zusammenfassen, Erläutern und Dokumentieren der Ergebnisse"
     }
    ]
   },
   "2": {
    "bezeichnung": "Vorplanung (Projekt- und Planungsvorbereitung)",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Analysieren der Grundlagen, Abstimmen der Leistungen mit den fachlich an der Planung Beteiligten"
     },
     {
      "buchstabe": "b",
      "text": "Abstimmen der Zielvorstellungen"
     },
     {
      "buchstabe": "c",
      "text": "Erfassen, Bewerten und Erläutern der Wechselwirkungen im Ökosystem"
     },
     {
      "buchstabe": "d",
      "text": "Erarbeiten eines Planungskonzepts einschließlich Untersuchen und Bewerten von Varianten nach gleichen Anforderungen unter Berücksichtigung zum Beispiel –der Topographie und der weiteren standörtlichen und ökologischen Rahmenbedingungen,–der Umweltbelange einschließlich der natur- und artenschutzrechtlichen Anforderungen und der vegetationstechnischen Bedingungen,–der gestalterischen und funktionalen Anforderungen,–Klären der wesentlichen Zusammenhänge, Vorgänge und Bedingungen,–Abstimmen oder Koordinieren unter Integration der Beiträge anderer an der Planung fachlich Beteiligter"
     },
     {
      "buchstabe": "–",
      "text": "der Topographie und der weiteren standörtlichen und ökologischen Rahmenbedingungen,"
     },
     {
      "buchstabe": "–",
      "text": "der Umweltbelange einschließlich der natur- und artenschutzrechtlichen Anforderungen und der vegetationstechnischen Bedingungen,"
     },
     {
      "buchstabe": "–",
      "text": "der gestalterischen und funktionalen Anforderungen,"
     },
     {
      "buchstabe": "–",
      "text": "Klären der wesentlichen Zusammenhänge, Vorgänge und Bedingungen,"
     },
     {
      "buchstabe": "–",
      "text": "Abstimmen oder Koordinieren unter Integration der Beiträge anderer an der Planung fachlich Beteiligter"
     },
     {
      "buchstabe": "e",
      "text": "Darstellen des Vorentwurfs mit Erläuterungen und Angaben zum terminlichen Ablauf"
     },
     {
      "buchstabe": "f",
      "text": "Kostenschätzung, zum Beispiel nach DIN 276, Vergleich mit den finanziellen Rahmenbedingungen"
     },
     {
      "buchstabe": "g",
      "text": "Zusammenfassen, Erläutern und Dokumentieren der Vorplanungsergebnisse"
     }
    ]
   },
   "3": {
    "bezeichnung": "Entwurfsplanung (System- und Integrationsplanung)",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Erarbeiten der Entwurfsplanung auf Grundlage der Vorplanung unter Vertiefung zum Beispiel der gestalterischen, funktionalen, wirtschaftlichen, standörtlichen, ökologischen, natur- und artenschutzrechtlichen Anforderungen Abstimmen oder Koordinieren unter Integration der Beiträge anderer an der Planung fachlich Beteiligter"
     },
     {
      "buchstabe": "b",
      "text": "Abstimmen der Planung mit zu beteiligenden Stellen und Behörden"
     },
     {
      "buchstabe": "c",
      "text": "Darstellen des Entwurfs zum Beispiel im Maßstab 1:500 bis 1:100, mit erforderlichen Angaben insbesondere –zur Bepflanzung,–zu Materialien und Ausstattungen,–zu Maßnahmen auf Grund rechtlicher Vorgaben,–zum terminlichen Ablauf"
     },
     {
      "buchstabe": "–",
      "text": "zur Bepflanzung,"
     },
     {
      "buchstabe": "–",
      "text": "zu Materialien und Ausstattungen,"
     },
     {
      "buchstabe": "–",
      "text": "zu Maßnahmen auf Grund rechtlicher Vorgaben,"
     },
     {
      "buchstabe": "–",
      "text": "zum terminlichen Ablauf"
     },
     {
      "buchstabe": "d",
      "text": "Objektbeschreibung mit Erläuterung von Ausgleichs- und Ersatzmaßnahmen nach Maßgabe der naturschutzrechtlichen Eingriffsregelung"
     },
     {
      "buchstabe": "e",
      "text": "Kostenberechnung, zum Beispiel nach DIN 276 einschließlich zugehöriger Mengenermittlung"
     },
     {
      "buchstabe": "f",
      "text": "Vergleich der Kostenberechnung mit der Kostenschätzung"
     },
     {
      "buchstabe": "g",
      "text": "Zusammenfassen, Erläutern und Dokumentieren der Entwurfsplanungsergebnisse"
     }
    ]
   },
   "4": {
    "bezeichnung": "Genehmigungsplanung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Erarbeiten und Zusammenstellen der Vorlagen und Nachweise für öffentlich-rechtliche Genehmigungen oder Zustimmungen einschließlich der Anträge auf Ausnahmen und Befreiungen sowie notwendiger Verhandlungen mit Behörden unter Verwendung der Beiträge anderer an der Planung fachlich Beteiligter"
     },
     {
      "buchstabe": "b",
      "text": "Einreichen der Vorlagen"
     },
     {
      "buchstabe": "c",
      "text": "Ergänzen und Anpassen der Planungsunterlagen, Beschreibungen und Berechnungen"
     }
    ]
   },
   "5": {
    "bezeichnung": "Ausführungsplanung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Erarbeiten der Ausführungsplanung auf Grundlage der Entwurfs- und Genehmigungsplanung bis zur ausführungsreifen Lösung als Grundlage für die weiteren Leistungsphasen"
     },
     {
      "buchstabe": "b",
      "text": "Erstellen von Plänen oder Beschreibungen, je nach Art des Bauvorhabens zum Beispiel im Maßstab 1:200 bis 1:50"
     },
     {
      "buchstabe": "c",
      "text": "Abstimmen oder Koordinieren unter Integration der Beiträge anderer an der Planung fachlich Beteiligter"
     },
     {
      "buchstabe": "d",
      "text": "Darstellen der Freianlagen mit den für die Ausführung notwendigen Angaben, Detail- oder Konstruktionszeichnungen, insbesondere –zu Oberflächenmaterial, -befestigungen und -relief,–zu ober- und unterirdischen Einbauten und Ausstattungen,–zur Vegetation mit Angaben zu Arten, Sorten und Qualitäten,–zu landschaftspflegerischen, naturschutzfachlichen oder artenschutzrechtlichen Maßnahmen"
     },
     {
      "buchstabe": "–",
      "text": "zu Oberflächenmaterial, -befestigungen und -relief,"
     },
     {
      "buchstabe": "–",
      "text": "zu ober- und unterirdischen Einbauten und Ausstattungen,"
     },
     {
      "buchstabe": "–",
      "text": "zur Vegetation mit Angaben zu Arten, Sorten und Qualitäten,"
     },
     {
      "buchstabe": "–",
      "text": "zu landschaftspflegerischen, naturschutzfachlichen oder artenschutzrechtlichen Maßnahmen"
     },
     {
      "buchstabe": "e",
      "text": "Fortschreiben der Angaben zum terminlichen Ablauf"
     },
     {
      "buchstabe": "f",
      "text": "Fortschreiben der Ausführungsplanung während der Objektausführung"
     }
    ]
   },
   "6": {
    "bezeichnung": "Vorbereitung der Vergabe",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Aufstellen von Leistungsbeschreibungen mit Leistungsverzeichnissen"
     },
     {
      "buchstabe": "b",
      "text": "Ermitteln und Zusammenstellen von Mengen auf Grundlage der Ausführungsplanung"
     },
     {
      "buchstabe": "c",
      "text": "Abstimmen oder Koordinieren der Leistungsbeschreibungen mit den an der Planung fachlich Beteiligten"
     },
     {
      "buchstabe": "d",
      "text": "Aufstellen eines Terminplans unter Berücksichtigung jahreszeitlicher, bauablaufbedingter und witterungsbedingter Erfordernisse"
     },
     {
      "buchstabe": "e",
      "text": "Ermitteln der Kosten auf Grundlage der vom Planer bepreisten Leistungsverzeichnisse"
     },
     {
      "buchstabe": "f",
      "text": "Kostenkontrolle durch Vergleich der vom Planer bepreisten Leistungsverzeichnisse mit der Kostenberechnung"
     },
     {
      "buchstabe": "g",
      "text": "Zusammenstellen der Vergabeunterlagen"
     }
    ]
   },
   "7": {
    "bezeichnung": "Mitwirkung bei der Vergabe",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Einholen von Angeboten"
     },
     {
      "buchstabe": "b",
      "text": "Prüfen und Werten der Angebote einschließlich Aufstellen eines Preisspiegels nach Einzelpositionen oder Teilleistungen, Prüfen und Werten der Angebote zusätzlicher und geänderter Leistungen der ausführenden Unternehmen und der Angemessenheit der Preise"
     },
     {
      "buchstabe": "c",
      "text": "Führen von Bietergesprächen"
     },
     {
      "buchstabe": "d",
      "text": "Erstellen der Vergabevorschläge, Dokumentation des Vergabeverfahrens"
     },
     {
      "buchstabe": "e",
      "text": "Zusammenstellen der Vertragsunterlagen"
     },
     {
      "buchstabe": "f",
      "text": "Kostenkontrolle durch Vergleichen der Ausschreibungsergebnisse mit den vom Planer bepreisten Leistungsverzeichnissen und der Kostenberechnung"
     },
     {
      "buchstabe": "g",
      "text": "Mitwirken bei der Auftragserteilung"
     }
    ]
   },
   "8": {
    "bezeichnung": "Objektüberwachung (Bauüberwachung) und Dokumentation",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Überwachen der Ausführung des Objekts auf Übereinstimmung mit der Genehmigung oder Zustimmung, den Verträgen mit ausführenden Unternehmen, den Ausführungsunterlagen, den einschlägigen Vorschriften sowie mit den allgemein anerkannten Regeln der Technik"
     },
     {
      "buchstabe": "b",
      "text": "Überprüfen von Pflanzen- und Materiallieferungen"
     },
     {
      "buchstabe": "c",
      "text": "Abstimmen mit den oder Koordinieren der an der Objektüberwachung fachlich Beteiligten"
     },
     {
      "buchstabe": "d",
      "text": "Fortschreiben und Überwachen des Terminplans unter Berücksichtigung jahreszeitlicher, bauablaufbedingter und witterungsbedingter Erfordernisse"
     },
     {
      "buchstabe": "e",
      "text": "Dokumentation des Bauablaufes (zum Beispiel Bautagebuch), Feststellen des Anwuchsergebnisses"
     },
     {
      "buchstabe": "f",
      "text": "Mitwirken beim Aufmaß mit den bauausführenden Unternehmen"
     },
     {
      "buchstabe": "g",
      "text": "Rechnungsprüfung einschließlich Prüfen der Aufmaße der ausführenden Unternehmen"
     },
     {
      "buchstabe": "h",
      "text": "Vergleich der Ergebnisse der Rechnungsprüfungen mit den Auftragssummen einschließlich Nachträgen"
     },
     {
      "buchstabe": "i",
      "text": "Organisation der Abnahme der Bauleistungen unter Mitwirkung anderer an der Planung und Objektüberwachung fachlich Beteiligter, Feststellung von Mängeln, Abnahmeempfehlung für den Auftraggeber"
     },
     {
      "buchstabe": "j",
      "text": "Antrag auf öffentlich-rechtliche Abnahmen und Teilnahme daran"
     },
     {
      "buchstabe": "k",
      "text": "Übergabe des Objekts"
     },
     {
      "buchstabe": "l",
      "text": "Überwachen der Beseitigung der bei der Abnahme festgestellten Mängel"
     },
     {
      "buchstabe": "m",
      "text": "Auflisten der Verjährungsfristen für Mängelansprüche"
     },
     {
      "buchstabe": "n",
      "text": "Überwachen der Fertigstellungspflege bei vegetationstechnischen Maßnahmen"
     },
     {
      "buchstabe": "o",
      "text": "Kostenkontrolle durch Überprüfen der Leistungsabrechnung der bauausführenden Unternehmen im Vergleich zu den Vertragspreisen"
     },
     {
      "buchstabe": "p",
      "text": "Kostenfeststellung, zum Beispiel nach DIN 276"
     },
     {
      "buchstabe": "q",
      "text": "Systematische Zusammenstellung der Dokumentation, zeichnerischen Darstellungen und rechnerischen Ergebnisse des Objekts"
     }
    ]
   },
   "9": {
    "bezeichnung": "Objektbetreuung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Fachliche Bewertung der innerhalb der Verjährungsfristen für Gewährleistungsansprüche festgestellten Mängel, längstens jedoch bis zum Ablauf von 5 Jahren seit Abnahme der Leistung, einschließlich notwendiger Begehungen"
     },
     {
      "buchstabe": "b",
      "text": "Objektbegehung zur Mängelfeststellung vor Ablauf der Verjährungsfristen für Mängelansprüche gegenüber den ausführenden Unternehmen"
     },
     {
      "buchstabe": "c",
      "text": "Mitwirken bei der Freigabe von Sicherheitsleistungen"
     }
    ]
   }
  }
 },
 "ingenieurbauwerke": {
  "anlage": "Anlage 12",
  "phasen": {
   "1": {
    "bezeichnung": "Grundlagenermittlung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Klären der Aufgabenstellung auf Grund der Vorgaben oder der Bedarfsplanung des Auftraggebers"
     },
     {
      "buchstabe": "b",
      "text": "Ermitteln der Planungsrandbedingungen sowie Beraten zum gesamten Leistungsbedarf"
     },
     {
      "buchstabe": "c",
      "text": "Formulieren von Entscheidungshilfen für die Auswahl anderer an der Planung fachlich Beteiligter"
     },
     {
      "buchstabe": "d",
      "text": "bei Objekten nach § 41 Nummer 6 und 7, die eine Tragwerksplanung erfordern: Klären der Aufgabenstellung auch auf dem Gebiet der Tragwerksplanung"
     },
     {
      "buchstabe": "e",
      "text": "Ortsbesichtigung"
     },
     {
      "buchstabe": "f",
      "text": "Zusammenfassen, Erläutern und Dokumentieren der Ergebnisse"
     }
    ]
   },
   "2": {
    "bezeichnung": "Vorplanung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Analysieren der Grundlagen"
     },
     {
      "buchstabe": "b",
      "text": "Abstimmen der Zielvorstellungen auf die öffentlich-rechtlichen Randbedingungen sowie Planungen Dritter"
     },
     {
      "buchstabe": "c",
      "text": "Untersuchen von Lösungsmöglichkeiten mit ihren Einflüssen auf bauliche und konstruktive Gestaltung, Zweckmäßigkeit, Wirtschaftlichkeit unter Beachtung der Umweltverträglichkeit"
     },
     {
      "buchstabe": "d",
      "text": "Beschaffen und Auswerten amtlicher Karten"
     },
     {
      "buchstabe": "e",
      "text": "Erarbeiten eines Planungskonzepts einschließlich Untersuchung der alternativen Lösungsmöglichkeiten nach gleichen Anforderungen mit zeichnerischer Darstellung und Bewertung unter Einarbeitung der Beiträge anderer an der Planung fachlich Beteiligter"
     },
     {
      "buchstabe": "f",
      "text": "Klären und Erläutern der wesentlichen fachspezifischen Zusammenhänge, Vorgänge und Bedingungen"
     },
     {
      "buchstabe": "g",
      "text": "Vorabstimmen mit Behörden und anderen an der Planung fachlich Beteiligten über die Genehmigungsfähigkeit, gegebenenfalls Mitwirken bei Verhandlungen über die Bezuschussung und Kostenbeteiligung"
     },
     {
      "buchstabe": "h",
      "text": "Mitwirken beim Erläutern des Planungskonzepts gegenüber Dritten an bis zu zwei Terminen"
     },
     {
      "buchstabe": "i",
      "text": "Überarbeiten des Planungskonzepts nach Bedenken und Anregungen"
     },
     {
      "buchstabe": "j",
      "text": "Kostenschätzung, Vergleich mit den finanziellen Rahmenbedingungen"
     },
     {
      "buchstabe": "k",
      "text": "Zusammenfassen, Erläutern und Dokumentieren der Ergebnisse"
     }
    ]
   },
   "3": {
    "bezeichnung": "Entwurfsplanung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Erarbeiten des Entwurfs auf Grundlage der Vorplanung durch zeichnerische Darstellung im erforderlichen Umfang und Detaillierungsgrad unter Berücksichtigung aller fachspezifischen Anforderungen, Bereitstellen der Arbeitsergebnisse als Grundlage für die anderen an der Planung fachlich Beteiligten sowie Integration und Koordination der Fachplanungen"
     },
     {
      "buchstabe": "b",
      "text": "Erläuterungsbericht unter Verwendung der Beiträge anderer an der Planung fachlich Beteiligter"
     },
     {
      "buchstabe": "c",
      "text": "fachspezifische Berechnungen ausgenommen Berechnungen aus anderen Leistungsbildern"
     },
     {
      "buchstabe": "d",
      "text": "Ermitteln und Begründen der zuwendungsfähigen Kosten, Mitwirken beim Aufstellen des Finanzierungsplans sowie Vorbereiten der Anträge auf Finanzierung"
     },
     {
      "buchstabe": "e",
      "text": "Mitwirken beim Erläutern des vorläufigen Entwurfs gegenüber Dritten an bis zu drei Terminen, Überarbeiten des vorläufigen Entwurfs auf Grund von Bedenken und Anregungen"
     },
     {
      "buchstabe": "f",
      "text": "Vorabstimmen der Genehmigungsfähigkeit mit Behörden und anderen an der Planung fachlich Beteiligten"
     },
     {
      "buchstabe": "g",
      "text": "Kostenberechnung einschließlich zugehöriger Mengenermittlung, Vergleich der Kostenberechnung mit der Kostenschätzung"
     },
     {
      "buchstabe": "h",
      "text": "Ermitteln der wesentlichen Bauphasen unter Berücksichtigung der Verkehrslenkung und der Aufrechterhaltung des Betriebes während der Bauzeit"
     },
     {
      "buchstabe": "i",
      "text": "Bauzeiten- und Kostenplan"
     },
     {
      "buchstabe": "j",
      "text": "Zusammenfassen, Erläutern und Dokumentieren der Ergebnisse"
     }
    ]
   },
   "4": {
    "bezeichnung": "Genehmigungsplanung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Erarbeiten und Zusammenstellen der Unterlagen für die erforderlichen öffentlich-rechtlichen Verfahren oder Genehmigungsverfahren einschließlich der Anträge auf Ausnahmen und Befreiungen, Aufstellen des Bauwerksverzeichnisses unter Verwendung der Beiträge anderer an der Planung fachlich Beteiligter"
     },
     {
      "buchstabe": "b",
      "text": "Erstellen des Grunderwerbsplanes und des Grunderwerbsverzeichnisses unter Verwendung der Beiträge anderer an der Planung fachlich Beteiligter"
     },
     {
      "buchstabe": "c",
      "text": "Vervollständigen und Anpassen der Planungsunterlagen, Beschreibungen und Berechnungen unter Verwendung der Beiträge anderer an der Planung fachlich Beteiligter"
     },
     {
      "buchstabe": "d",
      "text": "Abstimmen mit Behörden"
     },
     {
      "buchstabe": "e",
      "text": "Mitwirken in Genehmigungsverfahren einschließlich der Teilnahme an bis zu vier Erläuterungs-, Erörterungsterminen"
     },
     {
      "buchstabe": "f",
      "text": "Mitwirken beim Abfassen von Stellungnahmen zu Bedenken und Anregungen in bis zu zehn Kategorien"
     }
    ]
   },
   "5": {
    "bezeichnung": "Ausführungsplanung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Erarbeiten der Ausführungsplanung auf Grundlage der Ergebnisse der Leistungsphasen 3 und 4 unter Berücksichtigung aller fachspezifischen Anforderungen und Verwendung der Beiträge anderer an der Planung fachlich Beteiligter bis zur ausführungsreifen Lösung"
     },
     {
      "buchstabe": "b",
      "text": "Zeichnerische Darstellung, Erläuterungen und zur Objektplanung gehörige Berechnungen mit allen für die Ausführung notwendigen Einzelangaben einschließlich Detailzeichnungen in den erforderlichen Maßstäben"
     },
     {
      "buchstabe": "c",
      "text": "Bereitstellen der Arbeitsergebnisse als Grundlage für die anderen an der Planung fachlich Beteiligten und Integrieren ihrer Beiträge bis zur ausführungsreifen Lösung"
     },
     {
      "buchstabe": "d",
      "text": "Vervollständigen der Ausführungsplanung während der Objektausführung"
     }
    ]
   },
   "6": {
    "bezeichnung": "Vorbereiten der Vergabe",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Ermitteln von Mengen nach Einzelpositionen unter Verwendung der Beiträge anderer an der Planung fachlich Beteiligter"
     },
     {
      "buchstabe": "b",
      "text": "Aufstellen der Vergabeunterlagen, insbesondere Anfertigen der Leistungsbeschreibungen mit Leistungsverzeichnissen sowie der Besonderen Vertragsbedingungen"
     },
     {
      "buchstabe": "c",
      "text": "Abstimmen und Koordinieren der Schnittstellen zu den Leistungsbeschreibungen der anderen an der Planung fachlich Beteiligten"
     },
     {
      "buchstabe": "d",
      "text": "Festlegen der wesentlichen Ausführungsphasen"
     },
     {
      "buchstabe": "e",
      "text": "Ermitteln der Kosten auf Grundlage der vom Planer (Entwurfsverfasser) bepreisten Leistungsverzeichnisse"
     },
     {
      "buchstabe": "f",
      "text": "Kostenkontrolle durch Vergleich der vom Planer (Entwurfsverfasser) bepreisten Leistungsverzeichnisse mit der Kostenberechnung"
     },
     {
      "buchstabe": "g",
      "text": "Zusammenstellen der Vergabeunterlagen"
     }
    ]
   },
   "7": {
    "bezeichnung": "Mitwirken bei der Vergabe",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Einholen von Angeboten"
     },
     {
      "buchstabe": "b",
      "text": "Prüfen und Werten der Angebote, Aufstellen des Preisspiegels"
     },
     {
      "buchstabe": "c",
      "text": "Abstimmen und Zusammenstellen der Leistungen der fachlich Beteiligten, die an der Vergabe mitwirken"
     },
     {
      "buchstabe": "d",
      "text": "Führen von Bietergesprächen"
     },
     {
      "buchstabe": "e",
      "text": "Erstellen der Vergabevorschläge, Dokumentation des Vergabeverfahrens"
     },
     {
      "buchstabe": "f",
      "text": "Zusammenstellen der Vertragsunterlagen"
     },
     {
      "buchstabe": "g",
      "text": "Vergleichen der Ausschreibungsergebnisse mit den vom Planer bepreisten Leistungsverzeichnissen und der Kostenberechnung"
     },
     {
      "buchstabe": "h",
      "text": "Mitwirken bei der Auftragserteilung"
     }
    ]
   },
   "8": {
    "bezeichnung": "Bauoberleitung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Aufsicht über die örtliche Bauüberwachung, Koordinierung der an der Objektüberwachung fachlich Beteiligten, einmaliges Prüfen von Plänen auf Übereinstimmung mit dem auszuführenden Objekt und Mitwirken bei deren Freigabe"
     },
     {
      "buchstabe": "b",
      "text": "Aufstellen, Fortschreiben und Überwachen eines Terminplans (Balkendiagramm)"
     },
     {
      "buchstabe": "c",
      "text": "Veranlassen und Mitwirken beim Inverzugsetzen der ausführenden Unternehmen"
     },
     {
      "buchstabe": "d",
      "text": "Kostenfeststellung, Vergleich der Kostenfeststellung mit der Auftragssumme"
     },
     {
      "buchstabe": "e",
      "text": "Abnahme von Bauleistungen, Leistungen und Lieferungen unter Mitwirkung der örtlichen Bauüberwachung und anderer an der Planung und Objektüberwachung fachlich Beteiligter, Feststellen von Mängeln, Fertigung einer Niederschrift über das Ergebnis der Abnahme"
     },
     {
      "buchstabe": "f",
      "text": "Überwachen der Prüfungen der Funktionsfähigkeit der Anlagenteile und der Gesamtanlage"
     },
     {
      "buchstabe": "g",
      "text": "Antrag auf behördliche Abnahmen und Teilnahme daran"
     },
     {
      "buchstabe": "h",
      "text": "Übergabe des Objekts"
     },
     {
      "buchstabe": "i",
      "text": "Auflisten der Verjährungsfristen der Mängelansprüche"
     },
     {
      "buchstabe": "j",
      "text": "Zusammenstellen und Übergeben der Dokumentation des Bauablaufs, der Bestandsunterlagen und der Wartungsvorschriften"
     }
    ]
   },
   "9": {
    "bezeichnung": "Objektbetreuung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Fachliche Bewertung der innerhalb der Verjährungsfristen für Gewährleistungsansprüche festgestellten Mängel, längstens jedoch bis zum Ablauf von fünf Jahren seit Abnahme der Leistung, einschließlich notwendiger Begehungen"
     },
     {
      "buchstabe": "b",
      "text": "Objektbegehung zur Mängelfeststellung vor Ablauf der Verjährungsfristen für Mängelansprüche gegenüber den ausführenden Unternehmen"
     },
     {
      "buchstabe": "c",
      "text": "Mitwirken bei der Freigabe von Sicherheitsleistungen"
     }
    ]
   }
  }
 },
 "verkehrsanlagen": {
  "anlage": "Anlage 13",
  "phasen": {
   "1": {
    "bezeichnung": "Grundlagenermittlung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Klären der Aufgabenstellung auf Grund der Vorgaben oder der Bedarfsplanung des Auftraggebers"
     },
     {
      "buchstabe": "b",
      "text": "Ermitteln der Planungsrandbedingungen sowie Beraten zum gesamten Leistungsbedarf"
     },
     {
      "buchstabe": "c",
      "text": "Formulieren von Entscheidungshilfen für die Auswahl anderer an der Planung fachlich Beteiligter"
     },
     {
      "buchstabe": "d",
      "text": "Ortsbesichtigung"
     },
     {
      "buchstabe": "e",
      "text": "Zusammenfassen, Erläutern und Dokumentieren der Ergebnisse"
     }
    ]
   },
   "2": {
    "bezeichnung": "Vorplanung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Beschaffen und Auswerten amtlicher Karten"
     },
     {
      "buchstabe": "b",
      "text": "Analysieren der Grundlagen"
     },
     {
      "buchstabe": "c",
      "text": "Abstimmen der Zielvorstellungen auf die öffentlich-rechtlichen Randbedingungen sowie Planungen Dritter"
     },
     {
      "buchstabe": "d",
      "text": "Untersuchen von Lösungsmöglichkeiten mit ihren Einflüssen auf bauliche und konstruktive Gestaltung, Zweckmäßigkeit, Wirtschaftlichkeit unter Beachtung der Umweltverträglichkeit"
     },
     {
      "buchstabe": "e",
      "text": "Erarbeiten eines Planungskonzepts einschließlich Untersuchung von bis zu 3 Varianten nach gleichen Anforderungen mit zeichnerischer Darstellung und Bewertung unter Einarbeitung der Beiträge anderer an der Planung fachlich Beteiligter Überschlägige verkehrstechnische Bemessung der Verkehrsanlage, Ermitteln der Schallimmissionen von der Verkehrsanlage an kritischen Stellen nach Tabellenwerten Untersuchen der möglichen Schallschutzmaßnahmen, ausgenommen detaillierte schalltechnische Untersuchungen"
     },
     {
      "buchstabe": "f",
      "text": "Klären und Erläutern der wesentlichen fachspezifischen Zusammenhänge, Vorgänge und Bedingungen"
     },
     {
      "buchstabe": "g",
      "text": "Vorabstimmen mit Behörden und anderen an der Planung fachlich Beteiligten über die Genehmigungsfähigkeit, gegebenenfalls Mitwirken bei Verhandlungen über die Bezuschussung und Kostenbeteiligung"
     },
     {
      "buchstabe": "h",
      "text": "Mitwirken bei Erläutern des Planungskonzepts gegenüber Dritten an bis zu 2 Terminen"
     },
     {
      "buchstabe": "i",
      "text": "Überarbeiten des Planungskonzepts nach Bedenken und Anregungen"
     },
     {
      "buchstabe": "j",
      "text": "Bereitstellen von Unterlagen als Auszüge aus der Voruntersuchung zur Verwendung für eine Raumverträglichkeitsprüfung"
     },
     {
      "buchstabe": "k",
      "text": "Kostenschätzung, Vergleich mit den finanziellen Rahmenbedingungen"
     },
     {
      "buchstabe": "l",
      "text": "Zusammenfassen, Erläutern und Dokumentieren"
     }
    ]
   },
   "3": {
    "bezeichnung": "Entwurfsplanung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Erarbeiten des Entwurfs auf Grundlage der Vorplanung durch zeichnerische Darstellung im erforderlichen Umfang und Detaillierungsgrad unter Berücksichtigung aller fachspezifischen Anforderungen Bereitstellen der Arbeitsergebnisse als Grundlage für die anderen an der Planung fachlich Beteiligten, sowie Integration und Koordination der Fachplanungen"
     },
     {
      "buchstabe": "b",
      "text": "Erläuterungsbericht unter Verwendung der Beiträge anderer an der Planung fachlich Beteiligter"
     },
     {
      "buchstabe": "c",
      "text": "Fachspezifische Berechnungen ausgenommen Berechnungen aus anderen Leistungsbildern"
     },
     {
      "buchstabe": "d",
      "text": "Ermitteln der zuwendungsfähigen Kosten, Mitwirken beim Aufstellen des Finanzierungsplans sowie Vorbereiten der Anträge auf Finanzierung"
     },
     {
      "buchstabe": "e",
      "text": "Mitwirken beim Erläutern des vorläufigen Entwurfs gegenüber Dritten an bis zu drei Terminen, Überarbeiten des vorläufigen Entwurfs auf Grund von Bedenken und Anregungen"
     },
     {
      "buchstabe": "f",
      "text": "Vorabstimmen der Genehmigungsfähigkeit mit Behörden und anderen an der Planung fachlich Beteiligten"
     },
     {
      "buchstabe": "g",
      "text": "Kostenberechnung einschließlich zugehöriger Mengenermittlung, Vergleich der Kostenberechnung mit der Kostenschätzung"
     },
     {
      "buchstabe": "h",
      "text": "Überschlägige Festlegung der Abmessungen von Ingenieurbauwerken"
     },
     {
      "buchstabe": "i",
      "text": "Ermitteln der Schallimmissionen von der Verkehrsanlage nach Tabellenwerten; Festlegen der erforderlichen Schallschutzmaßnahmen an der Verkehrsanlage, gegebenenfalls unter Einarbeitung der Ergebnisse detaillierter schalltechnischer Untersuchungen und Feststellen der Notwendigkeit von Schallschutzmaßnahmen an betroffenen Gebäuden"
     },
     {
      "buchstabe": "j",
      "text": "Rechnerische Festlegung des Objekts"
     },
     {
      "buchstabe": "k",
      "text": "Darlegen der Auswirkungen auf Zwangspunkte"
     },
     {
      "buchstabe": "l",
      "text": "Nachweis der Lichtraumprofile"
     },
     {
      "buchstabe": "m",
      "text": "Ermitteln der wesentlichen Bauphasen unter Berücksichtigung der Verkehrslenkung und der Aufrechterhaltung des Betriebs während der Bauzeit"
     },
     {
      "buchstabe": "n",
      "text": "Bauzeiten- und Kostenplan"
     },
     {
      "buchstabe": "o",
      "text": "Zusammenfassen, Erläutern und Dokumentieren der Ergebnisse"
     }
    ]
   },
   "4": {
    "bezeichnung": "Genehmigungsplanung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Erarbeiten und Zusammenstellen der Unterlagen für die erforderlichen öffentlich-rechtlichen Verfahren oder Genehmigungsverfahren einschließlich der Anträge auf Ausnahmen und Befreiungen, Aufstellen des Bauwerksverzeichnisses unter Verwendung der Beiträge anderer an der Planung fachlich Beteiligter"
     },
     {
      "buchstabe": "b",
      "text": "Erstellen des Grunderwerbsplans und des Grunderwerbsverzeichnisses unter Verwendung der Beiträge anderer an der Planung fachlich Beteiligter"
     },
     {
      "buchstabe": "c",
      "text": "Vervollständigen und Anpassen der Planungsunterlagen, Beschreibungen und Berechnungen unter Verwendung der Beiträge anderer an der Planung fachlich Beteiligter"
     },
     {
      "buchstabe": "d",
      "text": "Abstimmen mit Behörden"
     },
     {
      "buchstabe": "e",
      "text": "Mitwirken in Genehmigungsverfahren einschließlich der Teilnahme an bis zu vier Erläuterungs-, Erörterungsterminen"
     },
     {
      "buchstabe": "f",
      "text": "Mitwirken beim Abfassen von Stellungnahmen zu Bedenken und Anregungen in bis zu 10 Kategorien"
     }
    ]
   },
   "5": {
    "bezeichnung": "Ausführungsplanung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Erarbeiten der Ausführungsplanung auf Grundlage der Ergebnisse der Leistungsphasen 3 und 4 unter Berücksichtigung aller fachspezifischen Anforderungen und Verwendung der Beiträge anderer an der Planung fachlich Beteiligter bis zur ausführungsreifen Lösung"
     },
     {
      "buchstabe": "b",
      "text": "Zeichnerische Darstellung, Erläuterungen und zur Objektplanung gehörige Berechnungen mit allen für die Ausführung notwendigen Einzelangaben einschließlich Detailzeichnungen in den erforderlichen Maßstäben"
     },
     {
      "buchstabe": "c",
      "text": "Bereitstellen der Arbeitsergebnisse als Grundlage für die anderen an der Planung fachlich Beteiligten und Integrieren ihrer Beiträge bis zur ausführungsreifen Lösung"
     },
     {
      "buchstabe": "d",
      "text": "Vervollständigen der Ausführungsplanung während der Objektausführung"
     }
    ]
   },
   "6": {
    "bezeichnung": "Vorbereiten der Vergabe",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Ermitteln von Mengen nach Einzelpositionen unter Verwendung der Beiträge anderer an der Planung fachlich Beteiligter"
     },
     {
      "buchstabe": "b",
      "text": "Aufstellen der Vergabeunterlagen, insbesondere Anfertigen der Leistungsbeschreibungen mit Leistungsverzeichnissen sowie der Besonderen Vertragsbedingungen"
     },
     {
      "buchstabe": "c",
      "text": "Abstimmen und Koordinieren der Schnittstellen zu den Leistungsbeschreibungen der anderen an der Planung fachlich Beteiligten"
     },
     {
      "buchstabe": "d",
      "text": "Festlegen der wesentlichen Ausführungsphasen"
     },
     {
      "buchstabe": "e",
      "text": "Ermitteln der Kosten auf Grundlage der vom Planer (Entwurfsverfasser) bepreisten Leistungsverzeichnisse"
     },
     {
      "buchstabe": "f",
      "text": "Kostenkontrolle durch Vergleich der vom Planer (Entwurfsverfasser) bepreisten Leistungsverzeichnisse mit der Kostenberechnung"
     },
     {
      "buchstabe": "g",
      "text": "Zusammenstellen der Vergabeunterlagen"
     }
    ]
   },
   "7": {
    "bezeichnung": "Mitwirken bei der Vergabe",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Einholen von Angeboten"
     },
     {
      "buchstabe": "b",
      "text": "Prüfen und Werten der Angebote, Aufstellen der Preisspiegel"
     },
     {
      "buchstabe": "c",
      "text": "Abstimmen und Zusammenstellen der Leistungen der fachlich Beteiligten, die an der Vergabe mitwirken"
     },
     {
      "buchstabe": "d",
      "text": "Führen von Bietergesprächen"
     },
     {
      "buchstabe": "e",
      "text": "Erstellen der Vergabevorschläge, Dokumentation des Vergabeverfahrens"
     },
     {
      "buchstabe": "f",
      "text": "Zusammenstellen der Vertragsunterlagen"
     },
     {
      "buchstabe": "g",
      "text": "Vergleichen der Ausschreibungsergebnisse mit den vom Planer bepreisten Leistungsverzeichnissen und der Kostenberechnung"
     },
     {
      "buchstabe": "h",
      "text": "Mitwirken bei der Auftragserteilung"
     }
    ]
   },
   "8": {
    "bezeichnung": "Bauoberleitung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Aufsicht über die örtliche Bauüberwachung, Koordinierung der an der Objektüberwachung fachlich Beteiligten, einmaliges Prüfen von Plänen auf Übereinstimmung mit dem auszuführenden Objekt und Mitwirken bei deren Freigabe"
     },
     {
      "buchstabe": "b",
      "text": "Aufstellen, Fortschreiben und Überwachen eines Terminplans (Balkendiagramm)"
     },
     {
      "buchstabe": "c",
      "text": "Veranlassen und Mitwirken daran, die ausführenden Unternehmen in Verzug zu setzen"
     },
     {
      "buchstabe": "d",
      "text": "Kostenfeststellung, Vergleich der Kostenfeststellung mit der Auftragssumme"
     },
     {
      "buchstabe": "e",
      "text": "Abnahme von Bauleistungen, Leistungen und Lieferungen unter Mitwirkung der örtlichen Bauüberwachung und anderer an der Planung und Objektüberwachung fachlich Beteiligter, Feststellen von Mängeln, Fertigen einer Niederschrift über das Ergebnis der Abnahme"
     },
     {
      "buchstabe": "f",
      "text": "Antrag auf behördliche Abnahmen und Teilnahme daran"
     },
     {
      "buchstabe": "g",
      "text": "Überwachen der Prüfungen der Funktionsfähigkeit der Anlagenteile und der Gesamtanlage"
     },
     {
      "buchstabe": "h",
      "text": "Übergabe des Objekts"
     },
     {
      "buchstabe": "i",
      "text": "Auflisten der Verjährungsfristen der Mängelansprüche"
     },
     {
      "buchstabe": "j",
      "text": "Zusammenstellen und Übergeben der Dokumentation des Bauablaufs, der Bestandsunterlagen und der Wartungsvorschriften"
     }
    ]
   },
   "9": {
    "bezeichnung": "Objektbetreuung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Fachliche Bewertung der innerhalb der Verjährungsfristen für Gewährleistungsansprüche festgestellten Mängel, längstens jedoch bis zum Ablauf von fünf Jahren seit Abnahme der Leistung, einschließlich notwendiger Begehungen"
     },
     {
      "buchstabe": "b",
      "text": "Objektbegehung zur Mängelfeststellung vor Ablauf der Verjährungsfristen für Mängelansprüche gegenüber den ausführenden Unternehmen"
     },
     {
      "buchstabe": "c",
      "text": "Mitwirken bei der Freigabe von Sicherheitsleistungen"
     }
    ]
   }
  }
 },
 "tragwerksplanung": {
  "anlage": "Anlage 14",
  "phasen": {
   "1": {
    "bezeichnung": "Grundlagenermittlung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Klären der Aufgabenstellung auf Grund der Vorgaben oder der Bedarfsplanung des Auftraggebers im Benehmen mit dem Objektplaner"
     },
     {
      "buchstabe": "b",
      "text": "Zusammenstellen der die Aufgabe beeinflussenden Planungsabsichten"
     },
     {
      "buchstabe": "c",
      "text": "Zusammenfassen, Erläutern und Dokumentieren der Ergebnisse"
     }
    ]
   },
   "2": {
    "bezeichnung": "Vorplanung (Projekt- u. Planungsvorbereitung)",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Analysieren der Grundlagen"
     },
     {
      "buchstabe": "b",
      "text": "Beraten in statisch-konstruktiver Hinsicht unter Berücksichtigung der Belange der Standsicherheit, der Gebrauchsfähigkeit und der Wirtschaftlichkeit"
     },
     {
      "buchstabe": "c",
      "text": "Mitwirken bei dem Erarbeiten eines Planungskonzepts einschließlich Untersuchung der Lösungsmöglichkeiten des Tragwerks unter gleichen Objektbedingungen mit skizzenhafter Darstellung, Klärung und Angabe der für das Tragwerk wesentlichen konstruktiven Festlegungen für zum Beispiel Baustoffe, Bauarten und Herstellungsverfahren, Konstruktionsraster und Gründungsart"
     },
     {
      "buchstabe": "d",
      "text": "Mitwirken bei Vorverhandlungen mit Behörden und anderen an der Planung fachlich Beteiligten über die Genehmigungsfähigkeit"
     },
     {
      "buchstabe": "e",
      "text": "Mitwirken bei der Kostenschätzung und bei der Terminplanung"
     },
     {
      "buchstabe": "f",
      "text": "Zusammenfassen, Erläutern und Dokumentieren der Ergebnisse"
     }
    ]
   },
   "3": {
    "bezeichnung": "Entwurfsplanung (System- u. Integrationsplanung)",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Erarbeiten der Tragwerkslösung, unter Beachtung der durch die Objektplanung integrierten Fachplanungen, bis zum konstruktiven Entwurf mit zeichnerischer Darstellung"
     },
     {
      "buchstabe": "b",
      "text": "Überschlägige statische Berechnung und Bemessung"
     },
     {
      "buchstabe": "c",
      "text": "Grundlegende Festlegungen der konstruktiven Details und Hauptabmessungen des Tragwerks für zum Beispiel Gestaltung der tragenden Querschnitte, Aussparungen und Fugen; Ausbildung der Auflager- und Knotenpunkte sowie der Verbindungsmittel"
     },
     {
      "buchstabe": "d",
      "text": "Überschlägiges Ermitteln der Betonstahlmengen im Stahlbetonbau, der Stahlmengen im Stahlbau und der Holzmengen im Ingenieurholzbau"
     },
     {
      "buchstabe": "e",
      "text": "Mitwirken bei der Objektbeschreibung bzw. beim Erläuterungsbericht"
     },
     {
      "buchstabe": "f",
      "text": "Mitwirken bei Verhandlungen mit Behörden und anderen an der Planung fachlich Beteiligten über die Genehmigungsfähigkeit"
     },
     {
      "buchstabe": "g",
      "text": "Mitwirken bei der Kostenberechnung und bei der Terminplanung"
     },
     {
      "buchstabe": "h",
      "text": "Mitwirken beim Vergleich der Kostenberechnung mit der Kostenschätzung"
     },
     {
      "buchstabe": "i",
      "text": "Zusammenfassen, Erläutern und Dokumentieren der Ergebnisse"
     }
    ]
   },
   "4": {
    "bezeichnung": "Genehmigungsplanung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Aufstellen der prüffähigen statischen Berechnungen für das Tragwerk unter Berücksichtigung der vorgegebenen bauphysikalischen Anforderungen"
     },
     {
      "buchstabe": "b",
      "text": "Bei Ingenieurbauwerken: Erfassen von normalen Bauzuständen"
     },
     {
      "buchstabe": "c",
      "text": "Anfertigen der Positionspläne für das Tragwerk oder Eintragen der statischen Positionen, der Tragwerksabmessungen, der Verkehrslasten, der Art und Güte der Baustoffe und der Besonderheiten der Konstruktionen in die Entwurfszeichnungen des Objektplaners"
     },
     {
      "buchstabe": "d",
      "text": "Zusammenstellen der Unterlagen der Tragwerksplanung zur Genehmigung"
     },
     {
      "buchstabe": "e",
      "text": "Abstimmen mit Prüfämtern und Prüfingenieuren oder Eigenkontrolle"
     },
     {
      "buchstabe": "f",
      "text": "Vervollständigen und Berichtigen der Berechnungen und Pläne"
     }
    ]
   },
   "5": {
    "bezeichnung": "Ausführungsplanung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Durcharbeiten der Ergebnisse der Leistungsphasen 3 und 4 unter Beachtung der durch die Objektplanung integrierten Fachplanungen"
     },
     {
      "buchstabe": "b",
      "text": "Anfertigen der Schalpläne in Ergänzung der fertig gestellten Ausführungspläne des Objektplaners"
     },
     {
      "buchstabe": "c",
      "text": "Zeichnerische Darstellung der Konstruktionen mit Einbau- und Verlegeanweisungen, zum Beispiel Bewehrungspläne, Stahlbau- oder Holzkonstruktionspläne mit Leitdetails (keine Werkstattzeichnungen)"
     },
     {
      "buchstabe": "d",
      "text": "Aufstellen von Stahl- oder Stücklisten als Ergänzung zur zeichnerischen Darstellung der Konstruktionen mit Stahlmengenermittlung"
     },
     {
      "buchstabe": "e",
      "text": "Fortführen der Abstimmung mit Prüfämtern und Prüfingenieuren oder Eigenkontrolle"
     }
    ]
   },
   "6": {
    "bezeichnung": "Vorbereitung der Vergabe",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Ermitteln der Betonstahlmengen im Stahlbetonbau, der Stahlmengen im Stahlbau und der Holzmengen im Ingenieurholzbau als Ergebnis der Ausführungsplanung und als Beitrag zur Mengenermittlung des Objektplaners"
     },
     {
      "buchstabe": "b",
      "text": "Überschlägiges Ermitteln der Mengen der konstruktiven Stahlteile und statisch erforderlichen Verbindungs- und Befestigungsmittel im Ingenieurholzbau"
     },
     {
      "buchstabe": "c",
      "text": "Mitwirken beim Erstellen der Leistungsbeschreibung als Ergänzung zu den Mengenermittlungen als Grundlage für das Leistungsverzeichnis des Tragwerks"
     }
    ]
   },
   "7": {
    "bezeichnung": "Mitwirkung bei der Vergabe",
    "leistungen": []
   },
   "8": {
    "bezeichnung": "Objektüberwachung",
    "leistungen": []
   },
   "9": {
    "bezeichnung": "Dokumentation und Objektbetreuung",
    "leistungen": []
   }
  }
 },
 "technische_ausruestung": {
  "anlage": "Anlage 15",
  "phasen": {
   "1": {
    "bezeichnung": "Grundlagenermittlung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Klären der Aufgabenstellung auf Grund der Vorgaben oder der Bedarfsplanung des Auftraggebers im Benehmen mit dem Objektplaner"
     },
     {
      "buchstabe": "b",
      "text": "Ermitteln der Planungsrandbedingungen und Beraten zum Leistungsbedarf und gegebenenfalls zur technischen Erschließung"
     },
     {
      "buchstabe": "c",
      "text": "Zusammenfassen, Erläutern und Dokumentieren der Ergebnisse"
     }
    ]
   },
   "2": {
    "bezeichnung": "Vorplanung (Projekt- und Planungsvorbereitung)",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Analysieren der Grundlagen Mitwirken beim Abstimmen der Leistungen mit den Planungsbeteiligten"
     },
     {
      "buchstabe": "b",
      "text": "Erarbeiten eines Planungskonzepts, dazu gehören zum Beispiel: Vordimensionieren der Systeme und maßbestimmenden Anlagenteile, Untersuchen von alternativen Lösungsmöglichkeiten bei gleichen Nutzungsanforderungen einschließlich Wirtschaftlichkeitsvorbetrachtung, zeichnerische Darstellung zur Integration in die Objektplanung unter Berücksichtigung exemplarischer Details, Angaben zum Raumbedarf"
     },
     {
      "buchstabe": "c",
      "text": "Aufstellen eines Funktionsschemas bzw. Prinzipschaltbildes für jede Anlage"
     },
     {
      "buchstabe": "d",
      "text": "Klären und Erläutern der wesentlichen fachübergreifenden Prozesse, Randbedingungen und Schnittstellen, Mitwirken bei der Integration der technischen Anlagen"
     },
     {
      "buchstabe": "e",
      "text": "Vorverhandlungen mit Behörden über die Genehmigungsfähigkeit und mit den zu beteiligenden Stellen zur Infrastruktur"
     },
     {
      "buchstabe": "f",
      "text": "Kostenschätzung nach DIN 276 (2. Ebene) und Terminplanung"
     },
     {
      "buchstabe": "g",
      "text": "Zusammenfassen, Erläutern und Dokumentieren der Ergebnisse"
     }
    ]
   },
   "3": {
    "bezeichnung": "Entwurfsplanung (System- und Integrationsplanung)",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Durcharbeiten des Planungskonzepts (stufenweise Erarbeitung einer Lösung) unter Berücksichtigung aller fachspezifischen Anforderungen sowie unter Beachtung der durch die Objektplanung integrierten Fachplanungen, bis zum vollständigen Entwurf"
     },
     {
      "buchstabe": "b",
      "text": "Festlegen aller Systeme und Anlagenteile"
     },
     {
      "buchstabe": "c",
      "text": "Berechnen und Bemessen der technischen Anlagen und Anlagenteile, Abschätzen von jährlichen Bedarfswerten (z. B. Nutz-, End- und Primärenergiebedarf) und Betriebskosten; Abstimmen des Platzbedarfs für technische Anlagen und Anlagenteile; Zeichnerische Darstellung des Entwurfs in einem mit dem Objektplaner abgestimmten Ausgabemaßstab mit Angabe maßbestimmender Dimensionen Fortschreiben und Detaillieren der Funktions- und Strangschemata der Anlagen Auflisten aller Anlagen mit technischen Daten und Angaben zum Beispiel für Energiebilanzierungen Anlagenbeschreibungen mit Angabe der Nutzungsbedingungen"
     },
     {
      "buchstabe": "d",
      "text": "Übergeben der Berechnungsergebnisse an andere Planungsbeteiligte zum Aufstellen vorgeschriebener Nachweise; Angabe und Abstimmung der für die Tragwerksplanung notwendigen Angaben über Durchführungen und Lastangaben (ohne Anfertigen von Schlitz- und Durchführungsplänen)"
     },
     {
      "buchstabe": "e",
      "text": "Verhandlungen mit Behörden und mit anderen zu beteiligenden Stellen über die Genehmigungsfähigkeit"
     },
     {
      "buchstabe": "f",
      "text": "Kostenberechnung nach DIN 276 (3. Ebene) und Terminplanung"
     },
     {
      "buchstabe": "g",
      "text": "Kostenkontrolle durch Vergleich der Kostenberechnung mit der Kostenschätzung"
     },
     {
      "buchstabe": "h",
      "text": "Zusammenfassen, Erläutern und Dokumentieren der Ergebnisse"
     }
    ]
   },
   "4": {
    "bezeichnung": "Genehmigungsplanung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Erarbeiten und Zusammenstellen der Vorlagen und Nachweise für öffentlich-rechtliche Genehmigungen oder Zustimmungen einschließlich der Anträge auf Ausnahmen oder Befreiungen sowie Mitwirken bei Verhandlungen mit Behörden"
     },
     {
      "buchstabe": "b",
      "text": "Vervollständigen und Anpassen der Planungsunterlagen, Beschreibungen und Berechnungen"
     }
    ]
   },
   "5": {
    "bezeichnung": "Ausführungsplanung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Erarbeiten der Ausführungsplanung auf Grundlage der Ergebnisse der Leistungsphasen 3 und 4 (stufenweise Erarbeitung und Darstellung der Lösung) unter Beachtung der durch die Objektplanung integrierten Fachplanungen bis zur ausführungsreifen Lösung"
     },
     {
      "buchstabe": "b",
      "text": "Fortschreiben der Berechnungen und Bemessungen zur Auslegung der technischen Anlagen und Anlagenteile Zeichnerische Darstellung der Anlagen in einem mit dem Objektplaner abgestimmten Ausgabemaßstab und Detaillierungsgrad einschließlich Dimensionen (keine Montage- oder Werkstattpläne) Anpassen und Detaillieren der Funktions- und Strangschemata der Anlagen bzw. der GA-Funktionslisten Abstimmen der Ausführungszeichnungen mit dem Objektplaner und den übrigen Fachplanern"
     },
     {
      "buchstabe": "c",
      "text": "Anfertigen von Schlitz- und Durchbruchsplänen"
     },
     {
      "buchstabe": "d",
      "text": "Fortschreibung des Terminplans"
     },
     {
      "buchstabe": "e",
      "text": "Fortschreiben der Ausführungsplanung auf den Stand der Ausschreibungsergebnisse und der dann vorliegenden Ausführungsplanung des Objektplaners, Übergeben der fortgeschriebenen Ausführungsplanung an die ausführenden Unternehmen"
     },
     {
      "buchstabe": "f",
      "text": "Prüfen und Anerkennen der Montage- und Werkstattpläne der ausführenden Unternehmen auf Übereinstimmung mit der Ausführungsplanung"
     }
    ]
   },
   "6": {
    "bezeichnung": "Vorbereitung der Vergabe",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Ermitteln von Mengen als Grundlage für das Aufstellen von Leistungsverzeichnissen in Abstimmung mit Beiträgen anderer an der Planung fachlich Beteiligter"
     },
     {
      "buchstabe": "b",
      "text": "Aufstellen der Vergabeunterlagen, insbesondere mit Leistungsverzeichnissen nach Leistungsbereichen, einschließlich der Wartungsleistungen auf Grundlage bestehender Regelwerke"
     },
     {
      "buchstabe": "c",
      "text": "Mitwirken beim Abstimmen der Schnittstellen zu den Leistungsbeschreibungen der anderen an der Planung fachlich Beteiligten"
     },
     {
      "buchstabe": "d",
      "text": "Ermitteln der Kosten auf Grundlage der vom Planer bepreisten Leistungsverzeichnisse"
     },
     {
      "buchstabe": "e",
      "text": "Kostenkontrolle durch Vergleich der vom Planer bepreisten Leistungsverzeichnisse mit der Kostenberechnung"
     },
     {
      "buchstabe": "f",
      "text": "Zusammenstellen der Vergabeunterlagen"
     }
    ]
   },
   "7": {
    "bezeichnung": "Mitwirkung bei der Vergabe",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Einholen von Angeboten"
     },
     {
      "buchstabe": "b",
      "text": "Prüfen und Werten der Angebote, Aufstellen der Preisspiegel nach Einzelpositionen, Prüfen und Werten der Angebote für zusätzliche oder geänderte Leistungen der ausführenden Unternehmen und der Angemessenheit der Preise"
     },
     {
      "buchstabe": "c",
      "text": "Führen von Bietergesprächen"
     },
     {
      "buchstabe": "d",
      "text": "Vergleichen der Ausschreibungsergebnisse mit den vom Planer bepreisten Leistungsverzeichnissen und der Kostenberechnung"
     },
     {
      "buchstabe": "e",
      "text": "Erstellen der Vergabevorschläge, Mitwirken bei der Dokumentation der Vergabeverfahren"
     },
     {
      "buchstabe": "f",
      "text": "Zusammenstellen der Vertragsunterlagen und bei der Auftragserteilung"
     }
    ]
   },
   "8": {
    "bezeichnung": "Objektüberwachung (Bauüberwachung) und Dokumentation",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Überwachen der Ausführung des Objekts auf Übereinstimmung mit der öffentlich-rechtlichen Genehmigung oder Zustimmung, den Verträgen mit den ausführenden Unternehmen, den Ausführungsunterlagen, den Montage- und Werkstattplänen, den einschlägigen Vorschriften und den allgemein anerkannten Regeln der Technik"
     },
     {
      "buchstabe": "b",
      "text": "Mitwirken bei der Koordination der am Projekt Beteiligten"
     },
     {
      "buchstabe": "c",
      "text": "Aufstellen, Fortschreiben und Überwachen des Terminplans (Balkendiagramm)"
     },
     {
      "buchstabe": "d",
      "text": "Dokumentation des Bauablaufs (Bautagebuch)"
     },
     {
      "buchstabe": "e",
      "text": "Prüfen und Bewerten der Notwendigkeit geänderter oder zusätzlicher Leistungen der Unternehmer und der Angemessenheit der Preise"
     },
     {
      "buchstabe": "f",
      "text": "Gemeinsames Aufmaß mit den ausführenden Unternehmen"
     },
     {
      "buchstabe": "g",
      "text": "Rechnungsprüfung in rechnerischer und fachlicher Hinsicht mit Prüfen und Bescheinigen des Leistungsstandes anhand nachvollziehbarer Leistungsnachweise"
     },
     {
      "buchstabe": "h",
      "text": "Kostenkontrolle durch Überprüfen der Leistungsabrechnungen der ausführenden Unternehmen im Vergleich zu den Vertragspreisen und dem Kostenanschlag"
     },
     {
      "buchstabe": "i",
      "text": "Kostenfeststellung"
     },
     {
      "buchstabe": "j",
      "text": "Mitwirken bei Leistungs- u. Funktionsprüfungen"
     },
     {
      "buchstabe": "k",
      "text": "fachtechnische Abnahme der Leistungen auf Grundlage der vorgelegten Dokumentation, Erstellung eines Abnahmeprotokolls, Feststellen von Mängeln und Erteilen einer Abnahmeempfehlung"
     },
     {
      "buchstabe": "l",
      "text": "Antrag auf behördliche Abnahmen und Teilnahme daran"
     },
     {
      "buchstabe": "m",
      "text": "Prüfung der übergebenen Revisionsunterlagen auf Vollzähligkeit, Vollständigkeit und stichprobenartige Prüfung auf Übereinstimmung mit dem Stand der Ausführung"
     },
     {
      "buchstabe": "n",
      "text": "Auflisten der Verjährungsfristen der Ansprüche auf Mängelbeseitigung"
     },
     {
      "buchstabe": "o",
      "text": "Überwachen der Beseitigung der bei der Abnahme festgestellten Mängel"
     },
     {
      "buchstabe": "p",
      "text": "Systematische Zusammenstellung der Dokumentation, der zeichnerischen Darstellungen und rechnerischen Ergebnisse des Objekts"
     }
    ]
   },
   "9": {
    "bezeichnung": "Objektbetreuung",
    "leistungen": [
     {
      "buchstabe": "a",
      "text": "Fachliche Bewertung der innerhalb der Verjährungsfristen für Gewährleistungsansprüche festgestellten Mängel, längstens jedoch bis zum Ablauf von fünf Jahren seit Abnahme der Leistung, einschließlich notwendiger Begehungen"
     },
     {
      "buchstabe": "b",
      "text": "Objektbegehung zur Mängelfeststellung vor Ablauf der Verjährungsfristen für Mängelansprüche gegenüber den ausführenden Unternehmen"
     },
     {
      "buchstabe": "c",
      "text": "Mitwirken bei der Freigabe von Sicherheitsleistungen"
     }
    ]
   }
  }
 }
};
