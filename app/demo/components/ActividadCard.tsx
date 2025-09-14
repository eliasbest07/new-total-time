import React, { useState, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

export default function ActividadCard() {
  const [timeInSeconds, setTimeInSeconds] = useState(22 * 60 + 59); // 22:59 inicial
  const [isRunning, setIsRunning] = useState(false);
  const [isActive, setIsActive] = useState(true); // Para el indicador verde

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timeInSeconds > 0) {
      interval = setInterval(() => {
        setTimeInSeconds(seconds => seconds - 1);
      }, 1000);
    } else if (timeInSeconds === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(interval!);
  }, [isRunning, timeInSeconds]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setTimeInSeconds(22 * 60 + 59);
    setIsRunning(false);
  };

  return (
    <div className="bg-slate-600 rounded-xl p-1 w-19 h-19 flex flex-col justify-between items-start shadow-lg relative">
      {/* Franja superior */}
      <div className="absolute top-0 left-0 right-0 h-5 bg-slate-700 rounded-t-xl"></div>
      
      {/* Indicador de estado */}
      <div className="flex justify-start w-full relative z-10">
        <div 
          className={`w-3 h-3 rounded-full transition-colors duration-300 ${
            isActive ? 'bg-green-400' : 'bg-gray-400'
          }`}
        />
      </div>

      {/* Tiempo */}
      <div className="flex-1 flex items-center justify-center w-full">
        <div 
          className="text-white text-base font-light tracking-wide cursor-pointer select-none"
          onClick={resetTimer}
          title="Click para resetear"
        >
          {formatTime(timeInSeconds)}
        </div>
      </div>

      {/* Botón de play/pause */}
      <div className="flex justify-end w-full">
        <button
          onClick={handlePlayPause}
          className="text-white hover:text-gray-300 transition-colors duration-200 p-1 hover:bg-slate-500 rounded-lg"
          aria-label={isRunning ? "Pausar timer" : "Iniciar timer"}
        >
          {isRunning ? (
            <Pause size={12} fill="currentColor" />
          ) : (
            <Play size={12} fill="currentColor" className="ml-0.5" />
          )}
        </button>
      </div>
    </div>
  );
}