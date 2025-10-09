import React, { useState, useRef } from 'react';
import { PlusIcon, PencilIcon, CheckIcon, XIcon, TrashIcon, CameraIcon } from './icons';
import { useSports } from '../hooks/useSports';
import { Sport, WorkingHours, ConsultantInfo, LessonType, LessonOption, Location } from '../types';

interface AdminPanelProps {
  sports: Sport[];
  workingHours: WorkingHours;
  slotInterval: number;
  setSlotInterval: React.Dispatch<React.SetStateAction<number>>;
  consultant: ConsultantInfo;
  updateWorkingHours: (wh: WorkingHours) => void;
  updateConsultant: (data: Partial<ConsultantInfo>) => void;
  onLogout: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  sports,
  workingHours,
  slotInterval,
  setSlotInterval,
  consultant,
  updateWorkingHours,
  updateConsultant,
  onLogout
}) => {
  const {
    addSport, updateSport, removeSport,
    addLessonType, updateLessonType, removeLessonType,
    addOption, removeOption,
    addLocation, removeLocation, updateLocation
  } = useSports();

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string | number>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Avatar upload
  const handleAvatarClick = () => fileInputRef.current?.click();
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => updateConsultant({ avatarUrl: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  // Inline edit
  const startEditing = (key: string, value: string | number) => {
    setEditingKey(key);
    setEditingValue(value);
  };
  const cancelEditing = () => {
    setEditingKey(null);
    setEditingValue('');
  };
  const handleSave = async () => {
    if (!editingKey) return;
    // sport-name::sportid, lesson-name::sportid::lessonid, location-name::sportid::lessonid::locationid...
    const parts = editingKey.split('::');
    if (parts[0] === 'sport-name') await updateSport(parts[1], { name: String(editingValue) });
    if (parts[0] === 'sport-color') await updateSport(parts[1], { color: String(editingValue) });
    if (parts[0] === 'lesson-name') await updateLessonType(parts[1], parts[2], { name: String(editingValue) });
    if (parts[0] === 'lesson-desc') await updateLessonType(parts[1], parts[2], { description: String(editingValue) });
    if (parts[0] === 'option-duration') await addOption(parts[1], parts[2], { duration: Number(editingValue) }); // solo aggiunta
    if (parts[0] === 'location-name') await updateLocation(parts[1], parts[2], parts[3], { name: String(editingValue) });
    if (parts[0] === 'location-address') await updateLocation(parts[1], parts[2], parts[3], { address: String(editingValue) });
    cancelEditing();
  };

  // Add/Remove handlers
  const handleAddSport = async () => {
    const name = prompt("Nome del nuovo sport:");
    if (name) {
      await addSport({
        id: name.toLowerCase().replace(/\s/g, '-') + Date.now(),
        name,
        color: '#cccccc',
        lessonTypes: [],
      });
    }
  };
  const handleRemoveSport = async (sportId: string) => {
    if (confirm("Sei sicuro di voler eliminare questo sport e tutte le sue lezioni?")) {
      await removeSport(sportId);
    }
  };
  const handleAddLessonType = async (sportId: string) => {
    const name = prompt("Nome del nuovo tipo di lezione:");
    if (name) {
      await addLessonType(sportId, {
        id: sportId + '-' + name.toLowerCase().replace(/\s/g, '-') + Date.now(),
        name,
        description: "Nuova descrizione",
        options: [],
        locations: []
      });
    }
  };
  const handleRemoveLessonType = async (sportId: string, lessonTypeId: string) => {
    if (confirm("Sei sicuro di voler eliminare questo tipo di lezione?")) {
      await removeLessonType(sportId, lessonTypeId);
    }
  };
  const handleAddOption = async (sportId: string, lessonTypeId: string) => {
    const duration = prompt("Durata in minuti:");
    if (duration && !isNaN(parseInt(duration))) {
      await addOption(sportId, lessonTypeId, { duration: parseInt(duration) });
    }
  };
  const handleRemoveOption = async (sportId: string, lessonTypeId: string, duration: number) => {
    await removeOption(sportId, lessonTypeId, duration);
  };
  const handleAddLocation = async (sportId: string, lessonTypeId: string) => {
    const name = prompt("Nome della nuova sede:");
    if (!name) return;
    const address = prompt("Indirizzo completo della sede:");
    if (address) {
      await addLocation(sportId, lessonTypeId, {
        id: name.toLowerCase().replace(/\s/g, '-') + Date.now(),
        name,
        address,
      });
    }
  };
  const handleRemoveLocation = async (sportId: string, lessonTypeId: string, locationId: string) => {
    await removeLocation(sportId, lessonTypeId, locationId);
  };

  // Orari settimanali
  const handleDayToggle = (dayIndex: number, isEnabled: boolean) => {
    const newWH = { ...workingHours };
    newWH[dayIndex] = isEnabled ? { start: 9 * 60, end: 17 * 60 } : null;
    updateWorkingHours(newWH);
  };
  const handleTimeChange = (dayIndex: number, type: 'start' | 'end', time: string) => {
    const minutes = timeToMinutes(time);
    const newWH = { ...workingHours };
    const current = newWH[dayIndex];
    if (current) {
      newWH[dayIndex] = { ...current, [type]: minutes };
      updateWorkingHours(newWH);
    }
  };

  // Utility
  const minutesToTime = (minutes: number) => {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };
  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };
  const displayWeekDays = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
  const dayIndexMap = [1, 2, 3, 4, 5, 6, 0];

  // Render
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
      );
    }
    return (
      <div className="flex items-center gap-2 group">
        {display}
        <button onClick={() => startEditing(key, value)} className="p-1 text-gray-400 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          <PencilIcon className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Pannello Amministrazione</h1>
        <button onClick={onLogout} className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600">Logout</button>
      </div>
      {/* ...Gestione informazioni principale e orari (identici a sopra)... */}
      <div className="space-y-6">
        {sports.map(sport => (
          <div key={sport.id} className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                {renderEditable(`sport-name::${sport.id}`, sport.name, <h2 className="text-xl font-semibold" style={{ color: sport.color }}>{sport.name}</h2>)}
                {renderEditable(`sport-color::${sport.id}`, sport.color, <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: sport.color }}></div>, 'color')}
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
                          <span>{o.duration} min</span>
                          <button onClick={() => handleRemoveOption(sport.id, lt.id, o.duration)} className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            <TrashIcon className="w-4 h-4" />
                          </button>
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
                            <button onClick={() => handleRemoveLocation(sport.id, lt.id, l.id)} className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => handleAddLocation(sport.id, lt.id)} className="text-sm text-primary hover:underline mt-1">+ Aggiungi</button>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={() => handleAddLessonType(sport.id)} className="mt-4 flex items-center text-primary font-semibold hover:underline text-sm">
              <PlusIcon className="w-4 h-4 mr-1" /> Nuovo tipo di lezione
            </button>
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