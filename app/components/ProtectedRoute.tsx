"use client";

import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { usuario, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('🛡️ ProtectedRoute - isLoading:', isLoading, 'usuario:', !!usuario);
    if (!isLoading && !usuario) {
      console.log('🔒 Redirigiendo a login - no hay usuario');
      router.push('/login');
    }
  }, [usuario, isLoading, router]);

  if (isLoading) {
    console.log('⏳ ProtectedRoute - Mostrando loading...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!usuario) {
    console.log('❌ ProtectedRoute - No hay usuario, no renderizando children');
    return null; // Se redirigirá al login
  }

  console.log('✅ ProtectedRoute - Usuario autenticado, renderizando children');
  return <>{children}</>;
}