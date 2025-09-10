import Perfil from './components/Perfil';
import RelojActual from './components/RelojActual';

export default function Dashboard() {
  return (
    <div
      className="relative overflow-hidden flex flex-col"
      style={{ height: 'calc(100vh - 1rem)', padding: '0.5rem' }}
    >
      <div className="relative z-10 w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 px-2">
          {/* Left section - Total Time */}
          <div className="flex flex-col">
            {/* User info and first time card */}
            <div className="flex gap-4 items-center mb-6">
              <Perfil
                nombre="Juan Pérez"
                empresa="Total Time Solutions"
                tipoUsuario="manager"
                saludPorcentaje={85}
                fotoUrl="/total-time_logo.png"
              />
              <RelojActual />
            </div>

          </div>

          {/* Center - Room tabs */}
          <div className="flex bg-white/20 backdrop-blur-sm rounded-full p-2 gap-1 absolute left-1/2 transform -translate-x-1/2">
            <button className="bg-green-200 text-gray-800 px-6 py-2 rounded-full font-medium">
              Sala <span className="bg-white px-2 py-1 rounded text-sm ml-1">2</span>
            </button>
            <button className="bg-gray-200 text-gray-800 px-6 py-2 rounded-full font-medium">Sala</button>
            <button className="bg-gray-200 text-gray-800 px-6 py-2 rounded-full font-medium">Sala</button>
          </div>

          {/* Right sidebar */}
          <div className="w-80 space-y-0">
            <div className="bg-green-600 text-white p-4 rounded-t-lg">
              <h3 className="font-medium">Usuarios conectados</h3>
            </div>
            <div className="bg-blue-700 text-white p-4">
              <h3 className="font-medium">Proyectos</h3>
            </div>
            <div className="bg-red-700 text-white p-16 rounded-b-lg">
              <h3 className="font-medium">Recursos</h3>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="relative flex justify-between items-start px-2 flex-1">
          {/* Left section - Activities and chart */}
          <div className="space-y-2">
            {/* Activities */}
            <div>
              <h2 className="text-gray-900 bg-white/80 backdrop-blur-sm px-2 py-2 rounded-lg text-xl mb-3 inline-block">
                Actividades
              </h2>
              <div className="w-16 h-16 bg-white/20 rounded-lg"></div>
            </div>

            {/* Missions */}
            <div>
              <h2 className="text-gray-900 bg-white/80 backdrop-blur-sm px-2 py-2 rounded-lg text-xl mb-3 inline-block">
                Misiones
              </h2>
              <div className="w-16 h-16 bg-white/20 rounded-lg"></div>
            </div>

            {/* Chart */}
            <div className="flex items-end gap-2">
              <div className="w-6 h-12 bg-white/30 rounded-sm"></div>
              <div className="w-6 h-8 bg-white/30 rounded-sm"></div>
              <div className="w-6 h-16 bg-white/30 rounded-sm"></div>
              <div className="w-6 h-10 bg-white/30 rounded-sm"></div>
            </div>
          </div>

          {/* Right section */}
          <div className="w-80">
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
            <div className="h-32 bg-white/20 backdrop-blur-sm rounded-2xl">
              Capture 
            </div>
          </div>
        </div>

        {/* Input centrado abajo */}
        <div className="flex justify-center mb-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-3 max-w-md w-full">
            <div className="w-8 h-8 bg-white/30 rounded"></div>
            <input
              type="text"
              placeholder="Escribe aquí"
              className="flex-1 bg-transparent text-white placeholder-white/70 outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}