import React, { useState, useEffect, useCallback } from 'react';
import EventTypeSelection from './components/EventTypeSelection';
import BookingPage from './components/BookingPage';
import ConfirmationPage from './components/ConfirmationPage';
import AdminPanel from './components/AdminPanel';
import LoginModal from './components/LoginModal';
import BackgroundIcon from './components/BackgroundIcon';
import { CogIcon } from './components/icons';
import type { LessonSelection, Booking, WorkingHours, DateOverrides, Sport, ConsultantInfo, AppConfig } from './types';
import { INITIAL_SPORTS_DATA, INITIAL_CONSULTANT_INFO, INITIAL_WORKING_HOURS, INITIAL_DATE_OVERRIDES, INITIAL_SLOT_INTERVAL, INITIAL_MINIMUM_NOTICE_HOURS } from './constants';
import { db, checkGoogleAuthStatus } from './firebaseConfig';

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

  // Auth state
  const [isBackendConfigured, setIsBackendConfigured] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  

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
        setMinimumNoticeHours(data.minimumNoticeHours || INITIAL_MINIMUM_NOTICE_HOURS);
        setSelectedCalendarIds(data.googleCalendarIds || []);
      } else {
        console.log("Configuration document not found. Initializing...");
        const initialConfig: AppConfig = {
          sportsData: INITIAL_SPORTS_DATA,
          consultantInfo: INITIAL_CONSULTANT_INFO,
          workingHours: INITIAL_WORKING_HOURS,
          dateOverrides: INITIAL_DATE_OVERRIDES,
          slotInterval: INITIAL_SLOT_INTERVAL,
          minimumNoticeHours: INITIAL_MINIMUM_NOTICE_HOURS,
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

    return () => unsubscribe();
  }, [isLoadingConfig]);

  // --- GOOGLE AUTH VIA FIREBASE FUNCTIONS ---
  const checkAuth = useCallback(async () => {
    setIsCheckingAuth(true);
    setAuthError(null);
    try {
      const result = await checkGoogleAuthStatus();
      const data = result.data as { isConfigured: boolean };
      if (typeof data?.isConfigured !== 'boolean') {
        throw new Error("La risposta del server per lo stato di configurazione non è valida.");
      }
      setIsBackendConfigured(data.isConfigured);
      if (!data.isConfigured) {
        setAuthError('BACKEND_NOT_CONFIGURED');
      }
    } catch (error: any) {
      console.error("Error checking backend config status:", error);
      setIsBackendConfigured(false);
      setAuthError(error.message || "Si è verificato un errore sconosciuto durante la verifica della configurazione del backend.");
    } finally {
      setIsCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  
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
  
  // --- ADMIN HANDLERS ---
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

  const handleSaveMinimumNoticeHours = async (newNotice: number) => {
    try {
      await db.collection('configuration').doc('main').update({ minimumNoticeHours: newNotice });
      alert('Preavviso minimo di prenotazione aggiornato!');
    } catch (error) {
      console.error("Error saving minimum notice:", error);
      alert("Errore nel salvataggio del preavviso minimo.");
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
        initialMinimumNoticeHours={minimumNoticeHours}
        initialSelectedCalendarIds={selectedCalendarIds}
        onSaveSportsData={handleSaveSportsData}
        onSaveWorkingHours={handleSaveWorkingHours}
        onSaveDateOverrides={handleSaveDateOverrides}
        onSaveConsultantInfo={handleSaveConsultantInfo}
        onSaveSlotInterval={handleSaveSlotInterval}
        onSaveMinimumNoticeHours={handleSaveMinimumNoticeHours}
        onSaveSelectedCalendars={handleSaveSelectedCalendars}
        onLogout={handleAdminLogout}
        isBackendConfigured={isBackendConfigured}
        onRefreshAuthStatus={checkAuth}
        isCheckingAuth={isCheckingAuth}
        authError={authError}
      />;
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
    <div className="bg-neutral-100 min-h-screen font-sans text-neutral-600">
      {backgroundSport && <BackgroundIcon sport={backgroundSport} />}
      <header className="bg-neutral-50 border-b border-neutral-200 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-primary">Prenotazione Lezioni</h1>
            <div className="flex items-center gap-4">
              <button onClick={() => setIsLoginModalOpen(true)} title="Admin Login" className="text-neutral-400 hover:text-primary transition-colors duration-200">
                <CogIcon className="w-6 h-6" />
              </button>
            </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto my-8 sm:my-10 relative z-10">
        <div className="bg-neutral-50 rounded-2xl shadow-lg overflow-hidden border border-neutral-200">
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
