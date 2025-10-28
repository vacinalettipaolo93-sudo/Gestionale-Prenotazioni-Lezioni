import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { WorkingHours, DateOverrides, Sport, LessonType, LessonOption, Location, ConsultantInfo } from '../types';
import { XIcon, PlusIcon, TrashIcon, CameraIcon, EmailIcon } from './icons';
import { getGoogleCalendarList, getServiceAccountEmail } from '../firebaseConfig';

interface GoogleCalendar {
    id: string;
    summary: string;
    accessRole: 'owner' | 'writer' | 'reader' | 'freeBusyReader';
}

interface AdminPanelProps {
    initialWorkingHours: WorkingHours;
    initialDateOverrides: DateOverrides;
    initialSportsData: Sport[];
    initialConsultantInfo: ConsultantInfo;
    initialSlotInterval: number;
    initialMinimumNoticeHours: number;
    initialSelectedCalendarIds: string[];
    onSaveWorkingHours: (newHours: WorkingHours) => void;
    onSaveDateOverrides: (newOverrides: DateOverrides) => void;
    onSaveSportsData: (newSports: Sport[]) => void;
    onSaveConsultantInfo: (newInfo: ConsultantInfo) => void;
    onSaveSlotInterval: (newInterval: number) => void;
    onSaveMinimumNoticeHours: (newNotice: number) => void;
    onSaveSelectedCalendars: (calendarIds: string[]) => void;
    onLogout: () => void;
    isBackendConfigured: boolean;
    onRefreshAuthStatus: () => void;
    isCheckingAuth: boolean;
    authError?: string | null;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
    initialWorkingHours, 
    initialDateOverrides, 
    initialSportsData,
    initialConsultantInfo,
    initialSlotInterval,
    initialMinimumNoticeHours,
    initialSelectedCalendarIds,
    onSaveWorkingHours,
    onSaveDateOverrides,
    onSaveSportsData,
    onSaveConsultantInfo,
    onSaveSlotInterval,
    onSaveMinimumNoticeHours,
    onSaveSelectedCalendars,
    onLogout,
    isBackendConfigured,
    onRefreshAuthStatus,
    isCheckingAuth,
    authError
}) => {
    const [workingHours, setWorkingHours] = useState<WorkingHours>(initialWorkingHours);
    const [dateOverrides, setDateOverrides] = useState<DateOverrides>(initialDateOverrides);
    const [sportsData, setSportsData] = useState<Sport[]>(JSON.parse(JSON.stringify(initialSportsData)));
    const [consultantInfo, setConsultantInfo] = useState<ConsultantInfo>(initialConsultantInfo);
    const [slotInterval, setSlotInterval] = useState<number>(initialSlotInterval);
    const [minimumNoticeHours, setMinimumNoticeHours] = useState<number>(initialMinimumNoticeHours);
    const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>(initialSelectedCalendarIds);
    
    const [activeTab, setActiveTab] = useState('profile');

    const [newOverrideDate, setNewOverrideDate] = useState('');
    const [newOverrideStart, setNewOverrideStart] = useState('09:00');
    const [newOverrideEnd, setNewOverrideEnd] = useState('17:00');
    const [isNewOverrideAvailable, setIsNewOverrideAvailable] = useState(true);

    // State for Integrations Tab
    const [allGoogleCalendars, setAllGoogleCalendars] = useState<GoogleCalendar[]>([]);
    const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
    const [calendarError, setCalendarError] = useState<string | null>(null);
    const [serviceAccountEmail, setServiceAccountEmail] = useState<string | null>(null);
    const [isLoadingEmail, setIsLoadingEmail] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const writableCalendars = useMemo(() => {
        return allGoogleCalendars.filter(cal => cal.accessRole === 'writer' || cal.accessRole === 'owner');
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

    const fetchCalendars = useCallback(async () => {
        if (!isBackendConfigured) return;

        setIsLoadingCalendars(true);
        setCalendarError(null);
        try {
            const result = await getGoogleCalendarList();
            const data = result.data as { calendars: GoogleCalendar[] };
            setAllGoogleCalendars(data.calendars || []);
        } catch (error: any) {
             console.error("ERRORE CRITICO nel caricamento dei calendari. Oggetto errore completo:", error);
            let detailedMessage = "Si è verificato un errore sconosciuto durante il caricamento dei calendari.";

            if (error.code === 'deadline-exceeded') {
                detailedMessage = "Il server ha impiegato troppo tempo per rispondere (timeout). La causa più comune è un problema di configurazione della fatturazione su Google Cloud o un numero molto elevato di calendari. Prova a ricaricare la pagina.";
            } else if (error.details?.serverMessage) {
                detailedMessage = `Errore dal server: ${error.details.serverMessage}`;
            } else if (error.message) {
                detailedMessage = error.message;
            }

            setCalendarError(`Caricamento fallito. ${detailedMessage} Controlla i log della console per maggiori dettagli tecnici.`);
        } finally {
            setIsLoadingCalendars(false);
        }
    }, [isBackendConfigured]);

    // Fetch Service Account Email once when backend is configured
    useEffect(() => {
        if (isBackendConfigured && !serviceAccountEmail && !isLoadingEmail) {
            setIsLoadingEmail(true);
            setEmailError(null);
            getServiceAccountEmail()
                .then(result => {
                    const data = result.data as { email: string };
                    setServiceAccountEmail(data.email);
                })
                .catch((error: any) => {
                    console.error("Failed to fetch service account email:", error);
                    const message = error.message || "Errore sconosciuto.";
                    setEmailError(`Impossibile caricare l'email del service account. Dettagli: ${message}`);
                })
                .finally(() => {
                    setIsLoadingEmail(false);
                });
        }
    }, [isBackendConfigured, serviceAccountEmail, isLoadingEmail]);

    // Fetch Google Calendars when relevant tabs are active
    useEffect(() => {
        const shouldFetch = isBackendConfigured && (activeTab === 'integrations' || activeTab === 'services' || activeTab === 'hours');
        
        if (shouldFetch && allGoogleCalendars.length === 0 && !isLoadingCalendars) {
            fetchCalendars();
        }
    }, [isBackendConfigured, activeTab, allGoogleCalendars.length, fetchCalendars, isLoadingCalendars]);


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

    const handleCopyToClipboard = () => {
        if (serviceAccountEmail) {
            navigator.clipboard.writeText(serviceAccountEmail).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
            });
        }
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
        const renderNoCalendarsFound = () => (
            <div className="p-6 bg-neutral-100 border border-neutral-200 rounded-lg text-sm">
                <p className="font-semibold text-xl text-neutral-800 mb-4">Nessun calendario trovato o accessibile</p>
                <p className="text-neutral-400 mb-6">Questo è normale se non hai ancora condiviso i tuoi calendari. Segui questi passaggi per risolvere:</p>
                
                <ol className="space-y-4 list-decimal list-inside text-neutral-600">
                    <li className="p-4 bg-neutral-50 rounded-md border border-neutral-200">
                        <span className="font-bold">Copia l'email del Service Account</span>
                        <p className="text-xs text-neutral-400 mt-1 mb-2">Questo è l'indirizzo "robot" che accederà ai tuoi calendari.</p>
                        {isLoadingEmail && (
                            <div className="flex items-center text-neutral-400 text-xs">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                                Caricamento email...
                            </div>
                        )}
                        {emailError && (
                             <div className="p-2 bg-red-900/10 text-red-400 text-xs rounded border border-red-400/30">
                                <strong>Errore:</strong> {emailError}
                            </div>
                        )}
                        {serviceAccountEmail && (
                            <div className="flex items-center gap-2 p-2 bg-neutral-100 rounded">
                                <code className="text-primary font-mono flex-grow break-all text-xs">{serviceAccountEmail}</code>
                                <button 
                                    onClick={handleCopyToClipboard} 
                                    disabled={!serviceAccountEmail}
                                    className="bg-primary text-white px-3 py-1 text-xs font-semibold rounded hover:bg-primary-dark transition-colors flex-shrink-0"
                                >
                                    {copied ? 'Copiato!' : 'Copia'}
                                </button>
                            </div>
                        )}
                    </li>

                    <li className="p-4 bg-neutral-50 rounded-md border border-neutral-200">
                        <span className="font-bold">Apri Google Calendar e condividi</span>
                        <p className="text-xs text-neutral-400 mt-1 mb-3">Vai alle impostazioni del calendario che vuoi usare, cerca la sezione "Condividi con persone..." e incolla l'email.</p>
                        <a href="https://calendar.google.com/calendar/r/settings" target="_blank" rel="noopener noreferrer" className="inline-block bg-blue-500 text-white px-4 py-2 text-sm font-semibold rounded hover:bg-blue-600 transition-colors">
                            Apri Impostazioni Google Calendar
                        </a>
                    </li>

                    <li className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-md text-amber-800">
                        <span className="font-bold">Imposta i permessi corretti (Importante!)</span>
                        <p className="text-xs mt-1">Quando condividi, assicurati di selezionare l'opzione <strong className="font-bold">"Apportare modifiche agli eventi"</strong> dal menu a tendina. Senza questo permesso, l'applicazione non potrà creare le prenotazioni.</p>
                    </li>
                    
                    <li className="p-4 bg-neutral-50 rounded-md border border-neutral-200">
                        <span className="font-bold">Verifica di nuovo</span>
                        <p className="text-xs text-neutral-400 mt-1 mb-3">Dopo aver condiviso, torna qui e clicca il pulsante qui sotto per ricaricare la lista dei calendari.</p>
                        <button 
                                onClick={fetchCalendars}
                                className="text-sm text-white bg-primary hover:bg-primary-dark py-2 px-4 rounded transition-colors disabled:bg-neutral-400"
                                disabled={isLoadingCalendars}
                            >
                                {isLoadingCalendars ? 'Caricamento...' : 'Ricarica Calendari'}
                        </button>
                         <p className="text-xs text-neutral-400 mt-2">
                            <strong>Nota:</strong> Dopo aver condiviso, potrebbero essere necessari alcuni minuti prima che il calendario appaia qui. Se non lo vedi subito, attendi 1-2 minuti e prova a ricaricare di nuovo.
                        </p>
                    </li>
                </ol>
            </div>
        );


        if (!isBackendConfigured) {
             return (
                <div className="p-6 bg-neutral-50 rounded-lg shadow-sm border border-neutral-200">
                    <h3 className="text-xl font-semibold mb-4 text-neutral-800">Integrazione Google Calendar</h3>
                    <p className="text-neutral-400">Completa la configurazione per visualizzare le opzioni di integrazione.</p>
                </div>
            );
        }
        
        return (
            <div className="p-6 bg-neutral-50 rounded-lg shadow-sm border border-neutral-200">
                <h3 className="text-xl font-semibold mb-4 text-neutral-800">Integrazione Google Calendar</h3>
                <div>
                    <div className="flex justify-between items-center mb-6 p-4 bg-green-900/10 border border-green-400/30 rounded-lg">
                        <p className="text-green-400 font-semibold">Configurazione backend attiva e connessa a Google.</p>
                         <button 
                            onClick={onRefreshAuthStatus} 
                            className="text-sm text-primary hover:underline disabled:text-neutral-400 disabled:no-underline"
                            disabled={isCheckingAuth}
                        >
                            {isCheckingAuth ? 'Verifica...' : 'Verifica Stato'}
                        </button>
                    </div>
                    
                    <h4 className="font-semibold text-neutral-800 mb-2">Seleziona i calendari per la sincronizzazione</h4>
                    <p className="text-sm text-neutral-400 mb-4">
                        Gli impegni presenti nei calendari selezionati verranno considerati come "non disponibile", bloccando gli slot corrispondenti.
                    </p>

                    {isLoadingCalendars ? (
                        <div className="flex items-center justify-center p-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <span className="ml-3 text-neutral-400">Caricamento calendari...</span>
                        </div>
                    ) : calendarError ? (
                        <div className="p-4 bg-red-900/50 border border-red-400 text-red-300 rounded-md">
                            <p className="font-bold">Errore</p>
                            <p>{calendarError}</p>
                        </div>
                    ) : allGoogleCalendars.length > 0 ? (
                        <div className="space-y-3 p-4 bg-neutral-100 border border-neutral-200 rounded-md max-h-96 overflow-y-auto">
                            {allGoogleCalendars.map(cal => (
                                <label key={cal.id} className="flex items-center p-2 rounded-md hover:bg-neutral-50/50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedCalendarIds.includes(cal.id)}
                                    onChange={() => handleCalendarSelectionChange(cal.id)}
                                    className="h-5 w-5 text-primary focus:ring-primary border-neutral-200 rounded bg-neutral-100"
                                />
                                <span className="ml-3 text-neutral-600">{cal.summary}</span>
                                </label>
                            ))}
                        </div>
                    ) : (
                        renderNoCalendarsFound()
                    )}
                    
                    <div className="mt-6 text-right">
                        <button 
                            onClick={() => onSaveSelectedCalendars(selectedCalendarIds)} 
                            disabled={isLoadingCalendars || allGoogleCalendars.length === 0}
                            className="bg-primary text-white font-bold py-2 px-6 rounded-md hover:bg-primary-dark transition-colors disabled:bg-neutral-400"
                        >
                            Salva Calendari Selezionati
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const tabs = [
        { id: 'profile', label: 'Profilo' },
        { id: 'hours', label: 'Orari e Disponibilità' },
        { id: 'services', label: 'Servizi' },
        { id: 'integrations', label: 'Integrazioni'}
    ];
    
    const renderAuthError = () => {
        if (!authError || isBackendConfigured) return null;
    
        const isSimpleConfigError = authError === 'BACKEND_NOT_CONFIGURED';
        const detailedErrorMessage = isSimpleConfigError ? null : authError;
    
        return (
            <div className="p-4 mb-6 bg-red-900/50 border border-red-400/80 text-red-300 rounded-lg shadow-lg" role="alert">
                <h4 className="font-bold text-lg text-white mb-2">Azione Richiesta: Completa la Configurazione di Google</h4>
                <p className="text-sm mb-4">
                    L'integrazione con Google Calendar non è attiva o ha riscontrato un problema.
                </p>
                
                {detailedErrorMessage && (
                     <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-md">
                        <p className="font-semibold text-red-300">Messaggio di errore dal server:</p>
                        <p className="text-red-200 text-sm font-mono">{detailedErrorMessage}</p>
                    </div>
                )}
    
                <p className="text-sm mb-4 text-white font-semibold">Per risolvere, controlla attentamente i seguenti punti:</p>
    
                <div className="text-sm space-y-4 mb-4 pl-4 border-l-2 border-red-400/50">
                    <div>
                        <p className="font-semibold text-white">1. Posiziona il file delle credenziali</p>
                        <p className="text-red-200 mt-1">
                            Assicurati che il file <code>credentials.json</code> scaricato da Google Cloud sia nella cartella <code>functions</code> del tuo progetto e di aver rieseguito il deploy (<code>firebase deploy --only functions</code>).
                        </p>
                    </div>
                    <div>
                        <p className="font-semibold text-white">2. Abilita l'API di Google Calendar</p>
                        <p className="text-red-200 mt-1">
                            È un passaggio fondamentale. Visita il link seguente per assicurarti che l'API sia attiva per il tuo progetto. Se non lo è, abilitala.
                            <a href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com?project=gestionale-prenotazioni-lezio" target="_blank" rel="noopener noreferrer" className="block mt-2 font-bold text-white underline hover:text-red-200">
                               Abilita Google Calendar API per 'gestionale-prenotazioni-lezio' &rarr;
                            </a>
                        </p>
                    </div>
                    <div>
                        <p className="font-semibold text-white">3. Condividi i tuoi calendari</p>
                        <p className="text-red-200 mt-1">
                           Apri il file <code>credentials.json</code>, copia l'indirizzo email alla voce <code>client_email</code> e usalo per condividere i tuoi calendari da Google Calendar, assegnandogli i permessi per "Apportare modifiche agli eventi".
                        </p>
                    </div>
                </div>
                
                <div className="mt-6 text-center">
                    <button
                        onClick={onRefreshAuthStatus}
                        disabled={isCheckingAuth}
                        className="bg-red-500/50 text-white font-semibold py-2 px-6 rounded-md border border-red-400 hover:bg-red-500/80 transition-colors disabled:opacity-50"
                    >
                        {isCheckingAuth ? 'Verifica...' : 'Ho completato i passaggi, Riprova'}
                    </button>
                </div>
            </div>
        );
    };


    return (
        <div className="flex min-h-screen bg-neutral-100 text-neutral-600">
            {/* Sidebar */}
            <nav className="w-64 bg-neutral-50 shadow-md p-4 flex flex-col border-r border-neutral-200">
                <div className="space-y-2 flex-grow">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full text-left font-semibold p-3 rounded-md transition-colors ${
                                activeTab === tab.id ? 'bg-primary text-primary-text' : 'text-neutral-600 hover:bg-neutral-100'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                 <button 
                    onClick={onLogout} 
                    className="w-full text-left font-semibold p-3 rounded-md transition-colors text-red-400 hover:bg-red-500/10"
                >
                    Logout
                </button>
            </nav>

            {/* Content */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                {renderAuthError()}

                {activeTab === 'profile' && renderProfileTab()}
                {activeTab === 'hours' && renderHoursTab()}
                {activeTab === 'services' && renderServicesTab()}
                {activeTab === 'integrations' && renderIntegrationsTab()}
            </main>
        </div>
    );
};

export default AdminPanel;