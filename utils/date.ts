import type { Booking, WorkingHours, DateOverrides } from '../types';

export interface CalendarEvent {
    startTime: Date;
    endTime: Date;
}

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
  calendarEvents: CalendarEvent[],
  workingHoursConfig: WorkingHours,
  slotInterval: number,
  dateOverrides: DateOverrides
): string[] => {
  const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const override = dateOverrides[dateKey];
  
  let workingHours: { start: number; end: number } | null;

  if (override !== undefined) {
    // An override exists for this date. It can be custom hours or null (unavailable).
    workingHours = override;
  } else {
    // No override, fall back to the weekly schedule.
    const dayOfWeek = date.getDay();
    workingHours = workingHoursConfig[dayOfWeek];
  }

  if (!workingHours) {
    return []; // Not a working day or explicitly set to unavailable
  }

  const { start, end } = workingHours;
  const times: string[] = [];

  // Combine bookings from Firestore and events from Google Calendar into a single list of busy slots
  const allBusySlots = [
    ...existingBookings.map(b => ({
      start: b.startTime.getHours() * 60 + b.startTime.getMinutes(),
      end: b.startTime.getHours() * 60 + b.startTime.getMinutes() + b.duration
    })),
    ...calendarEvents.map(e => ({
      start: e.startTime.getHours() * 60 + e.startTime.getMinutes(),
      end: e.endTime.getHours() * 60 + e.endTime.getMinutes()
    }))
  ];
  
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

    // Check for conflicts with all busy slots
    const isConflict = allBusySlots.some(busySlot => {
      // Check for overlap: (StartA < EndB) and (EndA > StartB)
      return slotStart < busySlot.end && slotEnd > busySlot.start;
    });

    if (!isConflict) {
      const hours = Math.floor(slotStart / 60).toString().padStart(2, '0');
      const minutes = (slotStart % 60).toString().padStart(2, '0');
      times.push(`${hours}:${minutes}`);
    }
  }

  return times;
};