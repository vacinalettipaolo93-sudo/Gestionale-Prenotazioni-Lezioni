
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {google} = require("googleapis");

initializeApp();
const db = getFirestore();

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
    const errorDetails = error.response?.data?.error;

    if (errorDetails) {
        specificMessage = errorDetails.message || specificMessage;
        statusCode = errorDetails.code || statusCode;
    } else if (error.message) {
        specificMessage = error.message;
    }

    let httpsErrorCode = 'internal';
    if (statusCode === 403) {
        httpsErrorCode = 'permission-denied';
        const reason = errorDetails?.details?.[0]?.reason || '';
        const errorMessage = (errorDetails?.message || '').toLowerCase();
        
        if (errorMessage.includes('api has not been used') || errorMessage.includes('is disabled')) {
             specificMessage = "The Google Calendar API is not enabled for your project. Please enable it in your Google Cloud Console.";
        } else if (reason === 'forbidden' || errorMessage.includes('insufficient permission') || errorMessage.includes('required scopes')) {
            specificMessage = "Insufficient Permission. The application needs additional permissions to access this resource. Please re-authenticate.";
        } else {
            specificMessage = "You do not have permission to access this resource. Please check your Google Calendar sharing settings.";
        }
    } else if (statusCode === 401) {
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

// --- NEW SECURE FUNCTIONS ---

exports.setInitialAdmin = onCall({
    secrets: false,
}, async (request) => {
    const { googleAuthToken } = request.data;
    try {
        const authClient = getAuthenticatedClientFromToken(googleAuthToken);
        const userInfoClient = google.oauth2({ version: 'v2', auth: authClient });
        const userInfoRes = await userInfoClient.userinfo.get();
        const userEmail = userInfoRes.data.email;

        if (!userEmail) {
            throw new HttpsError('unauthenticated', 'Could not retrieve user email from token.');
        }

        const configDocRef = db.collection('configuration').doc('main');
        const configDoc = await configDocRef.get();

        if (configDoc.exists) {
            const configData = configDoc.data();
            if (configData.adminEmails && configData.adminEmails.length > 0) {
                // Admins already exist, do nothing.
                return { success: true, message: 'Admins already configured.' };
            }
        }
        
        // If doc doesn't exist or admin list is empty, set this user as the first admin.
        await configDocRef.set({ adminEmails: [userEmail] }, { merge: true });

        return { success: true, message: `User ${userEmail} set as the first administrator.` };

    } catch (error) {
        handleApiError(error, 'setInitialAdmin');
    }
});

exports.updateConfig = onCall({
    secrets: false,
}, async (request) => {
    const { googleAuthToken, configPayload } = request.data;
    if (!configPayload || typeof configPayload !== 'object') {
        throw new HttpsError('invalid-argument', 'The "configPayload" object is required.');
    }

    try {
        const authClient = getAuthenticatedClientFromToken(googleAuthToken);
        const userInfoClient = google.oauth2({ version: 'v2', auth: authClient });
        const userInfoRes = await userInfoClient.userinfo.get();
        const userEmail = userInfoRes.data.email;

        const configDocRef = db.collection('configuration').doc('main');
        const configDoc = await configDocRef.get();

        if (!configDoc.exists) {
            throw new HttpsError('not-found', 'Configuration document does not exist.');
        }
        
        const configData = configDoc.data();
        const currentAdmins = (configData.adminEmails || []).map(e => e.toLowerCase());

        if (currentAdmins.length === 0) {
             throw new HttpsError('permission-denied', 'Nessun amministratore è ancora configurato.');
        }

        if (!currentAdmins.includes(userEmail.toLowerCase())) {
            throw new HttpsError('permission-denied', 'Non sei autorizzato a eseguire questa azione.');
        }

        // Validate payload to prevent unwanted fields from being written
        const allowedFields = [
            'workingHours', 'dateOverrides', 'sportsData', 'consultantInfo',
            'slotInterval', 'minimumNoticeHours', 'googleCalendarIds', 'adminEmails'
        ];
        const invalidFields = Object.keys(configPayload).filter(key => !allowedFields.includes(key));
        if (invalidFields.length > 0) {
            throw new HttpsError('invalid-argument', `Invalid config fields: ${invalidFields.join(', ')}`);
        }
        
        await configDocRef.update(configPayload);

        return { success: true, message: 'Configuration updated successfully.' };

    } catch (error) {
        handleApiError(error, 'updateConfig');
    }
});


// --- EXISTING GOOGLE CALENDAR FUNCTIONS ---

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