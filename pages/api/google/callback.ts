import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';
import { initFirebaseAdmin } from '../../lib/firebaseAdmin';

initFirebaseAdmin();
const db = (await Promise.resolve()).then(() => require('firebase-admin').firestore()); // lazy access

function renderResultPage(success: boolean, message: string) {
  return `<!doctype html>
  <html>
    <head><meta charset="utf-8"/><title>Google Connect</title></head>
    <body>
      <script>
        try {
          const payload = { success: ${success}, message: ${JSON.stringify(message)} };
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(payload, '*');
          }
        } catch(e){}
        document.body.innerHTML = "<p>${message}</p><p>Puoi chiudere questa finestra.</p>";
        setTimeout(() => { window.close(); }, 1200);
      </script>
    </body>
  </html>`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const code = req.query.code as string | undefined;
  if (!code) return res.status(400).send('Missing code');

  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri = process.env.OAUTH_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL}/api/google/callback`;
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens as any);

    const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
    const { data: profile } = await oauth2.userinfo.get();
    const email = profile?.email;
    if (!email) {
      return res.send(renderResultPage(false, 'Impossibile ottenere l\'email dell\'account Google.'));
    }

    if (tokens.refresh_token) {
      // salva refresh token in Firestore: collection google_tokens doc id = email
      const admin = require('firebase-admin');
      await admin.firestore().collection('google_tokens').doc(email).set({
        refresh_token: tokens.refresh_token,
        saved_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      return res.send(renderResultPage(true, 'Autorizzazione ricevuta. Puoi chiudere questa finestra.'));
    } else {
      // Se non ricevi refresh_token -> probabilmente l'utente aveva già autorizzato
      return res.send(renderResultPage(false, 'Refresh token non ricevuto. Revoca l\'accesso e riprova con prompt=consent.'));
    }
  } catch (err: any) {
    console.error('oauth callback error', err);
    return res.send(renderResultPage(false, 'Errore durante la callback: ' + (err.message || err)));
  }
}
