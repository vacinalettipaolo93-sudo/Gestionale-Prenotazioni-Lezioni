// Import the functions you need from the SDKs you need
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/functions';
import 'firebase/compat/auth';

// --- CONFIGURAZIONE FIREBASE ---
// I valori di configurazione sono stati inseriti direttamente in questo file.
const firebaseConfig = {
  apiKey: "AIzaSyBs_cE6smOR1qvSpoc24kDY4uTRtQclPdQ",
  authDomain: "gestionale-prenotazioni-lezio.firebaseapp.com",
  databaseURL: "https://gestionale-prenotazioni-lezio-default-rtdb.firebaseio.com",
  projectId: "gestionale-prenotazioni-lezio",
  storageBucket: "gestionale-prenotazioni-lezio.appspot.com",
  messagingSenderId: "437487120297",
  appId: "1:437487120297:web:30895af62079b5301a1eb8"
};


export const isFirebaseConfigValid = !!firebaseConfig.apiKey;

// Declare variables that will hold Firebase services.
// They will be null if the configuration is invalid.
let db: firebase.firestore.Firestore | null = null;
let auth: firebase.auth.Auth | null = null;
let checkGoogleAuthStatus: firebase.functions.HttpsCallable | null = null;
let getGoogleCalendarList: firebase.functions.HttpsCallable | null = null;
let getGoogleCalendarAvailability: firebase.functions.HttpsCallable | null = null;
let createGoogleCalendarEvent: firebase.functions.HttpsCallable | null = null;
let getServiceAccountEmail: firebase.functions.HttpsCallable | null = null;

// The firestore namespace can be exported directly. It doesn't depend on initialization.
const firestore = firebase.firestore;

// Initialize Firebase and its services only if the config is valid.
if (isFirebaseConfigValid) {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    // Now that the app is initialized, we can safely get the service instances.
    db = firebase.firestore();
    auth = firebase.auth();
    const functions = firebase.app().functions('us-central1');

    // Funzioni callable con timeout
    checkGoogleAuthStatus = functions.httpsCallable('checkGoogleAuthStatus', { timeout: 30000 }); // 30s
    getGoogleCalendarList = functions.httpsCallable('getGoogleCalendarList', { timeout: 60000 }); // 60s
    getGoogleCalendarAvailability = functions.httpsCallable('getGoogleCalendarAvailability', { timeout: 60000 }); // 60s
    createGoogleCalendarEvent = functions.httpsCallable('createGoogleCalendarEvent', { timeout: 60000 }); // 60s
    getServiceAccountEmail = functions.httpsCallable('getServiceAccountEmail');
} else {
    // Only show this error in development to avoid console noise in production
    // FIX: The Vite client types seem to be unavailable, causing a type error on `import.meta.env`.
    // Using a type assertion as a workaround.
    if ((import.meta as any).env.DEV) {
        console.error("Errore critico: la configurazione di Firebase non è valida o è mancante in firebaseConfig.ts");
    }
}

export { 
    db, 
    firestore,
    auth,
    checkGoogleAuthStatus, 
    getGoogleCalendarList,
    getGoogleCalendarAvailability,
    createGoogleCalendarEvent,
    getServiceAccountEmail,
};
