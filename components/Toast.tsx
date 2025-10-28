import React, { useState, useEffect } from 'react';
import { XIcon, InformationCircleIcon, CheckIcon } from './icons';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      handleClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [message, type]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Attendi la fine dell'animazione di fade-out
  };

  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  const icon = type === 'success' 
    ? <CheckIcon className="w-6 h-6 mr-3 text-white" /> 
    : <InformationCircleIcon className="w-6 h-6 mr-3 text-white" />;

  return (
    <div
      className={`fixed top-5 right-5 z-[9999] flex items-center p-4 rounded-lg shadow-lg text-white transition-all duration-300 ${bgColor} ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}
      role="alert"
    >
      {icon}
      <p className="flex-grow">{message}</p>
      <button onClick={handleClose} className="ml-4 p-1 rounded-full hover:bg-black/20" aria-label="Chiudi">
        <XIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Toast;