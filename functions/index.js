const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { google } = require("googleapis");
const path = require("path");
const fs = require("fs");

admin.initializeApp();

// --- CONFIGURAZIONE CON SERVICE ACCOUNT ---

const getAuthenticatedClient = async () => {
  const credentialsPath = path.resolve(__dirname, "./credentials.json");
  if (!fs.existsSync(credentialsPath)) {
    // Questo errore verrà gestito dal chiamante, che sa se è una configurazione mancante o un errore.
    throw new Error("File credentials.json non trovato nella cartella /functions.");
  }

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: [
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.readonly",
      ],
    });
    return await auth.getClient();
  } catch (error) {
    console.error("getAuthenticatedClient failed:", error.message);
    let detailedMessage = `Errore di autenticazione: ${error.message}.`;
    if (error.message && error.message.toLowerCase().includes('api is not enabled')) {
        detailedMessage += " Assicurati che l'API di Google Calendar sia abilitata nel tuo progetto Google Cloud.";
    } else {
        detailedMessage += " Assicurati che il file 'credentials.json' sia valido e non corrotto.";
    }
    // Crea un nuovo errore con un messaggio più descrittivo per essere lanciato.
    const augmentedError = new Error(detailedMessage);
    augmentedError.stack = error.stack; // Conserva lo stack originale per il debug
    throw augmentedError;
  }
};

const handleApiError = (error, functionName) => {
    console.error(`Errore in ${functionName}:`, error.message);
    // Se è già un HttpsError (lanciato da una dipendenza o da noi), rilancialo
    if (error.code && error.httpErrorCode) {
        throw error;
    }
    // Altrimenti, incapsulalo in un nuovo HttpsError
    throw new functions.https.HttpsError('internal', error.message || `Errore sconosciuto in ${functionName}.`);
};

// --- FUNZIONI CALLABLE DAL FRONTEND ---

exports.checkGoogleAuthStatus = functions.https.onCall(async (data, context) => {
    const credentialsPath = path.resolve(__dirname, "./credentials.json");
    if (!fs.existsSync(credentialsPath)) {
        // Se il file non esiste, è uno stato di "non configurato", non un errore.
        return { isConfigured: false };
    }
    
    try {
        // Il file esiste, ora proviamo a usarlo per una verifica completa.
        await getAuthenticatedClient();
        return { isConfigured: true };
    } catch (error) {
        console.error("checkGoogleAuthStatus fallito durante il tentativo di autenticazione:", error.message);
        // Il file esiste ma non è valido o le API sono disabilitate. Questo è uno stato di errore.
        throw new functions.https.HttpsError('internal', error.message);
    }
});


exports.getGoogleCalendarList = functions.https.onCall(async (data, context) => {
    try {
        const authClient = await getAuthenticatedClient();
        const calendar = google.calendar({ version: "v3", auth: authClient });
        const res = await calendar.calendarList.list();
        return { calendars: res.data.items };
    } catch (error) {
        handleApiError(error, 'getGoogleCalendarList');
    }
});

exports.getGoogleCalendarAvailability = functions.https.onCall(async (data, context) => {
    const { timeMin, timeMax, calendarIds } = data;
    
    if (!timeMin || !timeMax || !calendarIds) {
        throw new functions.https.HttpsError('invalid-argument', 'Parametri timeMin, timeMax e calendarIds richiesti.');
    }
    
    try {
        const authClient = await getAuthenticatedClient();
        const calendar = google.calendar({ version: "v3", auth: authClient });
        const res = await calendar.freebusy.query({
            requestBody: {
                timeMin,
                timeMax,
                items: calendarIds.map(id => ({ id })),
                timeZone: 'Europe/Rome',
            },
        });
        
        let busySlots = [];
        if (res.data.calendars) {
            for (const calId in res.data.calendars) {
                if (res.data.calendars[calId] && res.data.calendars[calId].busy) {
                    busySlots = busySlots.concat(res.data.calendars[calId].busy);
                }
            }
        }

        return { busy: busySlots };
    } catch (error) {
        handleApiError(error, 'getGoogleCalendarAvailability');
    }
});

exports.createGoogleCalendarEvent = functions.https.onCall(async (data, context) => {
    const { event, calendarId, sendUpdates } = data;
    if (!event || !calendarId) {
        throw new functions.https.HttpsError("invalid-argument", "L'oggetto 'event' e 'calendarId' sono richiesti.");
    }
    
    try {
        const authClient = await getAuthenticatedClient();
        const calendar = google.calendar({ version: "v3", auth: authClient });
        const createdEvent = await calendar.events.insert({
            calendarId: calendarId,
            requestBody: event,
            sendUpdates: sendUpdates || 'none',
        });
        return { success: true, eventId: createdEvent.data.id };
    } catch (error) {
        // Per questa specifica funzione, non lanciamo un errore per non interrompere la conferma
        // all'utente, ma registriamo l'errore e informiamo il frontend.
        console.error("Errore API Google Calendar (create event):", error.message);
        return { success: false, reason: "API Error", error: error.message };
    }
});
