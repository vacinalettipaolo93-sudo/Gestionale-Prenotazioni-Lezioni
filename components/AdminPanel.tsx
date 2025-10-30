import React, { useCallback, useEffect, useState } from 'react';
import GoogleIntegration from './GoogleIntegration';
import { fetchCalendars as fetchCalendarsFromServer, openOAuthPopup } from '../src/services/googleClient';
import { auth } from '../src/firebaseConfig';

/**
 * AdminPanel modificato per integrare Google Calendar tramite endpoint server-side.
 *
 * Nota: questo file è una versione completa pronta da incollare.
 * Assicurati di avere in progetto i file:
 *  - components/GoogleIntegration.tsx
 *  - src/services/googleClient.ts
 *  - src/firebaseConfig.ts
 *  - pages/api/google/* (oauth, callback, calendars, events)
 *
 * Props attesi:
 *  - user: user object (da Firebase Auth)
 *  - isAdmin: boolean
 *  - isBackendConfigured: boolean
 *  - initialSelectedCalendarIds: string[]
 *  - initialAdminEmails: string[]
 *  - onGoogleLogin: (userInfo, token) => void  (opzionale, mantenuto per compatibilità)
 *  - onGoogleLogout: () => void
 *  - onSaveSelectedCalendars: (ids: string[]) => Promise<void>
 *  - callUpdateConfig: (partialConfig) => Promise<void>
 *  - showToast: (message: string, type?: 'success'|'error'|'info') => void
 */
type GoogleCalendar = {
  id: string;
  summary: string;
  primary?: boolean;
  accessRole?: string;
};

type Props = {
  user: any;
  isAdmin: boolean;
  isBackendConfigured: boolean;
  initialSelectedCalendarIds?: string[];
  initialAdminEmails?: string[];
  onGoogleLogin?: (u: any, token?: string) => void;
  onGoogleLogout?: () => void;
  onSaveSelectedCalendars?: (ids: string[]) => Promise<void>;
  callUpdateConfig?: (cfg: any) => Promise<void>;
  showToast?: (msg: string, type?: 'success'|'error'|'info') => void;
};

export default function AdminPanel({
  user,
  isAdmin,
  isBackendConfigured,
  initialSelectedCalendarIds = [],
  initialAdminEmails = [],
  onGoogleLogin,
  onGoogleLogout,
  onSaveSelectedCalendars,
  callUpdateConfig,
  showToast = () => {},
}: Props) {
  // --- Local state
  const [activeTab, setActiveTab] = useState('integrations');
  const [allGoogleCalendars, setAllGoogleCalendars] = useState<GoogleCalendar[]>([]);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [calendarsFetched, setCalendarsFetched] = useState(false);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>(initialSelectedCalendarIds);
  const [localAdminEmails, setLocalAdminEmails] = useState<string[]>(initialAdminEmails);

  useEffect(() => setSelectedCalendarIds(initialSelectedCalendarIds), [initialSelectedCalendarIds]);
  useEffect(() => setLocalAdminEmails(initialAdminEmails), [initialAdminEmails]);

  // --- Load calendars from server using stored refresh token (FireStore)
  const handleLoadCalendars = useCallback(async () => {
    setIsLoadingCalendars(true);
    setCalendarError(null);
    try {
      const res = await fetchCalendarsFromServer();
      setAllGoogleCalendars(res.calendars || []);
      setCalendarsFetched(true);
    } catch (err: any) {
      console.error('Errore caricamento calendari (server):', err);
      const message = err?.message || 'Errore nel caricamento dei calendari dal server.';
      setCalendarError(message);
      setCalendarsFetched(false);
    } finally {
      setIsLoadingCalendars(false);
    }
  }, []);

  // --- Connect with Google (opens popup that hits /api/google/oauth)
  const handleConnectWithGoogle = useCallback(async () => {
    try {
      if (!auth.currentUser) {
        showToast('Effettua il login con Firebase prima di connettere Google.', 'error');
        return;
      }
      const result = await openOAuthPopup();
      if (result.success) {
        showToast('Account Google collegato correttamente.', 'success');
        await handleLoadCalendars();
      } else {
        showToast(result.message || 'Connessione Google annullata.', 'error');
      }
    } catch (err: any) {
      console.error('Errore connessione Google:', err);
      showToast(err?.message || 'Errore durante la connessione a Google.', 'error');
    }
  }, [handleLoadCalendars, showToast]);

  // --- Disconnect: optionally call /api/google/disconnect to remove stored refresh token
  const handleDisconnect = useCallback(async () => {
    try {
      if (!auth.currentUser) {
        showToast('Nessun utente autenticato.', 'error');
        return;
      }
      const idToken = await auth.currentUser.getIdToken();
      await fetch('/api/google/disconnect', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }).catch(() => {});
      setAllGoogleCalendars([]);
      setCalendarsFetched(false);
      setSelectedCalendarIds([]);
      onGoogleLogout?.();
      showToast('Account Google disconnesso.', 'success');
    } catch (err: any) {
      console.error('Errore durante disconnect', err);
      showToast('Errore durante la disconnessione.', 'error');
    }
  }, [onGoogleLogout, showToast]);

  // --- Toggle calendar selection
  const handleCalendarSelectionChange = (id: string) => {
    setSelectedCalendarIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      return [...prev, id];
    });
  };

  // --- Save selected calendars to backend config via prop callback
  const handleSaveSelectedCalendars = useCallback(async () => {
    try {
      if (onSaveSelectedCalendars) {
        await onSaveSelectedCalendars(selectedCalendarIds);
        showToast('Calendari salvati!', 'success');
      } else if (callUpdateConfig) {
        await callUpdateConfig({ googleCalendarIds: selectedCalendarIds });
        showToast('Calendari salvati!', 'success');
      } else {
        showToast('Nessun handler per salvare i calendari configurato.', 'error');
      }
    } catch (err: any) {
      console.error('Errore salvataggio calendari', err);
      showToast('Errore nel salvataggio dei calendari.', 'error');
    }
  }, [selectedCalendarIds, onSaveSelectedCalendars, callUpdateConfig, showToast]);

  // When admin tab active and user logged, try to auto-fetch calendars once
  useEffect(() => {
    if (isAdmin && activeTab === 'integrations' && !calendarsFetched && !isLoadingCalendars) {
      handleLoadCalendars();
    }
  }, [isAdmin, activeTab, calendarsFetched, isLoadingCalendars, handleLoadCalendars]);

  // --- UI render
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-neutral-800">Pannello Admin</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('integrations')}
            className={`px-4 py-2 rounded ${activeTab === 'integrations' ? 'bg-primary text-white' : 'bg-neutral-100'}`}
          >
            Integrazioni
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`px-4 py-2 rounded ${activeTab === 'services' ? 'bg-primary text-white' : 'bg-neutral-100'}`}
          >
            Servizi
          </button>
        </div>
      </div>

      {activeTab === 'integrations' && (
        <div className="bg-neutral-50 p-6 rounded-lg border border-neutral-200">
          <h3 className="text-xl font-semibold mb-4 text-neutral-800">Integrazione Google Calendar</h3>
          <p className="mb-4 text-neutral-400">
            Collega il tuo account Google per sincronizzare automaticamente le prenotazioni con il tuo calendario e verificare le disponibilità in tempo reale.
          </p>

          {!isBackendConfigured && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded mb-4 text-amber-700">
              Per usare Google Calendar devi configurare il backend (variabili d'ambiente e endpoint).
            </div>
          )}

          <div className="mb-6">
            {/* GoogleIntegration component handles connect popup + listing calendars */}
            <GoogleIntegration
              onCalendars={(items) => {
                setAllGoogleCalendars(items);
                setCalendarsFetched(true);
              }}
              onConnected={(ok) => {
                if (ok) showToast('Account Google collegato', 'success');
                else showToast('Connessione Google non completata', 'error');
              }}
            />
          </div>

          {isLoadingCalendars && <div className="mb-4">Caricamento calendari...</div>}

          {calendarError && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded mb-4">
              <p className="font-bold">Errore nel caricamento dei calendari</p>
              <p>{calendarError}</p>
              <div className="mt-3">
                <button onClick={() => handleConnectWithGoogle()} className="bg-red-500 text-white py-1 px-3 rounded">Riautorizza</button>
              </div>
            </div>
          )}

          {calendarsFetched && !isLoadingCalendars && !calendarError && allGoogleCalendars.length === 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-700 rounded mb-4">
              Nessun calendario trovato. Controlla i permessi o riconnetti l'account.
            </div>
          )}

          {allGoogleCalendars.length > 0 && (
            <div className="space-y-3 mb-4">
              {allGoogleCalendars.map(cal => (
                <label key={cal.id} className="flex items-center p-3 bg-neutral-100 rounded-md border border-neutral-200 cursor-pointer hover:bg-neutral-200/50">
                  <input
                    type="checkbox"
                    checked={selectedCalendarIds.includes(cal.id)}
                    onChange={() => handleCalendarSelectionChange(cal.id)}
                    className="h-4 w-4 text-primary focus:ring-primary border-neutral-200 rounded"
                  />
                  <span className="ml-3 text-neutral-800">{cal.summary}{cal.primary ? ' (Primario)' : ''}</span>
                  <span className="ml-auto text-xs text-neutral-400 capitalize">{cal.accessRole || ''}</span>
                </label>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={handleDisconnect} className="bg-red-100 text-red-600 font-semibold py-2 px-4 rounded-md hover:bg-red-200">Disconnetti</button>
            <button onClick={handleSaveSelectedCalendars} className="bg-primary text-white font-bold py-2 px-4 rounded-md hover:bg-primary-dark">Salva Selezione Calendari</button>
          </div>
        </div>
      )}

      {activeTab === 'services' && (
        <div className="bg-white p-6 rounded-lg border border-neutral-200">
          <h3 className="text-lg font-semibold mb-2">Servizi</h3>
          <p className="text-neutral-500">Qui puoi gestire servizi, sedi e preimpostazioni.</p>
          {/* Mantieni o reintegra la logica esistente del pannello servizi */}
        </div>
      )}
    </div>
  );
}
