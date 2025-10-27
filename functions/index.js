const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { google } = require("googleapis");
const path = require("path");
const fs = require("fs");

admin.initializeApp();

const CREDENTIALS_PATH = path.join(__dirname, "credentials.json");

let credentials;
try {
  const content = fs.readFileSync(CREDENTIALS_PATH);
  credentials = JSON.parse(content);
} catch (error) {
  console.error("Errore nel leggere o parsare il file credentials.json:", error);
}

const getOAuth2Client = (redirectUri) => {
  const { client_secret, client_id } = credentials.web;
  return new google.auth.OAuth2(client_id, client_secret, redirectUri);
};

exports.authorizeGoogle = functions.https.onRequest((req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "GET");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Max-Age", "3600");
    res.status(204).send("");
    return;
  }
  try {
    const { redirect_uris } = credentials.web;
    const oAuth2Client = getOAuth2Client(redirect_uris[0]);
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.readonly",
      ],
      prompt: "consent",
    });
    res.status(200).send({ authUrl });
  } catch (error) {
    console.error("Errore in authorizeGoogle:", error);
    res.status(500).send("Errore durante la creazione dell'URL di autorizzazione.");
  }
});

exports.googleCallback = functions.https.onRequest(async (req, res) => {
  const code = req.query.code;
  if (!code) {
    res.status(400).send("Codice di autorizzazione mancante.");
    return;
  }
  try {
    const { redirect_uris } = credentials.web;
    const oAuth2Client = getOAuth2Client(redirect_uris[0]);
    const { tokens } = await oAuth2Client.getToken(code);
    await admin.firestore().collection("secrets").doc("googleApiTokens").set({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date,
    });
    res.status(200).send(`
      <html><head><style>body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f0f4f8; } div { text-align: center; padding: 40px; background-color: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); } h1 { color: #27ae60; } p { color: #333; }</style></head><body><div><h1>Autorizzazione completata con successo!</h1><p>Ora puoi chiudere questa finestra e tornare al pannello di amministrazione.</p></div></body></html>
    `);
  } catch (error) {
    console.error("Errore durante lo scambio del codice con i token:", error);
    res.status(500).send("Errore durante l'ottenimento dei token di accesso.");
  }
});

async function getAuthenticatedClient() {
  const tokenDoc = await admin.firestore().collection("secrets").doc("googleApiTokens").get();
  if (!tokenDoc.exists) {
    throw new Error("Token non trovati in Firestore. Eseguire prima l'autorizzazione.");
  }
  const tokens = tokenDoc.data();
  const { redirect_uris } = credentials.web;
  const oAuth2Client = getOAuth2Client(redirect_uris[0]);
  oAuth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiryDate,
  });
  return new Promise((resolve, reject) => {
    oAuth2Client.getAccessToken((err, newAccessToken, response) => {
        if (err) {
            return reject(new Error("Impossibile aggiornare il token di accesso: " + err));
        }
        // Il nuovo access token potrebbe essere diverso, o potrebbe esserci una nuova expiry_date
        const newTokens = response.credentials;
        if (newTokens.access_token !== tokens.accessToken || newTokens.expiry_date !== tokens.expiryDate) {
            admin.firestore().collection("secrets").doc("googleApiTokens").update({
                accessToken: newTokens.access_token,
                expiryDate: newTokens.expiry_date,
            }).then(() => {
                oAuth2Client.setCredentials(newTokens); // Assicura che il client usi i token più recenti
                resolve(oAuth2Client);
            }).catch(reject);
        } else {
            resolve(oAuth2Client);
        }
    });
  });
}

exports.getGoogleCalendarAvailability = functions.https.onCall(async (data, context) => {
  const { timeMin, timeMax, calendarIds } = data;
  if (!timeMin || !timeMax || !calendarIds || !Array.isArray(calendarIds)) {
    throw new functions.https.HttpsError("invalid-argument", "timeMin, timeMax e calendarIds (array) sono richiesti.");
  }
  try {
    const oAuth2Client = await getAuthenticatedClient();
    const calendar = google.calendar({ version: "v3", auth: oAuth2Client });
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: timeMin,
        timeMax: timeMax,
        items: calendarIds.map((id) => ({ id: id })),
      },
    });
    const busySlots = [];
    for (const calId in response.data.calendars) {
      if (response.data.calendars.hasOwnProperty(calId)) {
        const calendarData = response.data.calendars[calId];
        if (calendarData.busy) {
          calendarData.busy.forEach((slot) => {
            busySlots.push({ start: slot.start, end: slot.end });
          });
        }
      }
    }
    return { busy: busySlots };
  } catch (error) {
    console.error("Errore in getGoogleCalendarAvailability:", error.message);
    if (error.message.includes("Token non trovati")) {
      throw new functions.https.HttpsError("unauthenticated", "Autorizzazione Google richiesta.");
    }
    throw new functions.https.HttpsError("internal", "Errore nel recuperare la disponibilità del calendario.");
  }
});

exports.createGoogleCalendarEvent = functions.https.onCall(async (data, context) => {
  const { event, calendarId, sendUpdates } = data;
  if (!event || !calendarId) {
    throw new functions.https.HttpsError("invalid-argument", "L'oggetto 'event' e 'calendarId' sono richiesti.");
  }
  try {
    const oAuth2Client = await getAuthenticatedClient();
    const calendar = google.calendar({ version: "v3", auth: oAuth2Client });
    const result = await calendar.events.insert({
      calendarId: calendarId,
      resource: event,
      sendUpdates: sendUpdates || "none",
    });
    return { success: true, eventId: result.data.id, eventLink: result.data.htmlLink };
  } catch (error) {
    console.error("Errore in createGoogleCalendarEvent:", error.message);
    if (error.message.includes("Token non trovati")) {
      throw new functions.https.HttpsError("unauthenticated", "Autorizzazione Google richiesta.");
    }
    throw new functions.https.HttpsError("internal", "Errore durante la creazione dell'evento su Google Calendar.");
  }
});

exports.checkGoogleAuthStatus = functions.https.onCall(async (data, context) => {
  try {
    const tokenDoc = await admin.firestore().collection("secrets").doc("googleApiTokens").get();
    return { isSignedIn: tokenDoc.exists && !!tokenDoc.data().refreshToken };
  } catch (error) {
    console.error("Errore in checkGoogleAuthStatus:", error);
    return { isSignedIn: false };
  }
});

exports.signOutGoogle = functions.https.onCall(async (data, context) => {
  try {
    const tokenDocRef = admin.firestore().collection("secrets").doc("googleApiTokens");
    const tokenDoc = await tokenDocRef.get();
    if (tokenDoc.exists) {
        const tokens = tokenDoc.data();
        if (tokens.refreshToken) {
            const oAuth2Client = getOAuth2Client(credentials.web.redirect_uris[0]);
            try {
                await oAuth2Client.revokeToken(tokens.refreshToken);
            } catch(e) {
                console.warn("Revoca del refresh token fallita (potrebbe essere già stato revocato):", e.message);
            }
        }
        await tokenDocRef.delete();
    }
    return { success: true };
  } catch (error) {
    console.error("Errore in signOutGoogle:", error);
    throw new functions.https.HttpsError("internal", "Errore durante il logout da Google.");
  }
});

// NUOVA FUNZIONE per ottenere la lista dei calendari
exports.getGoogleCalendarList = functions.https.onCall(async (data, context) => {
  try {
    const oAuth2Client = await getAuthenticatedClient();
    const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

    const response = await calendar.calendarList.list({
        // minAccessRole: 'writer' // Puoi filtrare se vuoi solo calendari modificabili
    });

    if (!response.data.items) {
        return { calendars: [] };
    }

    const calendarList = response.data.items.map(cal => ({
        id: cal.id,
        summary: cal.summary,
        accessRole: cal.accessRole
    }));

    return { calendars: calendarList };
  } catch (error) {
    console.error("Errore in getGoogleCalendarList:", error.message);
    if (error.message.includes("Token non trovati")) {
      throw new functions.https.HttpsError("unauthenticated", "Autorizzazione Google richiesta.");
    }
    throw new functions.https.HttpsError("internal", "Errore nel recuperare l'elenco dei calendari.");
  }
});