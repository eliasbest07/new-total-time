"use client";

import { useState } from 'react';
import Perfil from './components/Perfil';
import RelojActual from './components/RelojActual';
import Ventana from './components/Ventana';
import Accordion from './components/Accordion';
import AddResourceForm from './components/AddResourceForm';
import Pizarra from '@/application/pizarra/pizarra';
import { 
  FileText, 
  Image, 
  Video, 
  Download, 
  Link, 
  Code, 
  Archive, 
  FolderOpen 
} from 'lucide-react';
import { saveResource, type Resource, type NewResourceData } from './utils/resourceUtils';

export default function Dashboard() {
  const [ventanaAbierta, setVentanaAbierta] = useState(false);
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);
  
  // Lista de recursos inicial
  const [recursos, setRecursos] = useState<Resource[]>([
    { id: 1, name: 'Docs', icon: FileText, color: 'bg-blue-500', type: 'DOC' },
    { id: 2, name: 'Imágenes', icon: Image, color: 'bg-green-500', type: 'IMG' },
    { id: 3, name: 'Videos', icon: Video, color: 'bg-purple-500', type: 'MP4' },
    { id: 4, name: 'Archivos', icon: Download, color: 'bg-orange-500', type: 'ZIP' },
    { id: 5, name: 'Enlaces', icon: Link, color: 'bg-cyan-500', type: 'URL' },
    { id: 6, name: 'Código', icon: Code, color: 'bg-pink-500', type: 'JS' },
    { id: 7, name: 'PDFs', icon: FileText, color: 'bg-red-500', type: 'PDF' },
    { id: 8, name: 'Audio', icon: Video, color: 'bg-yellow-500', type: 'MP3' },
    { id: 9, name: 'Plantillas', icon: FolderOpen, color: 'bg-indigo-500', type: 'TPL' },
    { id: 10, name: 'Recursos', icon: Archive, color: 'bg-teal-600', type: 'RES' }
  ]);

  const handleAddResource = (): void => {
    setShowAddResourceModal(true);
  };

  const handleSaveResource = (newResourceData: NewResourceData): void => {
    const updatedResources = saveResource(newResourceData, recursos);
    setRecursos(updatedResources);
    setShowAddResourceModal(false);
  };

  const handleCloseAddResourceModal = (): void => {
    setShowAddResourceModal(false);
  };

  return (
    <div
      className="relative overflow-hidden flex flex-col"
      style={{ height: 'calc(100vh - 1rem)', padding: '0.5rem' }}
    >
      <div className="absolute inset-0 z-30">
        <Pizarra />
      </div>

      {/* Time cards positioned at bottom left */}
      <div className="w-80 z-50" style={{ position: 'absolute', bottom: '4rem', right: '1rem', zIndex :'30' }}>
        {/* Time info cards */}
        <div className="flex gap-3 mb-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 flex-1">
            <div className="text-white text-xl font-medium">2:12</div>
            <div className="text-white/70 text-sm">Tarea actual</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 flex-1">
            <div className="text-white text-xl font-medium">3:12</div>
            <div className="text-white/70 text-sm">Tiempo total hoy</div>
          </div>
        </div>

        {/* Capture area */}
        <div className="h-32 bg-green-500 rounded-2xl p-4 flex items-center justify-center text-white z-40">
          Capture
        </div>
      </div>

      
        {/* Header - Left section - Perfil */}
        <div className="mb-8 px-2 z-30 pointer-events-auto">
          <Perfil
            nombre="Elias Montilla"
            empresa="Total Time Solutions"
            tipoUsuario="manager"
            saludPorcentaje={85}
            fotoUrl="/total-time_logo.png"
          />
        </div>

        {/* Header - Left section - RelojActual */}
        <div className="mb-8 px-2 pointer-events-auto" style={{ position: 'absolute', top: '0.5rem', left: '9rem' }}>
          <RelojActual />
        </div>

            {/* Center - Room tabs */}
            <div className="flex bg-white/20 z-30 backdrop-blur-sm rounded-full p-2 gap-1 absolute left-1/2 transform -translate-x-1/2">
              <button onClick={() => setVentanaAbierta(true)} className="bg-green-200 text-gray-800 px-6 py-2 rounded-full font-medium">
                Avances <span className="bg-white px-2 py-1 rounded text-sm ml-1">2</span>
              </button>
              <button className="bg-gray-200 text-gray-800 px-6 py-2 rounded-full font-medium">Reglas</button>
              <button className="bg-gray-200 text-gray-800 px-6 py-2 rounded-full font-medium">Reportes</button>
            </div>

        {/* Main content area */}
        <div className="relative flex justify-between items-start px-2 flex-1">

        </div>

        {/* Activities positioned at fixed location */}
        <div className="pointer-events-auto" style={{ position: 'fixed', bottom: '14rem', left: '1rem', zIndex: 30 }}>
          <h2 className="text-gray-900 bg-white/80 backdrop-blur-sm px-2 py-2 rounded-lg text-xl mb-3 inline-block">
            Actividades
          </h2>
          <div
            className="w-16 h-16 bg-white/20 rounded-lg cursor-grab flex items-center justify-center text-xs text-white font-medium hover:bg-white/30 transition-colors"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', 'Actividades - Elemento arrastrado desde la interfaz');
            }}
          >
            drag me
          </div>
        </div>

        {/* Missions positioned at fixed location */}
        <div className="pointer-events-auto" style={{ position: 'fixed', bottom: '6rem', left: '1rem', zIndex: 30 }}>
          <h2 className="text-gray-900 bg-white/80 backdrop-blur-sm px-2 py-2 rounded-lg text-xl mb-3 inline-block">
            Misiones
          </h2>
          <div
            className="w-16 h-16 bg-white/20 rounded-lg cursor-grab flex items-center justify-center text-xs text-white font-medium hover:bg-white/30 transition-colors"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', 'Misiones - Elemento arrastrado desde la interfaz');
            }}
          >
            drag me
          </div>
        </div>

        {/* Accordion positioned at fixed location */}
        <div className="pointer-events-auto" style={{ position: 'fixed', top: '2rem', right: '1rem', zIndex: 40, width: '320px' }}>
          <h2 className="text-gray-900 bg-white/80 backdrop-blur-sm px-2 py-2 rounded-lg text-xl mb-3 inline-block">

          </h2>
          <Accordion recursos={recursos} onAddResource={handleAddResource} />
        </div>

        {/* Chart positioned at bottom left */}
        <div className="flex items-end gap-2 pointer-events-auto" style={{ position: 'fixed', bottom: '1rem', left: '1rem', zIndex: 30 }}>
          <div className="w-6 h-12 bg-white/30 rounded-sm"></div>
          <div className="w-6 h-8 bg-white/30 rounded-sm"></div>
          <div className="w-6 h-16 bg-white/30 rounded-sm"></div>
          <div className="w-6 h-10 bg-white/30 rounded-sm"></div>
          <div className="w-6 h-8 bg-white/30 rounded-sm"></div>
        </div>

        {/* Input centrado abajo */}
        <div className="flex justify-center pointer-events-auto" style={{ position: 'fixed', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', width: '100%', zIndex: 50 }}>
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-3 max-w-md w-full">
            <div className="w-8 h-8 bg-white/30 rounded"></div>
            <input
              type="text"
              placeholder="Escribe aquí"
              className="flex-1 bg-transparent text-white placeholder-white/70 outline-none"
            />
          </div>
        </div>
      


      {/* Ventana de prueba */}
      <Ventana
        isOpen={ventanaAbierta}
        onClose={() => setVentanaAbierta(false)}
        title="Ventana de Prueba"
        initialWidth={500}
        initialHeight={400}
      >
        <div className="text-black space-y-4">
          <h2 className="text-xl font-semibold">¡Funciona!</h2>
          <p className="text-black/80">
            Esta es una ventana modal que puedes arrastrar y redimensionar.
          </p>
          <div className="bg-white/10 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Controles:</h3>
            <ul className="text-sm text-black/70 space-y-1">
              <li>• Arrastra desde la barra de título</li>
              <li>• Redimensiona desde la esquina inferior derecha</li>
              <li>• Botón rojo: cerrar</li>
              <li>• Botón amarillo: minimizar</li>
              <li>• Botón verde: maximizar</li>
            </ul>
          </div>
        </div>
      </Ventana>

      {/* Modal para añadir recurso */}
      <Ventana
        isOpen={showAddResourceModal}
        onClose={handleCloseAddResourceModal}
        title="Añadir Nuevo Recurso"
        initialWidth={500}
        initialHeight={600}
        minWidth={450}
        minHeight={550}
        showOverlay={true}
      >
        <AddResourceForm
          onSave={handleSaveResource}
          onClose={handleCloseAddResourceModal}
        />
      </Ventana>
    </div>
  );
}