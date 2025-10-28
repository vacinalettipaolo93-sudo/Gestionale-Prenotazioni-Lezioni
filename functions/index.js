const {onCall, HttpsError} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const {google} = require("googleapis");

// Initialize Firebase Admin SDK. It will automatically use the
// service account credentials from the Cloud Functions environment.
admin.initializeApp();

// Create a Google Auth client that uses the Application Default Credentials.
// This is the standard way to authenticate in a GCP environment.
const auth = new google.auth.GoogleAuth({
  scopes: [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
  ],
});


async function getAuthenticatedClient() {
  try {
    const authClient = await auth.getClient();
    return authClient;
  } catch (error) {
    console.error("Error getting authenticated client:", error);
    // Provide a more helpful error message for the developer.
    throw new HttpsError("internal",
        "Failed to authenticate with Google APIs. This can happen if the Google Calendar API is not enabled in your Google Cloud project, or if the service account lacks permissions. Please check the function logs for more details.",
        { serverMessage: error.message });
  }
}

const handleApiError = (error, functionName) => {
    // Log the full error for server-side debugging, which is crucial.
    console.error(`ERROR IN ${functionName}:`, error);

    let specificMessage = "An unexpected server error occurred.";
    if (error.response?.data?.error?.message) {
        specificMessage = error.response.data.error.message;
    } else if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
        specificMessage = error.errors.map((e) => e.message).join('; ');
    } else if (error.message) {
        specificMessage = error.message;
    }
    
    // Check for HttpsError and rethrow if it's already in the correct format.
    if (error.code && error.httpErrorCode) {
        throw error;
    }

    const statusCode = error.code || error.response?.status;
    const finalMessage = statusCode ? `(Errore ${statusCode}) ${specificMessage}` : specificMessage;

    throw new HttpsError('internal', finalMessage, { serverMessage: finalMessage });
};


// --- FUNZIONI CALLABLE DAL FRONTEND ---

exports.getServiceAccountEmail = onCall(async (request) => {
    // This function must be called by an authenticated admin user.
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    try {
        // Get the project ID from the initialized admin SDK, which is the most reliable way.
        const projectId = admin.app().options.projectId;
        
        if (!projectId) {
            console.error("Could not determine project ID from Firebase Admin SDK.");
            throw new HttpsError("internal", "Unable to determine project ID.");
        }
        
        // The default service account email follows a standard format.
        const serviceAccountEmail = `${projectId}@appspot.gserviceaccount.com`;
        
        return { email: serviceAccountEmail };

    } catch (error) {
        handleApiError(error, 'getServiceAccountEmail');
    }
});


exports.checkGoogleAuthStatus = onCall(async (request) => {
    try {
        const authClient = await getAuthenticatedClient();
        const calendar = google.calendar({ version: "v3", auth: authClient });
        
        const res = await calendar.calendarList.list({
            maxResults: 250,
            // Request more fields for better error reporting
            fields: 'items(summary,accessRole)', 
        });

        const calendars = res.data?.items || [];

        // Log for debugging
        console.log(`Found ${calendars.length} calendars for the service account.`);
        calendars.forEach(cal => {
            console.log(`- ${cal.summary} (Access: ${cal.accessRole})`);
        });

        const hasWriterAccess = calendars.some(
            (cal) => cal.accessRole === 'writer' || cal.accessRole === 'owner'
        );
        
        if (hasWriterAccess) {
            return { isConfigured: true };
        } 
        
        // If we're here, no writable calendars were found. Let's build a better error message.
        if (calendars.length === 0) {
            return { 
                isConfigured: false, 
                error: 'Nessun calendario trovato. Assicurati di aver condiviso almeno un calendario con l\'email del Service Account e attendi qualche minuto per la propagazione dei permessi.' 
            };
        } else {
            const detectedCalendarsString = calendars
                .map(c => `"${c.summary}" (Permesso: ${c.accessRole})`)
                .join(', ');
            return { 
                isConfigured: false, 
                error: `Sono stati trovati dei calendari, ma nessuno con i permessi di scrittura. Calendari rilevati: [${detectedCalendarsString}]. Assicurati che per almeno uno sia impostato "Apportare modifiche agli eventi".`
            };
        }

    } catch (error) {
        console.error("Google Auth status check failed:", error);
        
        let specificMessage = error.message || "An unexpected error occurred during auth status check.";
        if (error.response?.data?.error?.message) {
            specificMessage = error.response.data.error.message;
        } else if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
            specificMessage = error.errors.map((e) => e.message).join('; ');
        }
        
        if (specificMessage.includes("API has not been used") || specificMessage.includes("is disabled")) {
            specificMessage = "L'API di Google Calendar non è abilitata per questo progetto Google Cloud. Segui il link nella guida per abilitarla. Dettagli: " + specificMessage;
        }

        return { isConfigured: false, error: specificMessage };
    }
});


exports.getGoogleCalendarList = onCall(async (request) => {
    // This function must be called by an authenticated admin user.
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    try {
        const authClient = await getAuthenticatedClient();
        const calendar = google.calendar({ version: "v3", auth: authClient });
        
        const res = await calendar.calendarList.list({
            maxResults: 250,
            fields: 'items(id,summary,accessRole)',
        });
        
        const calendars = (res.data && res.data.items) ? res.data.items : [];
        return { calendars: calendars };

    } catch (error) {
        handleApiError(error, 'getGoogleCalendarList');
    }
});

exports.getGoogleCalendarAvailability = onCall({ timeoutSeconds: 120 }, async (request) => {
    const { timeMin, timeMax, calendarIds } = request.data;
    
    if (!timeMin || !timeMax || !calendarIds || !Array.isArray(calendarIds) || calendarIds.length === 0) {
        // If no calendars are selected to check against, return no busy slots.
        return { busy: [] };
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

exports.createGoogleCalendarEvent = onCall({ timeoutSeconds: 120 }, async (request) => {
    const { event, calendarId, sendUpdates } = request.data;
    if (!event || !calendarId) {
        throw new HttpsError("invalid-argument", "L'oggetto 'event' e 'calendarId' sono richiesti.");
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