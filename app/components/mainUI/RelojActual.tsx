'use client';

import { useState, useEffect } from 'react';

const RelojActual = () => {
  const [time, setTime] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Marcar que estamos en el cliente
    setIsClient(true);
    
    // Establecer la hora inicial
    setTime(new Date());

    const timer = setInterval(() => {
      setTime(new Date());
    }, 60000); // Actualiza cada minuto

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const formatDate = (date: Date) => {
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 
                   'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    return `${day} ${month}`;
  };

  // Durante el servidor y hasta que se hidrate, mostrar placeholder
  if (!isClient || !time) {
    return (
      <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 min-w-[120px]">
        <div className="text-white text-xl font-medium">--:-- --</div>
        <div className="text-white text-sm">-- ---</div>
      </div>
    );
  }

  return (
    <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 min-w-[120px]">
      <div className="text-white text-xl font-medium">{formatTime(time)}</div>
      <div className="text-white text-sm">{formatDate(time)}</div>
    </div>
  );
};

export default RelojActual;