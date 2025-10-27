
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { google } = require("googleapis");
const path = require("path");
const fs = require("fs");
const util = require("util"); // For better object logging

admin.initializeApp();

// --- CONFIGURAZIONE CON SERVICE ACCOUNT ---

const getAuthenticatedClient = async () => {
  const credentialsPath = path.resolve(__dirname, "./credentials.json");
  if (!fs.existsSync(credentialsPath)) {
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
    const augmentedError = new Error(detailedMessage);
    augmentedError.stack = error.stack;
    throw augmentedError;
  }
};

const handleApiError = (error, functionName) => {
    console.error(`Errore dettagliato in ${functionName}:`, util.inspect(error, {depth: 5}));

    if (error.code && error.httpErrorCode) {
        throw error;
    }

    let serverMessage = `Si è verificato un errore in ${functionName}.`;
    let statusCode = '';

    if (error.code) {
        statusCode = `(Codice: ${error.code}) `;
    } else if (error.response?.status) {
        statusCode = `(Status: ${error.response.status}) `;
    }

    // Attempt to extract the most specific message from Google API error formats
    if (error.response?.data?.error?.message) {
        // Gaxios error structure (most common)
        serverMessage = error.response.data.error.message;
    } else if (error.errors && Array.isArray(error.errors) && error.errors.length > 0 && error.errors[0].message) {
        // Alternative Google API error structure: { errors: [ { message: '...' } ] }
        serverMessage = error.errors.map((e) => e.message).join("; ");
    } else if (error instanceof Error) {
        serverMessage = error.message;
    } else if (typeof error === 'string') {
        serverMessage = error;
    } else {
        try {
            serverMessage = JSON.stringify(error);
        } catch (e) {
            // Fallback is already set
        }
    }
    
    const finalMessage = `${statusCode}${serverMessage}`;
    throw new functions.https.HttpsError('internal', finalMessage, { serverMessage: finalMessage });
};

// --- FUNZIONI CALLABLE DAL FRONTEND ---

exports.checkGoogleAuthStatus = functions.https.onCall(async (data, context) => {
    const credentialsPath = path.resolve(__dirname, "./credentials.json");
    if (!fs.existsSync(credentialsPath)) {
        return { isConfigured: false };
    }
    
    try {
        const authClient = await getAuthenticatedClient();
        const calendar = google.calendar({ version: "v3", auth: authClient });
        
        await calendar.calendarList.list({ maxResults: 1 });
        
        return { isConfigured: true };
    } catch (error) {
        handleApiError(error, 'checkGoogleAuthStatus');
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

        return { 
            success: true, 
            eventId: createdEvent.data.id,
            eventUrl: createdEvent.data.htmlLink,
        };
    } catch (error) {
        handleApiError(error, 'createGoogleCalendarEvent');
    }
});
