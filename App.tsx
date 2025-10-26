import React, { useState, useEffect, useCallback } from 'react';
import EventTypeSelection from './components/EventTypeSelection';
import BookingPage from './components/BookingPage';
import ConfirmationPage from './components/ConfirmationPage';
import AdminPanel from './components/AdminPanel';
import LoginModal from './components/LoginModal';
import { CogIcon } from './components/icons';
import type { LessonSelection, Booking, WorkingHours, DateOverrides, Sport, ConsultantInfo, AppConfig } from './types';
import { INITIAL_SPORTS_DATA, INITIAL_CONSULTANT_INFO, INITIAL_WORKING_HOURS, INITIAL_DATE_OVERRIDES, INITIAL_SLOT_INTERVAL } from './constants';
import { CLIENT_ID, API_KEY, DISCOVERY_DOCS, SCOPES } from './googleConfig';
import { db } from './firebaseConfig';


declare const gapi: any;
// FIX: Augment the window interface to include the 'google' object from the Google Identity Services script.
declare global {
  interface Window {
    google: any;
  }
}

function App() {
  const [currentPage, setCurrentPage] = useState<'selection' | 'booking' | 'confirmation'>('selection');
  const [lessonSelection, setLessonSelection] = useState<LessonSelection | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  
  // App data state - will be populated from Firestore
  const [sportsData, setSportsData] = useState<Sport[]>([]);
  const [consultantInfo, setConsultantInfo] = useState<ConsultantInfo | null>(null);
  const [workingHours, setWorkingHours] = useState<WorkingHours>({});
  const [dateOverrides, setDateOverrides] = useState<DateOverrides>({});
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [slotInterval, setSlotInterval] = useState(INITIAL_SLOT_INTERVAL);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);

  // Auth state
  const [isGoogleSignedIn, setIsGoogleSignedIn] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  
  // Google API state
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);

  // --- FIREBASE REALTIME DATA ---
  useEffect(() => {
    const configRef = db.collection('configuration').doc('main');

    const unsubscribe = configRef.onSnapshot(async (doc) => {
      if (doc.exists) {
        const data = doc.data() as AppConfig;
        setSportsData(data.sportsData);
        setConsultantInfo(data.consultantInfo);
        setWorkingHours(data.workingHours);
        setDateOverrides(data.dateOverrides);
        setSlotInterval(data.slotInterval || INITIAL_SLOT_INTERVAL);
        setSelectedCalendarIds(data.googleCalendarIds || []);
      } else {
        // First run: Initialize the config document in Firestore
        console.log("Configuration document not found. Initializing...");
        const initialConfig: AppConfig = {
          sportsData: INITIAL_SPORTS_DATA,
          consultantInfo: INITIAL_CONSULTANT_INFO,
          workingHours: INITIAL_WORKING_HOURS,
          dateOverrides: INITIAL_DATE_OVERRIDES,
          slotInterval: INITIAL_SLOT_INTERVAL,
          googleCalendarIds: [],
        };
        try {
          await configRef.set(initialConfig);
          console.log("Successfully initialized configuration in Firestore.");
        } catch (error) {
          console.error("Error initializing Firestore configuration:", error);
          alert("Errore critico: impossibile inizializzare la configurazione dell'app.");
        }
      }
      if(isLoadingConfig) setIsLoadingConfig(false);
    }, (error) => {
      console.error("Error fetching Firestore configuration:", error);
      alert("Impossibile caricare la configurazione dell'applicazione. Controlla la connessione e la configurazione di Firebase.");
      setIsLoadingConfig(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [isLoadingConfig]); // Rerun if needed, e.g. after first init

  // --- GOOGLE API INITIALIZATION ---
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      gapi.load('client', initializeGapiClient);
    };
    document.body.appendChild(script);

    const script2 = document.createElement('script');
    script2.src = 'https://accounts.google.com/gsi/client';
    script2.onload = () => {
        setGisLoaded(true);
    };
    document.body.appendChild(script2);
    
    return () => {
        // Clean up scripts on component unmount
        document.body.removeChild(script);
        document.body.removeChild(script2);
    }
  }, []);

  const initializeGapiClient = useCallback(async () => {
    try {
      if (API_KEY.startsWith("INSERISCI_")) {
        throw new Error("Configurazione Google API incompleta: Per favore, inserisci la tua API Key nel file googleConfig.ts.");
      }
      await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: DISCOVERY_DOCS,
      });
      setGapiLoaded(true); // GAPI is now fully loaded and initialized
    } catch (error: any) {
        console.error("Error initializing Google API client:", error);
        if (error.result?.error?.message) {
             alert(`Errore nell'inizializzazione di Google API: ${error.result.error.message}. Controlla la tua API Key.`);
        } else {
             alert(error.message || "Errore nell'inizializzazione di Google API. Controlla che la API Key sia corretta e che la Google Calendar API sia abilitata nel tuo progetto Google Cloud.");
        }
    }
  }, []);

  const initializeGisClient = useCallback(() => {
    try {
      if (CLIENT_ID.startsWith("INSERISCI_")) {
        throw new Error("Configurazione Google API incompleta: Per favore, inserisci il tuo Client ID nel file googleConfig.ts.");
      }
      if (window.google?.accounts?.oauth2) {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (tokenResponse: any) => {
              if (tokenResponse.error) {
                  console.error('Google token error:', tokenResponse);
                  alert(`Accesso a Google fallito: ${tokenResponse.error_description || tokenResponse.error}. Controlla che il tuo Client ID sia configurato correttamente.`);
                  return;
              }
              if (tokenResponse && tokenResponse.access_token) {
                  gapi.client.setToken(tokenResponse);
                  setIsGoogleSignedIn(true);

                  // Persist the token in localStorage
                  const expires_at = Date.now() + (tokenResponse.expires_in * 1000);
                  localStorage.setItem('googleAuthToken', JSON.stringify({
                      ...tokenResponse,
                      expires_at
                  }));
              }
          },
        });
        setTokenClient(client);
      } else {
        throw new Error("Lo script di Google Identity Services non è stato caricato correttamente.");
      }
    } catch(error: any) {
        console.error("Error initializing Google Identity Services:", error);
        alert(error.message || "Impossibile inizializzare l'accesso con Google. Controlla che il Client ID in googleConfig.ts sia corretto.");
    }
  }, []);
  
  // Effect to initialize GIS and check for a stored token
  useEffect(() => {
    if (gapiLoaded && gisLoaded) {
        initializeGisClient();
        
        // Check for persisted token once GAPI is ready
        const storedToken = localStorage.getItem('googleAuthToken');
        if (storedToken) {
            const tokenData = JSON.parse(storedToken);
            if (tokenData.expires_at > Date.now()) {
                gapi.client.setToken(tokenData);
                setIsGoogleSignedIn(true);
            } else {
                localStorage.removeItem('googleAuthToken'); // Clean up expired token
            }
        }
    }
  }, [gapiLoaded, gisLoaded, initializeGisClient]);

  // --- GOOGLE AUTH HANDLERS ---
  const handleGoogleSignIn = () => {
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    }
  };

  const handleGoogleSignOut = () => {
    const token = gapi.client.getToken();
    if (token !== null) {
      window.google.accounts.oauth2.revoke(token.access_token, () => {
        gapi.client.setToken('');
        setIsGoogleSignedIn(false);
        localStorage.removeItem('googleAuthToken');
      });
    }
  };

  // --- NAVIGATION HANDLERS ---
  const handleSelectionComplete = (selection: LessonSelection) => {
    setLessonSelection(selection);
    setCurrentPage('booking');
  };

  const handleBookingConfirmed = (booking: Booking) => {
    setConfirmedBooking(booking);
    setCurrentPage('confirmation');
  };
  
  const handleBackFromBooking = () => {
    setCurrentPage('selection');
    setLessonSelection(null);
  }

  const handleBookAnother = () => {
    setCurrentPage('selection');
    setLessonSelection(null);
    setConfirmedBooking(null);
  };
  
  // --- ADMIN HANDLERS (NOW SAVE TO FIRESTORE) ---
  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    setIsLoginModalOpen(false);
  }
  
  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
  }

  const handleSaveWorkingHours = async (newHours: WorkingHours) => {
    try {
      await db.collection('configuration').doc('main').update({ workingHours: newHours });
      alert('Orari di lavoro aggiornati!');
    } catch (error) {
      console.error("Error saving working hours:", error);
      alert("Errore nel salvataggio degli orari.");
    }
  }
  
  const handleSaveDateOverrides = async (newOverrides: DateOverrides) => {
    try {
      await db.collection('configuration').doc('main').update({ dateOverrides: newOverrides });
      alert('Eccezioni del calendario aggiornate!');
    } catch (error) {
      console.error("Error saving date overrides:", error);
      alert("Errore nel salvataggio delle eccezioni.");
    }
  }
  
  const handleSaveSportsData = async (newSportsData: Sport[]) => {
    try {
      await db.collection('configuration').doc('main').update({ sportsData: newSportsData });
      alert('Dati di sport, lezioni e sedi aggiornati!');
    } catch (error) {
      console.error("Error saving sports data:", error);
      alert("Errore nel salvataggio dei dati sport.");
    }
  }
  
  const handleSaveConsultantInfo = async (newInfo: ConsultantInfo) => {
    try {
      await db.collection('configuration').doc('main').update({ consultantInfo: newInfo });
      alert('Informazioni del profilo aggiornate!');
    } catch (error) {
      console.error("Error saving consultant info:", error);
      alert("Errore nel salvataggio del profilo.");
    }
  }

  const handleSaveSlotInterval = async (newInterval: number) => {
    try {
      await db.collection('configuration').doc('main').update({ slotInterval: newInterval });
      alert('Intervallo di prenotazione aggiornato!');
    } catch (error) {
      console.error("Error saving slot interval:", error);
      alert("Errore nel salvataggio dell'intervallo.");
    }
  }

  const handleSaveSelectedCalendars = async (calendarIds: string[]) => {
    try {
      await db.collection('configuration').doc('main').update({ googleCalendarIds: calendarIds });
      alert('Calendari per la sincronizzazione aggiornati!');
    } catch (error) {
      console.error("Error saving selected calendars:", error);
      alert("Errore nel salvataggio dei calendari selezionati.");
    }
  };
  
  const renderLoading = () => (
    <div className="flex justify-center items-center h-[600px]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
    </div>
  );

  const renderContent = () => {
    if (isLoadingConfig || !consultantInfo) {
      return renderLoading();
    }

    if (isAdminLoggedIn) {
      return <AdminPanel 
        initialSportsData={sportsData}
        initialWorkingHours={workingHours}
        initialDateOverrides={dateOverrides}
        initialConsultantInfo={consultantInfo}
        initialSlotInterval={slotInterval}
        initialSelectedCalendarIds={selectedCalendarIds}
        onSaveSportsData={handleSaveSportsData}
        onSaveWorkingHours={handleSaveWorkingHours}
        onSaveDateOverrides={handleSaveDateOverrides}
        onSaveConsultantInfo={handleSaveConsultantInfo}
        onSaveSlotInterval={handleSaveSlotInterval}
        onSaveSelectedCalendars={handleSaveSelectedCalendars}
        onLogout={handleAdminLogout}
        isGoogleSignedIn={isGoogleSignedIn}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
        isGapiLoaded={gapiLoaded}
        isGisLoaded={gisLoaded}
      />;
    }

    switch (currentPage) {
      case 'selection':
        return <EventTypeSelection sports={sportsData} onSelectionComplete={handleSelectionComplete} consultant={consultantInfo} />;
      case 'booking':
        if (!lessonSelection) {
            setCurrentPage('selection');
            return null;
        }
        return <BookingPage 
            selection={lessonSelection} 
            onBookingConfirmed={handleBookingConfirmed} 
            onBack={handleBackFromBooking}
            workingHours={workingHours}
            dateOverrides={dateOverrides}
            slotInterval={slotInterval}
            consultant={consultantInfo}
            isGoogleSignedIn={isGoogleSignedIn}
            selectedCalendarIds={selectedCalendarIds}
        />;
      case 'confirmation':
         if (!confirmedBooking || !lessonSelection) {
            setCurrentPage('selection');
            return null;
        }
        return <ConfirmationPage booking={confirmedBooking} selection={lessonSelection} consultant={consultantInfo} onBookAnother={handleBookAnother} />;
      default:
        return <div>Error: Invalid page state.</div>;
    }
  };
  
  return (
    <div className="bg-gray-100 min-h-screen font-sans">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-primary">Prenotazione Lezioni</h1>
            <div className="flex items-center gap-4">
              <button onClick={() => setIsLoginModalOpen(true)} title="Admin Login" className="text-gray-500 hover:text-primary">
                <CogIcon className="w-6 h-6" />
              </button>
            </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto my-6 sm:my-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {renderContent()}
        </div>
      </main>
      
      {isLoginModalOpen && !isAdminLoggedIn && (
        <LoginModal 
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={handleAdminLoginSuccess}
        />
      )}
    </div>
  );
}

export default App;