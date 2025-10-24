'use client';

import { usePathname } from 'next/navigation';

const AnimatedBackground = () => {
  const pathname = usePathname();

  // No mostrar este fondo en la página del dashboard
  if (pathname?.startsWith('/dashboard')) {
    return null;
  }

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
};

export default AnimatedBackground;