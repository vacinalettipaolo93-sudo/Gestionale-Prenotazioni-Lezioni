import React, { useState } from 'react';
import type { Sport, LessonType, LessonOption, Location, LessonSelection, ConsultantInfo } from '../types';

interface EventTypeSelectionProps {
  sports: Sport[];
  onSelectionComplete: (selection: LessonSelection) => void;
  consultant: ConsultantInfo;
  onSportChange?: (sportId: string | null) => void;
}

const EventTypeSelection: React.FC<EventTypeSelectionProps> = ({ sports, onSelectionComplete, consultant, onSportChange }) => {
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [selectedLessonType, setSelectedLessonType] = useState<LessonType | null>(null);
  const [selectedOption, setSelectedOption] = useState<LessonOption | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  
  const [step, setStep] = useState(1);

  const handleSportSelect = (sport: Sport) => {
    setSelectedSport(sport);
    onSportChange?.(sport.id);
    setStep(2);
  };

  const handleLessonTypeSelect = (lessonType: LessonType) => {
    setSelectedLessonType(lessonType);
    setStep(3);
  };

  const handleOptionSelect = (option: LessonOption) => {
    setSelectedOption(option);
    if (selectedLessonType?.locations.length === 1) {
      handleLocationSelect(selectedLessonType.locations[0]);
    } else {
      setStep(4);
    }
  };
  
  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    if(selectedSport && selectedLessonType && selectedOption) {
        onSelectionComplete({
            sport: selectedSport,
            lessonType: selectedLessonType,
            option: selectedOption,
            location: location,
        });
    }
  };

  const resetSelection = () => {
    setSelectedSport(null);
    setSelectedLessonType(null);
    setSelectedOption(null);
    setSelectedLocation(null);
    onSportChange?.(null);
    setStep(1);
  }

  const renderStep1 = () => (
    <div>
      <h2 className="text-xl font-bold text-center text-neutral-800 mb-6">Prenota la tua lezione</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sports.map(sport => (
          <button key={sport.id} onClick={() => handleSportSelect(sport)} className="p-6 rounded-lg text-left transition-all duration-300 transform hover:scale-105 hover:shadow-xl border text-white" style={{ backgroundColor: sport.color }}>
            <h3 className="text-lg font-bold">{sport.name}</h3>
          </button>
        ))}
      </div>
    </div>
  );
  
  const renderStep2 = () => (
    <div>
      <h2 className="text-xl font-bold text-center text-neutral-800 mb-6">Scegli il tipo di lezione per {selectedSport?.name}</h2>
      <div className="space-y-3">
        {selectedSport?.lessonTypes.map(lt => (
          <button key={lt.id} onClick={() => handleLessonTypeSelect(lt)} className="w-full p-4 rounded-lg text-left transition-colors duration-200 border border-neutral-200 hover:bg-neutral-100 hover:border-primary">
            <h3 className="text-md font-semibold text-neutral-800">{lt.name}</h3>
            <p className="text-sm text-neutral-400">{lt.description}</p>
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div>
      <h2 className="text-xl font-bold text-center text-neutral-800 mb-6">Scegli la durata per {selectedLessonType?.name}</h2>
       <div className="space-y-3">
        {selectedLessonType?.options.map(opt => (
          <button key={opt.id} onClick={() => handleOptionSelect(opt)} className="w-full p-4 rounded-lg text-left transition-colors duration-200 border border-neutral-200 hover:bg-neutral-100 hover:border-primary">
            <h3 className="text-md font-semibold text-neutral-800">{opt.duration} minuti</h3>
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div>
      <h2 className="text-xl font-bold text-center text-neutral-800 mb-6">Scegli la sede</h2>
       <div className="space-y-3">
        {selectedLessonType?.locations.map(loc => (
          <button key={loc.id} onClick={() => handleLocationSelect(loc)} className="w-full p-4 rounded-lg text-left transition-colors duration-200 border border-neutral-200 hover:bg-neutral-100 hover:border-primary">
            <h3 className="text-md font-semibold text-neutral-800">{loc.name}</h3>
            <p className="text-sm text-neutral-400">{loc.address}</p>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center mb-8">
        <img src={consultant.avatarUrl} alt={consultant.name} className="w-20 h-20 rounded-full mr-4 border-2 border-neutral-200" />
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">{consultant.name}</h1>
          <p className="text-neutral-400">{consultant.title}</p>
        </div>
      </div>
      <p className="text-center mb-8">{consultant.welcomeMessage}</p>
      
      {step > 1 && (
        <button onClick={resetSelection} className="text-sm text-primary hover:underline mb-4">Ricomincia</button>
      )}

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
    </div>
  );
};

export default EventTypeSelection;