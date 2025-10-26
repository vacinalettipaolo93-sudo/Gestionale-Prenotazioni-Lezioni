import React from 'react';
import { TennisRacketIcon, PadelRacketIcon } from './icons';

interface BackgroundIconProps {
  sport: string;
}

const BackgroundIcon: React.FC<BackgroundIconProps> = ({ sport }) => {
  // Non mostrare nulla se lo sport non è tennis o padel
  if (sport !== 'tennis' && sport !== 'padel') {
    return null;
  }

  const IconComponent = sport === 'tennis' ? TennisRacketIcon : PadelRacketIcon;
  
  return (
    <div className="fixed inset-0 z-0 flex items-center justify-center overflow-hidden pointer-events-none" aria-hidden="true">
      <IconComponent className="w-3/4 h-3/4 max-w-4xl max-h-4xl text-neutral-200 opacity-5" />
    </div>
  );
};

export default BackgroundIcon;