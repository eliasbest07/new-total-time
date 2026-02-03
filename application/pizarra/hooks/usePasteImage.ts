import { useCallback, useEffect, RefObject } from 'react';
import { Card } from '../types';
import { generateUniqueId } from '../utils/idGenerator';
import { supabase } from '@/infrastructure/services/SupabaseClient';

export const usePasteImage = (
  cards: Card[],
  setCards: React.Dispatch<React.SetStateAction<Card[]>>,
  panOffset: { x: number; y: number },
  canvasRef: RefObject<HTMLDivElement | null>,
  setPastedImages: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>,
  readOnly: boolean = false
) => {

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    // Ignorar paste si está en modo solo lectura
    if (readOnly) {
      console.log('📋 [PIZARRA PASTE] Modo solo lectura, pegado deshabilitado');
      return;
    }

    // Ignorar paste si el usuario está en un input, textarea o elemento editable
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      console.log('📋 [PIZARRA PASTE] Ignorando paste en elemento editable');
      return;
    }

    console.log('📋 [PIZARRA PASTE] Evento paste detectado');

    const items = e.clipboardData?.items;
    if (!items) {
      console.log('⚠️ [PIZARRA PASTE] No hay items en el portapapeles');
      return;
    }

    console.log('📋 [PIZARRA PASTE] Items en portapapeles:', items.length);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log('📋 [PIZARRA PASTE] Item tipo:', item.type);

      if (item.type.indexOf('image') !== -1) {
        console.log('🖼️ [PIZARRA PASTE] Imagen detectada!');
        const blob = item.getAsFile();

        if (blob) {
          console.log('✅ [PIZARRA PASTE] Blob obtenido, creando URL temporal');
          const imageUrl = URL.createObjectURL(blob);

          // Cargar la imagen para obtener sus dimensiones reales
          const img = new Image();

          const dimensions = await new Promise<{width: number, height: number}>((resolve) => {
            img.onload = () => {
              console.log('🖼️ [PASTE] Imagen cargada:', {
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight,
                width: img.width,
                height: img.height
              });
              resolve({ width: img.naturalWidth, height: img.naturalHeight });
            };
            img.onerror = () => {
              console.log('❌ [PASTE] Error cargando imagen');
              resolve({ width: 300, height: 200 });
            };
            img.src = imageUrl;
          });

          console.log('📐 [PASTE] Dimensiones obtenidas:', dimensions);

          // Calcular dimensiones manteniendo aspect ratio
          const MAX_WIDTH = 500;
          const MAX_HEIGHT = 400;
          const MIN_WIDTH = 150;
          const MIN_HEIGHT = 120;

          const naturalWidth = dimensions.width;
          const naturalHeight = dimensions.height;

          console.log('📐 [PASTE] Usando dimensiones:', { naturalWidth, naturalHeight, aspectRatio: naturalWidth / naturalHeight });
          const aspectRatio = naturalWidth / naturalHeight;

          // Calcular tamaño base de la imagen
          let imageWidth = naturalWidth;
          let imageHeight = naturalHeight;

          // Escalar si es muy grande
          if (imageWidth > MAX_WIDTH || imageHeight > MAX_HEIGHT) {
            const scaleW = MAX_WIDTH / imageWidth;
            const scaleH = MAX_HEIGHT / imageHeight;
            const scale = Math.min(scaleW, scaleH);
            imageWidth = Math.round(imageWidth * scale);
            imageHeight = Math.round(imageHeight * scale);
          }

          // Asegurar tamaño mínimo
          if (imageWidth < MIN_WIDTH) {
            imageWidth = MIN_WIDTH;
            imageHeight = Math.round(imageWidth / aspectRatio);
          }
          if (imageHeight < MIN_HEIGHT) {
            imageHeight = MIN_HEIGHT;
            imageWidth = Math.round(imageHeight * aspectRatio);
          }

          // Card = imagen + espacio para header/footer/padding
          // Header (~30px) + timestamp (~20px) + padding vertical (16px) + barra superior (8px)
          const EXTRA_HEIGHT = 74;
          // Padding horizontal del card (16px)
          const EXTRA_WIDTH = 16;

          const cardWidth = imageWidth + EXTRA_WIDTH;
          const cardHeight = imageHeight + EXTRA_HEIGHT;

          console.log('📐 [PASTE] Cálculo final:', { imageWidth, imageHeight, cardWidth, cardHeight });

          // Calcular el siguiente z-index para que aparezca encima de todos
          const maxZIndex = cards.length === 0 ? 0 : Math.max(...cards.map(card => card.zIndex || 0));
          const nextZIndex = maxZIndex + 1;

          // Obtener los IDs existentes para evitar duplicados
          const existingIds = cards.map(card => card.id);

          // Calcular el centro de la vista actual
          const canvasWidth = canvasRef.current?.clientWidth || window.innerWidth;
          const canvasHeight = canvasRef.current?.clientHeight || window.innerHeight;
          const centerX = -panOffset.x + (canvasWidth / 2) - (cardWidth / 2);
          const centerY = -panOffset.y + (canvasHeight / 2) - (cardHeight / 2);

          const newCard: Card = {
            id: generateUniqueId('image', existingIds),
            type: 'image',
            title: 'Imagen pegada',
            content: `Pegada: ${new Date().toLocaleTimeString()}`,
            x: centerX,
            y: centerY,
            width: cardWidth,
            height: cardHeight,
            fontSize: 14,
            zIndex: nextZIndex
          };

          console.log('🖼️ [PIZARRA PASTE] Card creada con aspect ratio:', {
            original: `${img.naturalWidth}x${img.naturalHeight}`,
            card: `${cardWidth}x${cardHeight}`
          });

          // Mostrar la imagen inmediatamente con la URL temporal
          setPastedImages(prev => ({
            ...prev,
            [newCard.id]: imageUrl
          }));

          setCards(prev => [...prev, newCard]);
          console.log('✅ [PIZARRA PASTE] Card añadida a la pizarra');

          // Subir la imagen a Supabase Storage en segundo plano
          try {
            console.log('☁️ [PIZARRA PASTE] Subiendo imagen a Supabase Storage...');

            // Generar nombre de archivo único
            const fileExtension = blob.type.split('/')[1] || 'png';
            const fileName = `${newCard.id}-${Date.now()}.${fileExtension}`;
            const filePath = fileName;

            // Subir la imagen
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('imagenes_pizarra')
              .upload(filePath, blob, {
                contentType: blob.type,
                upsert: false
              });

            if (uploadError) {
              console.error('❌ [PIZARRA PASTE] Error al subir imagen:', uploadError);
              return;
            }

            console.log('✅ [PIZARRA PASTE] Imagen subida correctamente:', uploadData.path);

            // Obtener la URL pública
            const { data: urlData } = supabase.storage
              .from('imagenes_pizarra')
              .getPublicUrl(filePath);

            const publicUrl = urlData.publicUrl;
            console.log('🔗 [PIZARRA PASTE] URL pública obtenida:', publicUrl);

            // Actualizar la card con la URL de Supabase
            setCards(prev => prev.map(card =>
              card.id === newCard.id
                ? { ...card, imageUrl: publicUrl }
                : card
            ));

            // Actualizar el mapa de imágenes con la URL pública
            setPastedImages(prev => ({
              ...prev,
              [newCard.id]: publicUrl
            }));

            // ✅ FIX MEMORY LEAK: Liberar la URL temporal
            URL.revokeObjectURL(imageUrl);
            console.log('🗑️ [PIZARRA PASTE] URL temporal liberada');

          } catch (error) {
            console.error('❌ [PIZARRA PASTE] Error inesperado al subir imagen:', error);
            // ✅ FIX MEMORY LEAK: Liberar la URL temporal incluso si hay error
            URL.revokeObjectURL(imageUrl);
          }
        }
      }
    }
  }, [cards, setCards, setPastedImages, panOffset, canvasRef, readOnly]); // ✅ FIX MEMORY LEAK: Agregar setPastedImages a las dependencias

  useEffect(() => {
    // ✅ FIX MEMORY LEAK: El event listener se registra solo una vez
    // porque handlePaste está memoizado correctamente con useCallback
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  // No retorna nada, solo maneja el evento de pegar
};
