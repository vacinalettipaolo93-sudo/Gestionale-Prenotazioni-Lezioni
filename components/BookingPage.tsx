import React, { useState, useMemo } from 'react';
import type { LessonSelection, Booking, WorkingHours, DateOverrides, ConsultantInfo } from '../types';
import { CalendarIcon, ClockIcon, BackArrowIcon, UserIcon, EmailIcon, PhoneIcon, PlusIcon, XIcon } from './icons';
import { generateAvailableTimes } from '../utils/date';

const MAX_PARTICIPANTS = 10;

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
  showToast: (message: string, type: 'success' | 'error') => void;
}

const BookingPage: React.FC<BookingPageProps> = ({
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
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [newParticipant, setNewParticipant] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate available dates for the next 30 days
  const availableDates = useMemo(() => {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dayOfWeek = date.getDay();
      const dateStr = date.toISOString().split('T')[0];
      
      // Check if there are working hours for this day
      const hasOverride = dateOverrides[dateStr] !== undefined;
      const overrideHours = dateOverrides[dateStr];
      const regularHours = workingHours[dayOfWeek];
      
      if (hasOverride) {
        if (overrideHours !== null) {
          dates.push(date);
        }
      } else if (regularHours) {
        dates.push(date);
      }
    }
    
    return dates;
  }, [workingHours, dateOverrides]);

  // Generate time slots for selected date
  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];
    
    // TODO: Fetch existing bookings from Firestore and Google Calendar events
    // to properly check slot availability and prevent double bookings
    return generateAvailableTimes(
      selectedDate,
      selection.option.duration,
      [], // TODO: Replace with actual bookings from Firestore
      [], // TODO: Replace with actual calendar events from Google Calendar API
      workingHours,
      slotInterval,
      dateOverrides,
      minimumNoticeHours
    );
  }, [selectedDate, selection.option.duration, workingHours, slotInterval, dateOverrides, minimumNoticeHours]);

  const handleAddParticipant = () => {
    if (newParticipant.trim() && participants.length < MAX_PARTICIPANTS) {
      setParticipants([...participants, newParticipant.trim()]);
      setNewParticipant('');
    }
  };

  const handleRemoveParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime || !name || !email || !phone) {
      showToast('Per favore compila tutti i campi obbligatori', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);

      const booking: Booking = {
        sportId: selection.sport.id,
        lessonTypeId: selection.lessonType.id,
        duration: selection.option.duration,
        location: selection.location,
        startTime,
        name,
        email,
        phone,
        participants,
      };

      onBookingConfirmed(booking);
    } catch (error: any) {
      console.error('Error submitting booking:', error);
      showToast(error.message || 'Errore durante la prenotazione. Riprova.', 'error');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 sm:p-8">
      <button
        onClick={onBack}
        className="flex items-center text-primary hover:text-primary-dark mb-6 transition-colors"
      >
        <BackArrowIcon className="w-5 h-5 mr-2" />
        Indietro
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-neutral-800 mb-2">Prenota la tua lezione</h2>
        <div className="bg-neutral-100 border border-neutral-200 rounded-lg p-4">
          <h3 className="font-semibold text-neutral-800">{selection.lessonType.name}</h3>
          <p className="text-sm text-neutral-400 mt-1">{selection.sport.name}</p>
          <p className="text-sm text-neutral-400">{selection.option.duration} minuti</p>
          <p className="text-sm text-neutral-400">{selection.location.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date Selection */}
        <div>
          <label className="block text-sm font-semibold text-neutral-800 mb-2">
            <CalendarIcon className="w-5 h-5 inline mr-2" />
            Seleziona una data
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {availableDates.map((date) => {
              const isSelected = selectedDate?.toDateString() === date.toDateString();
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => {
                    setSelectedDate(date);
                    setSelectedTime(null);
                  }}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    isSelected
                      ? 'border-primary bg-primary text-white'
                      : 'border-neutral-200 bg-white text-neutral-800 hover:border-primary'
                  }`}
                >
                  <div className="text-xs font-semibold">
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

        {/* Time Selection */}
        {selectedDate && (
          <div>
            <label className="block text-sm font-semibold text-neutral-800 mb-2">
              <ClockIcon className="w-5 h-5 inline mr-2" />
              Seleziona un orario
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {timeSlots.map((slot) => {
                const isSelected = selectedTime === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      isSelected
                        ? 'border-primary bg-primary text-white'
                        : 'border-neutral-200 bg-white text-neutral-800 hover:border-primary'
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
            {timeSlots.length === 0 && (
              <p className="text-sm text-neutral-400 mt-2">
                Nessun orario disponibile per questa data.
              </p>
            )}
          </div>
        )}

        {/* Contact Information */}
        {selectedTime && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-neutral-800">Informazioni di contatto</h3>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                <UserIcon className="w-4 h-4 inline mr-2" />
                Nome completo *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Il tuo nome"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                <EmailIcon className="w-4 h-4 inline mr-2" />
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="tua@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                <PhoneIcon className="w-4 h-4 inline mr-2" />
                Telefono *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-3 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="+39 123 456 7890"
                required
              />
            </div>

            {/* Additional Participants */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Altri partecipanti (opzionale)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newParticipant}
                  onChange={(e) => setNewParticipant(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddParticipant();
                    }
                  }}
                  className="flex-1 p-3 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Nome partecipante"
                />
                <button
                  type="button"
                  onClick={handleAddParticipant}
                  className="px-4 py-3 bg-neutral-100 border border-neutral-200 rounded-lg hover:bg-neutral-200 transition-colors"
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
              </div>
              {participants.length > 0 && (
                <div className="space-y-2">
                  {participants.map((participant, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-neutral-50 rounded-lg border border-neutral-200"
                    >
                      <span className="text-sm text-neutral-800">{participant}</span>
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-dark transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? 'Elaborazione...' : 'Conferma Prenotazione'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default BookingPage;
