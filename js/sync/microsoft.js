// Anmeldung bei Microsoft. Grundlage des OneDrive-Abgleichs.
//
// Bewusst ohne MSAL: der Auth-Code-Flow mit PKCE ist hier rund hundert Zeilen,
// MSAL waeren 200 KB bei jedem Start — und die App laedt sonst nichts von
// aussen nach. Der Code entspricht dem der Zeiterfassungs-App; er hat sich dort
// seit August 2026 auf allen drei Geraeten bewaehrt, einschliesslich der
// Behandlung der 24-Stunden-Grenze.
//
// DIE 24-STUNDEN-GRENZE (AADSTS700084)
// Entra gibt Einzelseitenanwendungen ein Aktualisierungs-Token mit fester
// Lebensdauer von genau 24 Stunden — nicht verlaengerbar, weil ein Browser es
// nicht sicher verwahren kann. Ohne Gegenmassnahme muesste man sich taeglich neu
// anmelden. Die Gegenmassnahme ist eine Umleitung mit prompt=none: Besteht die
// Microsoft-Sitzung im Browser noch, kommt sofort ein neuer Code zurueck.
// Der sonst uebliche Weg ueber ein verstecktes iframe scheidet aus — Safari
// blockiert Cookies von Drittanbietern, das Fenster bliebe leer.
//
// EINMALIG IN ENTRA EINZUTRAGEN (App "CoWork_OS Claude" → Authentifizierung):
// Plattform "Einzelseitenanwendung (SPA)", Umleitungs-URI:
//     https://honorar.kreativlabor42.de/
// Ohne diesen Eintrag lehnt Microsoft mit AADSTS9002326 ab.
//
// ⚠️ ZUM UMFANG DER BERECHTIGUNG
// Angefordert wird Files.ReadWrite.All, weil genau das der App bereits erteilt
// ist und ein kleinerer Umfang eine neue Zustimmung ausloeste. Das Recht reicht
// weiter, als diese App braucht — sie schreibt eine einzige Datei. Wer es
// enger fassen will, traegt in Entra Files.ReadWrite ein und aendert RECHTE hier
// entsprechend; danach ist einmal neu zuzustimmen.

const MANDANT = 'a8270f4f-5927-47f9-9500-09f00736ffe8';
const KLIENT = '056553d5-0a4f-4801-a06c-99f40ebdeaa7';

const RECHTE = [
  'openid', 'profile', 'offline_access',
  'https://graph.microsoft.com/User.Read',
  'https://graph.microsoft.com/Files.ReadWrite.All',
].join(' ');

const S_VERIFIER = 'ms_verifier';
const S_TOKEN = 'honorar_ms_token';
const S_STILL = 'ms_still_versuch';
const S_STILL_LAEUFT = 'ms_still_laeuft';
const S_NOETIG = 'honorar_ms_anmeldung_noetig';

const REFRESH_LEBENSDAUER = 24 * 60 * 60 * 1000;
const ERNEUERN_AB = REFRESH_LEBENSDAUER - 60 * 60 * 1000;

export const GRAPH = 'https://graph.microsoft.com/v1.0';

const speicher = {
  lies: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  schreib: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  weg: (k) => localStorage.removeItem(k),
};

const gespeichert = () => speicher.lies(S_TOKEN);

export const umleitungsZiel = () =>
  location.origin + location.pathname.replace(/index\.html$/, '');

export const angemeldet = () => !!gespeichert()?.refresh;
export const konto = () => gespeichert()?.konto || null;

/** Naht Entras 24-Stunden-Grenze? Ohne Zeitstempel sicherheitshalber ja. */
export function erneuerungFaellig() {
  const t = gespeichert();
  if (!t?.refresh) return false;
  if (!t.refreshAm) return true;
  return Date.now() - t.refreshAm > ERNEUERN_AB;
}

export const anmeldungNoetig = () => !!speicher.lies(S_NOETIG);
const anmeldungNoetigSetzen = (an) => (an ? speicher.schreib(S_NOETIG, true) : speicher.weg(S_NOETIG));

// ————————————————————————————————————————————————————————————————
// PKCE
// ————————————————————————————————————————————————————————————————

function zufall(laenge = 64) {
  const roh = crypto.getRandomValues(new Uint8Array(laenge));
  return btoa(String.fromCharCode(...roh)).replace(/[+/=]/g, '').slice(0, laenge);
}

async function s256(text) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function zurAnmeldeseite(prompt) {
  const verifier = zufall();
  sessionStorage.setItem(S_VERIFIER, verifier);
  const p = new URLSearchParams({
    client_id: KLIENT,
    response_type: 'code',
    redirect_uri: umleitungsZiel(),
    scope: RECHTE,
    code_challenge: await s256(verifier),
    code_challenge_method: 'S256',
    prompt,
  });
  location.assign(`https://login.microsoftonline.com/${MANDANT}/oauth2/v2.0/authorize?${p}`);
}

export async function anmelden() {
  anmeldungNoetigSetzen(false);
  await zurAnmeldeseite('select_account');
}

/** Stille Erneuerung. Zwei Riegel gegen eine Umleitungsschleife: ein Merker
 *  fuer den laufenden Versuch und ein Mindestabstand von zwei Minuten. */
export async function stillErneuern() {
  if (!angemeldet() || anmeldungNoetig()) return false;
  if (!navigator.onLine) return false;
  if (sessionStorage.getItem(S_STILL_LAEUFT)) return false;
  if (Date.now() - Number(sessionStorage.getItem(S_STILL) || 0) < 2 * 60 * 1000) return false;

  sessionStorage.setItem(S_STILL, String(Date.now()));
  sessionStorage.setItem(S_STILL_LAEUFT, '1');
  await zurAnmeldeseite('none');
  return true;
}

/** Beim Start aufrufen: holt den Code aus der URL, wenn wir gerade von der
 *  Microsoft-Anmeldung zurueckkommen. */
export async function rueckkehrPruefen() {
  const p = new URLSearchParams(location.search);
  const code = p.get('code');
  const fehler = p.get('error_description') || p.get('error');
  const still = !!sessionStorage.getItem(S_STILL_LAEUFT);
  if (!code && !fehler) return null;

  sessionStorage.removeItem(S_STILL_LAEUFT);
  history.replaceState({}, '', umleitungsZiel() + location.hash);

  if (fehler) {
    // Bei der stillen Erneuerung ist das der Normalfall, kein Stoerfall: die
    // Microsoft-Sitzung im Browser ist abgelaufen.
    if (still && /login_required|interaction_required|consent_required/i.test(fehler)) {
      anmeldungNoetigSetzen(true);
      return { ok: false, still: true, meldung: null };
    }
    return { ok: false, meldung: lesbarerFehler(fehler) };
  }

  const verifier = sessionStorage.getItem(S_VERIFIER);
  sessionStorage.removeItem(S_VERIFIER);
  if (!verifier) return { ok: false, meldung: 'Anmeldung abgelaufen — bitte erneut versuchen.' };

  try {
    await tokenHolen({
      grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: umleitungsZiel(),
    });
    anmeldungNoetigSetzen(false);
    return { ok: true, still };
  } catch (e) {
    if (still) { anmeldungNoetigSetzen(true); return { ok: false, still: true, meldung: null }; }
    return { ok: false, meldung: lesbarerFehler(e.message) };
  }
}

function lesbarerFehler(text) {
  if (/AADSTS9002326|redirect_uri|cross-origin/i.test(text)) {
    return 'Diese Adresse ist in Entra nicht als Einzelseitenanwendung (SPA) eingetragen: '
      + umleitungsZiel();
  }
  if (/AADSTS65001|consent/i.test(text)) return 'Eine Berechtigung wurde noch nicht erteilt.';
  return text;
}

async function tokenHolen(zusatz) {
  const res = await fetch(`https://login.microsoftonline.com/${MANDANT}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: KLIENT, scope: RECHTE, ...zusatz }),
  });
  const daten = await res.json();
  if (!res.ok) throw new Error(daten.error_description || daten.error || 'Anmeldung fehlgeschlagen');

  const alt = gespeichert() || {};
  speicher.schreib(S_TOKEN, {
    refresh: daten.refresh_token || alt.refresh,
    // Die 24-Stunden-Uhr nur zuruecksetzen, wenn wirklich ein neues
    // Aktualisierungs-Token kam.
    refreshAm: daten.refresh_token ? Date.now() : (alt.refreshAm || null),
    access: daten.access_token,
    gueltigBis: Date.now() + (daten.expires_in - 120) * 1000,
    konto: kontoAusToken(daten.id_token) || alt.konto,
  });
  return daten.access_token;
}

function kontoAusToken(idToken) {
  if (!idToken) return null;
  try {
    const nutzlast = JSON.parse(atob(idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return nutzlast.preferred_username || nutzlast.email || null;
  } catch { return null; }
}

async function gueltigerToken() {
  const t = gespeichert();
  if (!t?.refresh) throw new Error('Nicht bei Microsoft angemeldet.');
  if (t.access && Date.now() < t.gueltigBis) return t.access;
  try {
    return await tokenHolen({ grant_type: 'refresh_token', refresh_token: t.refresh });
  } catch (fehler) {
    if (/AADSTS700084|invalid_grant|AADSTS70008|expired/i.test(fehler.message || '')) {
      speicher.weg(S_TOKEN);
      anmeldungNoetigSetzen(true);
      throw new Error('Die Anmeldung bei Microsoft ist abgelaufen. Bitte in den Einstellungen neu anmelden.');
    }
    throw fehler;
  }
}

export function abmelden() {
  speicher.weg(S_TOKEN);
  anmeldungNoetigSetzen(false);
  sessionStorage.removeItem(S_STILL);
  sessionStorage.removeItem(S_STILL_LAEUFT);
}

/**
 * Ein Graph-Aufruf mit gueltigem Token.
 *
 * `roh` schickt den Koerper unveraendert (fuer Dateiinhalte), sonst wird als
 * JSON gesendet. Ein 404 ist kein Fehler, sondern die uebliche Antwort beim
 * ersten Mal — die Datei gibt es noch nicht.
 */
export async function graph(pfad, { methode = 'GET', koerper = null, roh = null, kopf = {} } = {}) {
  const token = await gueltigerToken();
  const res = await fetch(pfad.startsWith('http') ? pfad : GRAPH + pfad, {
    method: methode,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(koerper ? { 'Content-Type': 'application/json' } : {}),
      ...kopf,
    },
    body: roh !== null ? roh : (koerper ? JSON.stringify(koerper) : undefined),
  });
  if (res.status === 204) return null;
  if (res.status === 404) return { _nichtGefunden: true };
  const text = await res.text();
  const daten = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(daten?.error?.message || `Graph antwortete ${res.status}`);
  return daten;
}
