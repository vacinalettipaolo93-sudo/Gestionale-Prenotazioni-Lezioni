import type { Sport, ConsultantInfo, WorkingHours, DateOverrides } from './types';

export const INITIAL_SLOT_INTERVAL = 30; // Default to 30 minutes

export const INITIAL_CONSULTANT_INFO: ConsultantInfo = {
  name: 'Paolo V.',
  title: 'Istruttore Certificato',
  avatarUrl: 'https://i.pravatar.cc/150?u=paolo',
  welcomeMessage: 'Benvenuto nel sistema di prenotazione. Seleziona lo sport e la lezione che preferisci per iniziare.',
  email: 'paolo.v@example.com',
};

export const INITIAL_SPORTS_DATA: Sport[] = [
  {
    id: 'padel',
    name: 'Padel',
    color: '#3498db',
    lessonTypes: [
      {
        id: 'padel-single',
        name: 'Lezione Singola',
        description: 'Lezione individuale per migliorare la tecnica.',
        options: [{ id: 'padel-single-60', duration: 60 }],
        locations: [
          { id: 'loc1', name: 'Centro Sportivo A', address: 'Via Roma 1, Milano' },
          { id: 'loc2', name: 'Club Padel B', address: 'Via Garibaldi 10, Milano' },
        ],
      },
      {
        id: 'padel-group',
        name: 'Lezione di Gruppo',
        description: 'Lezione per 2-4 persone, per imparare giocando.',
        options: [
          { id: 'padel-group-60', duration: 60 },
          { id: 'padel-group-90', duration: 90 },
        ],
        locations: [
          { id: 'loc1', name: 'Centro Sportivo A', address: 'Via Roma 1, Milano' },
        ],
      },
    ],
  },
  {
    id: 'tennis',
    name: 'Tennis',
    color: '#e74c3c',
    lessonTypes: [
      {
        id: 'tennis-private',
        name: 'Lezione Privata',
        description: 'Migliora il tuo dritto e rovescio con un istruttore dedicato.',
        options: [{ id: 'tennis-private-60', duration: 60 }],
        locations: [
          { id: 'loc3', name: 'Tennis Club C', address: 'Viale Italia 20, Milano' },
        ],
      },
    ],
  },
];

export const INITIAL_WORKING_HOURS: WorkingHours = {
  0: null, // Sunday
  1: { start: 9 * 60, end: 18 * 60 }, // Monday 9:00 - 18:00
  2: { start: 9 * 60, end: 18 * 60 }, // Tuesday 9:00 - 18:00
  3: { start: 9 * 60, end: 18 * 60 }, // Wednesday 9:00 - 18:00
  4: { start: 9 * 60, end: 18 * 60 }, // Thursday 9:00 - 18:00
  5: { start: 9 * 60, end: 18 * 60 }, // Friday 9:00 - 18:00
  6: { start: 10 * 60, end: 13 * 60 }, // Saturday 10:00 - 13:00
};

export const INITIAL_DATE_OVERRIDES: DateOverrides = {
  // Example: '2024-12-25': null, // Unavailable on Christmas
};
