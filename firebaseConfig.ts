

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { 
    getFirestore, 
    collection, 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    onSnapshot, 
    Timestamp,
    query,
    where,
    getDocs,
    addDoc
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";


// --- CONFIGURAZIONE FIREBASE ---
export const firebaseConfig = {
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
let db: any = null;
let auth: any = null;
let getGoogleCalendarList: any = null;
let getGoogleCalendarAvailability: any = null;
let createGoogleCalendarEvent: any = null;
let setInitialAdmin: any = null;
let updateConfig: any = null;
const firestore = { Timestamp };

if (isFirebaseConfigValid) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    const functions = getFunctions(app, 'us-central1');

    // Funzioni callable che usano il token OAuth 2.0 per operazioni sicure
    getGoogleCalendarList = httpsCallable(functions, 'getGoogleCalendarList');
    getGoogleCalendarAvailability = httpsCallable(functions, 'getGoogleCalendarAvailability');
    createGoogleCalendarEvent = httpsCallable(functions, 'createGoogleCalendarEvent');
    setInitialAdmin = httpsCallable(functions, 'setInitialAdmin');
    updateConfig = httpsCallable(functions, 'updateConfig');

} else {
    if ((import.meta as any).env.DEV) {
        console.error("Errore critico: la configurazione di Firebase non è valida o è mancante in firebaseConfig.ts");
    }
}

export { 
    db, 
    firestore,
    auth,
    getGoogleCalendarList,
    getGoogleCalendarAvailability,
    createGoogleCalendarEvent,
    setInitialAdmin,
    updateConfig,
};