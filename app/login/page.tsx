"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { SupabaseAuthRepository } from '@/infrastructure/datasource/SupabaseAuthRepository';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { usuario, setUsuario } = useAuth();
  const authRepository = new SupabaseAuthRepository();

  // Redirigir si el usuario ya está autenticado
  useEffect(() => {
    if (usuario) {
      router.replace('/'); // Usar replace para no agregar al historial
    }
  }, [usuario, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // console.log('🔐 Iniciando login para:', email);
      const user = await authRepository.login(email, password);

      if (user) {
        // console.log('✅ Login exitoso, actualizando contexto');
        setUsuario(user);
        router.replace('/'); // Usar replace para no agregar al historial
      } else {
        setError('Credenciales incorrectas');
      }
    } catch (error) {
      console.error('Error en login:', error);
      setError('Error al iniciar sesión. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Si ya está autenticado, no mostrar el formulario (se redirigirá)
  if (usuario) {
    return null;
  }

  return (
    <div
      className="relative overflow-hidden flex items-center justify-center"
      style={{ height: '100vh', padding: '0.5rem' }}
    >

      {/* Contenedor del login */}
      <div className="relative z-20 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 inline-block">
            <Image 
              src="/total-time_logo.png" 
              alt="Total Time Solutions" 
              width={64}
              height={64}
              className="h-16 w-auto mx-auto"
            />
          </div>
        </div>

        {/* Formulario de login */}
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white text-center mb-8">
            Iniciar Sesión
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo de correo/usuario */}
            <div>
              <label htmlFor="email" className="block text-white/90 text-sm font-medium mb-2">
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
                placeholder="ejemplo@correo.com"
                required
              />
            </div>

            {/* Campo de contraseña */}
            <div>
              <label htmlFor="password" className="block text-white/90 text-sm font-medium mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
                  placeholder="Ingresa tu contraseña"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

          

            {/* Mensaje de error */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-200 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Botón de submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-500/80 hover:bg-green-500 disabled:bg-green-500/40 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}