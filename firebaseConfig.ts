// Import the functions you need from the SDKs you need
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/functions';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBs_cE6smOR1qvSpoc24kDY4uTRtQclPdQ",
  authDomain: "gestionale-prenotazioni-lezio.firebaseapp.com",
  databaseURL: "https://gestionale-prenotazioni-lezio-default-rtdb.firebaseio.com",
  projectId: "gestionale-prenotazioni-lezio",
  storageBucket: "gestionale-prenotazioni-lezio.firebasestorage.app",
  messagingSenderId: "437487120297",
  appId: "1:437487120297:web:30895af62079b5301a1eb8"
};

// Initialize Firebase.
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Get and export the Firestore instance and the firestore namespace
const db = firebase.firestore();
const firestore = firebase.firestore;
const functions = firebase.app().functions('us-central1');

// Funzioni callable
const checkGoogleAuthStatus = functions.httpsCallable('checkGoogleAuthStatus');
const getGoogleCalendarList = functions.httpsCallable('getGoogleCalendarList');
const getGoogleCalendarAvailability = functions.httpsCallable('getGoogleCalendarAvailability');
const createGoogleCalendarEvent = functions.httpsCallable('createGoogleCalendarEvent');


export { 
    db, 
    firestore, 
    checkGoogleAuthStatus, 
    getGoogleCalendarList,
    getGoogleCalendarAvailability,
    createGoogleCalendarEvent,
};
