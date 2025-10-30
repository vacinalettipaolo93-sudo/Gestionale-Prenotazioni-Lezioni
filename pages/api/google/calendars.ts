import type { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';
import { initFirebaseAdmin } from '../../lib/firebaseAdmin';

initFirebaseAdmin();
const admin = require('firebase-admin');

async function verifyIdToken(req: NextApiRequest) {
  const header = req.headers.authorization as string | undefined;
  if (!header || !header.startsWith('Bearer ')) throw new Error('Missing Authorization header');
  const idToken = header.split('Bearer ')[1];
  const decoded = await admin.auth().verifyIdToken(idToken);
  return decoded;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const decoded = await verifyIdToken(req);
    const email = decoded.email as string;
    if (!email) return res.status(400).json({ error: 'User email missing' });

    const doc = await admin.firestore().collection('google_tokens').doc(email).get();
    if (!doc.exists) return res.status(404).json({ error: 'No refresh token stored for this user' });
    const refreshToken = doc.data()?.refresh_token;
    if (!refreshToken) return res.status(404).json({ error: 'No refresh token' });

    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const redirectUri = process.env.OAUTH_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL}/api/google/callback`;
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const list = await calendar.calendarList.list();
    return res.status(200).json({ calendars: list.data.items || [] });
  } catch (err: any) {
    console.error('calendars error', err);
    return res.status(500).json({ error: err.message || 'Failed to list calendars' });
  }
}
