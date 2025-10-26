import React from 'react';
import type { Booking, LessonSelection, ConsultantInfo } from '../types';
import { CheckCircleIcon, CalendarIcon, ClockIcon, UserIcon, LocationMarkerIcon, PhoneIcon } from './icons';

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

  return (
    <div className="p-8 text-center flex flex-col items-center justify-center min-h-[500px]">
      <CheckCircleIcon className="w-16 h-16 text-green-500 mb-4" />
      <h2 className="text-3xl font-bold text-gray-800">Confermato!</h2>
      <p className="text-gray-600 mt-2">Hai prenotato con successo la tua lezione con {consultant.name}.</p>
      
      <div className="text-left bg-gray-50 border border-gray-200 rounded-lg p-6 mt-8 w-full max-w-md">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">{selection.lessonType.name}</h3>
        <div className="space-y-3 text-gray-700">
          <div className="flex items-center">
            <UserIcon className="w-5 h-5 mr-3 text-gray-500" />
            <span>{consultant.name}</span>
          </div>
          <div className="flex items-center">
            <CalendarIcon className="w-5 h-5 mr-3 text-gray-500" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center">
            <ClockIcon className="w-5 h-5 mr-3 text-gray-500" />
            <span>{formattedTime} ({booking.duration} min)</span>
          </div>
           <div className="flex items-center">
            <PhoneIcon className="w-5 h-5 mr-3 text-gray-500" />
            <span>{booking.phone}</span>
          </div>
          <div className="flex items-start">
            <LocationMarkerIcon className="w-5 h-5 mr-3 text-gray-500 mt-1 flex-shrink-0" />
            <div>
              <span className="font-semibold block">{booking.location.name}</span>
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
                <UserIcon className="w-5 h-5 mr-3 text-gray-500 mt-1 flex-shrink-0" />
                <div>
                  <span className="font-semibold block">Altri Partecipanti</span>
                  <ul className="list-disc list-inside text-sm">
                    {booking.participants.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-6">
          Un riepilogo è stato inviato al tuo indirizzo email: <span className="font-semibold text-gray-600">{booking.email}</span>.
        </p>
         <p className="mt-4 text-center text-xs font-bold uppercase text-secondary">
            La prenotazione sarà confermata per messaggio previa verifica disponibilità campo
         </p>
      </div>

      <button
        onClick={onBookAnother}
        className="mt-8 bg-primary text-white font-bold py-3 px-6 rounded-md hover:bg-primary-dark transition-colors duration-200"
      >
        Prenota un'altra lezione
      </button>
    </div>
  );
};

export default ConfirmationPage;