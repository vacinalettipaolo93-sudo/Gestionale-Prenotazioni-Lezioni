const {onCall, HttpsError} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { google } = require("googleapis");
const path = require("path");
const fs = require("fs");
const util = require("util");

// In CommonJS, __dirname è disponibile a livello globale, quindi non c'è bisogno della logica di import.meta.url.
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

    // Tenta di estrarre il messaggio più specifico dai formati di errore dell'API di Google
    if (error.response?.data?.error?.message) {
        // Struttura di errore Gaxios (più comune)
        serverMessage = error.response.data.error.message;
    } else if (error.errors && Array.isArray(error.errors) && error.errors.length > 0 && error.errors[0].message) {
        // Struttura di errore alternativa dell'API di Google: { errors: [ { message: '...' } ] }
        serverMessage = error.errors.map((e) => e.message).join("; ");
    } else if (error instanceof Error) {
        serverMessage = error.message;
    } else if (typeof error === 'string') {
        serverMessage = error;
    } else {
        try {
            serverMessage = JSON.stringify(error);
        } catch (e) {
            // Il fallback è già impostato
        }
    }
    
    const finalMessage = `${statusCode}${serverMessage}`;
    throw new HttpsError('internal', finalMessage, { serverMessage: finalMessage });
};

// --- FUNZIONI CALLABLE DAL FRONTEND ---

exports.checkGoogleAuthStatus = onCall({ timeoutSeconds: 120 }, async (request) => {
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


exports.getGoogleCalendarList = onCall({ timeoutSeconds: 120 }, async (request) => {
    try {
        const authClient = await getAuthenticatedClient();
        const calendar = google.calendar({ version: "v3", auth: authClient });
        
        let allCalendars = [];
        let pageToken = null;
        
        // Loop per gestire la paginazione e recuperare tutti i calendari disponibili.
        do {
            const res = await calendar.calendarList.list({
                maxResults: 250, // Massimo consentito per pagina
                pageToken: pageToken,
                // Richiedi solo i campi necessari per ridurre la dimensione del payload
                fields: 'items(id,summary,accessRole),nextPageToken',
            });

            if (res.data.items) {
                allCalendars = allCalendars.concat(res.data.items);
            }
            pageToken = res.data.nextPageToken;
        } while (pageToken);

        return { calendars: allCalendars };
    } catch (error) {
        handleApiError(error, 'getGoogleCalendarList');
    }
});

exports.getGoogleCalendarAvailability = onCall({ timeoutSeconds: 120 }, async (request) => {
    const { timeMin, timeMax, calendarIds } = request.data;
    
    if (!timeMin || !timeMax || !calendarIds) {
        throw new HttpsError('invalid-argument', 'Parametri timeMin, timeMax e calendarIds richiesti.');
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
