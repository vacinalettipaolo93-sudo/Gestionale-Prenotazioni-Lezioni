import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBs_cE6smOR1qvSpoc24kDY4uTRtQclPdQ",
  authDomain: "gestionale-prenotazioni-lezio.firebaseapp.com",
  databaseURL: "https://gestionale-prenotazioni-lezio-default-rtdb.firebaseio.com",
  projectId: "gestionale-prenotazioni-lezio",
  storageBucket: "gestionale-prenotazioni-lezio.appspot.com",
  messagingSenderId: "437487120297",
  appId: "1:437487120297:web:30895af62079b5301a1eb8"
};

// Inizializza Firebase (client-side)
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
