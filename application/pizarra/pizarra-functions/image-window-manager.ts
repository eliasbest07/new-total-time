/**
 * image-window-manager.ts
 *
 * Funciones para gestionar ventanas modales de imágenes en la pizarra.
 * Maneja el cálculo de dimensiones, apertura y cierre de ventanas de imagen.
 */

/**
 * Tipo de datos para una ventana de imagen
 */
export interface ImageWindow {
  id: string;
  title: string;
  imageUrl: string;
  width: number;
  height: number;
}

/**
 * Parámetros para calcular dimensiones de imagen
 */
interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Calcula las dimensiones óptimas para una imagen manteniendo el aspect ratio
 *
 * @param naturalWidth - Ancho natural de la imagen
 * @param naturalHeight - Alto natural de la imagen
 * @param maxWidth - Ancho máximo permitido
 * @param maxHeight - Alto máximo permitido
 * @param scaleFactor - Factor de escala final (0.75 = 75%)
 * @returns Dimensiones calculadas {width, height}
 *
 * Proceso:
 * 1. Calcula el aspect ratio original
 * 2. Ajusta ancho si excede maxWidth
 * 3. Ajusta alto si excede maxHeight
 * 4. Aplica factor de escala final (reducción del 25% por defecto)
 */
function calculateImageDimensions(
  naturalWidth: number,
  naturalHeight: number,
  maxWidth: number,
  maxHeight: number,
  scaleFactor: number = 0.75
): ImageDimensions {
  const aspectRatio = naturalWidth / naturalHeight;

  let width = naturalWidth;
  let height = naturalHeight;

  // Ajustar si excede el ancho máximo
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }

  // Ajustar si excede el alto máximo
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  // Aplicar factor de escala (reducir 25% por defecto)
  width = width * scaleFactor;
  height = height * scaleFactor;

  return { width, height };
}

/**
 * Crea y retorna una nueva ventana de imagen con dimensiones calculadas
 *
 * @param imageUrl - URL de la imagen a mostrar
 * @param title - Título de la ventana
 * @returns Promise que resuelve con los datos de la ventana o null si hay error
 *
 * @example
 * const newWindow = await createImageWindow('https://example.com/image.jpg', 'Mi Imagen');
 * if (newWindow) {
 *   setImageWindows(prev => [...prev, newWindow]);
 * }
 *
 * Características:
 * - Carga la imagen de forma asíncrona
 * - Calcula dimensiones óptimas (máx 90% del viewport)
 * - Reduce tamaño final al 75%
 * - Mantiene aspect ratio original
 * - Genera ID único basado en timestamp
 */
export function createImageWindow(
  imageUrl: string,
  title: string
): Promise<ImageWindow | null> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      const maxWidth = window.innerWidth * 0.9;
      const maxHeight = window.innerHeight * 0.9;

      const { width, height } = calculateImageDimensions(
        img.naturalWidth,
        img.naturalHeight,
        maxWidth,
        maxHeight,
        0.75 // Reducir 25%
      );

      resolve({
        id: `img-${Date.now()}`,
        title,
        imageUrl,
        width,
        height
      });
    };

    img.onerror = () => {
      console.error('❌ Error al cargar imagen:', imageUrl);
      resolve(null);
    };

    img.src = imageUrl;
  });
}

/**
 * Filtra una ventana de imagen del array de ventanas abiertas
 *
 * @param windows - Array actual de ventanas de imagen
 * @param windowId - ID de la ventana a cerrar
 * @returns Nuevo array sin la ventana cerrada
 *
 * @example
 * const updatedWindows = removeImageWindow(imageWindows, 'img-1234567890');
 * setImageWindows(updatedWindows);
 */
export function removeImageWindow(
  windows: ImageWindow[],
  windowId: string
): ImageWindow[] {
  return windows.filter(w => w.id !== windowId);
}
