// Import the functions you need from the SDKs you need
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/functions';
import 'firebase/compat/auth';

// --- ISTRUZIONI IMPORTANTI ---
// DEVI CREARE un file chiamato `.env.local` nella cartella principale del progetto (la stessa di `package.json`).
// Questo file è essenziale per far funzionare l'applicazione in locale.
// Vite caricherà automaticamente queste variabili.
//
// Copia e incolla il seguente contenuto nel tuo file .env.local e sostituisci i valori
// con le tue credenziali reali che trovi nella console di Firebase:
//
// VITE_FIREBASE_API_KEY="AIza..."
// VITE_FIREBASE_AUTH_DOMAIN="tuo-progetto.firebaseapp.com"
// VITE_FIREBASE_DATABASE_URL="https://tuo-progetto.firebaseio.com"
// VITE_FIREBASE_PROJECT_ID="tuo-progetto"
// VITE_FIREBASE_STORAGE_BUCKET="tuo-progetto.appspot.com"
// VITE_FIREBASE_MESSAGING_SENDER_ID="1234567890"
// VITE_FIREBASE_APP_ID="1:1234567890:web:..."

const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env?.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env?.VITE_FIREBASE_APP_ID
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
    // @ts-ignore - import.meta.env is a Vite specific feature
    if (import.meta.env?.DEV) {
        console.error("Errore critico: la configurazione di Firebase non è stata trovata. Assicurati di aver creato un file .env.local con le tue chiavi VITE_FIREBASE_... come descritto in firebaseConfig.ts");
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