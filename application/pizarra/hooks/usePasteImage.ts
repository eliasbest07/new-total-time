import { useState, useCallback, useEffect } from 'react';
import { Card } from '../types/index';
import { generateUniqueId, generatePosition } from '../utils/idGenerator';

export const usePasteImage = (setCards: React.Dispatch<React.SetStateAction<Card[]>>) => {
  const [pastedImages, setPastedImages] = useState<{ [key: string]: string }>({});

  const handlePaste = useCallback((e: ClipboardEvent) => {
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
          console.log('✅ [PIZARRA PASTE] Blob obtenido, creando URL');
          const imageUrl = URL.createObjectURL(blob);

          const newCard = {
            id: generateUniqueId('image'),
            type: 'image',
            title: 'Imagen pegada',
            content: `Pegada: ${new Date().toLocaleTimeString()}`,
            x: generatePosition(),
            y: generatePosition(),
            width: 300,
            height: 200,
            fontSize: 14
          };

          console.log('🖼️ [PIZARRA PASTE] Card creada:', newCard);

          setPastedImages(prev => ({
            ...prev,
            [newCard.id]: imageUrl
          }));

          setCards(prev => [...prev, newCard]);
          console.log('✅ [PIZARRA PASTE] Card añadida a la pizarra');
        }
      }
    }
  }, [setCards]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  return { pastedImages, setPastedImages };
};
