"use client";

import { useState, useRef } from 'react';
import Perfil from './components/Perfil';
import RelojActual from './components/RelojActual';
import Ventana from './components/Ventana';
import Accordion from './components/Accordion';
import AddResourceForm from './components/AddResourceForm';
import Pizarra, { PizarraRef } from '@/application/pizarra/pizarra';
import MisionCard from './components/MisionCard';
import { 
  FileText, 
  Image, 
  Video, 
  Download, 
  Link, 
  Code, 
  Archive, 
  FolderOpen,
  ChevronRight,
  StickyNote,
  CheckSquare,
  Send
} from 'lucide-react';
import { saveResource, type Resource, type NewResourceData } from './utils/resourceUtils';
import ActividadCard from './components/ActividadCard';
import Cube from './components/cubo-acordion';

export default function Dashboard() {
  const [ventanaAbierta, setVentanaAbierta] = useState(false);
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);
  const [showActividadDetails, setShowActividadDetails] = useState(false);
  const [showMisionDetails, setShowMisionDetails] = useState(false);
  const [selectedMision, setSelectedMision] = useState<{title: string, hours: number} | null>(null);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showButtons, setShowButtons] = useState(false);
  const pizarraRef = useRef<PizarraRef>(null);
  
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

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const value = e.target.value;
    setInputText(value);
    setShowButtons(value.trim().length > 0);
    
    // Auto-resize the textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const lineHeight = 24; // 1.5rem = 24px
    const maxHeight = lineHeight * 5; // 5 lines max
    textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
  };

  const handleCreateNote = (): void => {
    if (inputText.trim() && pizarraRef.current) {
      pizarraRef.current.addNoteCard(inputText.trim());
      setInputText('');
      setShowButtons(false);
    }
  };

  const handleCreateTodoList = (): void => {
    if (inputText.trim() && pizarraRef.current) {
      pizarraRef.current.addTodoCard(inputText.trim());
      setInputText('');
      setShowButtons(false);
    }
  };

  const handleSendMessage = (): void => {
    console.log('Enviar mensaje:', inputText);
    setInputText('');
    setShowButtons(false);
  };

  const getLineCount = (text: string): number => {
    if (!text) return 1;
    return text.split('\n').length;
  };

  return (
    <div
      className="relative overflow-hidden flex flex-col"
      style={{ height: 'calc(100vh - 1rem)', padding: '0.5rem' }}
    >
      <div className="absolute inset-0 z-30">
        <Pizarra ref={pizarraRef} />
      </div>

      {/* Toggle Button - Always visible */}
<div className="fixed top-18 z-50 flex items-center transition-all duration-300">
  {/* Botón expandir o contraer*/}
  <button
    onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
    className={`p-1 py-4 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-lg 
      transition-all duration-300 text-white fixed top-18
      ${rightPanelCollapsed ? 'right-38' : 'right-78'}`}
  >
    <ChevronRight
      className={`w-4 h-4 transition-transform duration-300 ${
        rightPanelCollapsed ? 'rotate-180' : ''
      }`}
    />
  </button>

  {/* Cubo */}
  {rightPanelCollapsed && (
    <div className="fixed top-18 right-0">
      <Cube />
    </div>
  )}
</div>

     {/* Panel fijo para el Acordeón (arriba) */}
<div
  className={`fixed top-0 right-0 h-auto flex flex-col transition-all duration-300 z-30 ${
    rightPanelCollapsed ? "w-0" : "w-80 z-40"
  }`}
>
  {!rightPanelCollapsed && (
    <div className="p-4 pt-16">
      <Accordion recursos={recursos} onAddResource={handleAddResource} />
    </div>
  )}
</div>

{/* Panel fijo para las horas y el capture (abajo) */}
<div
  className={`fixed bottom-0 right-0 flex flex-col transition-all duration-300 z-40 ${
    rightPanelCollapsed ? "w-0" : "w-80"
  }`}
>
  {!rightPanelCollapsed && (
    <div className="p-4 flex flex-col gap-3">
      {/* Time info cards */}
      <div className="flex gap-3">
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 flex-1">
          <div className="text-white text-xl font-medium">2:12</div>
          <div className="text-white/70 text-sm">Tarea actual</div>
        </div>
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 flex-1">
          <div className="text-white text-xl font-medium">3:12</div>
          <div className="text-white/70 text-sm">Tiempo total hoy</div>
        </div>
      </div>

      {/* Capture */}
      <div className="h-32 border-2 border-green-500 rounded-2xl p-4 flex items-center justify-center text-green-500 font-medium">
        Capture
      </div>
    </div>
  )}
</div>

      
        {/* Header - Left section - Perfil */}
        <div className="mb-8 px-2 z-0 pointer-events-auto">
          <Perfil
            nombre="Elias Montilla"
            empresa="Total Time Solutions"
            tipoUsuario="manager"
            saludPorcentaje={85}
            fotoUrl="/total-time_logo.png"
          />
        </div>

        {/* Header - Left section - RelojActual */}
        <div className="pointer-events-auto " style={{ position: 'absolute', top: '0.5rem', left: '9rem', zIndex:40 }}>
          <RelojActual />
        </div>

            {/* Center - Room tabs */}
            <div className="flex bg-white/20 z-30 backdrop-blur-sm rounded-full p-2 gap-1 absolute left-1/2 transform -translate-x-1/2">
              <button onClick={() => setVentanaAbierta(true)} className="bg-green-200 text-gray-800 px-6 py-2 rounded-full font-medium">
                Avances <span className="bg-gray-600 px-1.5 py-1 rounded-full text-sm ml-1 text-white">2</span>
              </button>
              <button className="bg-gray-200 text-gray-800 px-6 py-2 rounded-full font-medium">Reglas</button>
              <button className="bg-gray-200 text-gray-800 px-6 py-2 rounded-full font-medium">Reportes</button>
            </div>

        {/* Main content area */}
        <div className="relative flex justify-between items-start px-2 flex-1">

        </div>

        {/* Activities positioned at fixed location */}
        <div className="pointer-events-auto" style={{ position: 'fixed', bottom: '15rem', left: '1rem', zIndex: 30 }}>
          <h2 className="text-gray-900 bg-white/80 backdrop-blur-sm px-2 py-2 rounded-lg text-xl mb-3 inline-block">
            Actividades 🗓️
          </h2>
          <div
            // className="bg-white/20 rounded-lg cursor-grab flex items-center justify-center text-xs text-white font-medium hover:bg-white/30 transition-colors"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', 'Actividades - Elemento arrastrado desde la interfaz');
            }}
            onClick={() => setShowActividadDetails(true)}
          >
             <ActividadCard />
          </div>
        </div>

        {/* Missions positioned at fixed location */}
        <div className="pointer-events-auto" style={{ position: 'fixed', bottom: '6rem', left: '1rem', zIndex: 30 }}>
          <h2 className="text-gray-900 bg-white/80 backdrop-blur-sm px-2 py-2 rounded-lg text-xl mb-3 inline-block">
            Misiones
          </h2>
          <div className="flex gap-2">
            <MisionCard 
              title="Optimizar rendimiento del sistema"
              hours={8}
              onClick={() => {
                setSelectedMision({title: "Optimizar rendimiento del sistema", hours: 8});
                setShowMisionDetails(true);
              }}
            />
            <MisionCard 
              title="Implementar nueva funcionalidad de reportes"
              hours={12}
              onClick={() => {
                setSelectedMision({title: "Implementar nueva funcionalidad de reportes", hours: 12});
                setShowMisionDetails(true);
              }}
            />
            <MisionCard 
              title="Refactorizar código legacy"
              hours={6}
              onClick={() => {
                setSelectedMision({title: "Refactorizar código legacy", hours: 6});
                setShowMisionDetails(true);
              }}
            />
          </div>
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
        <div className="flex flex-col items-center pointer-events-auto" style={{ position: 'fixed', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', width: '100%', zIndex: 50 }}>
          {/* Botones de acción */}
          {showButtons && (
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 mb-3 flex gap-3 max-w-md w-full">
              <button
                onClick={handleCreateNote}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-white text-sm font-medium transition-colors"
                title="Crear Nota"
              >
                <StickyNote size={16} />
                <span>Nota</span>
              </button>
              <button
                onClick={handleCreateTodoList}
                className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg text-white text-sm font-medium transition-colors"
                title="Crear Lista de Tareas"
              >
                <CheckSquare size={16} />
                <span>Tareas</span>
              </button>
              <button
                onClick={handleSendMessage}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-white text-sm font-medium transition-colors"
                title="Enviar"
              >
                <Send size={16} />
                <span>Enviar</span>
              </button>
            </div>
          )}

          {/* Input principal */}
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 flex items-start gap-3 max-w-md w-full">
            <div className="w-8 h-8 bg-white/30 rounded flex-shrink-0 mt-1"></div>
            <textarea
              value={inputText}
              onChange={handleInputChange}
              placeholder="Escribe aquí"
              className="flex-1 bg-transparent text-white placeholder-white/70 outline-none resize-none"
              style={{
                minHeight: '24px',
                maxHeight: '120px',
                lineHeight: '24px',
                overflowY: 'auto',
                wordWrap: 'break-word',
                whiteSpace: 'pre-wrap'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.shiftKey) {
                  // Allow new line with Shift+Enter
                  return;
                } else if (e.key === 'Enter') {
                  // Send on Enter without Shift
                  e.preventDefault();
                  if (inputText.trim()) {
                    handleSendMessage();
                  }
                }
              }}
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

      {/* Modal para detalles de actividad */}
      <Ventana
        isOpen={showActividadDetails}
        onClose={() => setShowActividadDetails(false)}
        title="Detalles de la Actividad"
        initialWidth={600}
        initialHeight={500}
        minWidth={500}
        minHeight={400}
        showOverlay={true}
      >
        <div className="text-black space-y-6 p-4">
          {/* Asunto */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Asunto</h3>
            <p className="text-gray-700">Reunión con cliente - Revisión de proyecto Q4</p>
          </div>

          {/* Participantes */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Participantes</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  EM
                </div>
                <span>Elias Montilla (Organizador)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  JD
                </div>
                <span>Juan Pérez</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  MR
                </div>
                <span>María Rodríguez</span>
              </div>
            </div>
          </div>

          {/* Hora de comienzo */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Fecha y Hora</h3>
            <div className="bg-gray-100 p-3 rounded-lg">
              <p className="font-medium">15 de Diciembre, 2025</p>
              <p className="text-gray-600">2:30 PM - 3:30 PM</p>
            </div>
          </div>

          {/* Botón para abrir link */}
          <div className="flex justify-center pt-4">
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              onClick={() => {
                window.open('https://meet.google.com/abc-defg-hij', '_blank');
              }}
            >
              Abrir enlace de la reunión
            </button>
          </div>
        </div>
      </Ventana>

      {/* Modal para detalles de misión */}
      <Ventana
        isOpen={showMisionDetails}
        onClose={() => setShowMisionDetails(false)}
        title="Detalles de la Misión"
        initialWidth={600}
        initialHeight={450}
        minWidth={500}
        minHeight={350}
        showOverlay={true}
      >
        {selectedMision && (
          <div className="text-black space-y-6 p-4">
            {/* Título de la misión */}
            <div>
              <h3 className="text-lg font-semibold mb-2">🎯 Misión</h3>
              <p className="text-gray-700 text-lg">{selectedMision.title}</p>
            </div>

            {/* Duración estimada */}
            <div>
              <h3 className="text-lg font-semibold mb-2">⏱️ Duración Estimada</h3>
              <div className="bg-green-100 p-3 rounded-lg">
                <p className="font-medium text-green-800">{selectedMision.hours} horas</p>
                <p className="text-green-600 text-sm">Tiempo aproximado para completar la misión</p>
              </div>
            </div>

            {/* Objetivos */}
            <div>
              <h3 className="text-lg font-semibold mb-2">📋 Objetivos</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700">Análisis de requisitos y alcance</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700">Desarrollo e implementación</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700">Pruebas y validación</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700">Documentación y entrega</span>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex justify-center gap-3 pt-4">
              <button 
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                onClick={() => {
                  console.log('Iniciar misión:', selectedMision.title);
                  setShowMisionDetails(false);
                }}
              >
                ▶️ Iniciar Misión
              </button>
              <button 
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                onClick={() => setShowMisionDetails(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Ventana>
    </div>
  );
}