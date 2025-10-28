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
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};


// Initialize Firebase.
if (!firebase.apps.length) {
    if (!firebaseConfig.apiKey) {
        console.error("Errore critico: la configurazione di Firebase non è stata trovata. Assicurati di aver creato un file .env.local con le tue chiavi VITE_FIREBASE_... come descritto in firebaseConfig.ts");
        // Potresti voler mostrare un messaggio di errore all'utente qui
    } else {
        firebase.initializeApp(firebaseConfig);
    }
}

// Get and export the instances and the firestore namespace
const db = firebase.firestore();
const firestore = firebase.firestore;
const functions = firebase.app().functions('us-central1');
const auth = firebase.auth();

// Funzioni callable con timeout
const checkGoogleAuthStatus = functions.httpsCallable('checkGoogleAuthStatus', { timeout: 30000 }); // 30s
const getGoogleCalendarList = functions.httpsCallable('getGoogleCalendarList', { timeout: 60000 }); // 60s
const getGoogleCalendarAvailability = functions.httpsCallable('getGoogleCalendarAvailability', { timeout: 60000 }); // 60s
const createGoogleCalendarEvent = functions.httpsCallable('createGoogleCalendarEvent', { timeout: 60000 }); // 60s
const getServiceAccountEmail = functions.httpsCallable('getServiceAccountEmail');


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