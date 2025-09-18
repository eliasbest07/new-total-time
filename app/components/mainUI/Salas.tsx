"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Sala {
  id: string;
  nombre: string;
  activa?: boolean;
}

interface SalasProps {
  salas?: Sala[];
}

const salasDefault: Sala[] = [
  { id: "1", nombre: "Sala Principal", activa: true },
  { id: "2", nombre: "Desarrollo" },
  { id: "3", nombre: "Reuniones" },
  { id: "4", nombre: "Marketing" },
  { id: "5", nombre: "Finanzas" },
];

export default function Salas({ salas = salasDefault }: SalasProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const maxVisible = 3;
  
  const canScrollLeft = currentIndex > 0;
  const canScrollRight = currentIndex + maxVisible < salas.length;
  
  const visibleSalas = salas.slice(currentIndex, currentIndex + maxVisible);
  
  const scrollLeft = () => {
    if (canScrollLeft) {
      setCurrentIndex(currentIndex - 1);
    }
  };
  
  const scrollRight = () => {
    if (canScrollRight) {
      setCurrentIndex(currentIndex + 1);
    }
  };
  
  return (
    <div className="flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2 z-30">
      {canScrollLeft && (
        <button
          onClick={scrollLeft}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-white/30 hover:bg-white/40 transition-all duration-200 backdrop-blur-sm"
        >
          <ChevronLeft className="w-4 h-4 text-gray-700" />
        </button>
      )}
      
      <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 overflow-hidden w-[340px]">
        <div 
          className="flex gap-1 transition-transform duration-500 ease-in-out"
          style={{ 
            transform: `translateX(-${currentIndex * 120}px)`,
            width: `${salas.length * 120}px`
          }}
        >
          {salas.map((sala, index) => (
            <button
              key={sala.id}
              className={`px-3 py-2 rounded-full font-medium transition-all duration-200 whitespace-nowrap min-w-[12px] max-w-[112px] overflow-hidden text-ellipsis ${
                sala.activa
                  ? "bg-green-200 text-gray-800"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              {sala.nombre}
            </button>
          ))}
          <div className="w-2"></div>
        </div>
      </div>
      
      {canScrollRight && (
        <button
          onClick={scrollRight}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-white/30 hover:bg-white/40 transition-all duration-200 backdrop-blur-sm"
        >
          <ChevronRight className="w-4 h-4 text-gray-700" />
        </button>
      )}
    </div>
  );
}