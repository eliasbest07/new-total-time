'use client';

import { usePathname } from 'next/navigation';
import { useSettings } from '@/app/contexts/SettingsContext';

const AnimatedBackground = () => {
  const pathname = usePathname();
  const { theme, customColors } = useSettings();

  // No mostrar este fondo en la página del dashboard
  if (pathname?.startsWith('/dashboard')) {
    return null;
  }

  // Determinar si estamos en modo oscuro
  const isDark = theme === 'dark' || (theme === 'auto' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Determinar si estamos en modo personalizado
  const isCustom = theme === 'custom';

  return (
    <div>
      {isCustom ? (
        <>
          <div
            className="background"
            style={{
              background: `linear-gradient(135deg, ${customColors.color1} 0%, ${customColors.color2} 100%)`,
              opacity: 1
            }}
          ></div>
          <div
            className="background"
            style={{
              background: `linear-gradient(135deg, ${customColors.color2} 0%, ${customColors.color1} 100%)`,
              opacity: 0
            }}
          ></div>
        </>
      ) : (
        <>
          <div className={isDark ? "background dark-blue-purple" : "background blue-purple"}></div>
          <div className={isDark ? "background dark-green-blue" : "background green-blue"}></div>
        </>
      )}

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