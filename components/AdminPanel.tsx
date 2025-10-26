import React, { useState, useEffect } from 'react';
import type { WorkingHours, DateOverrides, Sport, LessonType, LessonOption, Location, ConsultantInfo } from '../types';
import { XIcon, PlusIcon, TrashIcon, CameraIcon } from './icons';

interface AdminPanelProps {
    initialWorkingHours: WorkingHours;
    initialDateOverrides: DateOverrides;
    initialSportsData: Sport[];
    initialConsultantInfo: ConsultantInfo;
    onSaveWorkingHours: (newHours: WorkingHours) => void;
    onSaveDateOverrides: (newOverrides: DateOverrides) => void;
    onSaveSportsData: (newSports: Sport[]) => void;
    onSaveConsultantInfo: (newInfo: ConsultantInfo) => void;
    onLogout: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
    initialWorkingHours, 
    initialDateOverrides, 
    initialSportsData,
    initialConsultantInfo,
    onSaveWorkingHours,
    onSaveDateOverrides,
    onSaveSportsData,
    onSaveConsultantInfo,
    onLogout 
}) => {
    const [workingHours, setWorkingHours] = useState<WorkingHours>(initialWorkingHours);
    const [dateOverrides, setDateOverrides] = useState<DateOverrides>(initialDateOverrides);
    const [sportsData, setSportsData] = useState<Sport[]>(JSON.parse(JSON.stringify(initialSportsData)));
    const [consultantInfo, setConsultantInfo] = useState<ConsultantInfo>(initialConsultantInfo);
    
    const [activeTab, setActiveTab] = useState('profile');

    const [newOverrideDate, setNewOverrideDate] = useState('');
    const [newOverrideStart, setNewOverrideStart] = useState('09:00');
    const [newOverrideEnd, setNewOverrideEnd] = useState('17:00');
    const [isNewOverrideAvailable, setIsNewOverrideAvailable] = useState(true);

    const weekDays = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

    // Sync internal state with props to reflect real-time updates from Firestore
    useEffect(() => {
        setWorkingHours(initialWorkingHours);
    }, [initialWorkingHours]);

    useEffect(() => {
        setDateOverrides(initialDateOverrides);
    }, [initialDateOverrides]);
    
    useEffect(() => {
        setSportsData(JSON.parse(JSON.stringify(initialSportsData)));
    }, [initialSportsData]);

    useEffect(() => {
        setConsultantInfo(initialConsultantInfo);
    }, [initialConsultantInfo]);


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
    
    const handleDeleteLocation = (sportIndex: number, ltIndex: number, locIndex: number) => {
        updateState(setSportsData, (draft: Sport[]) => {
            draft[sportIndex].lessonTypes[ltIndex].locations.splice(locIndex, 1);
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
                        <PlusIcon className="w-5 h-5 mr-1" /> Aggiungi
                    </button>
                </form>

                <div className="space-y-2">
                    {Object.entries(dateOverrides).sort().map(([date, hours]) => (
                        <div key={date} className="flex items-center justify-between p-3 bg-white border rounded-md">
                            <span className="font-medium">{new Date(date + 'T00:00:00').toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            {hours ? (
                                <span>{`${String(Math.floor(hours.start / 60)).padStart(2, '0')}:${String(hours.start % 60).padStart(2, '0')}`} - {`${String(Math.floor(hours.end / 60)).padStart(2, '0')}:${String(hours.end % 60).padStart(2, '0')}`}</span>
                            ) : (
                                <span className="text-red-600">Non disponibile</span>
                            )}
                            <button onClick={() => handleRemoveOverride(date)} className="text-red-500 hover:text-red-700 p-1">
                                <TrashIcon className="w-5 h-5" />
                            </button>
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
    
    const renderSportsTab = () => (
        <div className="p-6">
            <h3 className="text-xl font-semibold mb-4">Gestione Sport, Lezioni e Sedi</h3>
            {sportsData.map((sport, sIndex) => (
                <div key={sport.id} className="bg-gray-50 border rounded-lg p-4 mb-4">
                    {/* Sport Details */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4 flex-grow">
                            <input
                                type="text"
                                value={sport.name}
                                onChange={(e) => handleUpdateSport(sIndex, 'name', e.target.value)}
                                className="font-bold text-lg p-2 border rounded"
                            />
                            <input
                                type="color"
                                value={sport.color}
                                onChange={(e) => handleUpdateSport(sIndex, 'color', e.target.value)}
                                className="h-10 w-10 p-1 border rounded"
                            />
                        </div>
                        <button onClick={() => handleDeleteSport(sIndex)} className="text-red-500 hover:text-red-700 p-2">
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Lesson Types */}
                    {sport.lessonTypes.map((lt, ltIndex) => (
                        <div key={lt.id} className="bg-white border rounded-md p-4 mb-3 ml-4">
                             <div className="flex items-center justify-between mb-2">
                                <input
                                    type="text"
                                    value={lt.name}
                                    onChange={(e) => handleUpdateLessonType(sIndex, ltIndex, 'name', e.target.value)}
                                    className="font-semibold p-1 border-b w-full"
                                />
                                <button onClick={() => handleDeleteLessonType(sIndex, ltIndex)} className="text-red-500 hover:text-red-700 p-2 ml-2">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                            <textarea
                                value={lt.description}
                                onChange={(e) => handleUpdateLessonType(sIndex, ltIndex, 'description', e.target.value)}
                                className="text-sm text-gray-600 p-1 border rounded w-full mb-3"
                                placeholder="Descrizione..."
                                rows={2}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Durations */}
                                <div>
                                    <h5 className="font-semibold mb-2">Durate (min)</h5>
                                    {lt.options.map((opt, optIndex) => (
                                        <div key={opt.id} className="flex items-center mb-2">
                                            <input
                                                type="number"
                                                value={opt.duration}
                                                onChange={(e) => handleUpdateOption(sIndex, ltIndex, optIndex, e.target.value)}
                                                className="p-1 border rounded w-24"
                                            />
                                            <button onClick={() => handleDeleteOption(sIndex, ltIndex, optIndex)} className="ml-2 text-red-500 hover:text-red-700 p-1">
                                                <XIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <button onClick={() => handleAddOption(sIndex, ltIndex)} className="text-sm text-primary hover:underline flex items-center">
                                        <PlusIcon className="w-4 h-4 mr-1" /> Aggiungi Durata
                                    </button>
                                </div>
                                {/* Locations */}
                                <div>
                                    <h5 className="font-semibold mb-2">Sedi</h5>
                                    {lt.locations.map((loc, locIndex) => (
                                         <div key={loc.id} className="mb-2">
                                            <div className="flex items-center">
                                                <input
                                                    type="text"
                                                    value={loc.name}
                                                    onChange={(e) => handleUpdateLocation(sIndex, ltIndex, locIndex, 'name', e.target.value)}
                                                    className="p-1 border rounded w-full"
                                                    placeholder="Nome Sede"
                                                />
                                                 <button onClick={() => handleDeleteLocation(sIndex, ltIndex, locIndex)} className="ml-2 text-red-500 hover:text-red-700 p-1">
                                                    <XIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={loc.address}
                                                onChange={(e) => handleUpdateLocation(sIndex, ltIndex, locIndex, 'address', e.target.value)}
                                                className="p-1 border rounded w-full mt-1 text-sm"
                                                placeholder="Indirizzo"
                                            />
                                        </div>
                                    ))}
                                    <button onClick={() => handleAddLocation(sIndex, ltIndex)} className="text-sm text-primary hover:underline flex items-center">
                                         <PlusIcon className="w-4 h-4 mr-1" /> Aggiungi Sede
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    <button onClick={() => handleAddLessonType(sIndex)} className="mt-2 text-primary hover:underline flex items-center ml-4">
                        <PlusIcon className="w-5 h-5 mr-1" /> Aggiungi Tipo Lezione
                    </button>
                </div>
            ))}
            <button onClick={handleAddSport} className="bg-green-500 text-white font-bold py-2 px-4 rounded hover:bg-green-600 flex items-center">
                <PlusIcon className="w-5 h-5 mr-1" /> Aggiungi Sport
            </button>
             <div className="mt-6 text-right">
                <button 
                    onClick={() => onSaveSportsData(sportsData)} 
                    className="bg-primary text-white font-bold py-2 px-6 rounded-md hover:bg-primary-dark transition-colors"
                >
                    Salva Modifiche Sport
                </button>
            </div>
        </div>
    );


    return (
        <div>
            <header className="p-6 bg-gray-50 border-b flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Pannello Amministratore</h2>
                <button onClick={onLogout} className="text-sm font-medium text-gray-600 hover:text-primary">
                    Logout
                </button>
            </header>

            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`${
                            activeTab === 'profile'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Profilo & Home
                    </button>
                    <button
                        onClick={() => setActiveTab('hours')}
                        className={`${
                            activeTab === 'hours'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Orari & Eccezioni
                    </button>
                    <button
                        onClick={() => setActiveTab('sports')}
                        className={`${
                            activeTab === 'sports'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Sport, Lezioni & Sedi
                    </button>
                </nav>
            </div>
            
            {activeTab === 'profile' && renderProfileTab()}
            {activeTab === 'hours' && renderHoursTab()}
            {activeTab === 'sports' && renderSportsTab()}

        </div>
    );
};

export default AdminPanel;