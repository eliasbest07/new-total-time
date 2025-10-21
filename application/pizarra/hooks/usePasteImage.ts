import { useState, useCallback, useEffect } from 'react';
import { Card } from '../types/index';
import { generateUniqueId, generatePosition } from '../utils/idGenerator';
import { supabase } from '@/infrastructure/services/SupabaseClient';

export const usePasteImage = (setCards: React.Dispatch<React.SetStateAction<Card[]>>) => {
  const [pastedImages, setPastedImages] = useState<{ [key: string]: string }>({});

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
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

          const newCard: Card = {
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

            // Liberar la URL temporal
            URL.revokeObjectURL(imageUrl);
            console.log('🗑️ [PIZARRA PASTE] URL temporal liberada');

          } catch (error) {
            console.error('❌ [PIZARRA PASTE] Error inesperado al subir imagen:', error);
          }
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
