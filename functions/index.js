
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
    // This error will be handled by the caller, which knows if it's a missing config or an error.
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
    // Create a new error with a more descriptive message to be thrown.
    const augmentedError = new Error(detailedMessage);
    augmentedError.stack = error.stack; // Preserve the original stack for debugging
    throw augmentedError;
  }
};

const handleApiError = (error, functionName) => {
    // Log the full error for better debugging in Firebase logs using util.inspect.
    console.error(`Errore in ${functionName}:`, util.inspect(error, {depth: null}));

    // If it's already an HttpsError (thrown by a dependency or us), rethrow it.
    if (error.code && error.httpErrorCode) {
        throw error;
    }

    // Create a detailed message from various possible error structures.
    // Prioritize more specific Google API error formats.
    let serverMessage = `Si è verificato un errore sconosciuto in ${functionName}.`;
    
    if (error.response?.data?.error?.message) {
        // Gaxios error structure (most common for Google APIs)
        serverMessage = error.response.data.error.message;
    } else if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
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
            // The initial value of serverMessage will be used as a fallback.
        }
    }
    
    // The client SDK sometimes replaces the 'message' for 'internal' errors.
    // The 'details' object is the reliable way to pass custom error data.
    // We also pass the message directly in case the client misses the details.
    throw new functions.https.HttpsError('internal', serverMessage, { serverMessage });
};

// --- FUNZIONI CALLABLE DAL FRONTEND ---

exports.checkGoogleAuthStatus = functions.https.onCall(async (data, context) => {
    const credentialsPath = path.resolve(__dirname, "./credentials.json");
    if (!fs.existsSync(credentialsPath)) {
        // If the file does not exist, it's a "not configured" state.
        return { isConfigured: false };
    }
    
    try {
        // A more robust check: attempt a real, lightweight API call.
        const authClient = await getAuthenticatedClient();
        const calendar = google.calendar({ version: "v3", auth: authClient });
        
        // This call will fail if the API is not enabled or auth is fundamentally broken.
        await calendar.calendarList.list({ maxResults: 1 });
        
        // If the call succeeds, the backend is configured correctly.
        return { isConfigured: true };
    } catch (error) {
        // Use the centralized error handler for consistent error propagation.
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
        // Now we propagate the error because the frontend depends on the result.
        handleApiError(error, 'createGoogleCalendarEvent');
    }
});
