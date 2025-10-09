import React, { useState } from 'react';
import type { LessonSelection, Booking, Sport, WorkingHours, ConsultantInfo } from './types';
import EventTypeSelection from './components/EventTypeSelection';
import BookingPage from './components/BookingPage';
import ConfirmationPage from './components/ConfirmationPage';
import AdminPanel from './components/AdminPanel';
import LoginModal from './components/LoginModal';
import { INITIAL_CONSULTANT_INFO, INITIAL_SPORTS_DATA, INITIAL_WORKING_HOURS } from './constants';
import { CogIcon } from './components/icons';

const App: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [sportsData, setSportsData] = useState<Sport[]>(INITIAL_SPORTS_DATA);
  const [workingHours, setWorkingHours] = useState<WorkingHours>(INITIAL_WORKING_HOURS);
  const [slotInterval, setSlotInterval] = useState<number>(15);
  const [consultantInfo, setConsultantInfo] = useState<ConsultantInfo>(INITIAL_CONSULTANT_INFO);
  
  const [currentView, setCurrentView] = useState('selection'); // 'selection', 'booking', 'confirmation'
  const [selection, setSelection] = useState<LessonSelection | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const handleLoginSuccess = () => {
    setIsAdmin(true);
    setIsLoginModalOpen(false);
  };
  
  const handleLogout = () => {
      setIsAdmin(false);
  }

  const handleSelectionComplete = (selectedLesson: LessonSelection) => {
    setSelection(selectedLesson);
    setCurrentView('booking');
  };
  
  const handleBookingConfirmed = (booking: Booking) => {
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
            consultant={consultantInfo}
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
            consultant={consultantInfo}
          />
        );
      case 'selection':
      default:
        return (
          <EventTypeSelection 
            sports={sportsData}
            onSelectionComplete={handleSelectionComplete}
            consultant={consultantInfo}
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
        {isAdmin ? <AdminPanel 
                        sports={sportsData} 
                        setSports={setSportsData} 
                        onLogout={handleLogout}
                        workingHours={workingHours}
                        setWorkingHours={setWorkingHours}
                        slotInterval={slotInterval}
                        setSlotInterval={setSlotInterval}
                        consultant={consultantInfo}
                        setConsultant={setConsultantInfo}
                    /> 
                    : renderUserContent()}
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