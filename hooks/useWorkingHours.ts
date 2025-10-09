import { useEffect, useState } from "react";
import { db } from "../utils/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import type { WorkingHours } from "../types";

export function useWorkingHours() {
  const [workingHours, setWorkingHours] = useState<WorkingHours>({});
  useEffect(() => {
    const ref = doc(db, "workingHours", "main");
    const unsubscribe = onSnapshot(ref, (snap) => {
      if(snap.exists()) setWorkingHours(snap.data() as WorkingHours);
    });
    return unsubscribe;
  }, []);

  async function updateWorkingHours(newConfig: WorkingHours) {
    const ref = doc(db, "workingHours", "main");
    await setDoc(ref, newConfig);
  }

  return { workingHours, updateWorkingHours };
}