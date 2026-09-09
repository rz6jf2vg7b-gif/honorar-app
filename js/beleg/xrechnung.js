// E-Rechnung: erzeugt den XML-Datensatz nach EN 16931 im Format XRechnung (CII).
//
// WARUM CII UND NICHT UBL
// Die Norm EN 16931 kennt zwei Syntaxen, UBL und UN/CEFACT CII. Beide sind
// zulaessig. CII ist hier die richtige Wahl, weil derselbe Datensatz spaeter
// unveraendert in ein ZUGFeRD-PDF eingebettet werden kann — ZUGFeRD/Factur-X
// verwendet ausschliesslich CII. Wer mit UBL anfaengt, schreibt den Erzeuger ein
// zweites Mal, sobald das hybride PDF dazukommt.
//
// WIE DIE ABRECHNUNG ABGEBILDET WIRD
// Der wichtigste Punkt, und der, an dem selbstgebaute Erzeuger scheitern: Diese
// App zieht bereits gestellte Rechnungen NETTO ab und versteuert die Differenz —
// so rechnet HOAI-Pro, und so stehen die geprueften Rechnungen im Bestand. In der
// Norm gibt es dafuer zwei Wege:
//   Abzug als Vorauszahlung (BT-113)  — versteuert die volle Summe und zieht
//     brutto ab. Das ergaebe eine ANDERE Steuer als auf dem Blatt.
//   Abzug als Nachlass auf Belegebene (BG-20) — mindert die Bemessungsgrundlage.
//     Genau das tut die App.
// Deshalb werden Abzuege und Einbehalt als Nachlaesse abgebildet. Damit stimmen
// XML und Papier auf den Cent ueberein — jede andere Wahl erzeugte zwei
// Rechnungen mit unterschiedlicher Umsatzsteuer ueber denselben Vorgang.
//
// ⚠️ DATENSCHUTZ
// Der Datensatz enthaelt zwingend die Bankverbindung und die Steuernummer des
// Rechnungsstellers. Das ist sein Zweck: er geht an den Rechnungsempfaenger.
// Er gehoert damit in dieselbe Klasse wie die Rechnung selbst — auf das Geraet
// und zum Empfaenger, niemals in ein oeffentliches Verzeichnis, ein Repository
// oder Testdaten.

import { runde2 } from '../hoai/geld.js';

/** Kennung des Profils. XRechnung 3.0 ist seit 01.02.2024 die gueltige Fassung. */
export const XRECHNUNG_KENNUNG =
  'urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_3.0';

/** Dokumentarten nach UNTDID 1001. */
const TYP_RECHNUNG = '380';
const TYP_GUTSCHRIFT = '381';

const x = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** Betrag in der Schreibweise der Norm: Punkt als Trennzeichen, zwei Stellen. */
const betrag = (z) => runde2(Math.abs(z || 0)).toFixed(2);
const satz = (z) => (Math.round((z || 0) * 10000) / 100).toFixed(2);

/** "09.09.2026" oder "2026-09-09" -> "20260909" (UNTDID 2379, Format 102). */
function datum102(d) {
  const s = String(d || '').trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return `${m[1]}${m[2]}${m[3]}`;
  m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
  if (m) return `${m[3]}${m[2]}${m[1]}`;
  return '';
}

const zeile = (tag, wert, attr = '') =>
  (wert === '' || wert === null || wert === undefined ? '' : `<${tag}${attr}>${x(wert)}</${tag}>`);

// ————————————————————————————————————————————————————————————————
// Pruefung
// ————————————————————————————————————————————————————————————————

/**
 * Prueft, ob der Beleg als E-Rechnung uebermittelt werden kann.
 *
 * Getrennt von pruefePflichtangaben(), weil die Norm mehr verlangt als das
 * Umsatzsteuergesetz: eine Kaeuferreferenz, elektronische Adressen beider
 * Seiten, ein Faelligkeitsdatum. Fehlt eines davon, weist der Empfaenger die
 * Rechnung maschinell ab, ohne dass ein Mensch sie je sieht.
 */
export function pruefeERechnung(d) {
  const fehlend = [];
  const hinweise = [];
  const b = d.buero || {};
  const e = d.empfaenger || {};
  const a = d.abrechnung || {};

  const verlangt = (bedingung, feld, fundstelle) => {
    if (!bedingung) fehlend.push({ feld, fundstelle });
  };

  verlangt(a.nummer, 'Rechnungsnummer', 'BT-1');
  verlangt(datum102(a.datum), 'Rechnungsdatum', 'BT-2');
  verlangt(d.leitwegId || d.bestellnummer,
    'Leitweg-ID oder Bestellnummer des Empfängers', 'BT-10 · bei öffentlichen Auftraggebern zwingend');
  verlangt(b.name && (b.strasse || b.plzOrt) && b.plzOrt, 'Anschrift des Rechnungsstellers', 'BG-5');
  verlangt(b.mail, 'E-Mail-Adresse des Rechnungsstellers', 'BT-34');
  verlangt(b.steuernummer || b.ustId, 'Steuernummer oder USt-IdNr.', 'BT-31 / BT-32');
  verlangt(e.name && e.plzOrt, 'Anschrift des Empfängers', 'BG-8');
  verlangt(d.empfaengerMail, 'E-Mail-Adresse des Empfängers', 'BT-49');
  verlangt(d.faelligkeit || d.zahlungsbedingung, 'Fälligkeit oder Zahlungsbedingung', 'BT-9 / BT-20');
  verlangt(b.kleinunternehmer || b.iban, 'IBAN für die Überweisung', 'BT-84');
  verlangt(d.leistungsdatum || d.leistungszeitraumVon,
    'Liefer- oder Leistungsdatum', 'BT-72 · sonst fehlt der Steuerzeitpunkt');

  // Ueberzahlungen aus frueheren Rechnungen lassen sich abbilden, Unterzahlungen
  // nicht: Eine negative Vorauszahlung kennt die Norm nicht.
  if (a.zahlbetrag > a.brutto + 0.005) {
    fehlend.push({
      feld: 'Der Zahlbetrag liegt über dem Rechnungsbetrag. Unterzahlungen früherer '
        + 'Rechnungen lassen sich in einer E-Rechnung nicht einrechnen — sie werden gemahnt.',
      fundstelle: 'BT-113',
    });
  }

  if (b.kleinunternehmer) {
    hinweise.push({
      text: 'Als Kleinunternehmer wird die Steuerkategorie E (steuerbefreit) mit dem '
        + 'Befreiungsgrund nach § 19 UStG übermittelt.',
      fundstelle: 'BT-118, BT-120',
    });
  }
  hinweise.push({
    text: 'Der Datensatz enthält Bankverbindung und Steuernummer. Er ist für den '
      + 'Empfänger bestimmt und gehört nicht in eine Ablage, die andere einsehen können.',
    fundstelle: 'Art. 5 Abs. 1 lit. f DSGVO',
  });

  return { ok: fehlend.length === 0, fehlend, hinweise };
}

// ————————————————————————————————————————————————————————————————
// Erzeugen
// ————————————————————————————————————————————————————————————————

/**
 * @param {object} d  dieselben Daten wie fuer den Beleg, ergaenzt um:
 * @param {string} [d.leitwegId]        Kaeuferreferenz (BT-10)
 * @param {string} [d.bestellnummer]    Bestellnummer des Auftraggebers (BT-13)
 * @param {string} [d.empfaengerMail]   elektronische Adresse des Empfaengers (BT-49)
 * @param {string} [d.empfaengerUstId]  USt-IdNr. des Empfaengers (BT-48)
 * @param {string} [d.faelligkeit]      ISO-Datum (BT-9)
 * @param {string} [d.zahlungsbedingung] Freitext (BT-20)
 * @param {string} [d.leistungsdatum]   ISO-Datum (BT-72)
 * @returns {string} XML
 */
export function xrechnungXml(d) {
  const a = d.abrechnung;
  const b = d.buero || {};
  const e = d.empfaenger || {};

  // Ein Storno traegt in dieser App negative Betraege. Die Norm kennt dafuer die
  // Gutschrift mit positiven Werten — sonst schlagen die Rechenregeln fehl.
  const gutschrift = (a.brutto || 0) < 0;
  const vz = gutschrift ? -1 : 1;

  const ustSatz = b.kleinunternehmer ? 0 : (a.ustSatz || 0);
  const kategorie = b.kleinunternehmer ? 'E' : 'S';

  // ── Positionen ───────────────────────────────────────
  // Jede Leistungszeile der Zusammenstellung wird eine Rechnungsposition.
  // Abzuege und Einbehalt sind KEINE Positionen, sondern Nachlaesse (siehe oben).
  const posten = (a.zeilen || []).filter((z) => z.art === 'leistung');
  const positionen = posten.map((p, i) => `
      <ram:IncludedSupplyChainTradeLineItem>
        <ram:AssociatedDocumentLineDocument>
          <ram:LineID>${i + 1}</ram:LineID>
        </ram:AssociatedDocumentLineDocument>
        <ram:SpecifiedTradeProduct>
          ${zeile('ram:Name', p.bez || 'Leistung')}
        </ram:SpecifiedTradeProduct>
        <ram:SpecifiedLineTradeAgreement>
          <ram:NetPriceProductTradePrice>
            <ram:ChargeAmount>${betrag(p.netto * vz)}</ram:ChargeAmount>
          </ram:NetPriceProductTradePrice>
        </ram:SpecifiedLineTradeAgreement>
        <ram:SpecifiedLineTradeDelivery>
          <ram:BilledQuantity unitCode="C62">1</ram:BilledQuantity>
        </ram:SpecifiedLineTradeDelivery>
        <ram:SpecifiedLineTradeSettlement>
          <ram:ApplicableTradeTax>
            <ram:TypeCode>VAT</ram:TypeCode>
            <ram:CategoryCode>${kategorie}</ram:CategoryCode>
            <ram:RateApplicablePercent>${satz(ustSatz)}</ram:RateApplicablePercent>
          </ram:ApplicableTradeTax>
          <ram:SpecifiedTradeSettlementLineMonetarySummation>
            <ram:LineTotalAmount>${betrag(p.netto * vz)}</ram:LineTotalAmount>
          </ram:SpecifiedTradeSettlementLineMonetarySummation>
        </ram:SpecifiedLineTradeSettlement>
      </ram:IncludedSupplyChainTradeLineItem>`).join('');

  const summeLeistungen = runde2(posten.reduce((s, p) => s + p.netto, 0) * vz);

  // ── Nachlaesse auf Belegebene ────────────────────────
  const nachlaesse = (a.zeilen || [])
    .filter((z) => z.art === 'einbehalt' || z.art === 'abzug')
    .map((z) => ({ bez: z.bez, betrag: runde2(Math.abs(z.netto)) }));
  const summeNachlass = runde2(nachlaesse.reduce((s, n) => s + n.betrag, 0));

  const nachlassXml = nachlaesse.map((n) => `
        <ram:SpecifiedTradeAllowanceCharge>
          <ram:ChargeIndicator>
            <udt:Indicator>false</udt:Indicator>
          </ram:ChargeIndicator>
          <ram:ActualAmount>${betrag(n.betrag)}</ram:ActualAmount>
          ${zeile('ram:Reason', n.bez)}
          <ram:CategoryTradeTax>
            <ram:TypeCode>VAT</ram:TypeCode>
            <ram:CategoryCode>${kategorie}</ram:CategoryCode>
            <ram:RateApplicablePercent>${satz(ustSatz)}</ram:RateApplicablePercent>
          </ram:CategoryTradeTax>
        </ram:SpecifiedTradeAllowanceCharge>`).join('');

  const bemessung = runde2(summeLeistungen - summeNachlass);
  const steuer = runde2((a.ust || 0) * vz);
  const brutto = runde2((a.brutto || 0) * vz);
  // Verrechnete Ueberzahlungen frueherer Rechnungen sind Vorauszahlungen.
  const vorausgezahlt = Math.max(0, runde2(brutto - (a.zahlbetrag || 0) * vz));
  const zahlbetrag = runde2(brutto - vorausgezahlt);

  const anschrift = (p) => `
          <ram:PostalTradeAddress>
            ${zeile('ram:PostcodeCode', plz(p.plzOrt))}
            ${zeile('ram:LineOne', p.strasse)}
            ${zeile('ram:LineTwo', p.zeile2)}
            ${zeile('ram:CityName', ort(p.plzOrt))}
            <ram:CountryID>${x(landCode(p.land))}</ram:CountryID>
          </ram:PostalTradeAddress>`;

  const steuernummern = [
    b.ustId ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${x(b.ustId)}</ram:ID></ram:SpecifiedTaxRegistration>` : '',
    b.steuernummer ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="FC">${x(b.steuernummer)}</ram:ID></ram:SpecifiedTaxRegistration>` : '',
  ].join('');

  const zahlungsmittel = b.kleinunternehmer && !b.iban ? '' : `
        <ram:SpecifiedTradeSettlementPaymentMeans>
          <ram:TypeCode>58</ram:TypeCode>
          <ram:PayeePartyCreditorFinancialAccount>
            ${zeile('ram:IBANID', (b.iban || '').replace(/\s+/g, ''))}
            ${zeile('ram:AccountName', b.kontoinhaber || b.inhaber || b.name)}
          </ram:PayeePartyCreditorFinancialAccount>
          ${b.bic ? `<ram:PayeeSpecifiedCreditorFinancialInstitution>
            <ram:BICID>${x(b.bic.replace(/\s+/g, ''))}</ram:BICID>
          </ram:PayeeSpecifiedCreditorFinancialInstitution>` : ''}
        </ram:SpecifiedTradeSettlementPaymentMeans>`;

  const befreiung = b.kleinunternehmer
    ? '<ram:ExemptionReason>Kein Ausweis von Umsatzsteuer, Kleinunternehmer gemäß § 19 UStG</ram:ExemptionReason>'
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>${XRECHNUNG_KENNUNG}</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${x(a.nummer)}</ram:ID>
    <ram:TypeCode>${gutschrift ? TYP_GUTSCHRIFT : TYP_RECHNUNG}</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${datum102(a.datum)}</udt:DateTimeString>
    </ram:IssueDateTime>${(d.anschreiben || d.leistungszeitraum) ? `
    <ram:IncludedNote>
      <ram:Content>${x([d.anschreiben, d.leistungszeitraum ? `Leistungszeitraum: ${d.leistungszeitraum}` : '']
        .filter(Boolean).join(' — '))}</ram:Content>
    </ram:IncludedNote>` : ''}
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>${positionen}
    <ram:ApplicableHeaderTradeAgreement>
      ${zeile('ram:BuyerReference', d.leitwegId || d.bestellnummer)}
      <ram:SellerTradeParty>
        ${zeile('ram:Name', b.name)}
        <ram:DefinedTradeContact>
          ${zeile('ram:PersonName', b.inhaber || b.bearbeiter)}
          ${b.telefon ? `<ram:TelephoneUniversalCommunication>
            <ram:CompleteNumber>${x(b.telefon)}</ram:CompleteNumber>
          </ram:TelephoneUniversalCommunication>` : ''}
          ${b.mail ? `<ram:EmailURIUniversalCommunication>
            <ram:URIID>${x(b.mail)}</ram:URIID>
          </ram:EmailURIUniversalCommunication>` : ''}
        </ram:DefinedTradeContact>${anschrift(b)}
        ${b.mail ? `<ram:URIUniversalCommunication>
          <ram:URIID schemeID="EM">${x(b.mail)}</ram:URIID>
        </ram:URIUniversalCommunication>` : ''}
        ${steuernummern}
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        ${zeile('ram:Name', e.name)}${anschrift(e)}
        ${d.empfaengerMail ? `<ram:URIUniversalCommunication>
          <ram:URIID schemeID="EM">${x(d.empfaengerMail)}</ram:URIID>
        </ram:URIUniversalCommunication>` : ''}
        ${d.empfaengerUstId ? `<ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${x(d.empfaengerUstId)}</ram:ID>
        </ram:SpecifiedTaxRegistration>` : ''}
      </ram:BuyerTradeParty>${d.bestellnummer ? `
      <ram:BuyerOrderReferencedDocument>
        <ram:IssuerAssignedID>${x(d.bestellnummer)}</ram:IssuerAssignedID>
      </ram:BuyerOrderReferencedDocument>` : ''}
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery>${datum102(d.leistungsdatum || d.leistungszeitraumBis || a.datum) ? `
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${datum102(d.leistungsdatum || d.leistungszeitraumBis || a.datum)}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>` : ''}
    </ram:ApplicableHeaderTradeDelivery>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>${zahlungsmittel}
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${betrag(steuer)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        ${befreiung}
        <ram:BasisAmount>${betrag(bemessung)}</ram:BasisAmount>
        <ram:CategoryCode>${kategorie}</ram:CategoryCode>
        <ram:RateApplicablePercent>${satz(ustSatz)}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>${nachlassXml}
      <ram:SpecifiedTradePaymentTerms>
        ${zeile('ram:Description', d.zahlungsbedingung)}${datum102(d.faelligkeit) ? `
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${datum102(d.faelligkeit)}</udt:DateTimeString>
        </ram:DueDateDateTime>` : ''}
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${betrag(summeLeistungen)}</ram:LineTotalAmount>
        <ram:ChargeTotalAmount>0.00</ram:ChargeTotalAmount>
        <ram:AllowanceTotalAmount>${betrag(summeNachlass)}</ram:AllowanceTotalAmount>
        <ram:TaxBasisTotalAmount>${betrag(bemessung)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${betrag(steuer)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${betrag(brutto)}</ram:GrandTotalAmount>
        <ram:TotalPrepaidAmount>${betrag(vorausgezahlt)}</ram:TotalPrepaidAmount>
        <ram:DuePayableAmount>${betrag(zahlbetrag)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>
`.replace(/^\s*\n/gm, '');
}

// ————————————————————————————————————————————————————————————————

const plz = (plzOrt) => (/^\s*(\S+)\s+/.exec(String(plzOrt || ''))?.[1] || '');
const ort = (plzOrt) => String(plzOrt || '').replace(/^\s*\S+\s+/, '').trim();

/**
 * Laenderkennzeichen nach ISO 3166-1 alpha-2. Die Stammdaten aus untermStrich
 * tragen teils das Kfz-Kennzeichen ("D"), teils den ausgeschriebenen Namen.
 */
function landCode(land) {
  const s = String(land || '').trim().toUpperCase();
  if (!s) return 'DE';
  const KARTE = {
    D: 'DE', DEUTSCHLAND: 'DE', GERMANY: 'DE',
    A: 'AT', ÖSTERREICH: 'AT', OESTERREICH: 'AT', AUSTRIA: 'AT',
    CH: 'CH', SCHWEIZ: 'CH', L: 'LU', LUXEMBURG: 'LU',
    F: 'FR', FRANKREICH: 'FR', NL: 'NL', NIEDERLANDE: 'NL',
    B: 'BE', BELGIEN: 'BE', I: 'IT', ITALIEN: 'IT',
  };
  return KARTE[s] || (/^[A-Z]{2}$/.test(s) ? s : 'DE');
}
