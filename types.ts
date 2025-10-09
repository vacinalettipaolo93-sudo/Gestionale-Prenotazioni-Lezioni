export interface Location {
  id: string;
  name: string;
  address: string;
}

export interface LessonOption {
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
  icon?: React.FC<{ className?: string; style?: React.CSSProperties }>;
  lessonTypes: LessonType[];
}

export interface Booking {
  id?: string;
  sportId: string;
  lessonTypeId: string;
  duration: number;
  location: Location;
  startTime: Date;
  name: string;
  email: string;
}

export interface LessonSelection {
    sport: Sport;
    lessonType: LessonType;
    option: LessonOption;
    location: Location;
}

export interface ConsultantInfo {
  name: string;
  title: string;
  avatarUrl: string;
  welcomeMessage: string;
}

export interface WorkingHours {
  [key: number]: { start: number; end: number } | null;
}