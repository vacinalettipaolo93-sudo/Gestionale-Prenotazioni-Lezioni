import { useEffect, useState } from "react";
import { db } from "../utils/firebase";
import { collection, onSnapshot, addDoc } from "firebase/firestore";
import type { Booking } from "../types";

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "bookings"), (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Booking));
    });
    return unsubscribe;
  }, []);

  async function addBooking(booking: Booking) {
    await addDoc(collection(db, "bookings"), booking);
  }

  return { bookings, addBooking };
}