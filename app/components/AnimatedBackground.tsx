'use client';

import { usePathname } from 'next/navigation';
import { useSettings } from '@/app/contexts/SettingsContext';

const AnimatedBackground = () => {
  const pathname = usePathname();
  const { theme } = useSettings();

  // No mostrar este fondo en la página del dashboard
  if (pathname?.startsWith('/dashboard')) {
    return null;
  }

  // Determinar si estamos en modo oscuro
  const isDark = theme === 'dark' || (theme === 'auto' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

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
};

export default AnimatedBackground;