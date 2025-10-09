import React, { useState } from "react";
import { Sport, LessonType, LessonOption, Location, ConsultantInfo, LessonSelection } from "../types";
import { RightArrowIcon, BackArrowIcon } from "./icons";

interface EventTypeSelectionProps {
  sports: Sport[];
  onSelectionComplete: (selection: LessonSelection) => void;
  consultant?: ConsultantInfo;
}

const EventTypeSelection: React.FC<EventTypeSelectionProps> = ({
  sports,
  onSelectionComplete,
  consultant,
}) => {
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [selectedLessonType, setSelectedLessonType] = useState<LessonType | null>(null);
  const [selectedOption, setSelectedOption] = useState<LessonOption | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  const handleSportSelect = (sport: Sport) => {
    setSelectedSport(sport);
    setSelectedLessonType(null);
    setSelectedOption(null);
    setSelectedLocation(null);
  };

  const handleLessonTypeSelect = (lessonType: LessonType) => {
    setSelectedLessonType(lessonType);
    setSelectedOption(null);
    setSelectedLocation(null);
  };

  const handleOptionSelect = (option: LessonOption) => {
    setSelectedOption(option);
    setSelectedLocation(null);
  };

  const handleLocationSelect = (locationId: string) => {
    if (!selectedLessonType) return;
    const location = selectedLessonType.locations.find((loc) => loc.id === locationId) || null;
    setSelectedLocation(location);
  };

  const handleBack = () => {
    if (selectedLocation) {
      setSelectedLocation(null);
    } else if (selectedOption) {
      setSelectedOption(null);
    } else if (selectedLessonType) {
      setSelectedLessonType(null);
    } else if (selectedSport) {
      setSelectedSport(null);
    }
  };

  const renderHeader = () => {
    if (selectedLocation && selectedLessonType) {
      return selectedLessonType.name;
    }
    if (selectedLessonType) {
      return selectedLessonType.name;
    }
    if (selectedSport) {
      return selectedSport.name;
    }
    return "Seleziona uno sport";
  };

  const renderLessonOptions = () => {
    if (!selectedLessonType) return null;
    return (
      <div>
        <h3 className="mb-2 font-bold text-gray-700">Durata</h3>
        <div className="flex gap-2 mb-6">
          {selectedLessonType.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handleOptionSelect(opt)}
              className={`px-4 py-2 rounded-md border ${
                selectedOption === opt
                  ? "bg-primary text-white border-primary"
                  : "bg-gray-100 text-gray-800 border-gray-300"
              }`}
            >
              {opt.duration} min
            </button>
          ))}
        </div>
        <h3 className="mb-2 font-bold text-gray-700">Sede</h3>
        <select
          className="w-full p-2 border rounded-md mb-4"
          value={selectedLocation?.id || ""}
          onChange={(e) => handleLocationSelect(e.target.value)}
        >
          <option value="">Seleziona una sede</option>
          {selectedLessonType.locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
        <button
          onClick={() =>
            onSelectionComplete({
              sport: selectedSport!,
              lessonType: selectedLessonType,
              option: selectedOption!,
              location: selectedLocation!,
            })
          }
          disabled={!selectedLocation}
          className="w-full bg-primary text-white font-bold py-3 px-4 rounded-md hover:bg-primary-dark transition-colors disabled:bg-gray-400"
        >
          Avanti
        </button>
      </div>
    );
  };

  const renderContent = () => {
    if (selectedLessonType) {
      return renderLessonOptions();
    }
    if (selectedSport) {
      return selectedSport.lessonTypes.map((lt) => (
        <button
          key={lt.id}
          onClick={() => handleLessonTypeSelect(lt)}
          className="w-full flex items-center p-4 border-b hover:bg-gray-50 transition-colors duration-200 text-left"
        >
          <div className="flex-grow">
            <h3 className="text-lg font-semibold text-gray-800">{lt.name}</h3>
            <p className="text-gray-600 mt-1 text-sm">{lt.description}</p>
          </div>
          <RightArrowIcon className="w-6 h-6 text-gray-400" />
        </button>
      ));
    }
    return sports.map((sport) => {
      const Icon = sport.icon;
      return (
        <button
          key={sport.id}
          onClick={() => handleSportSelect(sport)}
          className="w-full flex items-center p-4 border-b hover:bg-gray-50 transition-colors duration-200 text-left"
        >
          {Icon ? (
            <Icon className="w-12 h-12 mr-4" style={{ color: sport.color }} />
          ) : (
            <div className="w-4 h-12 rounded-full mr-4" style={{ backgroundColor: sport.color }}></div>
          )}
          <div className="flex-grow">
            <h3 className="text-xl font-bold text-gray-800">{sport.name}</h3>
          </div>
          <RightArrowIcon className="w-6 h-6 text-gray-400" />
        </button>
      );
    });
  };

  return (
    <div className="flex flex-col md:flex-row">
      <div className="w-full md:w-1/3 bg-white p-6 border-r flex flex-col items-center text-center">
        <img
          src={consultant?.avatarUrl || "https://ui-avatars.com/api/?name=Avatar"}
          alt={consultant?.name || "Avatar"}
          className="w-24 h-24 rounded-full mb-4"
        />
        <h2 className="text-xl font-bold text-gray-800">{consultant?.name || " "}</h2>
        <p className="text-gray-600">{consultant?.title || " "}</p>
        <p className="text-sm text-gray-500 mt-4">{consultant?.welcomeMessage || ""}</p>
      </div>
      <div className="w-full md:w-2/3 bg-white">
        <div className="p-4 border-b flex items-center">
          {selectedSport && (
            <button onClick={handleBack} className="p-2 rounded-full hover:bg-gray-100 mr-2">
              <BackArrowIcon className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <h2 className="text-xl font-bold text-gray-800">{renderHeader()}</h2>
        </div>
        <div>{renderContent()}</div>
      </div>
    </div>
  );
};

export default EventTypeSelection;