import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast, { ToastType } from '../components/ui/Toast';

interface ToastConfig {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastItem extends ToastConfig {
  id: number;
}

interface ToastContextType {
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((config: ToastConfig) => {
    const id = Date.now() + Math.random();
    console.log('🟢 Agregando toast:', id);
    setToasts((prev) => [...prev, { ...config, id }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    console.log('🔴 Eliminando toast:', id);
    setToasts((prev) => {
      const newToasts = prev.filter((toast) => toast.id !== id);
      console.log('📊 Toasts restantes:', newToasts.length);
      return newToasts;
    });
  }, []);

  const success = useCallback((message: string, duration?: number) => {
    showToast({ message, type: 'success', duration });
  }, [showToast]);

  const error = useCallback((message: string, duration?: number) => {
    showToast({ message, type: 'error', duration });
  }, [showToast]);

  const info = useCallback((message: string, duration?: number) => {
    showToast({ message, type: 'info', duration });
  }, [showToast]);

  const warning = useCallback((message: string, duration?: number) => {
    showToast({ message, type: 'warning', duration });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ success, error, info, warning }}>
      {children}
      {/* Contenedor de toasts - centro superior de la página, debajo del navbar */}
      <div
        style={{
          position: 'fixed',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
            }}
          >
            <Toast
              message={toast.message}
              type={toast.type}
              duration={toast.duration}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToastContext = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext debe ser usado dentro de un ToastProvider');
  }
  return context;
};
