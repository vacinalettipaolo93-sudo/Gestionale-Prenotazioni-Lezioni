import React, { useState, useEffect } from 'react';
import EventTypeSelection from './components/EventTypeSelection';
import BookingPage from './components/BookingPage';
import ConfirmationPage from './components/ConfirmationPage';
import AdminPanel from './components/AdminPanel';
import LoginModal from './components/LoginModal';
import { CogIcon } from './components/icons';
import { db } from './firebaseConfig';

import type { LessonSelection, Booking, Sport, ConsultantInfo, WorkingHours, DateOverrides } from './types';
import { 
    INITIAL_SPORTS_DATA,
    INITIAL_CONSULTANT_INFO,
    INITIAL_WORKING_HOURS,
    INITIAL_DATE_OVERRIDES,
    INITIAL_SLOT_INTERVAL
} from './constants';

type Page = 'selection' | 'booking' | 'confirmation' | 'admin';

const App: React.FC = () => {
    const [page, setPage] = useState<Page>('selection');
    const [selection, setSelection] = useState<LessonSelection | null>(null);
    const [booking, setBooking] = useState<Booking | null>(null);
    
    // Admin state
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);

    // Data state - fetched from DB, with local fallbacks
    const [consultantInfo, setConsultantInfo] = useState<ConsultantInfo>(INITIAL_CONSULTANT_INFO);
    const [sports, setSports] = useState<Sport[]>(INITIAL_SPORTS_DATA);
    const [workingHours, setWorkingHours] = useState<WorkingHours>(INITIAL_WORKING_HOURS);
    const [dateOverrides, setDateOverrides] = useState<DateOverrides>(INITIAL_DATE_OVERRIDES);
    const [slotInterval, setSlotInterval] = useState<number>(INITIAL_SLOT_INTERVAL);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const configDoc = await db.collection('config').doc('master').get();
                if (configDoc.exists) {
                    const data = configDoc.data();
                    if (data) {
                        setConsultantInfo(data.consultantInfo || INITIAL_CONSULTANT_INFO);
                        setSports(data.sports || INITIAL_SPORTS_DATA);
                        setWorkingHours(data.workingHours || INITIAL_WORKING_HOURS);
                        setDateOverrides(data.dateOverrides || INITIAL_DATE_OVERRIDES);
                        setSlotInterval(data.slotInterval || INITIAL_SLOT_INTERVAL);
                    }
                }
            } catch (error) {
                console.error("Error fetching config from Firestore:", error);
                // Fallback to initial constants if fetch fails
            }
        };

        fetchConfig();
    }, []);


    const handleSelectionComplete = (selected: LessonSelection) => {
        setSelection(selected);
        setPage('booking');
    };

    const handleBookingComplete = (bookingDetails: Booking) => {
        setBooking(bookingDetails);
        setPage('confirmation');
    };
    
    const handleGoBack = () => {
        setSelection(null);
        setPage('selection');
    }

    const handleBookAnother = () => {
        setSelection(null);
        setBooking(null);
        setPage('selection');
    };
    
    const handleAdminClick = () => {
        if (isLoggedIn) {
            setShowAdminPanel(true);
        } else {
            setShowLoginModal(true);
        }
    };

    const handleLoginSuccess = () => {
        setIsLoggedIn(true);
        setShowLoginModal(false);
        setShowAdminPanel(true);
    };

    const renderPage = () => {
        if (showAdminPanel && isLoggedIn) {
            return <AdminPanel 
                onClose={() => setShowAdminPanel(false)}
                initialConsultantInfo={consultantInfo}
                initialSports={sports}
                initialWorkingHours={workingHours}
                initialDateOverrides={dateOverrides}
                initialSlotInterval={slotInterval}
            />;
        }
        
        switch (page) {
            case 'booking':
                if (!selection) return null; // Should not happen
                return <BookingPage 
                    selection={selection} 
                    onBookingComplete={handleBookingComplete} 
                    onBack={handleGoBack}
                    workingHours={workingHours}
                    slotInterval={slotInterval}
                    dateOverrides={dateOverrides}
                />;
            case 'confirmation':
                if (!booking || !selection) return null; // Should not happen
                return <ConfirmationPage 
                    booking={booking} 
                    selection={selection}
                    consultant={consultantInfo}
                    onBookAnother={handleBookAnother} 
                />;
            case 'selection':
            default:
                return <EventTypeSelection 
                    sports={sports} 
                    onSelectionComplete={handleSelectionComplete}
                    consultant={consultantInfo}
                />;
        }
    };

    return (
        <div className="bg-gray-100 min-h-screen font-sans">
            <div className="container mx-auto p-4 max-w-4xl">
                <main className="bg-white shadow-lg rounded-lg overflow-hidden">
                    {renderPage()}
                </main>
            </div>
            <button
                onClick={handleAdminClick}
                className="fixed bottom-4 right-4 bg-gray-700 text-white p-3 rounded-full shadow-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
                aria-label="Admin Panel"
            >
                <CogIcon className="w-6 h-6" />
            </button>
            {showLoginModal && (
                <LoginModal 
                    onClose={() => setShowLoginModal(false)} 
                    onLoginSuccess={handleLoginSuccess} 
                />
            )}
        </div>
    );
};

export default App;
