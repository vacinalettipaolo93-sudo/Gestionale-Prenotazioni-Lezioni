import React, { useState, useMemo, useEffect } from 'react';
import type { LessonSelection, Booking, WorkingHours, ConsultantInfo, DateOverrides } from '../types';
import { generateAvailableTimes, CalendarEvent } from '../utils/date';
import { getDaysInMonth, getMonthName, getYear } from '../utils/date';
import { ClockIcon, CalendarIcon, BackArrowIcon, UserIcon, EmailIcon, LocationMarkerIcon, PhoneIcon, PlusIcon, XIcon } from './icons';
import { db, firestore } from '../firebaseConfig';

declare const gapi: any;

interface BookingPageProps {
  selection: LessonSelection;
  onBookingConfirmed: (booking: Booking) => void;
  onBack: () => void;
  workingHours: WorkingHours;
  dateOverrides: DateOverrides;
  slotInterval: number;
  consultant: ConsultantInfo;
  isGoogleSignedIn: boolean;
  selectedCalendarIds: string[];
}

const BookingPage: React.FC<BookingPageProps> = ({ 
    selection, onBookingConfirmed, onBack, workingHours, 
    dateOverrides, slotInterval, consultant, isGoogleSignedIn, selectedCalendarIds
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const daysInMonth = useMemo(() => getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth()), [currentDate]);
  const monthName = getMonthName(currentDate);
  const year = getYear(currentDate);

  useEffect(() => {
    if (selectedDate) {
      setIsLoading(true);
      
      const fetchBookingsAndGenerateTimes = async () => {
        try {
            // Fetch bookings from Firestore
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);

            const bookingsRef = db.collection("bookings");
            const q = bookingsRef
                .where("startTime", ">=", firestore.Timestamp.fromDate(startOfDay))
                .where("startTime", "<=", firestore.Timestamp.fromDate(endOfDay));
            
            const querySnapshot = await q.get();
            // FIX: The type for existing bookings was too restrictive and caused a type error when passed to `generateAvailableTimes`.
            // The documents from Firestore should contain all properties of a `Booking`, so this is changed to `Booking[]`.
            const existingBookings: Booking[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                existingBookings.push({
                    ...data,
                    startTime: (data.startTime as import('firebase/compat/app').default.firestore.Timestamp).toDate(),
                } as Booking);
            });

            // Fetch events from all selected Google Calendars
            let calendarEvents: CalendarEvent[] = [];
            if(isGoogleSignedIn && selectedCalendarIds && selectedCalendarIds.length > 0) {
                 const eventPromises = selectedCalendarIds.map(calendarId => 
                    gapi.client.calendar.events.list({
                        'calendarId': calendarId,
                        'timeMin': startOfDay.toISOString(),
                        'timeMax': endOfDay.toISOString(),
                        'showDeleted': false,
                        'singleEvents': true,
                        'orderBy': 'startTime'
                    })
                );
                
                const responses = await Promise.all(eventPromises);
                const allItems = responses.flatMap(response => response.result.items);

                calendarEvents = allItems
                  .filter((event: any) => 
                    event.status !== 'cancelled' && 
                    (event.start.dateTime || event.start.date) &&
                    event.transparency !== 'transparent' // Ignore events marked as "Available"
                  )
                  .map((event: any): CalendarEvent => {
                      if (event.start.date) {
                        // All-day event: Blocks the entire local day.
                        // new Date('YYYY-MM-DD') creates a date at midnight UTC. We need to treat it as local midnight.
                        // Appending T00:00:00 forces JS to parse it in the local timezone.
                        const startTime = new Date(event.start.date + 'T00:00:00');
                        const endTime = new Date(event.start.date + 'T23:59:59');
                        return { startTime, endTime };
                      } else {
                        // Timed event
                        return {
                            startTime: new Date(event.start.dateTime),
                            endTime: new Date(event.end.dateTime),
                        };
                      }
                  });
            }

            // Use the location-specific interval if available, otherwise fall back to the global setting.
            const effectiveSlotInterval = selection.location.slotInterval && selection.location.slotInterval > 0
                ? selection.location.slotInterval
                : slotInterval;

            const times = generateAvailableTimes(selectedDate, selection.option.duration, existingBookings, calendarEvents, workingHours, effectiveSlotInterval, dateOverrides);
            setAvailableTimes(times);
        } catch (error) {
            console.error("Error fetching bookings or calendar events:", error);
            alert("Errore nel caricamento degli eventi da Google Calendar. Controlla la console per i dettagli.");
            setAvailableTimes([]);
        } finally {
            setIsLoading(false);
        }
      }
      
      fetchBookingsAndGenerateTimes();
    } else {
      setAvailableTimes([]);
    }
    setSelectedTime(null);
  }, [selectedDate, selection.option.duration, selection.location, workingHours, slotInterval, dateOverrides, isGoogleSignedIn, selectedCalendarIds]);

  const handleDayClick = (day: Date) => {
    if (day.getTime() < new Date(new Date().setHours(0, 0, 0, 0)).getTime()) return;
    setSelectedDate(day);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const changeMonth = (offset: number) => {
    setSelectedDate(null);
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + offset);
      return newDate;
    });
  };
  
  const handleAddParticipant = () => {
    if (participants.length < 4) {
      setParticipants([...participants, '']);
    }
  };

  const handleParticipantChange = (index: number, value: string) => {
    const newParticipants = [...participants];
    newParticipants[index] = value;
    setParticipants(newParticipants);
  };

  const handleRemoveParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !selectedTime || !selectedDate) return;
    
    setIsSubmitting(true);

    try {
        const [hours, minutes] = selectedTime.split(':').map(Number);
        const bookingStartTime = new Date(selectedDate);
        bookingStartTime.setHours(hours, minutes);
        
        const bookingEndTime = new Date(bookingStartTime.getTime() + selection.option.duration * 60000);
        
        const finalParticipants = participants.filter(p => p.trim() !== '');

        const newBookingData = {
            sportId: selection.sport.id,
            lessonTypeId: selection.lessonType.id,
            duration: selection.option.duration,
            location: selection.location,
            startTime: firestore.Timestamp.fromDate(bookingStartTime),
            name,
            email,
            phone,
            participants: finalParticipants,
        };

        await db.collection("bookings").add(newBookingData);

        // Create event in Google Calendar
        if (isGoogleSignedIn) {
            let eventDescription = `Prenotazione effettuata da ${name} (${email}).\nTelefono: ${phone}.`;
            if (finalParticipants.length > 0) {
                eventDescription += `\nAltri partecipanti: ${finalParticipants.join(', ')}.`;
            }

            const event = {
                'summary': `${selection.sport.name}: ${selection.lessonType.name} - ${name}`,
                'location': selection.location.address,
                'description': eventDescription,
                'start': {
                    'dateTime': bookingStartTime.toISOString(),
                    'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
                },
                'end': {
                    'dateTime': bookingEndTime.toISOString(),
                    'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
                },
            };

            await gapi.client.calendar.events.insert({
                'calendarId': 'primary',
                'resource': event,
            });
        }
        
        onBookingConfirmed({ ...newBookingData, startTime: bookingStartTime });
    } catch (error) {
        console.error("Error adding document or calendar event: ", error);
        alert("Si è verificato un errore durante la prenotazione. Riprova.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const weekDays = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="flex flex-col md:flex-row min-h-[600px]">
      <div className="w-full md:w-1/3 p-6 border-r flex flex-col">
        <button onClick={onBack} className="flex items-center text-primary font-semibold mb-4 hover:underline">
          <BackArrowIcon className="w-5 h-5 mr-2" />
          Indietro
        </button>
        <p className="text-gray-500">{consultant.name}</p>
        <h2 className="text-2xl font-bold text-gray-800 my-2">{selection.lessonType.name}</h2>
        <div className="flex items-center text-gray-500 mb-2">
          <ClockIcon className="w-5 h-5 mr-2" />
          <span>{selection.option.duration} minuti</span>
        </div>
        <div className="flex items-start text-gray-500 mb-2">
            <LocationMarkerIcon className="w-5 h-5 mr-2 mt-1 flex-shrink-0" />
            <div>
              <span className="font-semibold block">{selection.location.name}</span>
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selection.location.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                  {selection.location.address}
              </a>
            </div>
        </div>

        {selectedTime && selectedDate && (
          <div className="flex items-center text-green-600 font-semibold mt-4 pt-4 border-t">
            <CalendarIcon className="w-5 h-5 mr-2" />
            <span>{`${selectedTime}, ${selectedDate.toLocaleString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}</span>
          </div>
        )}
      </div>

      <div className="w-full md:w-2/3 p-6 flex">
        {!selectedTime ? (
          <div className="flex-1 flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-2/3">
              <h3 className="text-xl font-bold mb-4">Seleziona una data</h3>
              <div className="flex justify-between items-center mb-2">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100">&lt;</button>
                <span className="font-semibold">{monthName} {year}</span>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100">&gt;</button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-sm text-gray-500">
                {weekDays.map(day => <div key={day}>{day}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1 mt-2">
                {daysInMonth.map((day, index) => (
                  <button
                    key={index}
                    onClick={() => day && handleDayClick(day)}
                    disabled={!day || day.getTime() < today.getTime()}
                    className={`p-2 rounded-full text-center disabled:text-gray-300 disabled:cursor-not-allowed ${
                      day ? 'hover:bg-primary-light' : ''
                    } ${
                      selectedDate && day && selectedDate.getTime() === day.getTime() ? 'bg-primary text-white' : ''
                    } ${
                      !day ? 'invisible' : ''
                    }`}
                  >
                    {day ? day.getDate() : ''}
                  </button>
                ))}
              </div>
            </div>

            {selectedDate && (
              <div className="w-full md:w-1/3 h-96 overflow-y-auto">
                <h3 className="text-lg font-semibold mb-2 text-center md:text-left">{selectedDate.toLocaleDateString('it-IT', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
                {isLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : availableTimes.length > 0 ? (
                  availableTimes.map(time => (
                    <button
                      key={time}
                      onClick={() => handleTimeSelect(time)}
                      className="w-full py-2 px-4 mb-2 border border-primary text-primary rounded-md hover:bg-primary hover:text-white transition-colors duration-200"
                    >
                      {time}
                    </button>
                  ))
                ) : (
                  <p className="text-gray-500 text-center">Nessun orario disponibile.</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full">
            <h3 className="text-xl font-bold mb-4">Inserisci i tuoi dati</h3>
            <form onSubmit={handleSubmit}>
              <p className="text-xs text-gray-500 mb-4">I campi contrassegnati con * sono obbligatori.</p>
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
                <div className="relative">
                  <UserIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
                </div>
              </div>
               <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <div className="relative">
                  <EmailIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
                </div>
              </div>
              <div className="mb-4">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Cellulare *</label>
                <div className="relative">
                  <PhoneIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="tel" id="phone" value={phone} onChange={e => setPhone(e.target.value)} required className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
                </div>
              </div>

              {/* Participants */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Aggiungi partecipanti (opzionale)</label>
                {participants.map((participant, index) => (
                  <div key={index} className="relative mb-2">
                    <UserIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder={`Nome partecipante ${index + 1}`}
                      value={participant}
                      onChange={(e) => handleParticipantChange(index, e.target.value)}
                      className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    />
                    <button type="button" onClick={() => handleRemoveParticipant(index)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                      <XIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                {participants.length < 4 && (
                  <button type="button" onClick={handleAddParticipant} className="flex items-center text-sm text-primary hover:underline mt-2">
                    <PlusIcon className="w-4 h-4 mr-1" />
                    Aggiungi partecipante
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-white font-bold py-3 px-4 rounded-md hover:bg-primary-dark transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>}
                {isSubmitting ? 'Conferma in corso...' : 'Conferma Prenotazione'}
              </button>
              <p className="mt-4 text-center text-sm font-bold uppercase text-secondary">
                La prenotazione sarà confermata per messaggio previa verifica disponibilità campo
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingPage;