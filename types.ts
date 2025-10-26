export interface Location {
  id: string;
  name: string;
  address: string;
}

export interface LessonOption {
  id: string;
  duration: number;
}

export interface LessonType {
  id: string;
  name: string;
  description: string;
  options: LessonOption[];
  locations: Location[];
}

export interface Sport {
  id: string;
  name: string;
  color: string;
  icon: string;
  lessonTypes: LessonType[];
}

export interface ConsultantInfo {
  name: string;
  title: string;
  avatarUrl: string;
  welcomeMessage: string;
}

export interface LessonSelection {
  sport: Sport;
  lessonType: LessonType;
  option: LessonOption;
  location: Location;
}

export interface Booking {
  id?: string;
  startTime: Date;
  duration: number;
  location: Location;
  lessonTypeId: string;
  name: string;
  email: string;
  phone: string;
  participants: string[];
}

// Key is the day of the week (0=Sun, 1=Mon, ...)
export interface WorkingHours {
  [key: number]: { start: number; end: number } | null;
}

// Key is date in 'YYYY-MM-DD' format
export interface DateOverrides {
    [key: string]: { start: number; end: number } | null;
}
