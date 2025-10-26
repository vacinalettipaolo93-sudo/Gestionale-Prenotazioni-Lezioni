import React from 'react';

export interface Location {
  id: string;
  name: string;
  address: string;
  slotInterval?: number; // Intervallo in minuti, opzionale per questa sede
}

export interface LessonOption {
  id: string;
  duration: number; // in minutes
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
  icon?: string;
  lessonTypes: LessonType[];
}

export interface Booking {
  sportId: string;
  lessonTypeId: string;
  duration: number;
  location: Location;
  startTime: Date;
  name: string;
  email: string;
  phone: string;
  participants: string[];
}

// Represents the user's final selection before navigating to the booking page
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
  [key: number]: { start: number; end: number } | null; // 0 for Sunday, 1 for Monday...
}

export interface DateOverrides {
  [date: string]: { start: number; end: number } | null; // Key is 'YYYY-MM-DD'
}

/**
 * Represents the structure of the main configuration document in Firestore.
 */
export interface AppConfig {
  sportsData: Sport[];
  consultantInfo: ConsultantInfo;
  workingHours: WorkingHours;
  dateOverrides: DateOverrides;
  slotInterval: number;
}