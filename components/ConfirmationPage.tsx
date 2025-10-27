import React from 'react';
import type { Booking, LessonSelection, ConsultantInfo } from '../types';
import { CheckCircleIcon, CalendarIcon, ClockIcon, UserIcon, LocationMarkerIcon, PhoneIcon, CalendarPlusIcon } from './icons';

interface ConfirmationPageProps {
  booking: Booking;
  selection: LessonSelection;
  consultant: ConsultantInfo;
  onBookAnother: () => void;
}

const ConfirmationPage: React.FC<ConfirmationPageProps> = ({ booking, selection, consultant, onBookAnother }) => {
  if (!selection || !booking) {
    return <div>Errore: Dettagli della prenotazione non trovati.</div>;
  }

  const formattedDate = booking.startTime.toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = booking.startTime.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // --- Funzioni per "Aggiungi al Calendario" ---

  const formatDateForCalendar = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d{3}/g, '');
  };

  const startTime = booking.startTime;
  const endTime = new Date(startTime.getTime() + booking.duration * 60000);
  
  // Google Calendar Link
  const googleCalendarUrl = () => {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `${selection.lessonType.name} con ${consultant.name}`,
      dates: `${formatDateForCalendar(startTime)}/${formatDateForCalendar(endTime)}`,
      details: `Lezione di ${selection.sport.name} con ${consultant.name}.\nPartecipanti: ${booking.name}${booking.participants.length > 0 ? ', ' + booking.participants.join(', ') : ''}.`,
      location: `${booking.location.name}, ${booking.location.address}`,
      ctz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    return `https://www.google.com/calendar/render?${params.toString()}`;
  };

  // ICS File Link
  const icsFileHref = () => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTAMP:${formatDateForCalendar(new Date())}`,
      `DTSTART:${formatDateForCalendar(startTime)}`,
      `DTEND:${formatDateForCalendar(endTime)}`,
      `SUMMARY:${selection.lessonType.name} con ${consultant.name}`,
      `DESCRIPTION:Lezione di ${selection.sport.name} con ${consultant.name}.\\nPartecipanti: ${booking.name}${booking.participants.length > 0 ? ', ' + booking.participants.join(', ') : ''}.`,
      `LOCATION:${booking.location.name}, ${booking.location.address}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
  };


  return (
    <div className="p-8 text-center flex flex-col items-center justify-center min-h-[600px]">
      <CheckCircleIcon className="w-16 h-16 text-green-500 mb-4" />
      <h2 className="text-3xl font-bold text-neutral-800">Confermato!</h2>
      <p className="text-neutral-400 mt-2">Hai prenotato con successo la tua lezione con {consultant.name}.</p>
      
      <div className="text-left bg-neutral-100 border border-neutral-200 rounded-lg p-6 mt-8 w-full max-w-md">
        <h3 className="text-xl font-semibold text-neutral-800 mb-4">{selection.lessonType.name}</h3>
        <div className="space-y-3 text-neutral-600">
          <div className="flex items-center">
            <UserIcon className="w-5 h-5 mr-3 text-neutral-400" />
            <span>{consultant.name}</span>
          </div>
          <div className="flex items-center">
            <CalendarIcon className="w-5 h-5 mr-3 text-neutral-400" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center">
            <ClockIcon className="w-5 h-5 mr-3 text-neutral-400" />
            <span>{formattedTime} ({booking.duration} min)</span>
          </div>
           <div className="flex items-center">
            <PhoneIcon className="w-5 h-5 mr-3 text-neutral-400" />
            <span>{booking.phone}</span>
          </div>
          <div className="flex items-start">
            <LocationMarkerIcon className="w-5 h-5 mr-3 text-neutral-400 mt-1 flex-shrink-0" />
            <div>
              <span className="font-semibold block text-neutral-800">{booking.location.name}</span>
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.location.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                  {booking.location.address}
              </a>
            </div>
          </div>
          {booking.participants && booking.participants.length > 0 && (
             <div className="flex items-start">
                <UserIcon className="w-5 h-5 mr-3 text-neutral-400 mt-1 flex-shrink-0" />
                <div>
                  <span className="font-semibold block text-neutral-800">Altri Partecipanti</span>
                  <ul className="list-disc list-inside text-sm text-neutral-400">
                    {booking.participants.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
            </div>
          )}
        </div>

        <p className="text-sm text-neutral-400 mt-6">
          Un riepilogo è stato inviato al tuo indirizzo email: <span className="font-semibold text-neutral-800">{booking.email}</span>.
        </p>
         <p className="mt-4 text-center text-xs font-bold uppercase text-neutral-400">
            La prenotazione sarà confermata per messaggio previa verifica disponibilità campo
         </p>
      </div>

      <div className="mt-8 w-full max-w-md">
        <h3 className="text-lg font-semibold text-neutral-800 mb-3">Aggiungi al tuo calendario</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href={googleCalendarUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-neutral-50 border border-neutral-200 text-neutral-800 font-semibold py-2 px-4 rounded-md hover:bg-neutral-100 transition-colors"
          >
            <CalendarPlusIcon className="w-5 h-5"/>
            Google Calendar
          </a>
          <a
            href={icsFileHref()}
            download="lezione.ics"
            className="flex-1 flex items-center justify-center gap-2 bg-neutral-50 border border-neutral-200 text-neutral-800 font-semibold py-2 px-4 rounded-md hover:bg-neutral-100 transition-colors"
          >
            <CalendarPlusIcon className="w-5 h-5"/>
            Altro Calendario (ICS)
          </a>
        </div>
      </div>


      <button
        onClick={onBookAnother}
        className="mt-8 bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-dark transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
      >
        Prenota un'altra lezione
      </button>
    </div>
  );
};

export default ConfirmationPage;