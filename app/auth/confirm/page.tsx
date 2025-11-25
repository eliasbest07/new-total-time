'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/infrastructure/services/SupabaseClient';
import { rateLimitHandler } from '@/infrastructure/services/RateLimitHandler';
import { Loader2 } from 'lucide-react';

export default function ConfirmPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Obtener los parámetros del hash de la URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        // Obtener también los query params por si acaso
        const queryParams = new URLSearchParams(window.location.search);

        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type') || queryParams.get('type');
        const tokenHash = queryParams.get('token_hash');

        console.log('🔍 Parámetros encontrados:', {
          accessToken: !!accessToken,
          refreshToken: !!refreshToken,
          type,
          tokenHash: !!tokenHash
        });

        // Caso 1: Tokens en el hash (magic link o confirmación automática)
        if (accessToken && refreshToken) {
          console.log('✅ Tokens encontrados en hash, estableciendo sesión...');

          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            // Verificar si es un error 429
            if (rateLimitHandler.isRateLimitError(error)) {
              rateLimitHandler.handleRateLimitError();
              const remaining = Math.ceil(rateLimitHandler.getRemainingCooldown() / 1000);
              console.error('❌ Error 429 (Rate Limit) estableciendo sesión. Cooldown activado.');
              setErrorMessage(`Demasiadas solicitudes. Por favor espera ${remaining} segundos antes de intentar nuevamente.`);
            } else {
              console.error('❌ Error estableciendo sesión:', error);
              setErrorMessage(error.message);
            }
            setStatus('error');
            return;
          }

          console.log('✅ Sesión establecida exitosamente');
          console.log('✅ Usuario confirmado:', data.user?.email);

          setStatus('success');

          // Redirigir a la página principal después de 1 segundo
          setTimeout(() => {
            router.replace('/');
          }, 1000);
          return;
        }

        // Caso 2: Token hash en query params (método antiguo)
        if (tokenHash && type) {
          console.log('✅ Token hash encontrado, verificando...');

          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          });

          if (error) {
            // Verificar si es un error 429
            if (rateLimitHandler.isRateLimitError(error)) {
              rateLimitHandler.handleRateLimitError();
              const remaining = Math.ceil(rateLimitHandler.getRemainingCooldown() / 1000);
              console.error('❌ Error 429 (Rate Limit) verificando OTP. Cooldown activado.');
              setErrorMessage(`Demasiadas solicitudes. Por favor espera ${remaining} segundos antes de intentar nuevamente.`);
            } else {
              console.error('❌ Error verificando OTP:', error);
              setErrorMessage(error.message);
            }
            setStatus('error');
            return;
          }

          console.log('✅ Email verificado exitosamente');
          setStatus('success');

          setTimeout(() => {
            router.replace('/');
          }, 1000);
          return;
        }

        // Si no hay tokens válidos
        console.error('❌ No se encontraron tokens válidos en la URL');
        setErrorMessage('Link de confirmación inválido');
        setStatus('error');

        setTimeout(() => {
          router.replace('/login');
        }, 3000);

      } catch (error: any) {
        // Verificar si es un error 429
        if (rateLimitHandler.isRateLimitError(error)) {
          rateLimitHandler.handleRateLimitError();
          const remaining = Math.ceil(rateLimitHandler.getRemainingCooldown() / 1000);
          console.error('❌ Error 429 (Rate Limit) en proceso de confirmación. Cooldown activado.');
          setErrorMessage(`Demasiadas solicitudes. Por favor espera ${remaining} segundos antes de intentar nuevamente.`);
        } else {
          console.error('❌ Error en proceso de confirmación:', error);
          setErrorMessage('Error procesando la confirmación');
        }
        setStatus('error');

        setTimeout(() => {
          router.replace('/login');
        }, 3000);
      }
    };

    handleEmailConfirmation();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full mx-4">
        {status === 'loading' && (
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-white animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Confirmando tu email...
            </h2>
            <p className="text-white/80">
              Por favor espera un momento
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              ¡Email confirmado!
            </h2>
            <p className="text-white/80">
              Redirigiendo a la aplicación...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Error en la confirmación
            </h2>
            <p className="text-white/80 mb-4">
              {errorMessage || 'No se pudo confirmar tu email'}
            </p>
            <p className="text-white/60 text-sm">
              Redirigiendo al login...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
