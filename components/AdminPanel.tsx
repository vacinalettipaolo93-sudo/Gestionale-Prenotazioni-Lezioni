import React, { useState } from 'react';
import { db } from '../firebaseConfig';
import { XIcon } from './icons';
import type { ConsultantInfo, Sport, WorkingHours, DateOverrides } from '../types';

interface AdminPanelProps {
    onClose: () => void;
    initialConsultantInfo: ConsultantInfo;
    initialSports: Sport[];
    initialWorkingHours: WorkingHours;
    initialDateOverrides: DateOverrides;
    initialSlotInterval: number;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
    onClose, 
    initialConsultantInfo,
    initialSports,
    initialWorkingHours,
    initialDateOverrides,
    initialSlotInterval
}) => {
    const [consultantInfo, setConsultantInfo] = useState<ConsultantInfo>(initialConsultantInfo);
    // Note: Editing complex nested state like sports is omitted for simplicity in this panel.
    // A more advanced implementation would be needed.
    const [sports] = useState<Sport[]>(initialSports); 
    const [workingHours, setWorkingHours] = useState<WorkingHours>(initialWorkingHours);
    const [dateOverrides] = useState<DateOverrides>(initialDateOverrides);
    const [slotInterval, setSlotInterval] = useState<number>(initialSlotInterval);

    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    const handleSave = async () => {
        setIsSaving(true);
        setSaveMessage('');
        try {
            const configData = {
                consultantInfo,
                sports, // Saving it back even if not editable in this UI
                workingHours,
                dateOverrides, // Saving it back even if not editable in this UI
                slotInterval
            };
            await db.collection('config').doc('master').set(configData, { merge: true });
            setSaveMessage('Impostazioni salvate con successo!');
            setTimeout(() => setSaveMessage(''), 3000);
        } catch (error) {
            console.error("Error saving config:", error);
            setSaveMessage('Errore durante il salvataggio.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleWorkingHourChange = (day: number, field: 'start' | 'end', value: string) => {
        const [h, m] = value.split(':').map(Number);
        const totalMinutes = h * 60 + m;
        
        setWorkingHours(prev => {
            const newHours = { ...prev };
            if (!newHours[day]) {
                newHours[day] = { start: 0, end: 0};
            }
            // Using non-null assertion as we check/create the object above
            newHours[day]![field] = totalMinutes;
            return newHours;
        });
    };
    
    const toggleDayAvailability = (day: number) => {
        setWorkingHours(prev => ({
            ...prev,
            [day]: prev[day] ? null : { start: 9 * 60, end: 17 * 60 }
        }));
    };
    
    const formatTime = (minutes: number) => {
        const h = Math.floor(minutes / 60).toString().padStart(2, '0');
        const m = (minutes % 60).toString().padStart(2, '0');
        return `${h}:${m}`;
    };
    
    const daysOfWeek = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-2xl font-bold text-gray-800">Pannello di Amministrazione</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-grow space-y-8">
                
                    <div className="p-4 border rounded-md">
                        <h3 className="text-lg font-semibold mb-4">Informazioni Consulente</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Nome</label>
                                <input type="text" value={consultantInfo.name} onChange={e => setConsultantInfo({...consultantInfo, name: e.target.value})} className="mt-1 w-full border-gray-300 rounded-md shadow-sm"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Titolo</label>
                                <input type="text" value={consultantInfo.title} onChange={e => setConsultantInfo({...consultantInfo, title: e.target.value})} className="mt-1 w-full border-gray-300 rounded-md shadow-sm"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium">URL Avatar</label>
                                <input type="text" value={consultantInfo.avatarUrl} onChange={e => setConsultantInfo({...consultantInfo, avatarUrl: e.target.value})} className="mt-1 w-full border-gray-300 rounded-md shadow-sm"/>
                            </div>
                             <div className="md:col-span-2">
                                <label className="block text-sm font-medium">Messaggio di Benvenuto</label>
                                <textarea value={consultantInfo.welcomeMessage} onChange={e => setConsultantInfo({...consultantInfo, welcomeMessage: e.target.value})} className="mt-1 w-full border-gray-300 rounded-md shadow-sm"/>
                            </div>
                        </div>
                    </div>
                    
                     <div className="p-4 border rounded-md">
                        <h3 className="text-lg font-semibold mb-4">Orari di Lavoro Settimanali</h3>
                         <div className="space-y-3">
                             {daysOfWeek.map((dayName, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                                    <div className="flex items-center">
                                         <input
                                            type="checkbox"
                                            checked={!!workingHours[index]}
                                            onChange={() => toggleDayAvailability(index)}
                                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mr-3"
                                        />
                                        <span className="font-medium w-24">{dayName}</span>
                                    </div>
                                    {workingHours[index] ? (
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="time" 
                                                value={formatTime(workingHours[index]!.start)} 
                                                onChange={(e) => handleWorkingHourChange(index, 'start', e.target.value)}
                                                className="border-gray-300 rounded-md shadow-sm"
                                            />
                                            <span>-</span>
                                            <input 
                                                type="time" 
                                                value={formatTime(workingHours[index]!.end)} 
                                                onChange={(e) => handleWorkingHourChange(index, 'end', e.target.value)}
                                                className="border-gray-300 rounded-md shadow-sm"
                                            />
                                        </div>
                                    ) : (
                                        <span className="text-gray-500">Non disponibile</span>
                                    )}
                                 </div>
                             ))}
                         </div>
                    </div>

                    <div className="p-4 border rounded-md">
                        <h3 className="text-lg font-semibold mb-2">Intervallo Slot Appuntamenti</h3>
                        <p className="text-sm text-gray-500 mb-2">
                            Imposta la frequenza degli slot mostrati all'utente (es. ogni 30 minuti).
                        </p>
                         <select
                            value={slotInterval}
                            onChange={e => setSlotInterval(Number(e.target.value))}
                            className="border-gray-300 rounded-md shadow-sm"
                         >
                            <option value={15}>15 minuti</option>
                            <option value={30}>30 minuti</option>
                            <option value={60}>60 minuti</option>
                         </select>
                    </div>

                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                    <div>
                        {saveMessage && (
                            <span className={`text-sm ${saveMessage.includes('Errore') ? 'text-red-600' : 'text-green-600'}`}>
                                {saveMessage}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-primary text-white font-bold py-2 px-6 rounded-md hover:bg-primary-dark transition-colors disabled:bg-gray-400"
                    >
                        {isSaving ? 'Salvataggio...' : 'Salva Impostazioni'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
