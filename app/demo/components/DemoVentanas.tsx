'use client';

import { useState } from 'react';
import Ventana from './Ventana';

const DemoVentanas = () => {
  const [ventanaSimple, setVentanaSimple] = useState(false);
  const [ventanaFormulario, setVentanaFormulario] = useState(false);
  const [ventanaGrafico, setVentanaGrafico] = useState(false);
  const [ventanaConfig, setVentanaConfig] = useState(false);

  const abrirVentanaSimple = () => {
    setVentanaSimple(true);
  };

  const abrirVentanaFormulario = () => {
    setVentanaFormulario(true);
  };

  const abrirVentanaGrafico = () => {
    setVentanaGrafico(true);
  };

  const abrirVentanaConfiguracion = () => {
    setVentanaConfig(true);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-white text-2xl font-bold mb-2">Demo de Ventanas Modales</h1>
        <p className="text-white/70">Prueba diferentes tipos de ventanas arrastrables y redimensionables</p>
      </div>

      {/* Botones para abrir ventanas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={abrirVentanaSimple}
          className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-4 rounded-xl transition-all duration-300 hover:scale-105 group"
        >
          <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📝</div>
          <h3 className="font-semibold">Ventana Simple</h3>
          <p className="text-sm text-white/70">Información básica</p>
        </button>

        <button
          onClick={abrirVentanaFormulario}
          className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-4 rounded-xl transition-all duration-300 hover:scale-105 group"
        >
          <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📋</div>
          <h3 className="font-semibold">Formulario</h3>
          <p className="text-sm text-white/70">Contacto interactivo</p>
        </button>

        <button
          onClick={abrirVentanaGrafico}
          className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-4 rounded-xl transition-all duration-300 hover:scale-105 group"
        >
          <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📊</div>
          <h3 className="font-semibold">Dashboard</h3>
          <p className="text-sm text-white/70">Estadísticas visuales</p>
        </button>

        <button
          onClick={abrirVentanaConfiguracion}
          className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-4 rounded-xl transition-all duration-300 hover:scale-105 group"
        >
          <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">⚙️</div>
          <h3 className="font-semibold">Configuración</h3>
          <p className="text-sm text-white/70">Ajustes del sistema</p>
        </button>
      </div>

      {/* Información adicional */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
        <h2 className="text-white text-lg font-semibold mb-4">Características del Componente</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white/80">
          <div>
            <h3 className="font-medium mb-2">Funcionalidades:</h3>
            <ul className="text-sm space-y-1">
              <li>• Arrastrar y soltar</li>
              <li>• Redimensionar desde esquina</li>
              <li>• Minimizar/Maximizar</li>
              <li>• Múltiples ventanas simultáneas</li>
              <li>• Z-index automático</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">Personalización:</h3>
            <ul className="text-sm space-y-1">
              <li>• Tamaño inicial configurable</li>
              <li>• Posición inicial configurable</li>
              <li>• Límites mínimos/máximos</li>
              <li>• Estilos CSS personalizables</li>
              <li>• Contenido completamente flexible</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Ventana Simple */}
      <Ventana
        isOpen={ventanaSimple}
        onClose={() => setVentanaSimple(false)}
        title="Ventana Simple"
        initialWidth={500}
        initialHeight={400}
      >
        <div className="text-white space-y-4">
          <h2 className="text-xl font-semibold">¡Hola desde la ventana!</h2>
          <p className="text-white/80">
            Esta es una ventana modal personalizable que puedes arrastrar y redimensionar.
          </p>
          <div className="bg-white/10 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Características:</h3>
            <ul className="text-sm text-white/70 space-y-1">
              <li>• Arrastrable</li>
              <li>• Redimensionable</li>
              <li>• Minimizable</li>
              <li>• Maximizable</li>
              <li>• Completamente personalizable</li>
            </ul>
          </div>
        </div>
      </Ventana>

      {/* Ventana Formulario */}
      <Ventana
        isOpen={ventanaFormulario}
        onClose={() => setVentanaFormulario(false)}
        title="Formulario de Contacto"
        initialWidth={450}
        initialHeight={500}
      >
        <div className="text-white space-y-4">
          <h2 className="text-xl font-semibold mb-4">Contacto</h2>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre</label>
              <input
                type="text"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Mensaje</label>
              <textarea
                rows={4}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                placeholder="Tu mensaje..."
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Enviar
              </button>
              <button
                type="button"
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </Ventana>

      {/* Ventana Dashboard */}
      <Ventana
        isOpen={ventanaGrafico}
        onClose={() => setVentanaGrafico(false)}
        title="Dashboard de Estadísticas"
        initialWidth={600}
        initialHeight={500}
      >
        <div className="text-white space-y-6">
          <h2 className="text-xl font-semibold">Estadísticas del Sistema</h2>
          
          {/* Métricas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-white/70">CPU</h3>
              <div className="text-2xl font-bold text-blue-400">45%</div>
            </div>
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-white/70">RAM</h3>
              <div className="text-2xl font-bold text-green-400">62%</div>
            </div>
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-white/70">Disco</h3>
              <div className="text-2xl font-bold text-yellow-400">78%</div>
            </div>
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-white/70">Red</h3>
              <div className="text-2xl font-bold text-purple-400">23%</div>
            </div>
          </div>

          {/* Gráfico simulado */}
          <div className="bg-white/10 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-white/70 mb-4">Uso en el tiempo</h3>
            <div className="flex items-end justify-center gap-2 h-32">
              {[40, 65, 45, 80, 55, 70, 35, 90, 60, 75].map((height, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-t from-blue-500 to-blue-300 rounded-sm animate-pulse hover:scale-110 transition-transform duration-300"
                  style={{
                    width: '20px',
                    height: `${height}%`,
                    animationDelay: `${index * 0.1}s`
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </Ventana>

      {/* Ventana Configuración */}
      <Ventana
        isOpen={ventanaConfig}
        onClose={() => setVentanaConfig(false)}
        title="Configuración"
        initialWidth={500}
        initialHeight={600}
      >
        <div className="text-white space-y-6">
          <h2 className="text-xl font-semibold">Configuración del Sistema</h2>
          
          <div className="space-y-4">
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="font-medium mb-3">Apariencia</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="rounded" defaultChecked />
                  <span className="text-sm">Modo oscuro</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Animaciones</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="rounded" defaultChecked />
                  <span className="text-sm">Efectos de desenfoque</span>
                </label>
              </div>
            </div>

            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="font-medium mb-3">Notificaciones</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="rounded" defaultChecked />
                  <span className="text-sm">Notificaciones push</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="rounded" defaultChecked />
                  <span className="text-sm">Sonidos</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Vibración</span>
                </label>
              </div>
            </div>

            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="font-medium mb-3">Privacidad</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Compartir datos de uso</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="rounded" defaultChecked />
                  <span className="text-sm">Cookies necesarias</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors duration-200">
              Guardar
            </button>
            <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors duration-200">
              Cancelar
            </button>
          </div>
        </div>
      </Ventana>
    </div>
  );
};

export default DemoVentanas;