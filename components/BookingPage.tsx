import React, { useState } from 'react';
import { createEvent as createEventServer } from '../src/services/googleClient';
import { CalendarIcon } from '@heroicons/react/outline';

/**
 * BookingPage con integrazione server-side per creare eventi su Google Calendar.
 *
 * Nota: questo file è una versione completa con la logica di creazione evento via endpoint /api/google/events.
 * Adatta le props (selection, booking, consultant, etc.) al tuo progetto.
 *
 * Props attesi (esempio):
 *  - selection: { sport, location, lessonType }
 *  - booking: { startTime: Date, duration: number, name: string, participants: string[] }
 *  - consultant: { name: string, email?: string }
 *  - adminEmail: string (email admin che ha connesso Google)
 *  - onBookingCreated: (bookingResult) => void
 *  - showToast: (msg, type) => void
 */
type Props = {
  selection: any;
  booking: any;
  consultant: any;
  adminEmail: string; // must match the email used when connecting Google (token stored under this email)
  onBookingCreated?: (result: any) => void;
  showToast?: (msg: string, type?: 'success'|'error'|'info') => void;
};

export default function BookingPage({ selection, booking, consultant, adminEmail, onBookingCreated, showToast = () => {} }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Utility: format date for ICS / Google if needed
  const formatDateForCalendar = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d{3}/g, '');
  };

  // Called to confirm the booking and create Google Calendar event via server
  const handleConfirmBooking = async () => {
    setIsSubmitting(true);
    try {
      const bookingStartTime: Date = new Date(booking.startTime);
      const bookingEndTime = new Date(bookingStartTime.getTime() + (booking.duration || 60) * 60000);

      // Build attendees (include consultant if has email)
      const attendees: any[] = [];
      if (booking.email) attendees.push({ email: booking.email, displayName: booking.name });
      if (consultant?.email) attendees.push({ email: consultant.email, displayName: consultant.name });
      if (booking.participants && booking.participants.length > 0) {
        booking.participants.forEach((p: string) => {
          // you might map participant emails if available
        });
      }

      const eventPayload = {
        summary: `${selection.lessonType?.name || 'Lezione'} con ${consultant?.name || ''}`,
        description: `Lezione di ${selection.sport?.name || ''} con ${consultant?.name || ''}.\nPrenotato da: ${booking.name}${booking.participants && booking.participants.length > 0 ? ', ' + booking.participants.join(', ') : ''}.`,
        start: {
          dateTime: bookingStartTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: bookingEndTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        attendees,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
        location: `${booking.location?.name || ''}${booking.location?.address ? ', ' + booking.location.address : ''}`,
      };

      // Determine target calendar id: prefer location -> sport -> primary
      let targetCalendarId = 'primary';
      if (selection.location?.googleCalendarId) {
        targetCalendarId = selection.location.googleCalendarId;
      } else if (selection.sport?.googleCalendarId) {
        targetCalendarId = selection.sport.googleCalendarId;
      }

      // The server endpoint associates the stored refresh_token to the authenticated admin email.
      // We include adminEmail only if your server expects it; current createEventServer signature uses only calendarId and event.
      // If your server requires email to find the stored token, adjust createEvent implementation accordingly.
      const result = await createEventServer(targetCalendarId, eventPayload);

      showToast('Prenotazione creata e inviata al calendario.', 'success');
      onBookingCreated?.(result);
      return result;
    } catch (err: any) {
      console.error('Errore creazione evento:', err);
      showToast(err?.message || 'Errore durante la creazione dell\'evento.', 'error');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg border border-neutral-200">
      <div className="flex items-start gap-4">
        <CalendarIcon className="w-6 h-6 text-primary" />
        <div>
          <h3 className="font-semibold text-lg">{selection.lessonType?.name || 'Lezione'}</h3>
          <p className="text-sm text-neutral-500">{bookingStartTimeToString(booking.startTime)}</p>
        </div>
      </div>

      <div className="mt-4">
        <button
          disabled={isSubmitting}
          onClick={() => handleConfirmBooking()}
          className="bg-primary text-white font-bold py-2 px-4 rounded hover:bg-primary-dark"
        >
          {isSubmitting ? 'Sto prenotando...' : 'Conferma e Aggiungi al Calendario'}
        </button>
      </div>
    </div>
  );
}

// small helper for display (kept outside the component to keep render simple)
function bookingStartTimeToString(start: any) {
  try {
    const d = new Date(start);
    return d.toLocaleString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
