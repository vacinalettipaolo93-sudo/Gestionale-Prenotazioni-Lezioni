// Import the functions you need from the SDKs you need
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

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

// Initialize Firebase only once (guard for SSR/HMR)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Export the Firestore instance and the firestore namespace as named exports
export const db = firebase.firestore();
export const firestore = firebase.firestore;

// Also export firebase as default if other files expect default import
export default firebase;