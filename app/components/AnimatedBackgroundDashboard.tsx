'use client';

import { useAuth } from '@/app/contexts/AuthContext';
import { useSettings } from '@/app/contexts/SettingsContext';
import { useEffect, useState } from 'react';

const AnimatedBackgroundDashboard = () => {
  const { usuario } = useAuth();
  const { theme } = useSettings();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determinar si estamos en modo oscuro
  const isDark = theme === 'dark' || (theme === 'auto' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Durante SSR y la hidratación inicial, renderizar un fondo por defecto
  if (!mounted) {
    return (
      <div>
        <div className="background blue-purple"></div>
        <div className="background green-blue"></div>

        <div>
          <ul className="circles">
            <li></li>
            <li></li>
            <li></li>
            <li></li>
            <li></li>
            <li></li>
            <li></li>
            <li></li>
            <li></li>
            <li></li>
          </ul>
        </div>
      </div>
    );
  }

  // Una vez montado en el cliente, renderizar basado en el estado del usuario
  // Si el usuario NO es admin (null o false), usar el fondo normal (igual que demo)
  if (!usuario?.admin) {
    return (
      <div>
        <div className={isDark ? "background dark-blue-purple" : "background blue-purple"}></div>
        <div className={isDark ? "background dark-green-blue" : "background green-blue"}></div>

        <div>
          <ul className="circles">
            <li></li>
            <li></li>
            <li></li>
            <li></li>
            <li></li>
            <li></li>
            <li></li>
            <li></li>
            <li></li>
            <li></li>
          </ul>
        </div>
      </div>
    );
  }

  // Si el usuario ES admin, usar el fondo del dashboard
  return (
    <div>
      <div className={isDark ? "background dark-dashboard-gradient" : "background dashboard-gradient"}></div>

      <div>
        <ul className="circles-dashboard">
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
        </ul>
      </div>
    </div>
  );
};

export default AnimatedBackgroundDashboard;
