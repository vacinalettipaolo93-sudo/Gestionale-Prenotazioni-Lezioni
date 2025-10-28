
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {google} = require("googleapis");

initializeApp();

// Helper function to create an authenticated OAuth2 client from an access token.
const getAuthenticatedClientFromToken = (token) => {
    if (!token) {
        throw new HttpsError('unauthenticated', 'Missing Google authentication token.');
    }
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: token });
    return oauth2Client;
};


const handleApiError = (error, functionName) => {
    console.error(`ERROR IN ${functionName}:`, JSON.stringify(error, null, 2));

    if (error instanceof HttpsError) {
        throw error;
    }

    let specificMessage = "An unexpected server error occurred.";
    let statusCode = 500;

    if (error.response?.data?.error) {
        specificMessage = error.response.data.error.message || specificMessage;
        statusCode = error.response.data.error.code || statusCode;
    } else if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
        specificMessage = error.errors.map((e) => e.message).join('; ');
        statusCode = error.code || statusCode;
    } else if (error.message) {
        specificMessage = error.message;
    }

    let httpsErrorCode = 'internal';
    if (statusCode === 401 || statusCode === 403) {
        httpsErrorCode = 'unauthenticated';
        specificMessage = "Invalid or expired Google credentials. Please re-authenticate.";
    } else if (statusCode === 404) {
        httpsErrorCode = 'not-found';
    } else if (statusCode === 400) {
        httpsErrorCode = 'invalid-argument';
    }
    
    const finalMessage = `(Errore ${statusCode}) ${specificMessage}`;
    throw new HttpsError(httpsErrorCode, finalMessage, { serverMessage: finalMessage });
};


exports.getGoogleCalendarList = onCall({
    secrets: false,
}, async (request) => {
    // Firebase Auth user must be logged in.
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { googleAuthToken } = request.data;
    try {
        const authClient = getAuthenticatedClientFromToken(googleAuthToken);
        const calendar = google.calendar({ version: "v3", auth: authClient });
        
        const res = await calendar.calendarList.list({
            maxResults: 250,
            fields: 'items(id,summary,accessRole)',
            minAccessRole: 'reader'
        });
        
        const calendars = (res.data && res.data.items) ? res.data.items : [];
        return { calendars };

    } catch (error) {
        handleApiError(error, 'getGoogleCalendarList');
    }
});


exports.getGoogleCalendarAvailability = onCall({ timeoutSeconds: 120 }, async (request) => {
    const { timeMin, timeMax, calendarIds, googleAuthToken } = request.data;
    
    if (!timeMin || !timeMax || !calendarIds || !Array.isArray(calendarIds) || calendarIds.length === 0) {
        return { busy: [] }; // Nothing to check, return empty.
    }
    
    try {
        const authClient = getAuthenticatedClientFromToken(googleAuthToken);
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
                if (res.data.calendars[calId] && !res.data.calendars[calId].errors && res.data.calendars[calId].busy) {
                    busySlots = busySlots.concat(res.data.calendars[calId].busy);
                }
                 if (res.data.calendars[calId].errors) {
                    console.warn(`Errors checking free/busy for calendar ${calId}:`, res.data.calendars[calId].errors);
                }
            }
        }

        return { busy: busySlots };
    } catch (error) {
        handleApiError(error, 'getGoogleCalendarAvailability');
    }
});


exports.createGoogleCalendarEvent = onCall({ timeoutSeconds: 120 }, async (request) => {
    // This is called by the end-user, so it doesn't need Firebase Auth check.
    const { event, calendarId, sendUpdates, googleAuthToken } = request.data;
    if (!event || !calendarId || !googleAuthToken) {
        throw new HttpsError("invalid-argument", "L'oggetto 'event', 'calendarId' e 'googleAuthToken' sono richiesti.");
    }
    
    try {
        const authClient = getAuthenticatedClientFromToken(googleAuthToken);
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
