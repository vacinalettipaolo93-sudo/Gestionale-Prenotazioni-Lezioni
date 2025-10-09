import React, { useState, useMemo, useEffect } from 'react';
import type { LessonSelection, Booking, WorkingHours, ConsultantInfo } from '../types';
import { EXISTING_BOOKINGS } from '../constants';
import { generateAvailableTimes, getDaysInMonth, getMonthName, getYear } from '../utils/date';
import { ClockIcon, CalendarIcon, BackArrowIcon, UserIcon, EmailIcon, LocationMarkerIcon } from './icons';

interface BookingPageProps {
  selection: LessonSelection;
  onBookingConfirmed: (booking: Booking) => void;
  onBack: () => void;
  workingHours: WorkingHours;
  slotInterval: number;
  consultant: ConsultantInfo;
}

const BookingPage: React.FC<BookingPageProps> = ({ selection, onBookingConfirmed, onBack, workingHours, slotInterval, consultant }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const daysInMonth = useMemo(() => getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth()), [currentDate]);
  const monthName = getMonthName(currentDate);
  const year = getYear(currentDate);

  useEffect(() => {
    if (selectedDate) {
      setIsLoading(true);
      // Simulate fetching availability
      setTimeout(() => {
        const times = generateAvailableTimes(selectedDate, selection.option.duration, EXISTING_BOOKINGS, workingHours, slotInterval);
        setAvailableTimes(times);
        setIsLoading(false);
      }, 300);
    } else {
      setAvailableTimes([]);
    }
    setSelectedTime(null);
  }, [selectedDate, selection.option.duration, workingHours, slotInterval]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !selectedTime || !selectedDate) return;
    
    setIsSubmitting(true);
    setTimeout(() => {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const bookingTime = new Date(selectedDate);
      bookingTime.setHours(hours, minutes);

      const newBooking: Booking = {
        sportId: selection.sport.id,
        lessonTypeId: selection.lessonType.id,
        duration: selection.option.duration,
        location: selection.location,
        startTime: bookingTime,
        name,
        email,
      };
      onBookingConfirmed(newBooking);
      setIsSubmitting(false);
    }, 1000);
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
            <span>{`${selectedTime}, ${selectedDate.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}</span>
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
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
                <div className="relative">
                  <UserIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
                </div>
              </div>
              <div className="mb-6">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <EmailIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-white font-bold py-3 px-4 rounded-md hover:bg-primary-dark transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>}
                {isSubmitting ? 'Conferma in corso...' : 'Conferma Prenotazione'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingPage;