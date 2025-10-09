import React, { useState, useRef } from 'react';
import type { Sport, LessonType, LessonOption, Location, WorkingHours, ConsultantInfo } from '../types';
import { PlusIcon, PencilIcon, CheckIcon, XIcon, TrashIcon, CameraIcon } from './icons';

interface AdminPanelProps {
    sports: Sport[];
    setSports: React.Dispatch<React.SetStateAction<Sport[]>>;
    onLogout: () => void;
    workingHours: WorkingHours;
    setWorkingHours: React.Dispatch<React.SetStateAction<WorkingHours>>;
    slotInterval: number;
    setSlotInterval: React.Dispatch<React.SetStateAction<number>>;
    consultant: ConsultantInfo;
    setConsultant: React.Dispatch<React.SetStateAction<ConsultantInfo>>;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
    sports, setSports, onLogout, 
    workingHours, setWorkingHours, 
    slotInterval, setSlotInterval,
    consultant, setConsultant
}) => {
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState<string | number>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setConsultant(prev => ({...prev, avatarUrl: reader.result as string}));
            };
            reader.readAsDataURL(file);
        }
    };

    const startEditing = (key: string, value: string | number) => {
        setEditingKey(key);
        setEditingValue(value);
    };

    const cancelEditing = () => {
        setEditingKey(null);
        setEditingValue('');
    };

    const handleSave = () => {
        if (!editingKey) return;
    
        const parts = editingKey.split('::');
        const type = parts[0];
        const sportId = parts[1];
        const lessonTypeId = parts[2];
        const itemIdentifier = parts[3]; // Can be duration for option, or location.id for location
    
        const updatedSports = sports.map(sport => {
            if (sport.id !== sportId) return sport;
    
            switch (type) {
                case 'sport-name':
                    return { ...sport, name: String(editingValue) };
                case 'sport-color':
                    return { ...sport, color: String(editingValue) };
                default:
                    const updatedLessonTypes = sport.lessonTypes.map(lt => {
                        if (lt.id !== lessonTypeId) return lt;
    
                        switch (type) {
                            case 'lesson-name':
                                return { ...lt, name: String(editingValue) };
                            case 'lesson-desc':
                                return { ...lt, description: String(editingValue) };
                            case 'option-duration':
                                const newDuration = Number(editingValue);
                                return { ...lt, options: lt.options.map(o => o.duration === Number(itemIdentifier) ? { ...o, duration: newDuration } : o) };
                             case 'location-name':
                                const newLocName = String(editingValue);
                                return { ...lt, locations: lt.locations.map(loc => loc.id === itemIdentifier ? {...loc, name: newLocName} : loc) };
                             case 'location-address':
                                const newLocAddress = String(editingValue);
                                return { ...lt, locations: lt.locations.map(loc => loc.id === itemIdentifier ? {...loc, address: newLocAddress} : loc) };
                            default:
                                return lt;
                        }
                    });
                    return { ...sport, lessonTypes: updatedLessonTypes };
            }
        });
    
        setSports(updatedSports);
        cancelEditing();
    };

    const handleAddSport = () => {
        const name = prompt("Nome del nuovo sport:");
        if (name) {
            setSports([...sports, {
                id: name.toLowerCase().replace(/\s/g, '-') + Date.now(),
                name,
                color: '#cccccc',
                lessonTypes: []
            }]);
        }
    };

    const handleRemoveSport = (sportId: string) => {
        if (confirm("Sei sicuro di voler eliminare questo sport e tutte le sue lezioni?")) {
            setSports(sports.filter(s => s.id !== sportId));
        }
    }

    const handleAddLessonType = (sportId: string) => {
        const name = prompt("Nome del nuovo tipo di lezione:");
        if (name) {
            const newSports = sports.map(sport => {
                if (sport.id === sportId) {
                    return {
                        ...sport,
                        lessonTypes: [...sport.lessonTypes, {
                            id: `${sportId}-${name.toLowerCase().replace(/\s/g, '-')}` + Date.now(),
                            name,
                            description: "Nuova descrizione",
                            options: [],
                            locations: []
                        }]
                    };
                }
                return sport;
            });
            setSports(newSports);
        }
    };

    const handleRemoveLessonType = (sportId: string, lessonTypeId: string) => {
        if (confirm("Sei sicuro di voler eliminare questo tipo di lezione?")) {
            setSports(sports.map(s => {
                if (s.id === sportId) {
                    return { ...s, lessonTypes: s.lessonTypes.filter(lt => lt.id !== lessonTypeId) };
                }
                return s;
            }));
        }
    };
    
    const handleRemoveOption = (sportId: string, lessonTypeId: string, duration: number) => {
        setSports(sports.map(s => s.id === sportId ? { ...s, lessonTypes: s.lessonTypes.map(lt => lt.id === lessonTypeId ? {...lt, options: lt.options.filter(o => o.duration !== duration)} : lt) } : s));
    };
    
    const handleRemoveLocation = (sportId: string, lessonTypeId: string, locationId: string) => {
         setSports(sports.map(s => s.id === sportId ? { ...s, lessonTypes: s.lessonTypes.map(lt => lt.id === lessonTypeId ? {...lt, locations: lt.locations.filter(loc => loc.id !== locationId)} : lt) } : s));
    };

    const handleAddOption = (sportId: string, lessonTypeId: string) => {
        const duration = prompt("Durata in minuti:");
        if(duration && !isNaN(parseInt(duration))) {
             setSports(sports.map(s => s.id === sportId ? {...s, lessonTypes: s.lessonTypes.map(lt => lt.id === lessonTypeId ? {...lt, options: [...lt.options, {duration: parseInt(duration)}]} : lt) } : s));
        }
    };

     const handleAddLocation = (sportId: string, lessonTypeId: string) => {
        const name = prompt("Nome della nuova sede:");
        if (!name) return;
        const address = prompt("Indirizzo completo della sede:");
        if (address) {
            const newLocation: Location = {
                id: name.toLowerCase().replace(/\s/g, '-') + Date.now(),
                name,
                address,
            };
             setSports(sports.map(s => s.id === sportId ? {...s, lessonTypes: s.lessonTypes.map(lt => lt.id === lessonTypeId ? {...lt, locations: [...lt.locations, newLocation]} : lt) } : s));
        }
    };
    
    const renderEditable = (key: string, value: string | number, display: React.ReactNode, type: 'text' | 'number' | 'color' = 'text') => {
        if (editingKey === key) {
            return (
                <div className="flex items-center gap-2">
                    <input 
                        type={type} 
                        value={editingValue} 
                        onChange={e => setEditingValue(type === 'number' ? e.target.valueAsNumber || 0 : e.target.value)}
                        className={`p-1 border rounded-md ${type === 'color' ? 'w-12 h-8' : 'w-full'}`}
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave();
                            if (e.key === 'Escape') cancelEditing();
                        }}
                    />
                    <button onClick={handleSave} className="p-1 text-green-600 hover:text-green-800"><CheckIcon className="w-5 h-5" /></button>
                    <button onClick={cancelEditing} className="p-1 text-red-600 hover:text-red-800"><XIcon className="w-5 h-5" /></button>
                </div>
            )
        }
        return (
            <div className="flex items-center gap-2 group">
                {display}
                <button onClick={() => startEditing(key, value)} className="p-1 text-gray-400 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <PencilIcon className="w-4 h-4" />
                </button>
            </div>
        )
    };

    const minutesToTime = (minutes: number) => {
        const h = Math.floor(minutes / 60).toString().padStart(2, '0');
        const m = (minutes % 60).toString().padStart(2, '0');
        return `${h}:${m}`;
    };
    
    const timeToMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };

    const handleDayToggle = (dayIndex: number, isEnabled: boolean) => {
        setWorkingHours(prev => ({
            ...prev,
            [dayIndex]: isEnabled ? { start: 9 * 60, end: 17 * 60 } : null
        }));
    };

    const handleTimeChange = (dayIndex: number, type: 'start' | 'end', time: string) => {
        const minutes = timeToMinutes(time);
        setWorkingHours(prev => {
            const current = prev[dayIndex];
            if (current) {
                return { ...prev, [dayIndex]: { ...current, [type]: minutes } };
            }
            return prev;
        });
    };

    const displayWeekDays = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
    const dayIndexMap = [1, 2, 3, 4, 5, 6, 0];

    return (
        <div className="p-6 bg-gray-50">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Pannello Amministrazione</h1>
                <button onClick={onLogout} className="bg-red-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-red-600">Logout</button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-semibold mb-4">Gestione Informazioni Principali</h2>
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                            <img src={consultant.avatarUrl} alt={consultant.name} className="w-24 h-24 rounded-full object-cover"/>
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full flex items-center justify-center transition-opacity">
                                <CameraIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100"/>
                            </div>
                        </div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                            accept="image/*"
                        />
                        <div className="flex-grow">
                             <label htmlFor="consultant-name" className="block text-sm font-medium text-gray-700">Nome Maestro</label>
                            <input 
                                type="text" 
                                id="consultant-name"
                                value={consultant.name}
                                onChange={e => setConsultant(prev => ({...prev, name: e.target.value}))}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm" 
                            />
                        </div>
                    </div>
                     <div>
                        <label htmlFor="consultant-title" className="block text-sm font-medium text-gray-700">Titolo</label>
                        <input 
                            type="text" 
                            id="consultant-title"
                            value={consultant.title}
                            onChange={e => setConsultant(prev => ({...prev, title: e.target.value}))}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm" 
                        />
                    </div>
                     <div>
                        <label htmlFor="consultant-avatar" className="block text-sm font-medium text-gray-700">URL Immagine Profilo (o carica sopra)</label>
                        <input 
                            type="text" 
                            id="consultant-avatar"
                            value={consultant.avatarUrl}
                            onChange={e => setConsultant(prev => ({...prev, avatarUrl: e.target.value}))}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm" 
                        />
                    </div>
                    <div>
                        <label htmlFor="consultant-welcome" className="block text-sm font-medium text-gray-700">Messaggio di Benvenuto</label>
                        <textarea 
                            id="consultant-welcome"
                            rows={3}
                            value={consultant.welcomeMessage}
                            onChange={e => setConsultant(prev => ({...prev, welcomeMessage: e.target.value}))}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                        ></textarea>
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-semibold mb-4">Gestione Orari e Disponibilità</h2>
                <div className="mb-6 border-b pb-6">
                    <label htmlFor="slot-interval" className="block text-sm font-medium text-gray-700 mb-1">Intervallo Slot di Prenotazione</label>
                    <select 
                        id="slot-interval" 
                        value={slotInterval} 
                        onChange={e => setSlotInterval(Number(e.target.value))}
                        className="mt-1 block w-full max-w-xs pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                    >
                        <option value="15">15 minuti</option>
                        <option value="30">30 minuti</option>
                        <option value="45">45 minuti</option>
                        <option value="60">60 minuti</option>
                    </select>
                </div>

                <h3 className="text-lg font-semibold mb-3">Orari Settimanali</h3>
                <div className="space-y-3">
                    {displayWeekDays.map((dayName, i) => {
                        const dayIndex = dayIndexMap[i];
                        const dayHours = workingHours[dayIndex];
                        const isEnabled = dayHours !== null;
                        return(
                            <div key={dayIndex} className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center mb-2 sm:mb-0">
                                    <input
                                        type="checkbox"
                                        id={`day-toggle-${dayIndex}`}
                                        checked={isEnabled}
                                        onChange={(e) => handleDayToggle(dayIndex, e.target.checked)}
                                        className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary mr-3"
                                    />
                                    <label htmlFor={`day-toggle-${dayIndex}`} className="w-24 font-medium text-gray-700">{dayName}</label>
                                </div>
                                {isEnabled && dayHours ? (
                                    <div className="flex items-center gap-2 pl-8 sm:pl-0">
                                        <input 
                                            type="time" 
                                            value={minutesToTime(dayHours.start)}
                                            onChange={e => handleTimeChange(dayIndex, 'start', e.target.value)}
                                            className="w-32 border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                                        />
                                        <span>-</span>
                                        <input 
                                            type="time" 
                                            value={minutesToTime(dayHours.end)}
                                            onChange={e => handleTimeChange(dayIndex, 'end', e.target.value)}
                                            className="w-32 border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                                        />
                                    </div>
                                ) : (
                                    <div className="pl-8 sm:pl-0">
                                         <p className="text-sm text-gray-400">Non disponibile</p>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>


            <div className="space-y-6">
                {sports.map(sport => (
                    <div key={sport.id} className="bg-white p-4 rounded-lg shadow-md">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-4">
                                {renderEditable(`sport-name::${sport.id}`, sport.name, <h2 className="text-xl font-semibold" style={{color: sport.color}}>{sport.name}</h2> )}
                                {renderEditable(`sport-color::${sport.id}`, sport.color, <div className="w-6 h-6 rounded-full border" style={{backgroundColor: sport.color}}></div>, 'color' )}
                            </div>
                            <button onClick={() => handleRemoveSport(sport.id)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-5 h-5" /></button>
                        </div>
                        {sport.lessonTypes.map(lt => (
                            <div key={lt.id} className="border-t pt-4 mt-4 ml-4">
                                <div className="flex justify-between items-center">
                                    {renderEditable(`lesson-name::${sport.id}::${lt.id}`, lt.name, <h3 className="font-bold">{lt.name}</h3>)}
                                    <button onClick={() => handleRemoveLessonType(sport.id, lt.id)} className="text-sm text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                                {renderEditable(`lesson-desc::${sport.id}::${lt.id}`, lt.description, <p className="text-sm text-gray-600">{lt.description}</p>)}
                                
                                <div className="flex flex-col md:flex-row gap-8 mt-2">
                                    <div>
                                        <h4 className="text-sm font-semibold">Durate:</h4>
                                        <ul className="text-sm space-y-1 mt-1">
                                            {lt.options.map(o => (
                                                <li key={o.duration} className="flex items-center gap-2 group">
                                                    {renderEditable(`option-duration::${sport.id}::${lt.id}::${o.duration}`, o.duration, <span>{o.duration} min</span>, 'number')}
                                                    <button onClick={() => handleRemoveOption(sport.id, lt.id, o.duration)} className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-4 h-4"/></button>
                                                </li>
                                            ))}
                                        </ul>
                                         <button onClick={() => handleAddOption(sport.id, lt.id)} className="text-sm text-primary hover:underline mt-1">+ Aggiungi</button>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold">Sedi:</h4>
                                        <ul className="text-sm space-y-2 mt-1">
                                            {lt.locations.map(l => (
                                                <li key={l.id}>
                                                    {renderEditable(`location-name::${sport.id}::${lt.id}::${l.id}`, l.name, <strong>{l.name}</strong>, 'text')}
                                                    <div className="flex items-center gap-2 group">
                                                        {renderEditable(`location-address::${sport.id}::${lt.id}::${l.id}`, l.address, <span className="text-xs text-gray-600">{l.address}</span>, 'text')}
                                                        <button onClick={() => handleRemoveLocation(sport.id, lt.id, l.id)} className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-4 h-4"/></button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                         <button onClick={() => handleAddLocation(sport.id, lt.id)} className="text-sm text-primary hover:underline mt-1">+ Aggiungi</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button onClick={() => handleAddLessonType(sport.id)} className="mt-4 flex items-center text-primary font-semibold hover:underline text-sm"><PlusIcon className="w-4 h-4 mr-1" />Aggiungi Tipo Lezione</button>
                    </div>
                ))}
            </div>

            <button onClick={handleAddSport} className="mt-6 w-full bg-green-500 text-white font-bold py-3 px-4 rounded-md hover:bg-green-600 transition-colors flex items-center justify-center">
                 <PlusIcon className="w-5 h-5 mr-2" /> Aggiungi un nuovo Sport
            </button>
        </div>
    );
};

export default AdminPanel;