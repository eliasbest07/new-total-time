import { useState, useCallback } from 'react';
import Toast, { ToastType } from '../components/ui/Toast';

interface ToastConfig {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastItem extends ToastConfig {
  id: number;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((config: ToastConfig) => {
    const id = Date.now() + Math.random(); // Asegurar ID único
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

  const ToastContainer = () => (
    <>
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            position: 'fixed',
            top: `${16 + index * 80}px`,
            right: '16px',
            zIndex: 10000,
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
    </>
  );

  return {
    success,
    error,
    info,
    warning,
    showToast,
    ToastContainer,
  };
};
