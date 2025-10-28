import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { WorkingHours, DateOverrides, Sport, LessonType, LessonOption, Location, ConsultantInfo } from '../types';
import { XIcon, PlusIcon, TrashIcon, CameraIcon, EmailIcon, ArrowLeftOnRectangleIcon } from './icons';
import { auth, getGoogleCalendarList } from '../firebaseConfig';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

interface GoogleCalendar {
    id: string;
    summary: string;
    accessRole: 'owner' | 'writer' | 'reader' | 'freeBusyReader';
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
    
    const [activeTab, setActiveTab] = useState('profile');

    const [newOverrideDate, setNewOverrideDate] = useState('');
    const [newOverrideStart, setNewOverrideStart] = useState('09:00');
    const [newOverrideEnd, setNewOverrideEnd] = useState('17:00');
    const [isNewOverrideAvailable, setIsNewOverrideAvailable] = useState(true);

    // --- State for Google Calendar Integration ---
    const [allGoogleCalendars, setAllGoogleCalendars] = useState<GoogleCalendar[]>([]);
    const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
    const [calendarError, setCalendarError] = useState<string | null>(null);

    const isBackendConfigured = !!localStorage.getItem('google_access_token');

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


    const fetchCalendars = useCallback(async () => {
        const googleAccessToken = localStorage.getItem('google_access_token');
        if (!googleAccessToken || !getGoogleCalendarList) {
            setCalendarError("Autenticazione Google richiesta.");
            return;
        }
        setIsLoadingCalendars(true);
        setCalendarError(null);
        try {
            const result = await getGoogleCalendarList({ googleAuthToken: googleAccessToken });
            const data = result.data as { calendars: GoogleCalendar[] };
            setAllGoogleCalendars(data.calendars || []);
        } catch (error: any) {
            console.error("ERRORE CRITICO nel caricamento dei calendari:", error.message);
            const detailedMessage = error?.details?.serverMessage || error.message || "Si è verificato un errore sconosciuto.";
            setCalendarError(`Caricamento fallito: ${detailedMessage}`);

            if (error.code === 'unauthenticated' || (error.message && (error.message.toLowerCase().includes('token') || error.message.toLowerCase().includes('credentials')))) {
                handleGoogleDisconnect();
                showToast('Sessione Google scaduta o non valida. Riconnettiti.', 'error');
            }
        } finally {
            setIsLoadingCalendars(false);
        }
    }, [showToast]);

    useEffect(() => {
        if(isAdmin) {
            const shouldFetch = (activeTab === 'integrations' || activeTab === 'services' || activeTab === 'hours');
            const googleAccessToken = localStorage.getItem('google_access_token');
            if (shouldFetch && googleAccessToken && allGoogleCalendars.length === 0) {
                fetchCalendars();
            }
        }
    }, [isAdmin, activeTab, fetchCalendars, allGoogleCalendars.length]);


    // --- Google Auth Handlers using Firebase Authentication ---
    const handleGoogleConnect = async () => {
        if (!auth) {
            showToast('Firebase Auth non è inizializzato.', 'error');
            return;
        }
        const provider = new GoogleAuthProvider();
        provider.addScope("https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events");

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
                showToast('Login riuscito!', 'success');
            } else {
                throw new Error("Informazioni utente o token non ricevuti da Google.");
            }
        } catch (error: any) {
            console.error("Errore durante l'accesso con Google:", error);
            let message = `Errore di accesso: ${error.message}`;
            
            if (error.code === 'auth/popup-closed-by-user') {
                message = 'La finestra di accesso è stata chiusa prima del completamento.';
            } else if (error.code === 'auth/unauthorized-domain') {
                message = "Dominio non autorizzato. L'amministratore deve aggiungere questo URL alla lista dei domini autorizzati nelle impostazioni di Firebase Authentication.";
            } else if (error.code === 'auth/popup-blocked') {
                message = 'La finestra di popup è stata bloccata dal browser. Abilita i popup per questo sito e riprova.';
            }
        
            if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
                showToast(message, 'error');
            }
        }
    };

    const handleGoogleDisconnect = async () => {
        if (!auth) return;
        try {
            await signOut(auth);
            localStorage.removeItem('google_access_token');
            setAllGoogleCalendars([]);
            onGoogleLogout();
            showToast('Logout effettuato.', 'success');
        } catch (error: any) {
            console.error("Errore durante il logout:", error);
            showToast(`Errore di logout: ${error.message}`, 'error');
        }
    };


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
    
    const handleUpdateLocation = (sportIndex: number, ltIndex: number, locIndex: number, field: keyof Omit<Location, 'id' | 'slotInterval'>, value: string) => {
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
        sportsData.forEach(sport => {
            sport.lessonTypes.forEach(lt => {
                lt.locations.forEach(loc => {
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
                            {sport.lessonTypes.map((lt, ltIndex) => (
                                <div key={lt.id} className="p-3 bg-neutral-100 rounded-md border border-neutral-200">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <input type="text" value={lt.name} onChange={e => handleUpdateLessonType(sportIndex, ltIndex, 'name', e.target.value)} className="font-semibold p-1 w-full bg-transparent border-transparent focus:border-primary outline-none border-b-2 text-neutral-800" />
                                            <textarea value={lt.description} onChange={e => handleUpdateLessonType(sportIndex, ltIndex, 'description', e.target.value)} className="text-sm text-neutral-600 p-1 w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-md focus:ring-primary focus:border-primary" placeholder="Descrizione..."/>
                                        </div>
                                        <button onClick={() => handleDeleteLessonType(sportIndex, ltIndex)} className="ml-2 text-neutral-400 hover:text-red-500"><XIcon className="w-4 h-4"/></button>
                                    </div>
                                    
                                    {/* Options */}
                                    <div className="mt-2 pl-4">
                                        <h4 className="text-sm font-medium text-neutral-400">Opzioni Durata</h4>
                                        {lt.options.map((opt, optIndex) => (
                                            <div key={opt.id} className="flex items-center gap-2 mt-1">
                                                <input type="number" step="15" value={opt.duration} onChange={e => handleUpdateOption(sportIndex, ltIndex, optIndex, e.target.value)} className="w-20 p-1 bg-neutral-50 border border-neutral-200 rounded-md focus:ring-primary focus:border-primary text-neutral-800" />
                                                <span className="text-neutral-600">minuti</span>
                                                <button onClick={() => handleDeleteOption(sportIndex, ltIndex, optIndex)} className="text-neutral-400 hover:text-red-500"><XIcon className="w-4 h-4"/></button>
                                            </div>
                                        ))}
                                        <button onClick={() => handleAddOption(sportIndex, ltIndex)} className="text-sm text-primary hover:underline mt-1">Aggiungi opzione</button>
                                    </div>
                                    
                                    {/* Locations */}
                                    <div className="mt-2 pl-4">
                                        <h4 className="text-sm font-medium text-neutral-400">Sedi</h4>
                                        {lt.locations.map((loc, locIndex) => (
                                            <div key={loc.id} className="mt-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <input type="text" value={loc.name} onChange={e => handleUpdateLocation(sportIndex, ltIndex, locIndex, 'name', e.target.value)} className="p-1 bg-neutral-50 border border-neutral-200 rounded-md flex-1 focus:ring-primary focus:border-primary text-neutral-800" placeholder="Nome Sede"/>
                                                    <button onClick={() => handleDeleteLocation(sportIndex, ltIndex, locIndex)} className="text-neutral-400 hover:text-red-500"><XIcon className="w-4 h-4"/></button>
                                                </div>
                                                <input type="text" value={loc.address} onChange={e => handleUpdateLocation(sportIndex, ltIndex, locIndex, 'address', e.target.value)} className="p-1 bg-neutral-50 border border-neutral-200 rounded-md w-full focus:ring-primary focus:border-primary text-neutral-800" placeholder="Indirizzo"/>
                                            </div>
                                        ))}
                                        <button onClick={() => handleAddLocation(sportIndex, ltIndex)} className="text-sm text-primary hover:underline mt-1">Aggiungi sede</button>
                                    </div>
                                </div>
                            ))}
                             <button onClick={() => handleAddLessonType(sportIndex)} className="text-sm font-semibold text-primary hover:underline mt-3">+ Aggiungi Tipo Lezione</button>
                        </div>
                    </div>
                ))}
            </div>
            {!isBackendConfigured && <p className="text-sm text-neutral-400 mt-4">Completa la configurazione nella scheda "Integrazioni" per assegnare calendari specifici agli sport.</p>}
            <button onClick={handleAddSport} className="mt-6 w-full text-center bg-neutral-200/50 hover:bg-neutral-200 text-neutral-800 font-bold py-2 px-4 rounded">+ Aggiungi Sport</button>
            <div className="mt-8 text-right">
                <button 
                    onClick={() => onSaveSportsData(sportsData)} 
                    className="bg-primary text-white font-bold py-2 px-6 rounded-md hover:bg-primary-dark transition-colors"
                >
                    Salva Modifiche Servizi
                </button>
            </div>
        </div>
    );

    const renderIntegrationsTab = () => {
        return (
            <div className="p-6">
                 <h3 className="text-xl font-semibold mb-2 text-neutral-800">Integrazione Google Calendar</h3>
                 <p className="text-sm text-neutral-400 mb-6">Collega il tuo Account Google per sincronizzare la disponibilità e creare eventi automaticamente.</p>
                
                <div className="p-6 bg-neutral-50 border border-neutral-200 rounded-lg">
                    <div className="flex flex-col sm:flex-row items-center justify-between">
                        <div>
                            <h4 className="font-semibold text-lg text-neutral-800">Stato della connessione</h4>
                            {isBackendConfigured ? (
                                <p className="text-green-600 font-semibold mt-1">Collegato come {user?.email}</p>
                            ) : (
                                <p className="text-neutral-400 mt-1">Non collegato</p>
                            )}
                        </div>
                        <div className="mt-4 sm:mt-0">
                           <button
                                onClick={handleGoogleDisconnect}
                                className="bg-red-500 text-white font-bold py-2 px-6 rounded-md hover:bg-red-600 transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>

                { isBackendConfigured && (
                 <div className="mt-6 p-6 bg-neutral-50 border border-neutral-200 rounded-lg">
                    <h4 className="font-semibold text-lg text-neutral-800 mb-2">Seleziona i calendari per la sincronizzazione</h4>
                    <p className="text-sm text-neutral-400 mb-4">
                        Gli impegni presenti nei calendari selezionati verranno considerati come "non disponibile", bloccando gli slot corrispondenti.
                    </p>
                    {isLoadingCalendars ? (
                         <div className="flex items-center justify-center p-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                         </div>
                    ): calendarError ? (
                        <p className="text-red-500">{calendarError}</p>
                    ) : allGoogleCalendars.length > 0 ? (
                        <>
                         <div className="space-y-3 p-4 bg-neutral-100 border border-neutral-200 rounded-md max-h-96 overflow-y-auto">
                                {allGoogleCalendars.map(cal => (
                                    <label key={cal.id} className="flex items-center p-2 rounded-md hover:bg-neutral-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedCalendarIds.includes(cal.id)}
                                        onChange={() => handleCalendarSelectionChange(cal.id)}
                                        className="h-5 w-5 text-primary focus:ring-primary border-neutral-200 rounded bg-neutral-50"
                                    />
                                    <span className="ml-3 text-neutral-600">{cal.summary}</span>
                                    { (cal.accessRole !== 'owner' && cal.accessRole !== 'writer') && 
                                        <span className="ml-auto text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">Sola lettura</span> 
                                    }
                                    </label>
                                ))}
                            </div>
                             <div className="mt-6 text-right">
                                <button 
                                    onClick={() => onSaveSelectedCalendars(selectedCalendarIds)} 
                                    className="bg-primary text-white font-bold py-2 px-6 rounded-md hover:bg-primary-dark transition-colors"
                                >
                                    Salva Calendari Selezionati
                                </button>
                            </div>
                        </>
                    ) : (
                        <p className="text-neutral-400 text-center p-4">Nessun calendario trovato nel tuo account Google.</p>
                    )}
                 </div>
                )}
            </div>
        );
    };

    const handleAddAdmin = (e: React.FormEvent) => {
        e.preventDefault();
        const emailToAdd = newAdminEmail.trim().toLowerCase();
        if (emailToAdd && /^\S+@\S+\.\S+$/.test(emailToAdd)) { // Basic email validation
            if (localAdminEmails.includes(emailToAdd)) {
                showToast('Questo utente è già un amministratore.', 'error');
                return;
            }
            const updatedEmails = [...localAdminEmails, emailToAdd];
            onSaveAdminEmails(updatedEmails);
            setNewAdminEmail('');
        } else {
            showToast('Inserisci un indirizzo email valido.', 'error');
        }
    };

    const handleRemoveAdmin = (emailToRemove: string) => {
        if (localAdminEmails.length <= 1) {
            showToast("Non puoi rimuovere l'unico amministratore.", 'error');
            return;
        }
        if (emailToRemove === user?.email) {
            showToast('Non puoi rimuovere te stesso.', 'error');
            return;
        }
        const updatedEmails = localAdminEmails.filter(email => email !== emailToRemove);
        onSaveAdminEmails(updatedEmails);
    };

    const renderAdminsTab = () => (
        <div className="p-6 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold mb-2 text-neutral-800">Gestione Amministratori</h3>
            <p className="text-sm text-neutral-400 mb-6">Aggiungi o rimuovi utenti che possono accedere a questo pannello di amministrazione.</p>
            
            <div className="bg-neutral-50 p-6 rounded-lg border border-neutral-200 mb-6">
                <h4 className="font-semibold text-lg text-neutral-800 mb-4">Aggiungi nuovo amministratore</h4>
                <form onSubmit={handleAddAdmin} className="flex items-center gap-4">
                    <div className="relative flex-grow">
                        <EmailIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                            type="email"
                            placeholder="email@esempio.com"
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.target.value)}
                            className="w-full pl-10 p-2 bg-neutral-100 border border-neutral-200 rounded-md focus:ring-primary focus:border-primary text-neutral-800"
                        />
                    </div>
                    <button type="submit" className="bg-green-500 text-white font-bold py-2 px-4 rounded hover:bg-green-600 flex items-center">
                        <PlusIcon className="w-5 h-5 mr-1"/> Aggiungi
                    </button>
                </form>
            </div>

            <div className="bg-neutral-50 p-6 rounded-lg border border-neutral-200">
                <h4 className="font-semibold text-lg text-neutral-800 mb-4">Amministratori attuali</h4>
                <div className="space-y-3">
                    {localAdminEmails.map((email) => (
                        <div key={email} className="flex items-center justify-between p-3 bg-neutral-100 border border-neutral-200 rounded-md">
                            <div className="flex items-center gap-3">
                                <img src={user?.email === email ? user.picture : `https://i.pravatar.cc/150?u=${email}`} alt={email} className="w-8 h-8 rounded-full" />
                                <span className="font-medium text-neutral-800">{email}</span>
                                {user?.email === email && <span className="text-xs text-primary bg-primary-text px-2 py-1 rounded-full">(Tu)</span>}
                            </div>
                            <button 
                                onClick={() => handleRemoveAdmin(email)}
                                disabled={localAdminEmails.length <= 1 || user?.email === email}
                                className="text-neutral-400 hover:text-red-500 disabled:text-neutral-200 disabled:cursor-not-allowed"
                                title={localAdminEmails.length <= 1 ? "Impossibile rimuovere l'unico admin" : user?.email === email ? "Non puoi rimuovere te stesso" : "Rimuovi admin"}
                            >
                                <TrashIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const tabs = [
        { id: 'profile', label: 'Profilo' },
        { id: 'hours', label: 'Orari e Disponibilità' },
        { id: 'services', label: 'Servizi' },
        { id: 'integrations', label: 'Integrazioni'},
        { id: 'admins', label: 'Amministratori' }
    ];

    
    // --- Render Logic based on Auth State ---
    const renderContent = () => {
        if (!user) {
            return (
                <div className="flex flex-col items-center justify-center h-full bg-neutral-100 p-8 text-center">
                    <h2 className="text-2xl font-bold text-neutral-800 mb-2">Pannello di Amministrazione</h2>
                    <p className="text-neutral-400 mb-6">Accedi con il tuo account Google per gestire le impostazioni.</p>
                    <button
                        onClick={handleGoogleConnect}
                        className="bg-blue-500 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-3"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 48 48" width="48px" height="48px"><path fill="#fbc02d" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12	s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20	s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#e53935" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039	l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4caf50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36	c-5.222,0-9.519-3.536-11.083-8.192l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1565c0" d="M43.611,20.083L43.595,20L42,20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574	l6.19,5.238C42.022,35.283,44,30.036,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
                        Accedi con Google
                    </button>
                    <div className="mt-6 p-3 bg-amber-500/10 text-amber-900 border border-amber-500/20 rounded-md text-sm max-w-md">
                    <strong>Nota:</strong> Se l'app è in modalità test nel tuo progetto Google Cloud, assicurati che il tuo account sia aggiunto agli utenti di test per poter accedere.
                    </div>
                </div>
            );
        }
        
        if (!isAdmin) {
            return (
                <div className="flex flex-col items-center justify-center h-full bg-neutral-100 p-8 text-center">
                    <div className="w-16 h-16 bg-red-100 flex items-center justify-center rounded-full mb-4">
                        <XIcon className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-neutral-800 mb-2">Accesso Negato</h2>
                    <p className="text-neutral-400 mb-6 max-w-md">
                        L'account <strong className="text-neutral-600">{user?.email}</strong> non è autorizzato ad accedere a questa sezione. Contatta l'amministratore per richiedere l'accesso.
                    </p>
                    <button
                        onClick={handleGoogleDisconnect}
                        className="bg-neutral-500 text-white font-bold py-2 px-6 rounded-md hover:bg-neutral-600 transition-colors"
                    >
                        Logout
                    </button>
                </div>
            );
        }

        // --- Render Full Admin Panel if Logged in and Authorized ---
        return (
            <div className="flex flex-col md:flex-row h-full bg-neutral-100 text-neutral-600">
                {/* Sidebar */}
                <nav className="w-full md:w-64 bg-neutral-50 shadow-md p-4 flex flex-col border-r border-neutral-200 flex-shrink-0">
                    <div className="flex flex-row md:flex-col flex-wrap md:flex-nowrap gap-1 md:space-y-2 flex-grow">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full text-left font-semibold p-3 rounded-md transition-colors text-sm sm:text-base ${
                                    activeTab === tab.id ? 'bg-primary text-white shadow' : 'text-neutral-600 hover:bg-neutral-200/50'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={onExitAdminView} 
                        className="w-full text-left font-semibold p-3 rounded-md transition-colors text-neutral-600 hover:bg-neutral-200/50 mt-4 flex items-center gap-2"
                    >
                        <ArrowLeftOnRectangleIcon className="w-5 h-5" />
                        Esci dal Pannello
                    </button>
                </nav>

                {/* Content */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                    {activeTab === 'profile' && renderProfileTab()}
                    {activeTab === 'hours' && renderHoursTab()}
                    {activeTab === 'services' && renderServicesTab()}
                    {activeTab === 'integrations' && renderIntegrationsTab()}
                    {activeTab === 'admins' && renderAdminsTab()}
                </main>
            </div>
        );
    };

    return (
        <div className="relative h-full w-full">
            <button 
                onClick={onExitAdminView} 
                className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-800 z-50 p-2 bg-neutral-50/50 rounded-full hover:bg-neutral-100"
                aria-label="Chiudi pannello di amministrazione"
            >
                <XIcon className="w-6 h-6"/>
            </button>
            {renderContent()}
        </div>
    );
};

export default AdminPanel;