import { auth } from '../firebaseConfig';

async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken();
}

export async function openOAuthPopup() {
  return new Promise<{ success: boolean; message?: string }>((resolve, reject) => {
    const w = 600, h = 700;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2.5;
    const url = `/api/google/oauth`;
    const popup = window.open(url, 'google_oauth', `width=${w},height=${h},left=${left},top=${top}`);
    if (!popup) {
      reject(new Error('Popup bloccato'));
      return;
    }
    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        resolve({ success: false, message: 'Finestra chiusa dall\'utente' });
      }
    }, 500);

    function handleMessage(e: MessageEvent) {
      try {
        const data = e.data;
        if (data && typeof data === 'object' && 'success' in data) {
          window.removeEventListener('message', handleMessage);
          clearInterval(timer);
          try { popup.close(); } catch {}
          resolve({ success: !!data.success, message: data.message });
        }
      } catch (err) {}
    }
    window.addEventListener('message', handleMessage);
  });
}

export async function fetchCalendars() {
  const idToken = await getIdToken();
  const r = await fetch(`/api/google/calendars`, {
    headers: {
      Authorization: idToken ? `Bearer ${idToken}` : '',
      'Content-Type': 'application/json',
    },
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body?.error || r.statusText);
  }
  return r.json();
}

export async function createEvent(calendarId: string, event: any) {
  const idToken = await getIdToken();
  const r = await fetch('/api/google/events', {
    method: 'POST',
    headers: {
      Authorization: idToken ? `Bearer ${idToken}` : '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ calendarId, event }),
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body?.error || r.statusText);
  }
  return r.json();
}
