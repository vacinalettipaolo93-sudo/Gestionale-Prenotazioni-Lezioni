import React, { useState, useMemo, useEffect } from 'react';
import type { LessonSelection, Booking, WorkingHours, ConsultantInfo } from '../types';
import { generateAvailableTimes, getDaysInMonth, getMonthName, getYear } from '../utils/date';
import { ClockIcon, CalendarIcon, BackArrowIcon, UserIcon, EmailIcon, LocationMarkerIcon } from './icons';

interface BookingPageProps {
  selection: LessonSelection;
  onBookingConfirmed: (booking: Booking) => void;
  onBack: () => void;
  workingHours: WorkingHours;
  slotInterval: number;
  consultant: ConsultantInfo;
  bookings: Booking[];
}

const BookingPage: React.FC<BookingPageProps> = ({ selection, onBookingConfirmed, onBack, workingHours, slotInterval, consultant, bookings }) => {
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
      setTimeout(() => {
        const times = generateAvailableTimes(selectedDate, selection.option.duration, bookings, workingHours, slotInterval);
        setAvailableTimes(times);
        setIsLoading(false);
      }, 300);
    } else {
      setAvailableTimes([]);
    }
    setSelectedTime(null);
  }, [selectedDate, selection.option.duration, workingHours, slotInterval, bookings]);

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
    // ... Qui mantieni la tua UI identica a prima!
  );
};

export default BookingPage;