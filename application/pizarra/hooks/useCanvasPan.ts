import { useState, useCallback, useEffect, useRef } from 'react';

export const useCanvasPan = () => {
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const edgePanningRef = useRef<{ x: number; y: number } | null>(null);
  const edgePanningStartTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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

  // Keyboard arrow keys support for panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only pan with arrows if not typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const panStep = 50; // pixels to move per key press
      let newOffset = { ...panOffset };

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          newOffset.y += panStep;
          break;
        case 'ArrowDown':
          e.preventDefault();
          newOffset.y -= panStep;
          break;
        case 'ArrowLeft':
          e.preventDefault();
          newOffset.x += panStep;
          break;
        case 'ArrowRight':
          e.preventDefault();
          newOffset.x -= panStep;
          break;
        default:
          return;
      }

      setPanOffset(newOffset);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [panOffset]);

  // Edge panning - auto-scroll when mouse is near canvas edges
  useEffect(() => {
    const handleEdgePanning = (e: MouseEvent) => {
      if (!canvasContainerRef.current) return;

      const container = canvasContainerRef.current;
      const rect = container.getBoundingClientRect();

      // Edge threshold in pixels
      const edgeThreshold = 50;
      const maxPanSpeed = 4;

      // Calculate mouse position relative to container
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Check if mouse is inside container
      if (mouseX < 0 || mouseX > rect.width || mouseY < 0 || mouseY > rect.height) {
        edgePanningRef.current = null;
        edgePanningStartTimeRef.current = null;
        return;
      }

      // Calculate pan direction based on edge proximity
      let directionX = 0;
      let directionY = 0;

      // Left edge
      if (mouseX < edgeThreshold) {
        directionX = (1 - mouseX / edgeThreshold);
      }
      // Right edge
      else if (mouseX > rect.width - edgeThreshold) {
        directionX = -(1 - (rect.width - mouseX) / edgeThreshold);
      }

      // Top edge
      if (mouseY < edgeThreshold) {
        directionY = (1 - mouseY / edgeThreshold);
      }
      // Bottom edge
      else if (mouseY > rect.height - edgeThreshold) {
        directionY = -(1 - (rect.height - mouseY) / edgeThreshold);
      }

      // Update edge panning state
      if (directionX !== 0 || directionY !== 0) {
        // Start timer if not already started
        if (edgePanningStartTimeRef.current === null) {
          edgePanningStartTimeRef.current = Date.now();
        }

        edgePanningRef.current = { x: directionX, y: directionY };
      } else {
        edgePanningRef.current = null;
        edgePanningStartTimeRef.current = null;
      }
    };

    document.addEventListener('mousemove', handleEdgePanning);
    return () => {
      document.removeEventListener('mousemove', handleEdgePanning);
    };
  }, []);

  // Animation loop for smooth edge panning with progressive acceleration
  useEffect(() => {
    const animate = () => {
      const edgePanning = edgePanningRef.current;
      if (edgePanning && edgePanningStartTimeRef.current !== null) {
        // Calculate elapsed time in milliseconds
        const elapsedTime = Date.now() - edgePanningStartTimeRef.current;

        // Delay antes de comenzar el panning (420ms)
        const activationDelay = 420;

        // Solo comenzar el panning si han pasado al menos 420ms
        if (elapsedTime >= activationDelay) {
          // Ajustar el tiempo para la aceleración (restando el delay)
          const adjustedTime = elapsedTime - activationDelay;

          // Progressive speed: 0 to 6 over 3 seconds (3000ms)
          const maxSpeed = 6;
          const accelerationDuration = 3000; // 3 seconds
          const currentSpeed = Math.min(maxSpeed, (adjustedTime / accelerationDuration) * maxSpeed);

          setPanOffset((prev) => ({
            x: prev.x + (edgePanning.x * currentSpeed),
            y: prev.y + (edgePanning.y * currentSpeed),
          }));
        }
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Callback to set canvas container ref
  const setCanvasRef = useCallback((ref: HTMLDivElement | null) => {
    canvasContainerRef.current = ref;
  }, []);

  return {
    isPanning,
    panOffset,
    setPanOffset,
    handleCanvasMouseDown,
    handleGlobalMouseMove,
    handleMouseUp,
    setCanvasRef,
  };
};
