import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'info', duration = 3000, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const isClosedRef = useRef(false);

  const handleClose = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();

    // Prevenir múltiples llamadas
    if (isClosedRef.current || isLeaving) {
      console.log('⚠️ Toast ya está cerrándose, ignorando...');
      return;
    }

    console.log('🔵 Cerrando toast...');
    isClosedRef.current = true;
    setIsLeaving(true);

    setTimeout(() => {
      console.log('🔵 Llamando onClose del toast');
      onClose();
    }, 300); // Duración de la animación de salida
  };

  useEffect(() => {
    // Trigger entrada animation
    const animTimer = setTimeout(() => setIsVisible(true), 10);

    // Auto-cerrar después de duration
    const closeTimer = setTimeout(() => {
      if (!isClosedRef.current) {
        console.log('🕐 Auto-cierre por timeout');
        isClosedRef.current = true;
        setIsLeaving(true);
        setTimeout(() => {
          onClose();
        }, 300);
      }
    }, duration);

    return () => {
      clearTimeout(animTimer);
      clearTimeout(closeTimer);
    };
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} className="text-green-600" />;
      case 'error':
        return <XCircle size={20} className="text-red-600" />;
      case 'warning':
        return <AlertTriangle size={20} className="text-yellow-600" />;
      case 'info':
      default:
        return <Info size={20} className="text-blue-600" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const toastContent = (
    <div
      className={`transition-all duration-300 transform ${
        isVisible && !isLeaving
          ? 'translate-y-0 opacity-100'
          : '-translate-y-full opacity-0'
      }`}
      style={{
        minWidth: '300px',
        maxWidth: '500px',
      }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <div
        className={`${getBackgroundColor()} border-2 rounded-xl shadow-2xl p-4 flex items-start gap-3`}
        role="alert"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1 text-sm text-gray-800 font-semibold">{message}</div>
        <button
          onClick={handleClose}
          className="flex-shrink-0 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Cerrar"
          type="button"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );

  return toastContent;
};

export default Toast;
