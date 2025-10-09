import type { Booking, WorkingHours } from '../types';

export const getMonthName = (date: Date): string => {
  return date.toLocaleString('it-IT', { month: 'long' });
};

export const getYear = (date: Date): number => {
    return date.getFullYear();
};

export const getDaysInMonth = (year: number, month: number): (Date | null)[] => {
  const date = new Date(year, month, 1);
  const days: (Date | null)[] = [];
  
  // Add padding for days before the 1st of the month
  const firstDayOfWeek = date.getDay(); 
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }

  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

export const generateAvailableTimes = (
  date: Date, 
  duration: number, 
  existingBookings: Booking[],
  workingHoursConfig: WorkingHours,
  slotInterval: number
): string[] => {
  const dayOfWeek = date.getDay();
  const workingHours = workingHoursConfig[dayOfWeek];

  if (!workingHours) {
    return []; // Not a working day
  }

  const { start, end } = workingHours;
  const times: string[] = [];

  // Filter bookings for the selected date
  const todaysBookings = existingBookings.filter(booking => {
    return booking.startTime.getFullYear() === date.getFullYear() &&
           booking.startTime.getMonth() === date.getMonth() &&
           booking.startTime.getDate() === date.getDate();
  });

  // Check slots based on the provided interval
  const timeStep = slotInterval;

  for (let time = start; time < end; time += timeStep) {
    const slotStart = time;
    const slotEnd = time + duration;

    // The slot must end within working hours
    if (slotEnd > end) continue;

    const slotStartTime = new Date(date);
    slotStartTime.setHours(Math.floor(slotStart / 60), slotStart % 60, 0, 0);

    // Don't show slots in the past
    if (slotStartTime.getTime() < new Date().getTime()) continue;

    // Check for conflicts with existing bookings
    const isConflict = todaysBookings.some(booking => {
      const bookingStart = booking.startTime.getHours() * 60 + booking.startTime.getMinutes();
      const bookingEnd = bookingStart + booking.duration;
      
      // Check for overlap: (StartA < EndB) and (EndA > StartB)
      return slotStart < bookingEnd && slotEnd > bookingStart;
    });

    if (!isConflict) {
      const hours = Math.floor(slotStart / 60).toString().padStart(2, '0');
      const minutes = (slotStart % 60).toString().padStart(2, '0');
      times.push(`${hours}:${minutes}`);
    }
  }

  return times;
};
