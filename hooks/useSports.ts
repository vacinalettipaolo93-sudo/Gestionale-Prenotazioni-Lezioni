import { useEffect, useState } from "react";
import { db } from "../utils/firebase";
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import type { Sport, LessonType, LessonOption, Location } from "../types";

export function useSports() {
  const [sports, setSports] = useState<Sport[]>([]);
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "sports"), (snapshot) => {
      setSports(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Sport));
    });
    return unsubscribe;
  }, []);

  async function addSport(sport: Sport) {
    await addDoc(collection(db, "sports"), sport);
  }

  async function updateSport(sportId: string, data: Partial<Sport>) {
    await updateDoc(doc(db, "sports", sportId), data);
  }

  async function removeSport(sportId: string) {
    await deleteDoc(doc(db, "sports", sportId));
  }

  // GESTIONE LESSON TYPES
  async function addLessonType(sportId: string, lessonType: LessonType) {
    const sport = sports.find(s => s.id === sportId);
    if (sport) {
      const lessonTypes = sport.lessonTypes ? [...sport.lessonTypes, lessonType] : [lessonType];
      await updateSport(sportId, { lessonTypes });
    }
  }
  async function updateLessonType(sportId: string, lessonTypeId: string, data: Partial<LessonType>) {
    const sport = sports.find(s => s.id === sportId);
    if (sport) {
      const lessonTypes = sport.lessonTypes.map(lt => lt.id === lessonTypeId ? { ...lt, ...data } : lt);
      await updateSport(sportId, { lessonTypes });
    }
  }
  async function removeLessonType(sportId: string, lessonTypeId: string) {
    const sport = sports.find(s => s.id === sportId);
    if (sport) {
      const lessonTypes = sport.lessonTypes.filter(lt => lt.id !== lessonTypeId);
      await updateSport(sportId, { lessonTypes });
    }
  }

  // GESTIONE OPTIONS
  async function addOption(sportId: string, lessonTypeId: string, option: LessonOption) {
    const sport = sports.find(s => s.id === sportId);
    if (sport) {
      const lessonTypes = sport.lessonTypes.map(lt => {
        if (lt.id === lessonTypeId) {
          return { ...lt, options: [...lt.options, option] };
        }
        return lt;
      });
      await updateSport(sportId, { lessonTypes });
    }
  }
  async function removeOption(sportId: string, lessonTypeId: string, duration: number) {
    const sport = sports.find(s => s.id === sportId);
    if (sport) {
      const lessonTypes = sport.lessonTypes.map(lt => {
        if (lt.id === lessonTypeId) {
          return { ...lt, options: lt.options.filter(o => o.duration !== duration) };
        }
        return lt;
      });
      await updateSport(sportId, { lessonTypes });
    }
  }

  // GESTIONE LOCATIONS
  async function addLocation(sportId: string, lessonTypeId: string, location: Location) {
    const sport = sports.find(s => s.id === sportId);
    if (sport) {
      const lessonTypes = sport.lessonTypes.map(lt => {
        if (lt.id === lessonTypeId) {
          return { ...lt, locations: [...lt.locations, location] };
        }
        return lt;
      });
      await updateSport(sportId, { lessonTypes });
    }
  }
  async function removeLocation(sportId: string, lessonTypeId: string, locationId: string) {
    const sport = sports.find(s => s.id === sportId);
    if (sport) {
      const lessonTypes = sport.lessonTypes.map(lt => {
        if (lt.id === lessonTypeId) {
          return { ...lt, locations: lt.locations.filter(loc => loc.id !== locationId) };
        }
        return lt;
      });
      await updateSport(sportId, { lessonTypes });
    }
  }
  async function updateLocation(sportId: string, lessonTypeId: string, locationId: string, data: Partial<Location>) {
    const sport = sports.find(s => s.id === sportId);
    if (sport) {
      const lessonTypes = sport.lessonTypes.map(lt => {
        if (lt.id === lessonTypeId) {
          return {
            ...lt,
            locations: lt.locations.map(loc => loc.id === locationId ? { ...loc, ...data } : loc)
          };
        }
        return lt;
      });
      await updateSport(sportId, { lessonTypes });
    }
  }

  return {
    sports,
    addSport,
    updateSport,
    removeSport,
    addLessonType,
    updateLessonType,
    removeLessonType,
    addOption,
    removeOption,
    addLocation,
    removeLocation,
    updateLocation
  };
}