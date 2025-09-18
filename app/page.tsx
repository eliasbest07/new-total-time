"use client";

import Pizarra, { PizarraRef } from "@/application/pizarra/pizarra";
import { useRef } from "react";
import Perfil from "./demo/components/Perfil";
import RelojActual from "./demo/components/RelojActual";


export default function Home() {

  const pizarraRef = useRef<PizarraRef>(null);
  
  return (
    //div de marco 
      <div
      className="relative overflow-hidden flex flex-col"
      style={{ height: 'calc(100vh - 1rem)', padding: '0.5rem' }}>

      <div className="absolute inset-0 z-30">
        <Pizarra ref={pizarraRef} />
      </div>
      
{/* estos dos componentes abajo estan dentro de demo, tiene que estar afuera para ser usados en cualquier parte */}
      <div className="mb-8 px-2 z-50 pointer-events-auto w-fit">
        <Perfil
          nombre="Elias Montilla"
          empresa="Total Time Solutions"
          tipoUsuario="manager"
          saludPorcentaje={85}
          fotoUrl="/total-time_logo.png"
        />
      </div>
 
      <div className="pointer-events-auto " style={{ position: 'absolute', top: '0.5rem', left: '9rem', zIndex:40 }}>
        <RelojActual /> 
      </div>

{/* este componente salas se debe crear */}
      <div className="flex bg-white/20 z-30 backdrop-blur-sm rounded-full p-2 gap-1 absolute left-1/2 transform -translate-x-1/2">
        <button className="bg-green-200 text-gray-800 px-6 py-2 rounded-full font-medium">
          Avances <span className="bg-gray-600 px-1.5 py-1 rounded-full text-sm ml-1 text-white">2</span>
        </button>
        <button className="bg-gray-200 text-gray-800 px-6 py-2 rounded-full font-medium">Reglas</button>
        <button className="bg-gray-200 text-gray-800 px-6 py-2 rounded-full font-medium">Reportes</button>
      </div>


    </div>
  );
}
