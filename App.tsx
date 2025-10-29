import React, { useState, useEffect, useCallback } from 'react';
import EventTypeSelection from './components/EventTypeSelection';
import BookingPage from './components/BookingPage';
import ConfirmationPage from './components/ConfirmationPage';
import AdminPanel from './components/AdminPanel';
import BackgroundIcon from './components/BackgroundIcon';
import Toast from './components/Toast';
import { CogIcon, InformationCircleIcon } from './components/icons';
import type { LessonSelection, Booking, WorkingHours, DateOverrides, Sport, ConsultantInfo, AppConfig } from './types';
import { INITIAL_SPORTS_DATA, INITIAL_CONSULTANT_INFO, INITIAL_WORKING_HOURS, INITIAL_DATE_OVERRIDES, INITIAL_SLOT_INTERVAL, INITIAL_MINIMUM_NOTICE_HOURS } from './constants';
import { db, isFirebaseConfigValid, setInitialAdmin, updateConfig, auth } from './firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

interface GoogleUser {
    email: string;
    name: string;
    picture: string;
}

// Moved AdminModal outside of the App component to prevent it from being re-created on every render.
// This preserves the state of AdminPanel and prevents the freezing issue.
const AdminModal = (props: any) => ( // Using any for simplicity as it just passes props through
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white w-full h-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <AdminPanel {...props} />
        </div>
    </div>
);


function App() {
  const [currentPage, setCurrentPage] = useState<'selection' | 'booking' | 'confirmation'>('selection');
  const [lessonSelection, setLessonSelection] = useState<LessonSelection | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [backgroundSport, setBackgroundSport] = useState<string | null>(null);
  
  // App data state
  const [sportsData, setSportsData] = useState<Sport[]>([]);
  const [consultantInfo, setConsultantInfo] = useState<ConsultantInfo | null>(null);
  const [workingHours, setWorkingHours] = useState<WorkingHours>({});
  const [dateOverrides, setDateOverrides] = useState<DateOverrides>({});
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [slotInterval, setSlotInterval] = useState(INITIAL_SLOT_INTERVAL);
  const [minimumNoticeHours, setMinimumNoticeHours] = useState(INITIAL_MINIMUM_NOTICE_HOURS);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [adminEmails, setAdminEmails] = useState<string[]>([]);

  // Admin View State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // UI State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  // Listen to Firebase Auth state changes for session persistence
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user && user.email && user.displayName) {
            setGoogleUser({
                email: user.email,
                name: user.displayName,
                picture: user.photoURL || '',
            });
        } else {
            setGoogleUser(null);
            setIsAdmin(false);
            localStorage.removeItem('google_access_token');
        }
    });
    return () => unsubscribe();
  }, []);
  
  // Check if logged in user is an admin
  useEffect(() => {
    if (googleUser && adminEmails.length > 0) {
        setIsAdmin(adminEmails.map(e => e.toLowerCase()).includes(googleUser.email.toLowerCase()));
    } else {
        setIsAdmin(false);
    }
  }, [googleUser, adminEmails]);


  const configDocRef = db ? doc(db, 'configuration', 'main') : null;

  // --- FIREBASE REALTIME DATA ---
  useEffect(() => {
    if (!isFirebaseConfigValid || !db || !configDocRef) {
        setSportsData(INITIAL_SPORTS_DATA);
        setConsultantInfo(INITIAL_CONSULTANT_INFO);
        setWorkingHours(INITIAL_WORKING_HOURS);
        setDateOverrides(INITIAL_DATE_OVERRIDES);
        setIsLoadingConfig(false);
        return;
    }

    const unsubscribe = onSnapshot(configDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AppConfig;
        setSportsData(data.sportsData || INITIAL_SPORTS_DATA);
        setConsultantInfo(data.consultantInfo || INITIAL_CONSULTANT_INFO);
        setWorkingHours(data.workingHours || INITIAL_WORKING_HOURS);
        setDateOverrides(data.dateOverrides || INITIAL_DATE_OVERRIDES);
        setSlotInterval(data.slotInterval || INITIAL_SLOT_INTERVAL);
        setMinimumNoticeHours(data.minimumNoticeHours || INITIAL_MINIMUM_NOTICE_HOURS);
        setSelectedCalendarIds(data.googleCalendarIds || []);
        setAdminEmails(data.adminEmails || []);
      } else {
        console.log("Configuration document not found. This will be created on first admin login.");
        setSportsData(INITIAL_SPORTS_DATA);
        setConsultantInfo(INITIAL_CONSULTANT_INFO);
        setWorkingHours(INITIAL_WORKING_HOURS);
        setDateOverrides(INITIAL_DATE_OVERRIDES);
        setAdminEmails([]);
      }
      if(isLoadingConfig) setIsLoadingConfig(false);
    }, (error) => {
      console.error("Error fetching Firestore configuration:", error);
      showToast("Impossibile caricare la configurazione. Controlla la connessione e la configurazione di Firebase.", 'error');
      setIsLoadingConfig(false);
    });

    return () => unsubscribe();
  }, [isLoadingConfig, configDocRef, showToast]);
  
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
    setBackgroundSport(null);
  }

  const handleBookAnother = () => {
    setCurrentPage('selection');
    setLessonSelection(null);
    setConfirmedBooking(null);
    setBackgroundSport(null);
  };
    
  // --- SECURE SAVE HANDLERS (via Firebase Functions) ---
  const callUpdateConfig = useCallback(async (configPayload: Partial<AppConfig>) => {
    const googleAccessToken = localStorage.getItem('google_access_token');
    if (!googleAccessToken) {
        showToast('Devi essere loggato per salvare le modifiche.', 'error');
        throw new Error("User not authenticated");
    }
    if (!updateConfig) {
        showToast('Funzione di aggiornamento non disponibile.', 'error');
        throw new Error("Update function not available");
    }
    await updateConfig({ googleAuthToken: googleAccessToken, configPayload });
  }, [showToast]);

  const handleSaveWorkingHours = useCallback(async (newHours: WorkingHours) => {
    try {
      await callUpdateConfig({ workingHours: newHours });
      showToast('Orari di lavoro aggiornati!', 'success');
    } catch (error) {
      console.error("Error saving working hours:", error);
      showToast("Errore nel salvataggio degli orari.", 'error');
    }
  }, [callUpdateConfig, showToast]);
  
  const handleSaveDateOverrides = useCallback(async (newOverrides: DateOverrides) => {
    try {
      await callUpdateConfig({ dateOverrides: newOverrides });
      showToast('Eccezioni del calendario aggiornate!', 'success');
    } catch (error) {
      console.error("Error saving date overrides:", error);
      showToast("Errore nel salvataggio delle eccezioni.", 'error');
    }
  }, [callUpdateConfig, showToast]);
  
  const handleSaveSportsData = useCallback(async (newSportsData: Sport[]) => {
    try {
      await callUpdateConfig({ sportsData: newSportsData });
      showToast('Dati di sport, lezioni e sedi aggiornati!', 'success');
    } catch (error) {
      console.error("Error saving sports data:", error);
      showToast("Errore nel salvataggio dei dati sport.", 'error');
    }
  }, [callUpdateConfig, showToast]);
  
  const handleSaveConsultantInfo = useCallback(async (newInfo: ConsultantInfo) => {
    try {
      await callUpdateConfig({ consultantInfo: newInfo });
      showToast('Informazioni del profilo aggiornate!', 'success');
    } catch (error) {
      console.error("Error saving consultant info:", error);
      showToast("Errore nel salvataggio del profilo.", 'error');
    }
  }, [callUpdateConfig, showToast]);

  const handleSaveSlotInterval = useCallback(async (newInterval: number) => {
    try {
      await callUpdateConfig({ slotInterval: newInterval });
      showToast('Intervallo di prenotazione aggiornato!', 'success');
    } catch (error) {
      console.error("Error saving slot interval:", error);
      showToast("Errore nel salvataggio dell'intervallo.", 'error');
    }
  }, [callUpdateConfig, showToast]);

  const handleSaveMinimumNoticeHours = useCallback(async (newNotice: number) => {
    try {
      await callUpdateConfig({ minimumNoticeHours: newNotice });
      showToast('Preavviso minimo di prenotazione aggiornato!', 'success');
    } catch (error) {
      console.error("Error saving minimum notice:", error);
      showToast("Errore nel salvataggio del preavviso minimo.", 'error');
    }
  }, [callUpdateConfig, showToast]);

  const handleSaveSelectedCalendars = useCallback(async (calendarIds: string[]) => {
    try {
      await callUpdateConfig({ googleCalendarIds: calendarIds });
      showToast('Calendari per la sincronizzazione aggiornati!', 'success');
    } catch (error) {
      console.error("Error saving selected calendars:", error);
      showToast("Errore nel salvataggio dei calendari selezionati.", 'error');
    }
  }, [callUpdateConfig, showToast]);

  const handleSaveAdminEmails = useCallback(async (newEmails: string[]) => {
    try {
      await callUpdateConfig({ adminEmails: newEmails });
      showToast('Lista amministratori aggiornata!', 'success');
    } catch (error) {
      console.error("Error saving admin emails:", error);
      showToast("Errore nel salvataggio della lista amministratori.", 'error');
    }
  }, [callUpdateConfig, showToast]);

   const handleGoogleLogin = useCallback(async (user: GoogleUser, token: string) => {
    setGoogleUser(user);
    if (adminEmails.length === 0) {
        if (token && setInitialAdmin) {
            try {
                await setInitialAdmin({ googleAuthToken: token });
                showToast(`Benvenuto! ${user.name} è stato impostato come primo amministratore.`, 'success');
            } catch (error: any) {
                console.error("Error setting first admin:", error);
                const message = error?.details?.serverMessage || "Errore nell'impostazione del primo amministratore.";
                showToast(message, 'error');
            }
        }
    }
   }, [adminEmails, showToast]);

   const handleGoogleLogout = useCallback(() => {
    setGoogleUser(null);
    setIsAdmin(false);
   }, []);

   const onExitAdminView = useCallback(() => {
    setShowAdminModal(false);
   }, []);
  
  const renderLoading = () => (
    <div className="flex justify-center items-center h-[600px]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
    </div>
  );

  const renderPublicContent = () => {
    if (isLoadingConfig || !consultantInfo) {
      return renderLoading();
    }
    
    switch (currentPage) {
      case 'selection':
        return <EventTypeSelection sports={sportsData} onSelectionComplete={handleSelectionComplete} consultant={consultantInfo} onSportChange={setBackgroundSport} />;
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
            minimumNoticeHours={minimumNoticeHours}
            consultant={consultantInfo}
            selectedCalendarIds={selectedCalendarIds}
            showToast={showToast}
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
  
  if (!isFirebaseConfigValid) {
    return (
        <div className="bg-neutral-100 text-neutral-800 min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 text-center">
            <InformationCircleIcon className="w-16 h-16 text-red-500 mb-4" />
            <h1 className="text-2xl sm:text-4xl font-bold text-red-400 mb-4">Errore di Configurazione</h1>
            <p className="text-base sm:text-lg mb-6 text-neutral-400 max-w-2xl">
                L'applicazione non può avviarsi perché le credenziali di Firebase non sono state trovate.
            </p>
            <div className="bg-neutral-50 p-4 sm:p-6 rounded-lg shadow-lg text-left max-w-3xl w-full border border-neutral-200">
                <h2 className="text-xl font-semibold mb-3 text-neutral-800">Azione Richiesta</h2>
                <p className="mb-4 text-neutral-600 text-sm sm:text-base">
                    Per risolvere, crea un file chiamato <code className="bg-neutral-200/50 text-primary font-mono py-1 px-2 rounded">.env.local</code> nella cartella principale del progetto (la stessa dove si trova `package.json`) e inserisci le tue chiavi Firebase.
                </p>
                <pre className="bg-neutral-100 p-4 rounded-md text-xs sm:text-sm overflow-x-auto">
                    <code className="text-neutral-600">
                        VITE_FIREBASE_API_KEY="AIza..."<br />
                        VITE_FIREBASE_AUTH_DOMAIN="tuo-progetto.firebaseapp.com"<br />
                        VITE_FIREBASE_DATABASE_URL="https://tuo-progetto.firebaseio.com"<br />
                        VITE_FIREBASE_PROJECT_ID="tuo-progetto"<br />
                        VITE_FIREBASE_STORAGE_BUCKET="tuo-progetto.appspot.com"<br />
                        VITE_FIREBASE_MESSAGING_SENDER_ID="1234567890"<br />
                        VITE_FIREBASE_APP_ID="1:1234567890:web:..."
                    </code>
                </pre>
                <p className="mt-4 text-sm text-neutral-400">
                    Puoi trovare queste chiavi nelle impostazioni del tuo progetto Firebase. Dopo aver creato e salvato il file, ricarica questa pagina.
                </p>
            </div>
        </div>
    );
  }

  return (
    <div className="bg-neutral-100 min-h-screen font-sans text-neutral-600">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {backgroundSport && <BackgroundIcon sport={backgroundSport} />}
      {showAdminModal && <AdminModal 
              user={googleUser}
              isAdmin={isAdmin}
              onGoogleLogin={handleGoogleLogin}
              onGoogleLogout={handleGoogleLogout}
              onExitAdminView={onExitAdminView}
              initialSportsData={sportsData}
              initialWorkingHours={workingHours}
              initialDateOverrides={dateOverrides}
              initialConsultantInfo={consultantInfo!}
              initialSlotInterval={slotInterval}
              initialMinimumNoticeHours={minimumNoticeHours}
              initialSelectedCalendarIds={selectedCalendarIds}
              initialAdminEmails={adminEmails}
              onSaveSportsData={handleSaveSportsData}
              onSaveWorkingHours={handleSaveWorkingHours}
              onSaveDateOverrides={handleSaveDateOverrides}
              onSaveConsultantInfo={handleSaveConsultantInfo}
              onSaveSlotInterval={handleSaveSlotInterval}
              onSaveMinimumNoticeHours={handleSaveMinimumNoticeHours}
              onSaveSelectedCalendars={handleSaveSelectedCalendars}
              onSaveAdminEmails={handleSaveAdminEmails}
              showToast={showToast}
            />}

      <header className="bg-neutral-50 border-b border-neutral-200 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-primary">Prenotazione Lezioni</h1>
            <div className="flex items-center gap-4">
              <button onClick={() => setShowAdminModal(true)} title="Pannello Admin" className="text-neutral-400 hover:text-primary transition-colors duration-200">
                <CogIcon className="w-6 h-6" />
              </button>
            </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto my-8 sm:my-10 relative z-10">
        <div className="bg-neutral-50 rounded-2xl shadow-lg overflow-hidden border border-neutral-200">
          {renderPublicContent()}
        </div>
      </main>
    </div>
  );
}

export default App;