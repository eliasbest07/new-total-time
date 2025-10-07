"use client";

import { useState, useEffect } from 'react';
import { StorageService } from '@/infrastructure/services/StorageService';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Usuario } from '@/domain/entities/Usuario';

export default function LocalStorageDebug() {
  const [userData, setUserData] = useState<Usuario | null>(null);
  const [timestamp, setTimestamp] = useState<string>('');
  const [isFresh, setIsFresh] = useState<boolean>(false);
  const { clearUsuario, usuario } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const loadData = () => {
      const user = StorageService.getUser();
      const timestampValue = localStorage.getItem('usuario_timestamp');
      const fresh = StorageService.isUserDataFresh();
      
      setUserData(user);
      setTimestamp(timestampValue || 'No timestamp');
      setIsFresh(fresh);
    };

    loadData();
    
    // Actualizar cada segundo
    const interval = setInterval(loadData, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const clearStorage = () => {
    StorageService.clearUser();
    setUserData(null);
    setTimestamp('');
    setIsFresh(false);
  };

  const handleLogout = () => {
    try {
      clearUsuario();
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <div className="fixed bottom-4 z-30 right-4 bg-black/80 text-white p-4 rounded-lg max-w-md text-xs">
      <h3 className="font-bold mb-2">LocalStorage Debug</h3>
      
      <div className="mb-2">
        <strong>Cache Status:</strong> {isFresh ? '✅ Fresh' : '❌ Stale'}
      </div>
      
      <div className="mb-2">
        <strong>Timestamp:</strong> {timestamp}
        {timestamp && timestamp !== 'No timestamp' && (
          <div>({new Date(parseInt(timestamp)).toLocaleString()})</div>
        )}
      </div>
      
      <div className="mb-2">
        <strong>User Data:</strong>
        {userData ? (
          <pre className="bg-gray-800 p-2 rounded mt-1 overflow-auto max-h-32">
            {JSON.stringify(userData, null, 2)}
          </pre>
        ) : (
          <span className="text-red-400">No user data</span>
        )}
      </div>
      
      <div className="flex gap-2">
        <button 
          onClick={clearStorage}
          className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
        >
          Clear Storage
        </button>
        
        {usuario && (
          <button 
            onClick={handleLogout}
            className="bg-orange-600 hover:bg-orange-700 px-2 py-1 rounded text-xs"
          >
            Logout
          </button>
        )}
      </div>
    </div>
  );
}