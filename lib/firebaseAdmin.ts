import admin from 'firebase-admin';

let initialized = false;

export function initFirebaseAdmin() {
  if (initialized) return admin;
  // FIREBASE_SERVICE_ACCOUNT deve contenere il JSON serializzato del service account
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // fallback: prova default application credentials (non sempre disponibile su Vercel)
    admin.initializeApp();
  }
  initialized = true;
  return admin;
}
