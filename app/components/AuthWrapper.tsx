"use client";

import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { usuario, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !usuario) {
      router.replace('/login');
    }
  }, [usuario, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!usuario) {
    return null;
  }

  return <>{children}</>;
}