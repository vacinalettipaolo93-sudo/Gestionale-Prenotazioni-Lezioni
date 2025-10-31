import React, { useState, useEffect } from 'react';
import { createEvent as createEventServer } from '../src/services/googleClient';
import type { LessonSelection, Booking, WorkingHours, DateOverrides, ConsultantInfo } from '../types';
import { CalendarIcon, ClockIcon, BackArrowIcon, UserIcon, EmailIcon, PhoneIcon, PlusIcon, XIcon } from './icons';

interface BookingPageProps {
  selection: LessonSelection;
  onBookingConfirmed: (booking: Booking) => void;
  onBack: () => void;
  workingHours: WorkingHours;
  dateOverrides: DateOverrides;
  slotInterval: number;
  minimumNoticeHours: number;
  consultant: ConsultantInfo;
  selectedCalendarIds: string[];
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export default function BookingPage({
  selection,
  onBookingConfirmed,
  onBack,
  workingHours,
  dateOverrides,
  slotInterval,
  minimumNoticeHours,
  consultant,
  selectedCalendarIds,
  showToast,
}: BookingPageProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [newParticipant, setNewParticipant] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const duration = selection.option.duration;
  const location = selection.location;

  // Generate available dates (next 30 days)
  const getAvailableDates = () => {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayOfWeek = date.getDay();
      const dateString = date.toISOString().split('T')[0];
      
      // Check if date has working hours or override
      const override = dateOverrides[dateString];
      if (override === null) continue; // Closed
      
      const hours = override || workingHours[dayOfWeek];
      if (hours) {
        dates.push(date);
      }
    }
    return dates;
  };

  // Generate time slots for selected date
  useEffect(() => {
    if (!selectedDate) {
      setAvailableSlots([]);
      return;
    }

    const dayOfWeek = selectedDate.getDay();
    const dateString = selectedDate.toISOString().split('T')[0];
    const override = dateOverrides[dateString];
    const hours = override || workingHours[dayOfWeek];

    if (!hours) {
      setAvailableSlots([]);
      return;
    }

    const slots: string[] = [];
    const interval = location.slotInterval || slotInterval;
    const now = new Date();
    const minTime = new Date(now.getTime() + minimumNoticeHours * 60 * 60 * 1000);

    let currentTime = hours.start;
    while (currentTime + duration <= hours.end) {
      const slotDate = new Date(selectedDate);
      const hours_part = Math.floor(currentTime);
      const minutes_part = Math.round((currentTime - hours_part) * 60);
      slotDate.setHours(hours_part, minutes_part, 0, 0);

      // Only add if it's after minimum notice time
      if (slotDate >= minTime) {
        const timeString = `${String(hours_part).padStart(2, '0')}:${String(minutes_part).padStart(2, '0')}`;
        slots.push(timeString);
      }

      currentTime += interval / 60;
    }

    setAvailableSlots(slots);
  }, [selectedDate, dateOverrides, workingHours, slotInterval, location.slotInterval, duration, minimumNoticeHours]);

  const handleAddParticipant = () => {
    if (newParticipant.trim()) {
      setParticipants([...participants, newParticipant.trim()]);
      setNewParticipant('');
    }
  };

  const handleRemoveParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTimeSlot || !name || !email || !phone) {
      showToast('Compila tutti i campi obbligatori', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const [hours, minutes] = selectedTimeSlot.split(':').map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);

      const booking: Booking = {
        sportId: selection.sport.id,
        lessonTypeId: selection.lessonType.id,
        duration,
        location,
        startTime,
        name,
        email,
        phone,
        participants,
      };

      // Try to create Google Calendar event if calendars are configured
      if (selectedCalendarIds.length > 0) {
        try {
          const calendarId = location.googleCalendarId || selection.sport.googleCalendarId || selectedCalendarIds[0];
          const endTime = new Date(startTime.getTime() + duration * 60000);
          
          const event = {
            summary: `${selection.lessonType.name} - ${name}`,
            description: `Lezione di ${selection.sport.name} con ${consultant.name}\nPartecipanti: ${name}${participants.length > 0 ? ', ' + participants.join(', ') : ''}`,
            location: `${location.name}, ${location.address}`,
            start: {
              dateTime: startTime.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            end: {
              dateTime: endTime.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            attendees: [
              { email },
              ...(consultant.email ? [{ email: consultant.email }] : []),
            ],
          };

          const result = await createEventServer(calendarId, event);
          booking.googleEventId = result.id;
        } catch (error) {
          console.error('Error creating Google Calendar event:', error);
          // Continue with booking even if Google Calendar fails
        }
      }

      onBookingConfirmed(booking);
      showToast('Prenotazione confermata!', 'success');
    } catch (error) {
      console.error('Error submitting booking:', error);
      showToast('Errore durante la prenotazione. Riprova.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableDates = getAvailableDates();

  return (
    <div className="p-4 sm:p-8">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-neutral-400 hover:text-primary transition-colors duration-200"
      >
        <BackArrowIcon className="w-5 h-5" />
        <span>Indietro</span>
      </button>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-neutral-800 mb-2">Prenota la tua lezione</h2>
        <p className="text-neutral-600">
          {selection.sport.name} - {selection.lessonType.name} ({selection.option.duration} min)
        </p>
        <p className="text-neutral-500 text-sm">
          {location.name}, {location.address}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date Selection */}
        <div>
          <label className="flex items-center gap-2 text-neutral-700 font-medium mb-3">
            <CalendarIcon className="w-5 h-5" />
            Seleziona la data
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {availableDates.map((date) => {
              const dateString = date.toISOString().split('T')[0];
              const isSelected = selectedDate?.toISOString().split('T')[0] === dateString;
              return (
                <button
                  key={dateString}
                  type="button"
                  onClick={() => {
                    setSelectedDate(date);
                    setSelectedTimeSlot(null);
                  }}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                    isSelected
                      ? 'border-primary bg-primary text-white'
                      : 'border-neutral-200 hover:border-primary hover:bg-neutral-50'
                  }`}
                >
                  <div className="text-xs font-medium">
                    {date.toLocaleDateString('it-IT', { weekday: 'short' })}
                  </div>
                  <div className="text-lg font-bold">
                    {date.getDate()}
                  </div>
                  <div className="text-xs">
                    {date.toLocaleDateString('it-IT', { month: 'short' })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Slot Selection */}
        {selectedDate && (
          <div>
            <label className="flex items-center gap-2 text-neutral-700 font-medium mb-3">
              <ClockIcon className="w-5 h-5" />
              Seleziona l'orario
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {availableSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedTimeSlot(slot)}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                    selectedTimeSlot === slot
                      ? 'border-primary bg-primary text-white'
                      : 'border-neutral-200 hover:border-primary hover:bg-neutral-50'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
            {availableSlots.length === 0 && (
              <p className="text-neutral-500 text-sm">Nessun orario disponibile per questa data</p>
            )}
          </div>
        )}

        {/* User Details */}
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-neutral-700 font-medium mb-2">
              <UserIcon className="w-5 h-5" />
              Nome completo *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-neutral-200 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-neutral-700 font-medium mb-2">
              <EmailIcon className="w-5 h-5" />
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-neutral-200 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-neutral-700 font-medium mb-2">
              <PhoneIcon className="w-5 h-5" />
              Telefono *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-neutral-200 focus:border-primary focus:outline-none"
            />
          </div>

          {/* Participants */}
          <div>
            <label className="flex items-center gap-2 text-neutral-700 font-medium mb-2">
              <UserIcon className="w-5 h-5" />
              Altri partecipanti (opzionale)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newParticipant}
                onChange={(e) => setNewParticipant(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddParticipant())}
                placeholder="Nome partecipante"
                className="flex-1 px-4 py-3 rounded-lg border border-neutral-200 focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddParticipant}
                className="px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors duration-200"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
            </div>
            {participants.length > 0 && (
              <div className="space-y-2">
                {participants.map((participant, index) => (
                  <div key={index} className="flex items-center justify-between bg-neutral-50 px-4 py-2 rounded-lg">
                    <span>{participant}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveParticipant(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !selectedDate || !selectedTimeSlot}
          className="w-full px-6 py-4 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isSubmitting ? 'Prenotazione in corso...' : 'Conferma prenotazione'}
        </button>
      </form>
    </div>
  );
}
