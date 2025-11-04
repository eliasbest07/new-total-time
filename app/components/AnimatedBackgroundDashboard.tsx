'use client';

import { useAuth } from '@/app/contexts/AuthContext';

const AnimatedBackgroundDashboard = () => {
  const { usuario } = useAuth();

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
