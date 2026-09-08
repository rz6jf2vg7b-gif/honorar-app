// Datenhaltung: IndexedDB.
//
// Dieselbe Wahl wie bei der Zeiterfassungs-App: die Daten liegen auf dem Geraet,
// die App laeuft ohne Netz, und ein Abgleich ueber OneDrive kann spaeter darauf
// aufsetzen. localStorage scheidet aus — Belege mit Herleitung sind zu gross und
// muessen durchsuchbar bleiben.
//
// Wichtig fuer die Nachvollziehbarkeit: Ein festgeschriebener Beleg wird nie mehr
// veraendert. Er traegt seinen kompletten Rechenstand als Kopie in sich
// (Feld `snapshot`), damit er auch dann noch reproduzierbar ist, wenn der Vertrag
// spaeter durch Nachtraege weitergezogen wurde.

const DB_NAME = 'honorarapp';
const DB_VERSION = 1;

export const SPEICHER = {
  EINSTELLUNGEN: 'einstellungen',
  PROJEKTE: 'projekte',
  ADRESSEN: 'adressen',
  VERTRAEGE: 'vertraege',
  BELEGE: 'belege',
};

let dbP = null;

function oeffnen() {
  if (dbP) return dbP;
  dbP = new Promise((res, rej) => {
    const anf = indexedDB.open(DB_NAME, DB_VERSION);
    anf.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(SPEICHER.EINSTELLUNGEN)) {
        db.createObjectStore(SPEICHER.EINSTELLUNGEN);
      }
      if (!db.objectStoreNames.contains(SPEICHER.PROJEKTE)) {
        const s = db.createObjectStore(SPEICHER.PROJEKTE, { keyPath: 'id' });
        s.createIndex('nummer', 'nummer');
      }
      if (!db.objectStoreNames.contains(SPEICHER.ADRESSEN)) {
        const s = db.createObjectStore(SPEICHER.ADRESSEN, { keyPath: 'id' });
        s.createIndex('name', 'name');
      }
      if (!db.objectStoreNames.contains(SPEICHER.VERTRAEGE)) {
        const s = db.createObjectStore(SPEICHER.VERTRAEGE, { keyPath: 'id' });
        s.createIndex('projektId', 'projektId');
      }
      if (!db.objectStoreNames.contains(SPEICHER.BELEGE)) {
        const s = db.createObjectStore(SPEICHER.BELEGE, { keyPath: 'id' });
        s.createIndex('projektId', 'projektId');
        s.createIndex('nummer', 'nummer');
        s.createIndex('datum', 'datum');
      }
    };
    anf.onsuccess = () => res(anf.result);
    anf.onerror = () => rej(anf.error);
  });
  return dbP;
}

async function tx(speicher, modus, arbeit) {
  const db = await oeffnen();
  return new Promise((res, rej) => {
    const t = db.transaction(speicher, modus);
    const s = t.objectStore(speicher);
    let ergebnis;
    try {
      ergebnis = arbeit(s);
    } catch (e) {
      rej(e); return;
    }
    t.oncomplete = () => res(ergebnis && ergebnis.result !== undefined ? ergebnis.result : ergebnis);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
}

const alsPromise = (anf) => new Promise((res, rej) => {
  anf.onsuccess = () => res(anf.result);
  anf.onerror = () => rej(anf.error);
});

export async function lesen(speicher, id) {
  const db = await oeffnen();
  return alsPromise(db.transaction(speicher).objectStore(speicher).get(id));
}

export async function alle(speicher) {
  const db = await oeffnen();
  return alsPromise(db.transaction(speicher).objectStore(speicher).getAll());
}

export async function schreiben(speicher, wert, schluessel) {
  return tx(speicher, 'readwrite', (s) => (schluessel !== undefined ? s.put(wert, schluessel) : s.put(wert)));
}

export async function schreibeViele(speicher, werte) {
  return tx(speicher, 'readwrite', (s) => { for (const w of werte) s.put(w); });
}

export async function loeschen(speicher, id) {
  return tx(speicher, 'readwrite', (s) => s.delete(id));
}

export async function leeren(speicher) {
  return tx(speicher, 'readwrite', (s) => s.clear());
}

/** Neue Kennung. Zeitanteil vorn, damit Listen ohne Index chronologisch sortieren. */
export function neueId(praefix = 'x') {
  return `${praefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ————————————————————————————————————————————————————————————————
// Einstellungen
// ————————————————————————————————————————————————————————————————

export const VORGABE_EINSTELLUNGEN = {
  buero: {
    name: '',
    inhaber: '',
    funktion: '',
    kuerzel: '',
    // Anschrift in Einzelfeldern: zusammengesetzte Felder laden dazu ein, Straße
    // und Hausnummer zu vertauschen oder doppelte Leerzeichen zu hinterlassen —
    // beides faellt erst auf dem fertigen Beleg auf.
    strasse: '',
    hausnummer: '',
    plz: '',
    ort: '',
    land: 'D',
    telefonLand: '+49',
    telefon: '',
    mail: '',
    web: '',
    bank: '',
    iban: '',
    bic: '',
    steuernummer: '',
    steuernummerMuster: 'auto',
    ustId: '',
    kleinunternehmer: false,
  },
  cd: {
    wortmarkeMager: '',
    wortmarkeFett: '',
    wortmarkeEnde: '',
    disziplin: '',
    akzent: '#14b8a6',
  },
  vorgaben: {
    fassung: 2021,
    leistungsbild: 'gebaeude',
    honorarzone: 3,
    honorarsatz: 0.5,
    ustSatz: 0.19,
    nebenkostenProzent: 0.05,
    umbauzuschlag: 0.20,
    stundensatz: 95,
    zahlungsziel: 30,
    nummernschema: '{art}-{projekt}-{lfd}',
    ablageschema: '{datum}_{projekt}_{nummer}_{art}',
  },
};

/**
 * Aeltere Einstellungen auf die heutige Form bringen. Wird bei jedem Lesen
 * angewendet — so verliert niemand seine Daten, nur weil die App weiterwaechst.
 */
function bueroAngleichen(b) {
  const neu = { ...b };
  if (b.plzOrt && !b.plz && !b.ort) {
    const m = /^\s*(\S+)\s+(.*)$/.exec(String(b.plzOrt).trim());
    if (m) { neu.plz = m[1]; neu.ort = m[2]; }
    else neu.ort = b.plzOrt;
    delete neu.plzOrt;
  }
  if (b.strasse && !b.hausnummer) {
    const m = /^(.*?)\s+(\d+\s*[a-zA-Z]?(?:\s*[-/]\s*\d+\s*[a-zA-Z]?)?)$/.exec(String(b.strasse).trim());
    if (m) { neu.strasse = m[1]; neu.hausnummer = m[2]; }
  }
  if (b.telefon && !b.telefonLand) {
    const m = /^\s*(\+\d{1,3})\s*(.*)$/.exec(String(b.telefon));
    if (m) { neu.telefonLand = m[1]; neu.telefon = m[2]; }
  }
  return neu;
}

/** Anschrift und Telefon fuer die Ausgabe zusammensetzen. */
export function anschriftZeilen(buero) {
  const strasse = [buero.strasse, buero.hausnummer].filter(Boolean).join(' ').trim();
  const ort = [buero.plz, buero.ort].filter(Boolean).join(' ').trim();
  const land = buero.land && buero.land !== 'D' ? `${buero.land}-` : '';
  return { strasse, plzOrt: ort ? `${land}${ort}` : '' };
}

export function telefonZeigen(buero) {
  return [buero.telefonLand, buero.telefon].filter(Boolean).join(' ').trim();
}

export async function einstellungenLesen() {
  const roh = (await lesen(SPEICHER.EINSTELLUNGEN, 'aktuell')) || {};
  return {
    buero: bueroAngleichen({ ...VORGABE_EINSTELLUNGEN.buero, ...(roh.buero || {}) }),
    cd: { ...VORGABE_EINSTELLUNGEN.cd, ...(roh.cd || {}) },
    vorgaben: { ...VORGABE_EINSTELLUNGEN.vorgaben, ...(roh.vorgaben || {}) },
  };
}

export async function einstellungenSchreiben(e) {
  return schreiben(SPEICHER.EINSTELLUNGEN, e, 'aktuell');
}

// ————————————————————————————————————————————————————————————————
// Sicherung
// ————————————————————————————————————————————————————————————————

/** Vollstaendige Sicherung als Objekt — Grundlage fuer Export und OneDrive-Abgleich. */
export async function sicherungErstellen() {
  const [einstellungen, projekte, adressen, vertraege, belege] = await Promise.all([
    einstellungenLesen(),
    alle(SPEICHER.PROJEKTE),
    alle(SPEICHER.ADRESSEN),
    alle(SPEICHER.VERTRAEGE),
    alle(SPEICHER.BELEGE),
  ]);
  return {
    art: 'honorarapp-sicherung',
    fassung: 1,
    stand: new Date().toISOString(),
    einstellungen, projekte, adressen, vertraege, belege,
  };
}

/**
 * Sicherung einspielen. Bestehende Belege werden NICHT geloescht, sondern nur
 * ergaenzt oder ueberschrieben — eine Sicherung darf keine Rechnung verschwinden
 * lassen, die auf diesem Geraet entstanden ist.
 */
export async function sicherungEinspielen(daten) {
  if (daten?.art !== 'honorarapp-sicherung') {
    throw new Error('Das ist keine HonorarApp-Sicherung.');
  }
  if (daten.einstellungen) await einstellungenSchreiben(daten.einstellungen);
  if (daten.projekte?.length) await schreibeViele(SPEICHER.PROJEKTE, daten.projekte);
  if (daten.adressen?.length) await schreibeViele(SPEICHER.ADRESSEN, daten.adressen);
  if (daten.vertraege?.length) await schreibeViele(SPEICHER.VERTRAEGE, daten.vertraege);
  if (daten.belege?.length) await schreibeViele(SPEICHER.BELEGE, daten.belege);
  return {
    projekte: daten.projekte?.length || 0,
    adressen: daten.adressen?.length || 0,
    vertraege: daten.vertraege?.length || 0,
    belege: daten.belege?.length || 0,
  };
}
