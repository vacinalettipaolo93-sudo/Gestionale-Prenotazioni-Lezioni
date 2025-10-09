import React, { useState, useRef } from 'react';
import { PlusIcon, PencilIcon, CheckIcon, XIcon, TrashIcon, CameraIcon } from './icons';
import { useSports } from '../hooks/useSports';
import { Sport, WorkingHours, ConsultantInfo, LessonType, LessonOption, Location } from '../types';

interface AdminPanelProps {
  sports: Sport[];
  workingHours: WorkingHours;
  slotInterval: number;
  setSlotInterval: React.Dispatch<React.SetStateAction<number>>;
  consultant?: ConsultantInfo;
  updateWorkingHours: (wh: WorkingHours) => void;
  updateConsultant: (data: Partial<ConsultantInfo>) => void;
  onLogout: () => void;
}

const defaultConsultant = {
  name: '',
  title: '',
  avatarUrl: '',
  welcomeMessage: ''
};

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
        color: "#cccccc",
        icon: undefined,
        lessonTypes: [],
      });
    }
  };

  // ...qui aggiungi il resto del rendering del pannello, invariato
  // Quando usi consultant.avatarUrl, usa consultant?.avatarUrl || defaultConsultant.avatarUrl

  return (
    <div className="admin-panel">
      <div className="consultant-info">
        <img
          src={consultant?.avatarUrl || defaultConsultant.avatarUrl || "https://ui-avatars.com/api/?name=Avatar"}
          alt={consultant?.name || "Avatar"}
          className="w-24 h-24 rounded-full mb-4"
          onClick={handleAvatarClick}
          style={{ cursor: "pointer" }}
        />
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <h2 className="text-xl font-bold text-gray-800">{consultant?.name || defaultConsultant.name}</h2>
        <p className="text-gray-600">{consultant?.title || defaultConsultant.title}</p>
        <p className="text-sm text-gray-500 mt-4">{consultant?.welcomeMessage || defaultConsultant.welcomeMessage}</p>
      </div>
      {/* Resto del pannello amministratore invariato */}
    </div>
  );
};

export default AdminPanel;