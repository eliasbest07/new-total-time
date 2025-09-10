import Perfil from './components/Perfil';

export default function Dashboard() {
  return (
    <div className="relative overflow-hidden" style={{ height: 'calc(100vh - 4rem)', padding: '1.5rem' }}>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          {/* Left section - Total Time */}
          <div className="flex flex-col">


            {/* User info */}
            <div className="mb-6">
              <Perfil
                nombre="Juan Pérez"
                empresa="Total Time Solutions"
                tipoUsuario="manager"
                saludPorcentaje={85}
                fotoUrl="/total-time_logo.png"
              />
            </div>

            {/* Time info */}
            <div className="flex gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 min-w-[120px]">
                <div className="text-white text-xl font-medium">9:45 pm</div>
                <div className="text-white/70 text-sm">5 sep</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 min-w-[120px]">
                <div className="text-white text-xl font-medium">2:12</div>
                <div className="text-white/70 text-sm">Tarea actual</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 min-w-[140px]">
                <div className="text-white text-xl font-medium">3:12</div>
                <div className="text-white/70 text-sm">Tiempo total hoy</div>
              </div>
            </div>
          </div>

          {/* Center - Room tabs */}
          <div className="flex bg-white/20 backdrop-blur-sm rounded-full p-2 gap-1">
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
        <div className="flex justify-between items-end">
          {/* Left section - Activities and chart */}
          <div className="space-y-4">
            {/* Activities */}
            <div>
              <h2 className="text-gray-900 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg text-xl mb-3 inline-block">
                Actividades
              </h2>
              <div className="w-16 h-16 bg-white/20 rounded-lg"></div>
            </div>

            {/* Missions */}
            <div>
              <h2 className="text-gray-900 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg text-xl mb-3 inline-block">
                Misiones
              </h2>
              <div className="w-16 h-16 bg-white/20 rounded-lg"></div>
            </div>

            {/* Chart */}
            <div className="flex items-end gap-2 mt-8">
              <div className="w-6 h-12 bg-white/30 rounded-sm"></div>
              <div className="w-6 h-8 bg-white/30 rounded-sm"></div>
              <div className="w-6 h-16 bg-white/30 rounded-sm"></div>
              <div className="w-6 h-10 bg-white/30 rounded-sm"></div>
            </div>
          </div>

          {/* Center - Input area */}
          <div className="flex-1 mx-8">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-3 max-w-md mx-auto">
              <div className="w-8 h-8 bg-white/30 rounded"></div>
              <input
                type="text"
                placeholder="Escribe aquí"
                className="flex-1 bg-transparent text-white placeholder-white/70 outline-none"
              />
            </div>
          </div>

          {/* Right - Large content area */}
          <div className="w-80 h-32 bg-white/20 backdrop-blur-sm rounded-2xl"></div>
        </div>
      </div>
    </div>
  )
}
