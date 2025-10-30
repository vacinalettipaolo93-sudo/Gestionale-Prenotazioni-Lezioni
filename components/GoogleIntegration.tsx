import React, { useEffect, useState } from 'react';
import { openOAuthPopup, fetchCalendars } from '../src/services/googleClient';
import { auth } from '../firebaseConfig';

type Props = {
  onCalendars?: (items: any[]) => void;
  onConnected?: (ok: boolean) => void;
};

export default function GoogleIntegration({ onCalendars, onConnected }: Props) {
  const [loading, setLoading] = useState(false);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (u) loadCalendars();
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadCalendars() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetchCalendars();
      const items = res.calendars || [];
      setCalendars(items);
      onCalendars?.(items);
    } catch (err: any) {
      setMessage(err.message || 'Errore caricamento calendari');
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    setLoading(true);
    setMessage(null);
    try {
      const result = await openOAuthPopup();
      if (result.success) {
        setMessage('Connessione Google eseguita. Carico calendari...');
        onConnected?.(true);
        await loadCalendars();
      } else {
        setMessage(result.message || 'Connessione annullata');
        onConnected?.(false);
      }
    } catch (err: any) {
      setMessage(err.message || 'Errore connessione');
      onConnected?.(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-4">
        <button onClick={handleConnect} className="bg-blue-500 text-white py-2 px-4 rounded">
          {loading ? 'Caricamento...' : 'Connetti con Google'}
        </button>
      </div>

      {message && <div className="mb-3 text-sm text-neutral-600">{message}</div>}

      <div>
        <h4 className="font-semibold mb-2">Calendari</h4>
        {loading && <div>Caricamento...</div>}
        {!loading && calendars.length === 0 && <div className="text-sm text-neutral-500">Nessun calendario trovato</div>}
        <ul>
          {calendars.map((c: any) => (
            <li key={c.id} className="text-sm">{c.summary} {c.primary ? '(Primario)' : ''} — {c.accessRole}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
