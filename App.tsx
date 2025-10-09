import React, { useState } from 'react';
import type { LessonSelection, Booking } from './types';
import EventTypeSelection from './components/EventTypeSelection';
import BookingPage from './components/BookingPage';
import ConfirmationPage from './components/ConfirmationPage';
import AdminPanel from './components/AdminPanel';
import LoginModal from './components/LoginModal';
import { CogIcon } from './components/icons';

import { useSports } from './hooks/useSports';
import { useWorkingHours } from './hooks/useWorkingHours';
import { useConsultant } from './hooks/useConsultant';
import { useBookings } from './hooks/useBookings';

const defaultConsultant = {
  name: '',
  title: '',
  avatarUrl: '',
  welcomeMessage: ''
};

const App: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const { sports } = useSports();
  const { workingHours, updateWorkingHours } = useWorkingHours();
  const { consultant, updateConsultant } = useConsultant();
  const { bookings, addBooking } = useBookings();

  const [slotInterval, setSlotInterval] = useState<number>(15);
  const [currentView, setCurrentView] = useState('selection');
  const [selection, setSelection] = useState<LessonSelection | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const handleLoginSuccess = () => {
    setIsAdmin(true);
    setIsLoginModalOpen(false);
  };

  const handleLogout = () => setIsAdmin(false);

  const handleSelectionComplete = (selectedLesson: LessonSelection) => {
    setSelection(selectedLesson);
    setCurrentView('booking');
  };

  const handleBookingConfirmed = async (booking: Booking) => {
    await addBooking(booking);
    setConfirmedBooking(booking);
    setCurrentView('confirmation');
  };

  const handleBackToSelection = () => {
    setSelection(null);
    setCurrentView('selection');
  };

  const handleBookAnother = () => {
    setSelection(null);
    setConfirmedBooking(null);
    setCurrentView('selection');
  };

  const renderUserContent = () => {
    switch (currentView) {
      case 'confirmation':
        return (
          <ConfirmationPage
            booking={confirmedBooking!}
            selection={selection!}
            consultant={consultant ?? defaultConsultant}
            onBookAnother={handleBookAnother}
          />
        );
      case 'booking':
        return (
          <BookingPage
            selection={selection!}
            onBookingConfirmed={handleBookingConfirmed}
            onBack={handleBackToSelection}
            workingHours={workingHours}
            slotInterval={slotInterval}
            consultant={consultant ?? defaultConsultant}
            bookings={bookings}
          />
        );
      case 'selection':
      default:
        return (
          <EventTypeSelection
            sports={sports}
            onSelectionComplete={handleSelectionComplete}
            consultant={consultant ?? defaultConsultant}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-4xl relative">
        {!isAdmin && (
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="absolute top-2 right-2 p-2 text-gray-500 hover:text-primary transition-colors z-10"
            aria-label="Accesso Amministratore"
          >
            <CogIcon className="w-6 h-6" />
          </button>
        )}
      </div>
      <main className="w-full max-w-4xl bg-white shadow-2xl rounded-lg overflow-hidden my-4">
        {isAdmin ? (
          <AdminPanel
            sports={sports}
            workingHours={workingHours}
            slotInterval={slotInterval}
            setSlotInterval={setSlotInterval}
            consultant={consultant ?? defaultConsultant}
            updateWorkingHours={updateWorkingHours}
            updateConsultant={updateConsultant}
            onLogout={handleLogout}
          />
        ) : (
          renderUserContent()
        )}
      </main>
      {isLoginModalOpen && (
        <LoginModal
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
    </div>
  );
};

export default App;