import React, { useState, useEffect, useMemo } from 'react';
import type { WorkingHours, DateOverrides, Sport, LessonType, LessonOption, Location, ConsultantInfo } from '../types';
import { XIcon, PlusIcon, TrashIcon, CameraIcon } from './icons';

declare const gapi: any;

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
    initialSelectedCalendarIds: string[];
    onSaveWorkingHours: (newHours: WorkingHours) => void;
    onSaveDateOverrides: (newOverrides: DateOverrides) => void;
    onSaveSportsData: (newSports: Sport[]) => void;
    onSaveConsultantInfo: (newInfo: ConsultantInfo) => void;
    onSaveSlotInterval: (newInterval: number) => void;
    onSaveSelectedCalendars: (calendarIds: string[]) => void;
    onLogout: () => void;
    isGoogleSignedIn: boolean;
    onGoogleSignIn: () => void;
    onGoogleSignOut: () => void;
    isGapiLoaded: boolean;
    isGisLoaded: boolean;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
    initialWorkingHours, 
    initialDateOverrides, 
    initialSportsData,
    initialConsultantInfo,
    initialSlotInterval,
    initialSelectedCalendarIds,
    onSaveWorkingHours,
    onSaveDateOverrides,
    onSaveSportsData,
    onSaveConsultantInfo,
    onSaveSlotInterval,
    onSaveSelectedCalendars,
    onLogout,
    isGoogleSignedIn,
    onGoogleSignIn,
    onGoogleSignOut,
    isGapiLoaded,
    isGisLoaded
}) => {
    const [workingHours, setWorkingHours] = useState<WorkingHours>(initialWorkingHours);
    const [dateOverrides, setDateOverrides] = useState<DateOverrides>(initialDateOverrides);
    const [sportsData, setSportsData] = useState<Sport[]>(JSON.parse(JSON.stringify(initialSportsData)));
    const [consultantInfo, setConsultantInfo] = useState<ConsultantInfo>(initialConsultantInfo);
    const [slotInterval, setSlotInterval] = useState<number>(initialSlotInterval);
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
    useEffect(() => setSelectedCalendarIds(initialSelectedCalendarIds), [initialSelectedCalendarIds]);

    // Fetch Google Calendars when user is signed in
    useEffect(() => {
        if (isGoogleSignedIn && (activeTab === 'integrations' || activeTab === 'services' || activeTab === 'hours')) {
            if (allGoogleCalendars.length > 0) return; // Fetch only once
            
            setIsLoadingCalendars(true);
            setCalendarError(null);
            gapi.client.calendar.calendarList.list()
                .then((response: any) => {
                    if(response.result.items){
                        setAllGoogleCalendars(response.result.items.map((cal: any) => ({ 
                            id: cal.id, 
                            summary: cal.summary,
                            accessRole: cal.accessRole
                        })));
                    } else {
                        setAllGoogleCalendars([]);
                    }
                })
                .catch((error: any) => {
                    console.error("Error fetching calendar list:", error);
                    setCalendarError("Impossibile caricare l'elenco dei calendari. Prova a disconnetterti e a riconnetterti a Google per aggiornare le autorizzazioni.");
                })
                .finally(() => {
                    setIsLoadingCalendars(false);
                });
        }
    }, [isGoogleSignedIn, activeTab, allGoogleCalendars]);


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
        updateState(setSportsData, (draft) => {
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
        updateState(setSportsData, (draft) => {
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
            <h3 className="text-xl font-semibold mb-6">Personalizzazione Profilo & Home</h3>
            <div className="space-y-6 bg-gray-50 p-6 rounded-lg">
                <div className="flex items-center gap-6">
                    <img src={consultantInfo.avatarUrl} alt={consultantInfo.name} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md" />
                    <div className="relative">
                         <label htmlFor="avatar-upload" className="cursor-pointer bg-white text-primary font-semibold py-2 px-4 rounded-md border border-primary hover:bg-primary-light transition-colors flex items-center gap-2">
                            <CameraIcon className="w-5 h-5" />
                            Cambia Foto
                        </label>
                        <input id="avatar-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </div>
                </div>
                <div>
                    <label htmlFor="consultant-name" className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                    <input 
                        id="consultant-name"
                        type="text" 
                        value={consultantInfo.name} 
                        onChange={(e) => handleInfoChange('name', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                    />
                </div>
                 <div>
                    <label htmlFor="consultant-title" className="block text-sm font-medium text-gray-700 mb-1">Titolo (sottotitolo)</label>
                    <input 
                        id="consultant-title"
                        type="text" 
                        value={consultantInfo.title} 
                        onChange={(e) => handleInfoChange('title', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                    />
                </div>
                 <div>
                    <label htmlFor="consultant-welcome" className="block text-sm font-medium text-gray-700 mb-1">Messaggio di Benvenuto</label>
                    <textarea 
                        id="consultant-welcome"
                        rows={3}
                        value={consultantInfo.welcomeMessage} 
                        onChange={(e) => handleInfoChange('welcomeMessage', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
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
            <div className="mb-8 pb-8 border-b">
                 <h3 className="text-xl font-semibold mb-4">Impostazione Intervallo Slot Globale</h3>
                 <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
                    <label htmlFor="slot-interval" className="font-medium text-gray-700">Intervallo prenotazione (minuti):</label>
                    <select
                        id="slot-interval"
                        value={slotInterval}
                        onChange={(e) => setSlotInterval(Number(e.target.value))}
                        className="p-2 border rounded-md"
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
            
            {/* Location Specific Settings */}
            <div className="mb-8 pb-8 border-b">
                 <h3 className="text-xl font-semibold mb-4">Impostazioni Specifiche per Sede</h3>
                 <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                    {uniqueLocations.map(loc => (
                        <div key={loc.name} className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 border-t pt-4 first:border-t-0 first:pt-0">
                             <label htmlFor={`slot-interval-${loc.id}`} className="font-medium text-gray-700">{loc.name}:</label>
                             <div className="flex items-center gap-2">
                                <label htmlFor={`slot-interval-${loc.id}`} className="text-sm">Intervallo:</label>
                                <select
                                    id={`slot-interval-${loc.id}`}
                                    value={loc.slotInterval || 0}
                                    onChange={(e) => handleLocationIntervalChangeByName(loc.name, e.target.value)}
                                    className="p-2 border rounded-md w-full"
                                >
                                    <option value="0">Default (Globale)</option>
                                    <option value="15">15 minuti</option>
                                    <option value="30">30 minuti</option>
                                    <option value="60">60 minuti</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <label htmlFor={`calendar-loc-${loc.id}`} className="text-sm">Calendario:</label>
                                <select
                                    id={`calendar-loc-${loc.id}`}
                                    value={loc.googleCalendarId || ''}
                                    onChange={(e) => handleLocationCalendarChangeByName(loc.name, e.target.value)}
                                    disabled={!isGoogleSignedIn}
                                    className="p-2 border rounded-md w-full disabled:bg-gray-200"
                                >
                                    <option value="">Default (Primario)</option>
                                    {writableCalendars.map(cal => (
                                        <option key={cal.id} value={cal.id}>{cal.summary}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ))}
                    {!isGoogleSignedIn && <p className="text-sm text-gray-500 mt-2">Accedi a Google nella scheda "Integrazioni" per assegnare calendari specifici alle sedi.</p>}
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
                <h3 className="text-xl font-semibold mb-4">Orari di Lavoro Settimanali</h3>
                <div className="space-y-4">
                    {weekDays.map((dayName, index) => {
                        const dayHours = workingHours[index];
                        return (
                            <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-md">
                                <label className="flex items-center w-32">
                                    <input
                                        type="checkbox"
                                        checked={!!dayHours}
                                        onChange={() => toggleDayAvailability(index)}
                                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                    />
                                    <span className="ml-3 font-medium text-gray-700">{dayName}</span>
                                </label>
                                {/* FIX: Replaced the conditional rendering logic with a more explicit check to ensure TypeScript correctly narrows the type and allows access to `start` and `end` properties. */}
                                {dayHours ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="time"
                                            value={`${String(Math.floor(dayHours.start / 60)).padStart(2, '0')}:${String(dayHours.start % 60).padStart(2, '0')}`}
                                            onChange={(e) => handleWorkingHoursChange(index, 'start', e.target.value)}
                                            className="p-1 border rounded-md"
                                        />
                                        <span>-</span>
                                        <input
                                            type="time"
                                            value={`${String(Math.floor(dayHours.end / 60)).padStart(2, '0')}:${String(dayHours.end % 60).padStart(2, '0')}`}
                                            onChange={(e) => handleWorkingHoursChange(index, 'end', e.target.value)}
                                            className="p-1 border rounded-md"
                                        />
                                    </div>
                                ) : (
                                    <span className="text-gray-500">Non disponibile</span>
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
                <h3 className="text-xl font-semibold mb-4">Eccezioni Calendario</h3>
                <form onSubmit={handleAddOverride} className="bg-gray-50 p-4 rounded-lg mb-6 flex flex-wrap items-end gap-4">
                    <div>
                        <label htmlFor="override-date" className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                        <input
                            id="override-date"
                            type="date"
                            value={newOverrideDate}
                            onChange={(e) => setNewOverrideDate(e.target.value)}
                            required
                            className="p-2 border rounded-md"
                        />
                    </div>
                    <div>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={isNewOverrideAvailable}
                                onChange={(e) => setIsNewOverrideAvailable(e.target.checked)}
                                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700">Disponibile</span>
                        </label>
                    </div>
                    {isNewOverrideAvailable && (
                        <div className="flex items-end gap-2">
                            <div>
                                <label htmlFor="override-start" className="block text-sm font-medium text-gray-700 mb-1">Inizio</label>
                                <input id="override-start" type="time" value={newOverrideStart} onChange={(e) => setNewOverrideStart(e.target.value)} className="p-2 border rounded-md" />
                            </div>
                            <div>
                                <label htmlFor="override-end" className="block text-sm font-medium text-gray-700 mb-1">Fine</label>
                                <input id="override-end" type="time" value={newOverrideEnd} onChange={(e) => setNewOverrideEnd(e.target.value)} className="p-2 border rounded-md" />
                            </div>
                        </div>
                    )}
                    <button type="submit" className="bg-green-500 text-white font-bold py-2 px-4 rounded hover:bg-green-600 flex items-center">
                        <PlusIcon className="w-5 h-5 mr-1"/> Aggiungi Eccezione
                    </button>
                </form>
                <div className="space-y-2">
                    {Object.entries(dateOverrides).sort().map(([date, hours]) => (
                        <div key={date} className="flex items-center justify-between p-3 bg-white border rounded-md">
                            <span className="font-semibold">{new Date(date + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            {hours ? (
                                <span className="text-green-600">{`${String(Math.floor(hours.start / 60)).padStart(2, '0')}:${String(hours.start % 60).padStart(2, '0')}`} - {`${String(Math.floor(hours.end / 60)).padStart(2, '0')}:${String(hours.end % 60).padStart(2, '0')}`}</span>
                            ) : (
                                <span className="text-red-600">Non disponibile</span>
                            )}
                            <button onClick={() => handleRemoveOverride(date)} className="text-gray-400 hover:text-red-500"><XIcon className="w-5 h-5"/></button>
                        </div>
                    ))}
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
            <h3 className="text-xl font-semibold mb-4">Gestione Sport, Lezioni e Sedi</h3>
            <div className="space-y-6">
                {sportsData.map((sport, sportIndex) => (
                    <div key={sport.id} className="p-4 bg-white rounded-lg shadow">
                        <div className="flex items-start justify-between border-b pb-3 mb-3 gap-4">
                             <div className="flex items-center gap-4 flex-grow">
                                <input type="color" value={sport.color} onChange={e => handleUpdateSport(sportIndex, 'color', e.target.value)} className="w-10 h-10" />
                                <input type="text" value={sport.name} onChange={e => handleUpdateSport(sportIndex, 'name', e.target.value)} className="text-lg font-bold p-1 border-b-2 flex-grow" />
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <button onClick={() => handleDeleteSport(sportIndex)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-5 h-5" /></button>
                                {isGoogleSignedIn && (
                                    <div className="w-64">
                                        <label htmlFor={`calendar-sport-${sport.id}`} className="block text-xs font-medium text-gray-600 mb-1">Calendario Google per nuovi eventi</label>
                                        <select
                                            id={`calendar-sport-${sport.id}`}
                                            value={sport.googleCalendarId || ''}
                                            onChange={e => handleUpdateSport(sportIndex, 'googleCalendarId', e.target.value)}
                                            className="p-1 border rounded-md w-full text-sm"
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
                                <div key={lt.id} className="p-3 bg-gray-50 rounded-md">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <input type="text" value={lt.name} onChange={e => handleUpdateLessonType(sportIndex, ltIndex, 'name', e.target.value)} className="font-semibold p-1 w-full" />
                                            <textarea value={lt.description} onChange={e => handleUpdateLessonType(sportIndex, ltIndex, 'description', e.target.value)} className="text-sm text-gray-600 p-1 w-full mt-1 border rounded-md" placeholder="Descrizione..."/>
                                        </div>
                                        <button onClick={() => handleDeleteLessonType(sportIndex, ltIndex)} className="ml-2 text-gray-400 hover:text-red-500"><XIcon className="w-4 h-4"/></button>
                                    </div>
                                    
                                    {/* Options */}
                                    <div className="mt-2 pl-4">
                                        <h4 className="text-sm font-medium text-gray-700">Opzioni Durata</h4>
                                        {lt.options.map((opt, optIndex) => (
                                            <div key={opt.id} className="flex items-center gap-2 mt-1">
                                                <input type="number" step="15" value={opt.duration} onChange={e => handleUpdateOption(sportIndex, ltIndex, optIndex, e.target.value)} className="w-20 p-1 border rounded-md" />
                                                <span>minuti</span>
                                                <button onClick={() => handleDeleteOption(sportIndex, ltIndex, optIndex)} className="text-gray-400 hover:text-red-500"><XIcon className="w-4 h-4"/></button>
                                            </div>
                                        ))}
                                        <button onClick={() => handleAddOption(sportIndex, ltIndex)} className="text-sm text-primary hover:underline mt-1">Aggiungi opzione</button>
                                    </div>
                                    
                                    {/* Locations */}
                                    <div className="mt-2 pl-4">
                                        <h4 className="text-sm font-medium text-gray-700">Sedi</h4>
                                        {lt.locations.map((loc, locIndex) => (
                                            <div key={loc.id} className="mt-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <input type="text" value={loc.name} onChange={e => handleUpdateLocation(sportIndex, ltIndex, locIndex, 'name', e.target.value)} className="p-1 border rounded-md flex-1" placeholder="Nome Sede"/>
                                                    <button onClick={() => handleDeleteLocation(sportIndex, ltIndex, locIndex)} className="text-gray-400 hover:text-red-500"><XIcon className="w-4 h-4"/></button>
                                                </div>
                                                <input type="text" value={loc.address} onChange={e => handleUpdateLocation(sportIndex, ltIndex, locIndex, 'address', e.target.value)} className="p-1 border rounded-md w-full" placeholder="Indirizzo"/>
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
            {!isGoogleSignedIn && <p className="text-sm text-gray-500 mt-4">Accedi a Google nella scheda "Integrazioni" per assegnare calendari specifici agli sport.</p>}
            <button onClick={handleAddSport} className="mt-6 w-full text-center bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded">+ Aggiungi Sport</button>
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
    
    const renderIntegrationsTab = () => (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Integrazione Google Calendar</h3>
            {!isGapiLoaded || !isGisLoaded ? (
                <p>Caricamento dei servizi Google in corso...</p>
            ) : !isGoogleSignedIn ? (
                <div className="text-center p-8 border-2 border-dashed rounded-lg">
                    <p className="mb-4 text-gray-600">Connetti il tuo account Google per sincronizzare automaticamente la tua disponibilità e creare eventi per le nuove prenotazioni.</p>
                    <button onClick={onGoogleSignIn} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                        Accedi con Google
                    </button>
                </div>
            ) : (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <p className="text-green-600 font-semibold">Connesso a Google Calendar.</p>
                        <button onClick={onGoogleSignOut} className="text-sm text-red-500 hover:underline">Disconnetti</button>
                    </div>
                    
                    <h4 className="font-semibold text-gray-800 mb-2">Seleziona i calendari per la sincronizzazione</h4>
                    <p className="text-sm text-gray-500 mb-4">
                        Gli impegni presenti nei calendari selezionati verranno considerati come "non disponibile", bloccando gli slot corrispondenti.
                    </p>

                    {isLoadingCalendars ? (
                        <div className="flex items-center justify-center p-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <span className="ml-3 text-gray-600">Caricamento calendari...</span>
                        </div>
                    ) : calendarError ? (
                        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
                            <p className="font-bold">Errore</p>
                            <p>{calendarError}</p>
                        </div>
                    ) : allGoogleCalendars.length > 0 ? (
                        <div className="space-y-3 p-4 bg-gray-50 border rounded-md max-h-96 overflow-y-auto">
                            {allGoogleCalendars.map(cal => (
                                <label key={cal.id} className="flex items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedCalendarIds.includes(cal.id)}
                                    onChange={() => handleCalendarSelectionChange(cal.id)}
                                    className="h-5 w-5 text-primary focus:ring-primary border-gray-300 rounded"
                                />
                                <span className="ml-3 text-gray-800">{cal.summary}</span>
                                </label>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 p-4 bg-gray-50 border rounded-md">Nessun calendario trovato.</p>
                    )}
                    
                    <div className="mt-6 text-right">
                        <button 
                            onClick={() => onSaveSelectedCalendars(selectedCalendarIds)} 
                            disabled={isLoadingCalendars}
                            className="bg-primary text-white font-bold py-2 px-6 rounded-md hover:bg-primary-dark transition-colors disabled:bg-gray-400"
                        >
                            Salva Calendari Selezionati
                        </button>
                    </div>

                </div>
            )}
        </div>
    );

    const tabs = [
        { id: 'profile', label: 'Profilo' },
        { id: 'hours', label: 'Orari e Disponibilità' },
        { id: 'services', label: 'Servizi' },
        { id: 'integrations', label: 'Integrazioni'}
    ];

    return (
        <div className="flex min-h-screen">
            {/* Sidebar */}
            <nav className="w-64 bg-white shadow-md p-4 flex flex-col">
                <div className="space-y-2 flex-grow">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full text-left font-semibold p-3 rounded-md transition-colors ${
                                activeTab === tab.id ? 'bg-primary-light text-primary' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                 <button 
                    onClick={onLogout} 
                    className="w-full text-left font-semibold p-3 rounded-md transition-colors text-red-600 hover:bg-red-50"
                >
                    Logout
                </button>
            </nav>

            {/* Content */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-gray-100 overflow-y-auto">
                {activeTab === 'profile' && renderProfileTab()}
                {activeTab === 'hours' && renderHoursTab()}
                {activeTab === 'services' && renderServicesTab()}
                {activeTab === 'integrations' && renderIntegrationsTab()}
            </main>
        </div>
    );
};

export default AdminPanel;