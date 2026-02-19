"use client";

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/infrastructure/services/SupabaseClient';
import { ArrowRight, Clock, CheckCircle, Mail } from 'lucide-react';

export default function RegistrePage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email) {
      setError('Por favor ingresa tu correo electrónico');
      setLoading(false);
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from('correos_interesados')
        .insert([{ correo: email }]);

      if (insertError) {
        if (insertError.code === '23505') {
          setError('Este correo ya está registrado. Te contactaremos pronto.');
        } else {
          throw insertError;
        }
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err: any) {
      console.error('Error guardando correo:', err);
      setError('Ocurrió un error. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(165deg, #0a0a1a 0%, #0f1729 30%, #0d1117 60%, #0a0a1a 100%)' }}>
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">¡Listo!</h2>
          <p className="text-gray-400 mb-6">
            Hemos guardado tu correo. Te notificaremos cuando puedas acceder a Total Time.
          </p>
          <Link
            href="/getstarted"
            className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(165deg, #0a0a1a 0%, #0f1729 30%, #0d1117 60%, #0a0a1a 100%)' }}>
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Total Time</span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Acceso Anticipado</h1>
            <p className="text-gray-400 text-sm">
              Déjanos tu correo y te avisaremos cuando puedas comenzar a usar Total Time.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                required
                placeholder="tu@email.com"
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' }}
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>
                  <span>Quiero Acceso</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-gray-600 text-xs text-center mt-4">
            No spam. Solo te avisaremos cuando esté listo.
          </p>
        </div>

        {/* Footer links */}
        <div className="flex items-center justify-center gap-6 mt-6 text-sm">
          <Link href="/getstarted" className="text-gray-500 hover:text-white transition-colors">
            Volver al inicio
          </Link>
          <Link href="/login" className="text-gray-500 hover:text-white transition-colors">
            Iniciar Sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
