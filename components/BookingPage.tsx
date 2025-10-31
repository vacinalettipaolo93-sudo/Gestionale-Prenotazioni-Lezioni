import React, { useState } from 'react';
import { createEvent as createEventServer } from '../src/services/googleClient';
import { CalendarIcon } from './icons';

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

  // ... resto del file invariato ...
