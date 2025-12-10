'use client';

import { useAuth } from '@/app/contexts/AuthContext';
import { useEffect, useState } from 'react';

const AnimatedBackgroundDashboard = () => {
  const { usuario } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Si el usuario ES admin, usar el fondo del dashboard
  return (
    <div>
      <div className="background dashboard-gradient"></div>

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
