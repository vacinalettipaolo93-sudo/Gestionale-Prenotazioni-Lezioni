import type { Sport, Booking, ConsultantInfo, WorkingHours, Location } from './types';
import { BallIcon } from './components/icons';

export const INITIAL_CONSULTANT_INFO: ConsultantInfo = {
  name: 'Paolo Mariani',
  title: 'Maestro di Tennis & Padel',
  avatarUrl: 'https://picsum.photos/seed/teacher/200/200',
  welcomeMessage: 'Benvenuto nella mia pagina di prenotazione. Inizia selezionando lo sport che preferisci.',
};

const TENNIS_SALO: Location = {
    id: 'tennis-salo-canottieri',
    name: 'Tennis Salò Canottieri',
    address: 'Via Maria Montessori, 20, 25087 Salò BS'
};

const TENNIS_GAVARDO: Location = {
    id: 'tennis-club-gavardo',
    name: 'Tennis Club Gavardo',
    address: 'Via delle Polentine, 1, 25085 Gavardo BS'
};


export const INITIAL_SPORTS_DATA: Sport[] = [
  {
    id: 'tennis',
    name: 'Tennis',
    color: '#eab308', // yellow-500
    icon: BallIcon,
    lessonTypes: [
      {
        id: 'tennis-individuale',
        name: 'Lezione Individuale',
        description: 'Lezione one-to-one per migliorare la tecnica e la strategia.',
        options: [
          { duration: 60 },
          { duration: 90 },
        ],
        locations: [TENNIS_SALO, TENNIS_GAVARDO],
      },
      {
        id: 'tennis-gruppo',
        name: 'Lezione di Gruppo (Max 4 persone)',
        description: 'Allenamento di gruppo per esercitarsi in situazioni di gioco reali.',
        options: [
          { duration: 60 },
        ],
        locations: [TENNIS_GAVARDO],
      },
    ],
  },
  {
    id: 'padel',
    name: 'Padel',
    color: '#38bdf8', // sky-400
    icon: BallIcon,
    lessonTypes: [
        {
            id: 'padel-individuale',
            name: 'Lezione Individuale Padel',
            description: 'Migliora la tecnica del padel con un istruttore dedicato.',
            options: [
              { duration: 60 },
            ],
            locations: [TENNIS_SALO],
        },
        {
            id: 'padel-coppia',
            name: 'Lezione di Coppia Padel',
            description: 'Allenati con un partner per affinare la strategia di gioco.',
            options: [
              { duration: 90 },
            ],
            locations: [TENNIS_SALO],
        }
    ]
  }
];

// 0 = Sunday, 1 = Monday, ..., 6 = Saturday
// Hours are in minutes from midnight (e.g., 9:00 = 540)
export const INITIAL_WORKING_HOURS: WorkingHours = {
  0: null, // Sunday
  1: { start: 9 * 60, end: 19 * 60 }, // Monday 9:00 - 19:00
  2: { start: 9 * 60, end: 19 * 60 }, // Tuesday 9:00 - 19:00
  3: { start: 9 * 60, end: 13 * 60 }, // Wednesday 9:00 - 13:00
  4: { start: 9 * 60, end: 19 * 60 }, // Thursday 9:00 - 19:00
  5: { start: 10 * 60, end: 18 * 60 }, // Friday 10:00 - 18:00
  6: { start: 9 * 60, end: 13 * 60 }, // Saturday 9:00 - 13:00
};

// Mocked existing bookings. In a real app, this would be fetched from Firebase.
const today = new Date();
const tomorrow = new Date();
tomorrow.setDate(today.getDate() + 1);

export const EXISTING_BOOKINGS: Booking[] = [
  {
    sportId: 'tennis',
    lessonTypeId: 'tennis-individuale',
    duration: 60,
    location: TENNIS_GAVARDO,
    startTime: new Date(new Date(tomorrow).setHours(10, 0, 0, 0)),
    name: 'Luca Bianchi',
    email: 'luca@example.com',
  },
  {
    sportId: 'padel',
    lessonTypeId: 'padel-coppia',
    duration: 90,
    location: TENNIS_SALO,
    startTime: new Date(new Date(tomorrow).setHours(14, 0, 0, 0)),
    name: 'Giulia Verdi',
    email: 'giulia@example.com',
  },
];