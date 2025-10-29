import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { WorkingHours, DateOverrides, Sport, LessonType, LessonOption, Location, ConsultantInfo } from '../types';
import { XIcon, PlusIcon, TrashIcon, CameraIcon, EmailIcon, ArrowLeftOnRectangleIcon, InformationCircleIcon } from './icons';
import { auth, getGoogleCalendarList, isFirebaseConfigValid, firebaseConfig } from '../firebaseConfig';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

interface GoogleCalendar {
    id: string;
    summary: string;
    accessRole: 'owner' | 'writer' | 'reader' | 'freeBusyReader';
    primary?: boolean;
}

interface GoogleUser {
    email: string;
    name: string;
    picture: string;
}

interface AdminPanelProps {
    user: GoogleUser | null;
    isAdmin: boolean;
    onGoogleLogin: (user: GoogleUser, token: string) => void;
    onGoogleLogout: () => void;
    initialWorkingHours: WorkingHours;
    initialDateOverrides: DateOverrides;
    initialSportsData: Sport[];
    initialConsultantInfo: ConsultantInfo;
    initialSlotInterval: number;
    initialMinimumNoticeHours: number;
    initialSelectedCalendarIds: string[];
    initialAdminEmails: string[];
    onSaveWorkingHours: (newHours: WorkingHours) => void;
    onSaveDateOverrides: (newOverrides: DateOverrides) => void;
    onSaveSportsData: (newSports: Sport[]) => void;
    onSaveConsultantInfo: (newInfo: ConsultantInfo) => void;
    onSaveSlotInterval: (newInterval: number) => void;
    onSaveMinimumNoticeHours: (newNotice: number) => void;
    onSaveSelectedCalendars: (calendarIds: string[]) => void;
    onSaveAdminEmails: (emails: string[]) => void;
    onExitAdminView: () => void;
    showToast: (message: string, type: 'success' | 'error') => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
    user,
    isAdmin,
    onGoogleLogin,
    onGoogleLogout,
    initialWorkingHours, 
    initialDateOverrides, 
    initialSportsData,
    initialConsultantInfo,
    initialSlotInterval,
    initialMinimumNoticeHours,
    initialSelectedCalendarIds,
    initialAdminEmails,
    onSaveWorkingHours,
    onSaveDateOverrides,
    onSaveSportsData,
    onSaveConsultantInfo,
    onSaveSlotInterval,
    onSaveMinimumNoticeHours,
    onSaveSelectedCalendars,
    onSaveAdminEmails,
    onExitAdminView,
    showToast,
}) => {
    const [workingHours, setWorkingHours] = useState<WorkingHours>(initialWorkingHours);
    const [dateOverrides, setDateOverrides] = useState<DateOverrides>(initialDateOverrides);
    const [sportsData, setSportsData] = useState<Sport[]>(JSON.parse(JSON.stringify(initialSportsData)));
    const [consultantInfo, setConsultantInfo] = useState<ConsultantInfo>(initialConsultantInfo);
    const [slotInterval, setSlotInterval] = useState<number>(initialSlotInterval);
    const [minimumNoticeHours, setMinimumNoticeHours] = useState<number>(initialMinimumNoticeHours);
    const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>(initialSelectedCalendarIds);
    const [localAdminEmails, setLocalAdminEmails] = useState<string[]>(initialAdminEmails);
    const [newAdminEmail, setNewAdminEmail] = useState('');
    
    const [activeTab, setActiveTab] = useState('integrations');

    const [newOverrideDate, setNewOverrideDate] = useState('');
    const [newOverrideStart, setNewOverrideStart] = useState('09:00');
    const [newOverrideEnd, setNewOverrideEnd] = useState('17:00');
    const [isNewOverrideAvailable, setIsNewOverrideAvailable] = useState(true);
    
    // --- State for Login Feedback ---
    const [loginError, setLoginError] = useState<string | null>(null);

    // --- State for Google Calendar Integration ---
    const [allGoogleCalendars, setAllGoogleCalendars] = useState<GoogleCalendar[]>([]);
    const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
    const [calendarError, setCalendarError] = useState<string | null>(null);
    const [calendarsFetched, setCalendarsFetched] = useState(false);
    const [showReauthPrompt, setShowReauthPrompt] = useState(false);
    const [calendarDebugInfo, setCalendarDebugInfo] = useState<any>(null);


    const isBackendConfigured = !!user && !!localStorage.getItem('google_access_token');

    const writableCalendars = useMemo(() => {
        return allGoogleCalendars.filter(cal => cal.accessRole === 'owner' || cal.accessRole === 'writer');
    }, [allGoogleCalendars]);

    const weekDays = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

    // Sync internal state with props to reflect real-time updates from Firestore
    useEffect(() => setWorkingHours(initialWorkingHours), [initialWorkingHours]);
    useEffect(() => setDateOverrides(initialDateOverrides), [initialDateOverrides]);
    useEffect(() => setSportsData(JSON.parse(JSON.stringify(initialSportsData))), [initialSportsData]);
    useEffect(() => setConsultantInfo(initialConsultantInfo), [initialConsultantInfo]);
    useEffect(() => setSlotInterval(initialSlotInterval), [initialSlotInterval]);
    useEffect(() => setMinimumNoticeHours(initialMinimumNoticeHours), [initialMinimumNoticeHours]);
    useEffect(() => setSelectedCalendarIds(initialSelectedCalendarIds), [initialSelectedCalendarIds]);
    useEffect(() => setLocalAdminEmails(initialAdminEmails), [initialAdminEmails]);

    // --- Google Auth Handlers using Firebase Authentication ---
    const handleGoogleConnect = async () => {
        setLoginError(null); // Reset error on new attempt
        if (!auth) {
            const errorMsg = 'Errore critico: Firebase Auth non è inizializzato.';
            setLoginError(errorMsg);
            showToast(errorMsg, 'error');
            return;
        }
        const provider = new GoogleAuthProvider();
        // Request the necessary permissions (scopes).
        provider.addScope("https://www.googleapis.com/auth/calendar.readonly");
        provider.addScope("https://www.googleapis.com/auth/calendar.events");
        
        // CRUCIAL FIX: Force the account selection AND consent screen to appear every time.
        // This is the strongest method to resolve stubborn issues where Google caches old/incomplete permissions.
        provider.setCustomParameters({
            prompt: 'consent select_account',
        });

        try {
            const result = await signInWithPopup(auth, provider);
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential?.accessToken;
            const loggedInUser = result.user;

            if (token && loggedInUser.email && loggedInUser.displayName) {
                localStorage.setItem('google_access_token', token);
                onGoogleLogin({
                    email: loggedInUser.email,
                    name: loggedInUser.displayName,
                    picture: loggedInUser.photoURL || '',
                }, token);
                // After successful login, reset calendar state to force a refetch
                setCalendarsFetched(false);
                setAllGoogleCalendars([]);
                setShowReauthPrompt(false);
                setCalendarError(null);
                showToast('Login riuscito!', 'success');
            } else {
                throw new Error("Informazioni utente o token non ricevuti da Google.");
            }
        } catch (error: any) {
            console.error("Errore durante l'accesso con Google:", error);
            let message = `Errore di accesso: ${error.message} (codice: ${error.code})`;
            
            if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
                return;
            } else if (error.code === 'auth/unauthorized-domain') {
                message = "Questo dominio non è autorizzato per l'accesso. Controlla la console Firebase.";
            } else if (error.code === 'auth/popup-blocked') {
                message = 'La finestra di popup è stata bloccata dal browser. Abilita i popup per questo sito e riprova.';
            }
        
            setLoginError(message);
            showToast(message, 'error');
        }
    };

    const handleGoogleDisconnect = useCallback(async (isSilent = false) => {
        if (!auth) return;
        try {
            await signOut(auth);
            localStorage.removeItem('google_access_token');
            setAllGoogleCalendars([]);
            setCalendarsFetched(false);
            setCalendarDebugInfo(null);
            onGoogleLogout();
            if(!isSilent) showToast('Logout effettuato.', 'success');
        } catch (error: any) {
            console.error("Errore durante il logout:", error);
            if(!isSilent) showToast(`Errore di logout: ${error.message}. Tento un logout forzato.`, 'error');
            localStorage.removeItem('google_access_token');
            onGoogleLogout();
            setAllGoogleCalendars([]);
            setCalendarsFetched(false);
            setCalendarDebugInfo(null);
        }
    }, [onGoogleLogout, showToast]);

    const handleReAuth = useCallback(async () => {
        await handleGoogleDisconnect(true); // Silently log out first
        handleGoogleConnect(); // Then trigger a new login
    }, [handleGoogleDisconnect, handleGoogleConnect]);

    const fetchCalendars = useCallback(async () => {
        const googleAccessToken = localStorage.getItem('google_access_token');
        if (!googleAccessToken || !getGoogleCalendarList) {
            setCalendarError("Autenticazione Google richiesta.");
            return;
        }
        setIsLoadingCalendars(true);
        setCalendarError(null);
        setShowReauthPrompt(false);
        setCalendarDebugInfo(null);
        try {
            const result = await getGoogleCalendarList({ googleAuthToken: googleAccessToken });
            const data = result?.data as { calendars?: GoogleCalendar[], debugInfo?: any };
            setAllGoogleCalendars(data?.calendars || []);
            setCalendarDebugInfo(data?.debugInfo || null);
            setCalendarsFetched(true);
        } catch (error: any)
        {
            console.error("ERRORE CRITICO nel caricamento dei calendari:", error.message);
            const detailedMessage = error?.details?.serverMessage || error.message || "Si è verificato un errore sconosciuto.";
            
            const errorMessage = (detailedMessage || '').toLowerCase();
            if (errorMessage.includes('insufficient permission') || errorMessage.includes('required scopes')) {
                setCalendarError("L'applicazione non ha i permessi necessari per leggere i tuoi calendari.");
                setShowReauthPrompt(true);
            } else {
                 setCalendarError(`Caricamento fallito: ${detailedMessage}`);
            }
            setCalendarDebugInfo({ error: true, message: error.message, details: error.details });
            setCalendarsFetched(true); // We consider it "fetched" even if it's an error, to show the error message.

            if (error.code === 'unauthenticated' || errorMessage.includes('token') || errorMessage.includes('credentials')) {
                handleGoogleDisconnect();
                showToast('Sessione Google scaduta o non valida. Riconnettiti.', 'error');
            }
        } finally {
            setIsLoadingCalendars(false);
        }
    }, [showToast, handleGoogleDisconnect]);

    useEffect(() => {
        if(isAdmin) {
            const shouldFetch = (activeTab === 'integrations' || activeTab === 'services' || activeTab === 'hours');
            const googleAccessToken = localStorage.getItem('google_access_token');
            if (shouldFetch && googleAccessToken && !calendarsFetched && !isLoadingCalendars) {
                fetchCalendars();
            }
        }
    }, [isAdmin, activeTab, fetchCalendars, calendarsFetched, isLoadingCalendars]);


    // --- State Update Handlers ---
    const updateState = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, updateFn: (draft: T) => void) => {
        setter((current: T) => {
            const draft = JSON.parse(JSON.stringify(current)) as T;
            updateFn(draft);
            return draft;
        });
    };
    
    // --- Consultant Info Handlers ---
    const handleInfoChange = (field: keyof ConsultantInfo, value: string) => {
        setConsultantInfo(prev => ({...prev, [field]: value}));
    };
    
    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result;
                if (typeof result === 'string') {
                    handleInfoChange('avatarUrl', result);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    // --- Hours & Overrides Handlers ---
    const handleWorkingHoursChange = (day: number, field: 'start' | 'end', value: string) => {
        const [hours, minutes] = value.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes;
        
        updateState(setWorkingHours, (draft: WorkingHours) => {
            const newDayHours = draft[day] ? { ...draft[day] } : { start: 0, end: 0 };
            (newDayHours as { start: number; end: number })[field] = totalMinutes;
            draft[day] = newDayHours;
        });
    };

    const toggleDayAvailability = (day: number) => {
        updateState(setWorkingHours, (draft: WorkingHours) => {
            draft[day] = draft[day] ? null : { start: 9 * 60, end: 17 * 60 };
        });
    };

    const handleAddOverride = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newOverrideDate) return;
        
        let overrideValue: { start: number; end: number } | null = null;
        if (isNewOverrideAvailable) {
            const [startH, startM] = newOverrideStart.split(':').map(Number);
            const [endH, endM] = newOverrideEnd.split(':').map(Number);
            overrideValue = { start: startH * 60 + startM, end: endH * 60 + endM };
        }
        
        updateState(setDateOverrides, (draft: DateOverrides) => {
            draft[newOverrideDate] = overrideValue;
        });
        
        setNewOverrideDate('');
    };

    const handleRemoveOverride = (date: string) => {
        updateState(setDateOverrides, (draft: DateOverrides) => {
            delete draft[date];
        });
    };

    // --- Sports, Lessons, Locations Handlers ---
    const handleAddSport = () => {
        updateState(setSportsData, (draft: Sport[]) => {
            draft.push({
                id: `sport-${Date.now()}`,
                name: 'Nuovo Sport',
                color: '#cccccc',
                lessonTypes: []
            });
        });
    };
    
    const handleUpdateSport = (index: number, field: keyof Sport, value: string) => {
        updateState(setSportsData, (draft: Sport[]) => {
            (draft[index] as any)[field] = value;
        });
    };

    const handleDeleteSport = (index: number) => {
        updateState(setSportsData, (draft: Sport[]) => {
            draft.splice(index, 1);
        });
    };
    
    const handleAddLessonType = (sportIndex: number) => {
        updateState(setSportsData, (draft: Sport[]) => {
            draft[sportIndex].lessonTypes.push({
                id: `lesson-${Date.now()}`,
                name: 'Nuovo Tipo Lezione',
                description: '',
                options: [],
                locations: []
            });
        });
    };
    
    const handleUpdateLessonType = (sportIndex: number, ltIndex: number, field: keyof LessonType, value: string) => {
         updateState(setSportsData, (draft: Sport[]) => {
            (draft[sportIndex].lessonTypes[ltIndex] as any)[field] = value;
        });
    };
    
    const handleDeleteLessonType = (sportIndex: number, ltIndex: number) => {
        updateState(setSportsData, (draft: Sport[]) => {
            draft[sportIndex].lessonTypes.splice(ltIndex, 1);
        });
    };
    
    const handleAddOption = (sportIndex: number, ltIndex: number) => {
        updateState(setSportsData, (draft: Sport[]) => {
            draft[sportIndex].lessonTypes[ltIndex].options.push({
                id: `opt-${Date.now()}`,
                duration: 60
            });
        });
    };

    const handleUpdateOption = (sportIndex: number, ltIndex: number, optIndex: number, value: string) => {
        updateState(setSportsData, (draft: Sport[]) => {
            draft[sportIndex].lessonTypes[ltIndex].options[optIndex].duration = parseInt(value, 10) || 0;
        });
    };
    
    const handleDeleteOption = (sportIndex: number, ltIndex: number, optIndex: number) => {
        updateState(setSportsData, (draft: Sport[]) => {
            draft[sportIndex].lessonTypes[ltIndex].options.splice(optIndex, 1);
        });
    };
    
    const handleAddLocation = (sportIndex: number, ltIndex: number) => {
        updateState(setSportsData, (draft: Sport[]) => {
            draft[sportIndex].lessonTypes[ltIndex].locations.push({
                id: `loc-${Date.now()}`,
                name: 'Nuova Sede',
                address: ''
            });
        });
    };
    
    const handleUpdateLocation = (sportIndex: number, ltIndex: number, locIndex: number, field: keyof Omit<Location, 'id' | 'slotInterval' | 'googleCalendarId'>, value: string) => {
        updateState(setSportsData, (draft: Sport[]) => {
            (draft[sportIndex].lessonTypes[ltIndex].locations[locIndex] as any)[field] = value;
        });
    };
    
    const handleLocationIntervalChangeByName = (locationName: string, value: string) => {
        const newInterval = parseInt(value, 10);
        updateState(setSportsData, (draft: Sport[]) => {
            draft.forEach(sport => {
                sport.lessonTypes.forEach(lt => {
                    lt.locations.forEach(loc => {
                        if (loc.name === locationName) {
                            if (newInterval > 0) {
                                loc.slotInterval = newInterval;
                            } else {
                                delete loc.slotInterval;
                            }
                        }
                    });
                });
            });
        });
    };

    const handleLocationCalendarChangeByName = (locationName: string, calendarId: string) => {
        updateState(setSportsData, (draft: Sport[]) => {
            draft.forEach(sport => {
                sport.lessonTypes.forEach(lt => {
                    lt.locations.forEach(loc => {
                        if (loc.name === locationName) {
                           if (calendarId) {
                                loc.googleCalendarId = calendarId;
                            } else {
                                delete loc.googleCalendarId;
                            }
                        }
                    });
                });
            });
        });
    };

    const handleDeleteLocation = (sportIndex: number, ltIndex: number, locIndex: number) => {
        updateState(setSportsData, (draft: Sport[]) => {
            draft[sportIndex].lessonTypes[ltIndex].locations.splice(locIndex, 1);
        });
    };
    
    const uniqueLocations = useMemo(() => {
        const locationsMap = new Map<string, Location>();
        (sportsData || []).forEach(sport => {
            (sport.lessonTypes || []).forEach(lt => {
                (lt.locations || []).forEach(loc => {
                    if (loc.name && !locationsMap.has(loc.name)) {
                        locationsMap.set(loc.name, loc);
                    }
                });
            });
        });
        return Array.from(locationsMap.values());
    }, [sportsData]);

     // --- Integrations Handlers ---
    const handleCalendarSelectionChange = (calendarId: string) => {
        setSelectedCalendarIds(prev => {
            if (prev.includes(calendarId)) {
                return prev.filter(id => id !== calendarId);
            } else {
                return [...prev, calendarId];
            }
        });
    };

    const renderProfileTab = () => (
        <div className="p-6 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold mb-6 text-neutral-800">Personalizzazione Profilo & Home</h3>
            <div className="space-y-6 bg-neutral-50 p-6 rounded-lg border border-neutral-200">
                <div className="flex items-center gap-6">
                    <img src={consultantInfo.avatarUrl} alt={consultantInfo.name} className="w-24 h-24 rounded-full object-cover border-4 border-neutral-100 shadow-md" />
                    <div className="relative">
                         <label htmlFor="avatar-upload" className="cursor-pointer bg-neutral-50 text-primary font-semibold py-2 px-4 rounded-md border border-primary hover:bg-primary hover:text-white transition-colors flex items-center gap-2">
                            <CameraIcon className="w-5 h-5" />
                            Cambia Foto
                        </label>
                        <input id="avatar-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </div>
                </div>
                <div>
                    <label htmlFor="consultant-name" className="block text-sm font-medium text-neutral-400 mb-1">Nome</label>
                    <input 
                        id="consultant-name"
                        type="text" 
                        value={consultantInfo.name} 
                        onChange={(e) => handleInfoChange('name', e.target.value)}
                        className="w-full p-2 bg-neutral-100 border border-neutral-200 rounded-md focus:ring-primary focus:border-primary text-neutral-800"
                    />
                </div>
                 <div>
                    <label htmlFor="consultant-title" className="block text-sm font-medium text-neutral-400 mb-1">Titolo (sottotitolo)</label>
                    <input 
                        id="consultant-title"
                        type="text" 
                        value={consultantInfo.title} 
                        onChange={(e) => handleInfoChange('title', e.target.value)}
                        className="w-full p-2 bg-neutral-100 border border-neutral-200 rounded-md focus:ring-primary focus:border-primary text-neutral-800"
                    />
                </div>
                <div>
                    <label htmlFor="consultant-email" className="block text-sm font-medium text-neutral-400 mb-1">Email per le notifiche</label>
                    <div className="relative">
                        <EmailIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                            id="consultant-email"
                            type="email"
                            placeholder="La tua email per ricevere gli inviti"
                            value={consultantInfo.email || ''}
                            onChange={(e) => handleInfoChange('email', e.target.value)}
                            className="w-full pl-10 p-2 bg-neutral-100 border border-neutral-200 rounded-md focus:ring-primary focus:border-primary text-neutral-800"
                        />
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">Questa email sarà usata per inviarti una notifica di calendario per ogni nuova prenotazione.</p>
                </div>
                 <div>
                    <label htmlFor="consultant-welcome" className="block text-sm font-medium text-neutral-400 mb-1">Messaggio di Benvenuto</label>
                    <textarea 
                        id="consultant-welcome"
                        rows={3}
                        value={consultantInfo.welcomeMessage} 
                        onChange={(e) => handleInfoChange('welcomeMessage', e.target.value)}
                        className="w-full p-2 bg-neutral-100 border border-neutral-200 rounded-md focus:ring-primary focus:border-primary text-neutral-800"
                    />
                </div>
            </div>
             <div className="mt-6 text-right">
                <button 
                    onClick={() => onSaveConsultantInfo(consultantInfo)} 
                    className="bg-primary text-white font-bold py-2 px-6 rounded-md hover:bg-primary-dark transition-colors"
                >
                    Salva Modifiche Profilo
                </button>
            </div>
        </div>
    );
    
    const renderHoursTab = () => (
        <div className="p-6">
            {/* Slot Interval */}
            <div className="mb-8 pb-8 border-b border-neutral-200">
                 <h3 className="text-xl font-semibold mb-4 text-neutral-800">Impostazione Intervallo Slot Globale</h3>
                 <div className="flex items-center gap-4 bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                    <label htmlFor="slot-interval" className="font-medium text-neutral-400">Intervallo prenotazione (minuti):</label>
                    <select
                        id="slot-interval"
                        value={slotInterval}
                        onChange={(e) => setSlotInterval(Number(e.target.value))}
                        className="p-2 bg-neutral-100 border border-neutral-200 rounded-md focus:ring-primary focus:border-primary text-neutral-800"
                    >
                        <option value="15">15 minuti</option>
                        <option value="30">30 minuti</option>
                        <option value="60">60 minuti</option>
                    </select>
                 </div>
                 <div className="mt-4 text-right">
                    <button 
                        onClick={() => onSaveSlotInterval(slotInterval)} 
                        className="bg-primary text-white font-bold py-2 px-6 rounded-md hover:bg-primary-dark transition-colors"
                    >
                        Salva Intervallo Globale
                    </button>
                </div>
            </div>

            {/* Minimum Notice */}
            <div className="mb-8 pb-8 border-b border-neutral-200">
                 <h3 className="text-xl font-semibold mb-4 text-neutral-800">Preavviso Minimo Prenotazione</h3>
                 <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                    <label htmlFor="minimum-notice" className="font-medium text-neutral-400 block mb-2">Impedisci prenotazioni effettuate con meno di:</label>
                    <select
                        id="minimum-notice"
                        value={minimumNoticeHours}
                        onChange={(e) => setMinimumNoticeHours(Number(e.target.value))}
                        className="p-2 bg-neutral-100 border border-neutral-200 rounded-md focus:ring-primary focus:border-primary text-neutral-800"
                    >
                        <option value="0">Nessun preavviso</option>
                        <option value="2">2 ore di preavviso</option>
                        <option value="4">4 ore di preavviso</option>
                        <option value="8">8 ore di preavviso</option>
                        <option value="12">12 ore di preavviso</option>
                        <option value="24">24 ore di preavviso</option>
                        <option value="48">48 ore di preavviso</option>
                    </select>
                    <p className="text-xs text-neutral-400 mt-2">Gli utenti non potranno prenotare fasce orarie che iniziano prima di questo preavviso.</p>
                 </div>
                 <div className="mt-4 text-right">
                    <button 
                        onClick={() => onSaveMinimumNoticeHours(minimumNoticeHours)} 
                        className="bg-primary text-white font-bold py-2 px-6 rounded-md hover:bg-primary-dark transition-colors"
                    >
                        Salva Preavviso Minimo
                    </button>
                </div>
            </div>
            
            {/* Location Specific Settings */}
            <div className="mb-8 pb-8 border-b border-neutral-200">
                 <h3 className="text-xl font-semibold mb-4 text-neutral-800">Impostazioni Specifiche per Sede</h3>
                 <div className="space-y-4 bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                    {uniqueLocations.map(loc => (
                        <div key={loc.name} className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 border-t border-neutral-200/50 pt-4 first:border-t-0 first:pt-0">
                             <label htmlFor={`slot-interval-${loc.id}`} className="font-medium text-neutral-400">{loc.name}:</label>
                             <div className="flex items-center gap-2">
                                <label htmlFor={`slot-interval-${loc.id}`} className="text-sm text-neutral-400">Intervallo:</label>
                                <select
                                    id={`slot-interval-${loc.id}`}
                                    value={loc.slotInterval || 0}
                                    onChange={(e) => handleLocationIntervalChangeByName(loc.name, e.target.value)}
                                    className="p-2 bg-neutral-100 border border-neutral-200 rounded-md w-full focus:ring-primary focus:border-primary text-neutral-800"
                                >
                                    <option value="0">Default (Globale)</option>
                                    <option value="15">15 minuti</option>
                                    <option value="30">30 minuti</option>
                                    <option value="60">60 minuti</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <label htmlFor={`calendar-loc-${loc.id}`} className="text-sm text-neutral-400">Calendario:</label>
                                <select
                                    id={`calendar-loc-${loc.id}`}
                                    value={loc.googleCalendarId || ''}
                                    onChange={(e) => handleLocationCalendarChangeByName(loc.name, e.target.value)}
                                    disabled={!isBackendConfigured}
                                    className="p-2 bg-neutral-100 border border-neutral-200 rounded-md w-full disabled:bg-neutral-200/50 focus:ring-primary focus:border-primary text-neutral-800 disabled:text-neutral-400"
                                >
                                    <option value="">Default (Primario)</option>
                                    {writableCalendars.map(cal => (
                                        <option key={cal.id} value={cal.id}>{cal.summary}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ))}
                    {!isBackendConfigured && <p className="text-sm text-neutral-400 mt-2">Completa la configurazione nella scheda "Integrazioni" per assegnare calendari specifici alle sedi.</p>}
                 </div>
                 <div className="mt-4 text-right">
                    <button 
                        onClick={() => onSaveSportsData(sportsData)} 
                        className="bg-primary text-white font-bold py-2 px-6 rounded-md hover:bg-primary-dark transition-colors"
                    >
                        Salva Impostazioni Sedi
                    </button>
                </div>
            </div>

            {/* Working Hours */}
            <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-neutral-800">Orari di Lavoro Settimanali</h3>
                <div className="space-y-4">
                    {weekDays.map((dayName, index) => {
                        const dayHours = workingHours[index];
                        return (
                            <div key={index} className="flex items-center gap-4 p-3 bg-neutral-50 rounded-md border border-neutral-200">
                                <label className="flex items-center w-32">
                                    <input
                                        type="checkbox"
                                        checked={!!dayHours}
                                        onChange={() => toggleDayAvailability(index)}
                                        className="h-4 w-4 text-primary focus:ring-primary border-neutral-200 rounded bg-neutral-100"
                                    />
                                    <span className="ml-3 font-medium text-neutral-600">{dayName}</span>
                                </label>
                                {dayHours ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="time"
                                            value={`${String(Math.floor(dayHours.start / 60)).padStart(2, '0')}:${String(dayHours.start % 60).padStart(2, '0')}`}
                                            onChange={(e) => handleWorkingHoursChange(index, 'start', e.target.value)}
                                            className="p-1 bg-neutral-100 border border-neutral-200 rounded-md focus:ring-primary focus:border-primary text-neutral-800"
                                        />
                                        <span className='text-neutral-400'>-</span>
                                        <input
                                            type="time"
                                            value={`${String(Math.floor(dayHours.end / 60)).padStart(2, '0')}:${String(dayHours.end % 60).padStart(2, '0')}`}
                                            onChange={(e) => handleWorkingHoursChange(index, 'end', e.target.value)}
                                            className="p-1 bg-neutral-100 border border-neutral-200 rounded-md focus:ring-primary focus:border-primary text-neutral-800"
                                        />
                                    </div>
                                ) : (
                                    <span className="text-neutral-400">Non disponibile</span>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="mt-6 text-right">
                    <button 
                        onClick={() => onSaveWorkingHours(workingHours)} 
                        className="bg-primary text-white font-bold py-2 px-6 rounded-md hover:bg-primary-dark transition-colors"
                    >
                        Salva Orari
                    </button>
                </div>
            </div>

            {/* Date Overrides */}
            <div>
                <h3 className="text-xl font-semibold mb-4 text-neutral-800">Eccezioni Calendario</h3>
                <form onSubmit={handleAddOverride} className="bg-neutral-50 p-4 rounded-lg mb-6 flex flex-wrap items-end gap-4 border border-neutral-200">
                    <div>
                        <label htmlFor="override-date" className="block text-sm font-medium text-neutral-400 mb-1">Data</label>
                        <input
                            id="override-date"
                            type="date"
                            value={newOverrideDate}
                            onChange={(e) => setNewOverrideDate(e.target.value)}
                            required
                            className="p-2 bg-neutral-100 border border-neutral-200 rounded-md focus:ring-primary focus:border-primary text-neutral-800"
                        />
                    </div>
                    <div>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={isNewOverrideAvailable}
                                onChange={(e) => setIsNewOverrideAvailable(e.target.checked)}
                                className="h-4 w-4 text-primary focus:ring-primary border-neutral-200 rounded bg-neutral-100"
                            />
                            <span className="ml-2 text-sm font-medium text-neutral-400">Disponibile</span>
                        </label>
                    </div>
                    {isNewOverrideAvailable && (
                        <div className="flex items-end gap-2">
                            <div>
                                <label htmlFor="override-start" className="block text-sm font-medium text-neutral-400 mb-1">Inizio</label>
                                <input id="override-start" type="time" value={newOverrideStart} onChange={(e) => setNewOverrideStart(e.target.value)} className="p-2 bg-neutral-100 border border-neutral-200 rounded-md focus:ring-primary focus:border-primary text-neutral-800" />
                            </div>
                            <div>
                                <label htmlFor="override-end" className="block text-sm font-medium text-neutral-400 mb-1">Fine</label>
                                <input id="override-end" type="time" value={newOverrideEnd} onChange={(e) => setNewOverrideEnd(e.target.value)} className="p-2 bg-neutral-100 border border-neutral-200 rounded-md focus:ring-primary focus:border-primary text-neutral-800" />
                            </div>
                        </div>
                    )}
                    <button type="submit" className="bg-green-500 text-white font-bold py-2 px-4 rounded hover:bg-green-600 flex items-center">
                        <PlusIcon className="w-5 h-5 mr-1"/> Aggiungi Eccezione
                    </button>
                </form>
                <div className="space-y-2">
                    {Object.entries(dateOverrides).sort().map(([date, hours]) => {
                        const typedHours = hours as { start: number; end: number } | null;
                        return (
                            <div key={date} className="flex items-center justify-between p-3 bg-neutral-50 border border-neutral-200 rounded-md">
                                <span className="font-semibold text-neutral-800">{new Date(date + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                {typedHours ? (
                                    <span className="text-green-400">{`${String(Math.floor(typedHours.start / 60)).padStart(2, '0')}:${String(typedHours.start % 60).padStart(2, '0')}`} - {`${String(Math.floor(typedHours.end / 60)).padStart(2, '0')}:${String(typedHours.end % 60).padStart(2, '0')}`}</span>
                                ) : (
                                    <span className="text-red-400">Non disponibile</span>
                                )}
                                <button onClick={() => handleRemoveOverride(date)} className="text-neutral-400 hover:text-red-500"><XIcon className="w-5 h-5"/></button>
                            </div>
                        );
                    })}
                </div>
                 <div className="mt-6 text-right">
                    <button 
                        onClick={() => onSaveDateOverrides(dateOverrides)} 
                        className="bg-primary text-white font-bold py-2 px-6 rounded-md hover:bg-primary-dark transition-colors"
                    >
                        Salva Eccezioni
                    </button>
                </div>
            </div>
        </div>
    );

    const renderServicesTab = () => (
        <div className="p-6">
            <h3 className="text-xl font-semibold mb-4 text-neutral-800">Gestione Sport, Lezioni e Sedi</h3>
            <div className="space-y-6">
                {sportsData.map((sport, sportIndex) => (
                    <div key={sport.id} className="p-4 bg-neutral-50 rounded-lg shadow-sm border border-neutral-200">
                        <div className="flex items-start justify-between border-b border-neutral-200 pb-3 mb-3 gap-4">
                             <div className="flex items-center gap-4 flex-grow">
                                <input type="color" value={sport.color} onChange={e => handleUpdateSport(sportIndex, 'color', e.target.value)} className="w-10 h-10 rounded-md overflow-hidden bg-transparent border-none cursor-pointer" />
                                <input type="text" value={sport.name} onChange={e => handleUpdateSport(sportIndex, 'name', e.target.value)} className="text-lg font-bold p-1 bg-transparent border-b-2 border-transparent focus:border-primary outline-none flex-grow text-neutral-800" />
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <button onClick={() => handleDeleteSport(sportIndex)} className="text-neutral-400 hover:text-red-500"><TrashIcon className="w-5 h-5" /></button>
                                {isBackendConfigured && (
                                    <div className="w-64">
                                        <label htmlFor={`calendar-sport-${sport.id}`} className="block text-xs font-medium text-neutral-400 mb-1">Calendario Google per nuovi eventi</label>
                                        <select
                                            id={`calendar-sport-${sport.id}`}
                                            value={sport.googleCalendarId || ''}
                                            onChange={e => handleUpdateSport(sportIndex, 'googleCalendarId', e.target.value)}
                                            className="p-1 bg-neutral-100 border border-neutral-200 rounded-md w-full text-sm focus:ring-primary focus:border-primary text-neutral-800"
                                        >
                                            <option value="">Default (Primario)</option>
                                            {writableCalendars.map(cal => (
                                                <option key={cal.id} value={cal.id}>{cal.summary}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Lesson Types */}
                        <div className="space-y-4 pl-4">
                            {(sport.lessonTypes || []).map((lt, ltIndex) => (
                                <div key={lt.id} className="p-3 bg-neutral-100 rounded-md border border-neutral-200">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex-1">
                                            <input type="text" value={lt.name} onChange={e => handleUpdateLessonType(sportIndex, ltIndex, 'name', e.target.value)} className="font-semibold p-1 w-full bg-transparent border-transparent focus:border-primary outline-none border-b-2 text-neutral-800" />
                                            <textarea value={lt.description} onChange={e => handleUpdateLessonType(sportIndex, ltIndex, 'description', e.target.value)} className="text-sm text-neutral-400 p-1 w-full bg-transparent border-transparent focus:border-primary outline-none border-b-2 mt-1" placeholder="Descrizione..." rows={2}></textarea>

                                            {/* Options */}
                                            <div className="mt-3 pl-4 border-l-2 border-neutral-200">
                                                <h5 className="text-sm font-semibold text-neutral-600 mb-2">Opzioni Durata</h5>
                                                {(lt.options || []).map((opt, optIndex) => (
                                                    <div key={opt.id} className="flex items-center gap-2 mb-1">
                                                        <input 
                                                            type="number" 
                                                            value={opt.duration} 
                                                            onChange={e => handleUpdateOption(sportIndex, ltIndex, optIndex, e.target.value)} 
                                                            className="w-20 p-1 bg-white border border-neutral-200 rounded-md text-sm"
                                                        />
                                                        <span className="text-sm text-neutral-400">minuti</span>
                                                        <button onClick={() => handleDeleteOption(sportIndex, ltIndex, optIndex)} className="text-neutral-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                                                    </div>
                                                ))}
                                                <button onClick={() => handleAddOption(sportIndex, ltIndex)} className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"><PlusIcon className="w-3 h-3"/>Aggiungi durata</button>
                                            </div>

                                            {/* Locations */}
                                            <div className="mt-3 pl-4 border-l-2 border-neutral-200">
                                                <h5 className="text-sm font-semibold text-neutral-600 mb-2">Sedi</h5>
                                                {(lt.locations || []).map((loc, locIndex) => (
                                                    <div key={loc.id} className="mb-2 p-2 bg-white rounded border border-neutral-200/50">
                                                        <div className="flex justify-between items-center">
                                                            <input 
                                                                type="text" 
                                                                value={loc.name} 
                                                                onChange={e => handleUpdateLocation(sportIndex, ltIndex, locIndex, 'name', e.target.value)} 
                                                                className="font-medium p-1 w-full bg-transparent border-transparent focus:border-primary outline-none border-b text-sm"
                                                                placeholder="Nome Sede"
                                                            />
                                                            <button onClick={() => handleDeleteLocation(sportIndex, ltIndex, locIndex)} className="text-neutral-400 hover:text-red-500 ml-2"><TrashIcon className="w-4 h-4" /></button>
                                                        </div>
                                                        <input 
                                                            type="text" 
                                                            value={loc.address} 
                                                            onChange={e => handleUpdateLocation(sportIndex, ltIndex, locIndex, 'address', e.target.value)} 
                                                            className="p-1 w-full bg-transparent border-transparent focus:border-primary outline-none border-b text-xs mt-1"
                                                            placeholder="Indirizzo"
                                                        />
                                                    </div>
                                                ))}
                                                <button onClick={() => handleAddLocation(sportIndex, ltIndex)} className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"><PlusIcon className="w-3 h-3"/>Aggiungi sede</button>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteLessonType(sportIndex, ltIndex)} className="text-neutral-400 hover:text-red-500"><TrashIcon className="w-5 h-5" /></button>
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => handleAddLessonType(sportIndex)} className="text-sm text-primary hover:underline mt-4 flex items-center gap-1"><PlusIcon className="w-4 h-4" /> Aggiungi Tipo Lezione</button>
                        </div>
                    </div>
                ))}
                <button onClick={handleAddSport} className="w-full text-center p-3 border-2 border-dashed border-neutral-200 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:border-primary hover:text-primary transition-colors">
                    <PlusIcon className="w-6 h-6 mx-auto" />
                    <span className="text-sm font-semibold">Aggiungi Sport</span>
                </button>
            </div>
            <div className="mt-6 text-right">
                <button 
                    onClick={() => onSaveSportsData(sportsData)} 
                    className="bg-primary text-white font-bold py-2 px-6 rounded-md hover:bg-primary-dark transition-colors"
                >
                    Salva Modifiche Servizi
                </button>
            </div>
        </div>
    );
    
    const handleAddAdminEmail = (e: React.FormEvent) => {
        e.preventDefault();
        if (newAdminEmail && !localAdminEmails.map(e => e.toLowerCase()).includes(newAdminEmail.toLowerCase())) {
            setLocalAdminEmails([...localAdminEmails, newAdminEmail.trim()]);
            setNewAdminEmail('');
        }
    };

    const handleRemoveAdminEmail = (emailToRemove: string) => {
        setLocalAdminEmails(localAdminEmails.filter(email => email !== emailToRemove));
    };

    const renderAdminsTab = () => (
         <div className="p-6">
            <h3 className="text-xl font-semibold mb-4 text-neutral-800">Gestione Amministratori</h3>
            <div className="bg-neutral-50 p-6 rounded-lg border border-neutral-200">
                <p className="text-sm text-neutral-400 mb-4">
                    Gli utenti in questa lista possono accedere a questo pannello di amministrazione e modificare le impostazioni.
                </p>
                
                <div className="space-y-2 mb-6">
                    {localAdminEmails.map((email) => (
                        <div key={email} className="flex items-center justify-between p-3 bg-neutral-100 rounded-md border border-neutral-200">
                            <div className="flex items-center gap-2">
                                <EmailIcon className="w-5 h-5 text-neutral-400" />
                                <span className="text-neutral-800">{email}</span>
                            </div>
                            <button onClick={() => handleRemoveAdminEmail(email)} className="text-neutral-400 hover:text-red-500" disabled={localAdminEmails.length <= 1}>
                                <TrashIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    ))}
                    {localAdminEmails.length <= 1 && <p className="text-xs text-neutral-400 mt-2">Deve esserci almeno un amministratore.</p>}
                </div>

                <form onSubmit={handleAddAdminEmail} className="flex items-center gap-4">
                    <input 
                        type="email"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="nuovo.admin@esempio.com"
                        className="flex-grow p-2 bg-white border border-neutral-200 rounded-md focus:ring-primary focus:border-primary text-neutral-800"
                    />
                    <button type="submit" className="bg-green-500 text-white font-bold py-2 px-4 rounded hover:bg-green-600 flex items-center">
                        <PlusIcon className="w-5 h-5 mr-1"/> Aggiungi
                    </button>
                </form>

                 <div className="mt-6 text-right">
                    <button 
                        onClick={() => onSaveAdminEmails(localAdminEmails)} 
                        className="bg-primary text-white font-bold py-2 px-6 rounded-md hover:bg-primary-dark transition-colors"
                        disabled={localAdminEmails.length < 1}
                    >
                        Salva Lista Admin
                    </button>
                </div>
            </div>
        </div>
    );
    
    const renderIntegrationsTab = () => (
        <div className="p-6">
            <h3 className="text-xl font-semibold mb-4 text-neutral-800">Integrazione Google Calendar</h3>
            <div className="bg-neutral-50 p-6 rounded-lg border border-neutral-200">
                <p className="mb-4 text-neutral-400">
                    Collega il tuo account Google per sincronizzare automaticamente le prenotazioni con il tuo calendario e verificare le disponibilità in tempo reale, evitando sovrapposizioni.
                </p>
                {isBackendConfigured && user ? (
                    <div>
                        <div className="flex items-center gap-4 p-4 bg-neutral-100 rounded-lg border border-neutral-200 mb-6">
                             <img src={user.picture} alt={user.name} className="w-12 h-12 rounded-full" />
                             <div>
                                <p className="font-semibold text-neutral-800">{user.name}</p>
                                <p className="text-sm text-neutral-400">{user.email}</p>
                             </div>
                             <button onClick={() => handleGoogleDisconnect()} className="ml-auto bg-red-100 text-red-600 font-semibold py-2 px-4 rounded-md hover:bg-red-200 transition-colors flex items-center gap-2">
                                 <ArrowLeftOnRectangleIcon className="w-5 h-5"/>
                                 Disconnetti
                             </button>
                        </div>
                        
                        <h4 className="text-lg font-semibold mb-2 text-neutral-800">Seleziona calendari da controllare</h4>
                        <p className="text-sm text-neutral-400 mb-4">
                            Il sistema controllerà la disponibilità su tutti i calendari selezionati. Le nuove prenotazioni verranno create sul calendario associato allo sport/sede, o sul calendario primario se non specificato.
                        </p>
                        
                        {isLoadingCalendars && <div className="flex justify-center items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}

                        {calendarError && (
                             <div className="p-4 bg-red-900/10 border border-red-400/30 text-red-400 rounded-md text-sm mb-4">
                                <p className="font-bold mb-2">Errore nel Caricamento dei Calendari</p>
                                <p>{calendarError}</p>
                                {showReauthPrompt && (
                                     <button onClick={handleReAuth} className="mt-3 bg-red-500 text-white font-semibold py-1 px-3 rounded-md hover:bg-red-600 transition-colors">
                                        Riautorizza
                                    </button>
                                )}
                            </div>
                        )}

                        {calendarsFetched && !isLoadingCalendars && !calendarError && allGoogleCalendars.length === 0 && (
                            <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-600 rounded-lg text-sm mb-4">
                                <div className="flex">
                                    <InformationCircleIcon className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-bold mb-1">Nessun Calendario Trovato</p>
                                        <p>
                                            Il tuo account Google è connesso, ma non abbiamo trovato calendari. Questo può accadere se l'applicazione non ha i permessi necessari.
                                        </p>
                                        <p className="mt-2">
                                            Prova a <button onClick={handleReAuth} className="font-bold underline hover:text-amber-700">riconnettere il tuo account</button> per forzare l'aggiornamento dei permessi.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {allGoogleCalendars.length > 0 && (
                            <div className="space-y-3">
                                {allGoogleCalendars.map(cal => (
                                    <label key={cal.id} className="flex items-center p-3 bg-neutral-100 rounded-md border border-neutral-200 cursor-pointer hover:bg-neutral-200/50">
                                        <input 
                                            type="checkbox"
                                            checked={selectedCalendarIds.includes(cal.id)}
                                            onChange={() => handleCalendarSelectionChange(cal.id)}
                                            className="h-4 w-4 text-primary focus:ring-primary border-neutral-200 rounded"
                                        />
                                        <span className="ml-3 text-neutral-800">{cal.summary}{cal.primary && ' (Primario)'}</span>
                                        <span className="ml-auto text-xs text-neutral-400 capitalize">{cal.accessRole.replace('Reader', '')}</span>
                                    </label>
                                ))}
                            </div>
                        )}

                        <div className="mt-6 text-right">
                             <button 
                                onClick={() => onSaveSelectedCalendars(selectedCalendarIds)} 
                                className="bg-primary text-white font-bold py-2 px-6 rounded-md hover:bg-primary-dark transition-colors"
                            >
                                Salva Selezione Calendari
                            </button>
                        </div>

                    </div>
                ) : (
                    <div>
                        <button onClick={handleGoogleConnect} className="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-3">
                            <svg className="w-6 h-6" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
                            Connetti con Google
                        </button>
                        {loginError && <p className="text-red-500 text-sm mt-4 text-center">{loginError}</p>}
                    </div>
                )}
            </div>
        </div>
    );
    
    const renderContent = () => {
        if (!user || !isAdmin) {
            return (
                <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                    <h2 className="text-2xl font-bold text-neutral-800 mb-2">Accesso Amministratore</h2>
                    <p className="text-neutral-400 mb-6">Accedi con un account Google autorizzato per gestire le prenotazioni.</p>
                    <button onClick={handleGoogleConnect} className="bg-blue-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-3">
                         <svg className="w-6 h-6" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
                        Accedi con Google
                    </button>
                    {loginError && <p className="text-red-500 text-sm mt-4">{loginError}</p>}
                </div>
            );
        }

        const tabs = [
            { id: 'integrations', label: 'Integrazioni' },
            { id: 'services', label: 'Servizi & Sedi' },
            { id: 'hours', label: 'Orari & Disponibilità' },
            { id: 'profile', label: 'Profilo Pubblico' },
            { id: 'admins', label: 'Amministratori' },
        ];
        
        return (
            <div className="flex h-full">
                <aside className="w-64 bg-neutral-100 p-4 border-r border-neutral-200">
                    <h2 className="text-lg font-bold text-primary mb-6">Pannello Admin</h2>
                    <nav className="flex flex-col space-y-2">
                        {tabs.map(tab => (
                             <button 
                                key={tab.id} 
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full text-left px-4 py-2 rounded-md font-semibold transition-colors ${activeTab === tab.id ? 'bg-primary text-white' : 'text-neutral-600 hover:bg-neutral-200/50'}`}
                             >
                                {tab.label}
                             </button>
                        ))}
                    </nav>
                </aside>
                <div className="flex-1 bg-white overflow-y-auto">
                    {activeTab === 'integrations' && renderIntegrationsTab()}
                    {activeTab === 'services' && renderServicesTab()}
                    {activeTab === 'hours' && renderHoursTab()}
                    {activeTab === 'profile' && renderProfileTab()}
                    {activeTab === 'admins' && renderAdminsTab()}
                </div>
            </div>
        );
    };


    return (
        <>
            <header className="bg-neutral-50 border-b border-neutral-200 relative z-10 p-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-neutral-800">Impostazioni</h2>
                <button onClick={onExitAdminView} className="p-2 rounded-full hover:bg-neutral-200/50">
                    <XIcon className="w-6 h-6 text-neutral-400"/>
                </button>
            </header>
            <main className="flex-grow overflow-hidden">
                {renderContent()}
            </main>
        </>
    );
}

export default AdminPanel;