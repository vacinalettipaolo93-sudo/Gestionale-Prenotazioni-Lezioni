import React, { useState, useEffect, useMemo } from 'react';
import type { LessonSelection, Booking, WorkingHours, DateOverrides } from '../types';
import { CalendarIcon, ClockIcon, BackArrowIcon, UserIcon, EmailIcon, PhoneIcon, PlusIcon, TrashIcon } from './icons';
import { getMonthName, getYear, getDaysInMonth, generateAvailableTimes, CalendarEvent } from '../utils/date';
import { db } from '../firebaseConfig';

// Mock gapi for type safety, as it's loaded from a script tag
declare const gapi: any;

interface BookingPageProps {
  selection: LessonSelection;
  onBookingComplete: (booking: Booking) => void;
  onBack: () => void;
  workingHours: WorkingHours;
  slotInterval: number;
  dateOverrides: DateOverrides;
}

const BookingPage: React.FC<BookingPageProps> = ({ selection, onBookingComplete, onBack, workingHours, slotInterval, dateOverrides }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [availableTimes, setAvailableTimes] = useState<string[]>([]);
    const [isLoadingTimes, setIsLoadingTimes] = useState(false);
    
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [participants, setParticipants] = useState<string[]>(['']);
    
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [gcalEvents, setGcalEvents] = useState<CalendarEvent[]>([]);

    useEffect(() => {
        // Fetch google calendar events for the selected month when the component loads or month changes
        const fetchGcalEventsForMonth = async () => {
             if (gapi?.client?.calendar) {
                const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

                try {
                    const response = await gapi.client.calendar.events.list({
                        'calendarId': 'primary',
                        'timeMin': startOfMonth.toISOString(),
                        'timeMax': endOfMonth.toISOString(),
                        'showDeleted': false,
                        'singleEvents': true,
                        'orderBy': 'startTime'
                    });
                    
                    const events: CalendarEvent[] = response.result.items
                        .filter((item: any) => item.status !== 'cancelled')
                        .map((item: any) => ({
                            startTime: new Date(item.start.dateTime || item.start.date),
                            endTime: new Date(item.end.dateTime || item.end.date),
                        }));
                    setGcalEvents(events);
                } catch (err) {
                    console.error("Error fetching Google Calendar events:", err);
                }
            }
        };
        fetchGcalEventsForMonth();
    }, [currentDate]);

    useEffect(() => {
        if (!selectedDate) {
            setAvailableTimes([]);
            return;
        }

        const fetchBookingsAndGenerateTimes = async () => {
            setIsLoadingTimes(true);
            try {
                // Fetch bookings from Firestore for the selected date
                const startOfDay = new Date(selectedDate);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(selectedDate);
                endOfDay.setHours(23, 59, 59, 999);

                const snapshot = await db.collection('bookings')
                    .where('startTime', '>=', startOfDay)
                    .where('startTime', '<=', endOfDay)
                    .get();

                const existingBookings: Booking[] = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        ...data,
                        startTime: data.startTime.toDate(),
                    } as Booking;
                });
                
                // Filter GCal events for the selected date
                const gcalEventsForDay = gcalEvents.filter(event => 
                    event.startTime.getFullYear() === selectedDate.getFullYear() &&
                    event.startTime.getMonth() === selectedDate.getMonth() &&
                    event.startTime.getDate() === selectedDate.getDate()
                );

                const times = generateAvailableTimes(
                    selectedDate, 
                    selection.option.duration, 
                    existingBookings,
                    gcalEventsForDay,
                    workingHours,
                    slotInterval,
                    dateOverrides
                );
                setAvailableTimes(times);
            } catch (err) {
                console.error("Error fetching bookings:", err);
                setError("Impossibile caricare gli orari. Riprova più tardi.");
            } finally {
                setIsLoadingTimes(false);
            }
        };

        fetchBookingsAndGenerateTimes();
    }, [selectedDate, selection.option.duration, workingHours, slotInterval, dateOverrides, gcalEvents]);

    const days = useMemo(() => getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth()), [currentDate]);
    const today = new Date();
    today.setHours(0,0,0,0);

    const handleDateSelect = (day: Date) => {
        if (day.getTime() < today.getTime()) return;
        setSelectedDate(day);
        setSelectedTime(null);
    };
    
    const handleParticipantChange = (index: number, value: string) => {
        const newParticipants = [...participants];
        newParticipants[index] = value;
        setParticipants(newParticipants);
    };

    const addParticipant = () => {
        setParticipants([...participants, '']);
    };

    const removeParticipant = (index: number) => {
        setParticipants(participants.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDate || !selectedTime || !name || !email || !phone) {
            setError("Per favore, compila tutti i campi richiesti.");
            return;
        }
        
        setError('');
        setIsSubmitting(true);
        
        const [hours, minutes] = selectedTime.split(':').map(Number);
        const startTime = new Date(selectedDate);
        startTime.setHours(hours, minutes, 0, 0);

        const newBooking: Booking = {
            startTime,
            duration: selection.option.duration,
            location: selection.location,
            lessonTypeId: selection.lessonType.id,
            name,
            email,
            phone,
            participants: participants.filter(p => p.trim() !== ''),
        };

        try {
            await db.collection('bookings').add(newBooking);
            onBookingComplete(newBooking);
        } catch (err) {
            console.error("Error saving booking:", err);
            setError("Si è verificato un errore durante la prenotazione. Riprova.");
            setIsSubmitting(false);
        }
    };
    
    const renderCalendar = () => (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>&lt;</button>
                <h3 className="font-bold capitalize">{getMonthName(currentDate)} {getYear(currentDate)}</h3>
                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>&gt;</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
                {['D', 'L', 'M', 'M', 'G', 'V', 'S'].map(d => <div key={d} className="font-semibold text-gray-500">{d}</div>)}
                {days.map((day, i) => {
                    if (!day) return <div key={`empty-${i}`}></div>;
                    const isPast = day.getTime() < today.getTime();
                    const isSelected = selectedDate && day.getTime() === selectedDate.getTime();
                    const dayClasses = `p-2 rounded-full cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary text-white' :
                        isPast ? 'text-gray-300 cursor-not-allowed' :
                        'hover:bg-gray-200'
                    }`;
                    return (
                        <div key={day.toISOString()} onClick={() => handleDateSelect(day)} className={dayClasses}>
                            {day.getDate()}
                        </div>
                    );
                })}
            </div>
        </div>
    );
    
    const renderTimes = () => {
        if (!selectedDate) return <div className="p-4 text-center text-gray-500">Seleziona una data per vedere gli orari disponibili.</div>;
        if (isLoadingTimes) return <div className="p-4 text-center text-gray-500">Caricamento...</div>;
        if (availableTimes.length === 0) return <div className="p-4 text-center text-gray-500">Nessun orario disponibile per questa data.</div>;
        
        return (
            <div className="p-4 grid grid-cols-3 sm:grid-cols-4 gap-2">
                {availableTimes.map(time => (
                    <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`p-2 rounded-md border text-center transition-colors ${
                            selectedTime === time 
                                ? 'bg-primary text-white border-primary-dark'
                                : 'bg-white hover:border-primary'
                        }`}
                    >
                        {time}
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div>
            <div className="p-4 border-b flex items-center bg-gray-50">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 mr-2">
                    <BackArrowIcon className="w-5 h-5 text-gray-600"/>
                </button>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Seleziona data e ora</h2>
                    <p className="text-sm text-gray-600">{selection.lessonType.name} - {selection.option.duration} min</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-1/2 border-r">
                    {renderCalendar()}
                </div>
                <div className="w-full md:w-1/2 max-h-[400px] overflow-y-auto">
                    {renderTimes()}
                </div>
            </div>

            {selectedTime && (
                <div className="p-6 bg-gray-50 border-t">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Inserisci i tuoi dettagli</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome e Cognome</label>
                                <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"/>
                            </div>
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Numero di telefono</label>
                                <input type="tel" id="phone" value={phone} onChange={e => setPhone(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"/>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                            <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"/>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Altri Partecipanti (opzionale)</label>
                             {participants.map((p, index) => (
                                <div key={index} className="flex items-center mt-1">
                                    <input 
                                        type="text" 
                                        value={p} 
                                        onChange={e => handleParticipantChange(index, e.target.value)} 
                                        placeholder={`Nome Partecipante ${index + 2}`}
                                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                                    />
                                    {participants.length > 1 && (
                                        <button type="button" onClick={() => removeParticipant(index)} className="ml-2 text-red-500 hover:text-red-700">
                                            <TrashIcon className="w-5 h-5"/>
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button type="button" onClick={addParticipant} className="mt-2 flex items-center text-sm text-primary hover:underline">
                                <PlusIcon className="w-4 h-4 mr-1"/> Aggiungi partecipante
                            </button>
                        </div>

                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full bg-primary text-white font-bold py-3 px-4 rounded-md hover:bg-primary-dark transition-colors disabled:bg-gray-400"
                        >
                            {isSubmitting ? 'Prenotazione in corso...' : 'Conferma Prenotazione'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default BookingPage;
