"use client";

import Pizarra, { PizarraRef } from "@/application/pizarra/pizarra";
import { useRef } from "react";

import Perfil from "@/app/components/mainUI/Perfil";
import RelojActual from "@/app/components/mainUI/RelojActual";
import Salas from "@/app/components/mainUI/Salas";

export default function MainScreen() {
  const pizarraRef = useRef<PizarraRef>(null);

  return (
    <div
      className="relative overflow-hidden flex flex-col"
      style={{ height: 'calc(100vh - 1rem)', padding: '0.5rem' }}>

      <div className="absolute inset-0 z-30">
        <Pizarra ref={pizarraRef} />
      </div>

      {/* estos dos componentes abajo estan dentro de demo, tiene que estar afuera para ser usados en cualquier parte */}
      <div className="mb-8 px-2 z-50 pointer-events-auto w-fit">
        <Perfil />
      </div>

      <div className="pointer-events-auto " style={{ position: 'absolute', top: '0.5rem', left: '9rem', zIndex: 40 }}>
        <RelojActual />
      </div>

      <Salas />
    </div>
  );
}