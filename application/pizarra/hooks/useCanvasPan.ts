import { useState, useCallback } from 'react';

export const useCanvasPan = () => {
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const handleCanvasMouseDown = useCallback((
    e: React.MouseEvent<HTMLDivElement>,
    draggedCard: string | null,
    isConnecting: boolean
  ) => {
    if (!draggedCard && e.target === e.currentTarget && !isConnecting) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
    }
  }, [panOffset]);

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (isPanning) {
      const newPanX = e.clientX - panStart.x;
      const newPanY = e.clientY - panStart.y;
      setPanOffset({ x: newPanX, y: newPanY });
    }
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    }
  }, [isPanning]);

  return {
    isPanning,
    panOffset,
    handleCanvasMouseDown,
    handleGlobalMouseMove,
    handleMouseUp
  };
};
