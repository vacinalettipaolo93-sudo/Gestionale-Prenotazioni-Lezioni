import { useEffect, useState } from "react";
import { db } from "../utils/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import type { ConsultantInfo } from "../types";

export function useConsultant() {
  const [consultant, setConsultant] = useState<ConsultantInfo | null>(null);

  useEffect(() => {
    const ref = doc(db, "consultant", "main");
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) setConsultant(snap.data() as ConsultantInfo);
    });
    return unsubscribe;
  }, []);

  async function updateConsultant(data: Partial<ConsultantInfo>) {
    const ref = doc(db, "consultant", "main");
    await setDoc(ref, { ...consultant, ...data });
  }

  return { consultant, updateConsultant };
}