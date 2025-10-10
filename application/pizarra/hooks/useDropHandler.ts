import { useState, useCallback } from 'react';
import { Card } from '../types/index';
import { generateUniqueId } from '../utils/idGenerator';

export const useDropHandler = (
  setCards: React.Dispatch<React.SetStateAction<Card[]>>,
  panOffset: { x: number; y: number },
  canvasRef: React.RefObject<HTMLDivElement>,
  cards: Card[]
) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isReceivingDrag, setIsReceivingDrag] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
    setIsReceivingDrag(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!(e.relatedTarget instanceof Node) || !e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
      setIsReceivingDrag(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setIsReceivingDrag(false);

    console.log('🎯 [PIZARRA DROP] Evento drop recibido');

    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - panOffset.x;
    const y = e.clientY - rect.top - panOffset.y;

    const existingIds = cards.map(card => card.id);
    const resourceData = e.dataTransfer.getData('application/json');

    if (resourceData) {
      try {
        const resource = JSON.parse(resourceData);
        console.log('✅ [PIZARRA DROP] JSON parseado:', resource);
        console.log('🔍 [PIZARRA DROP] Tipo detectado:', resource.type);
        console.log('🔍 [PIZARRA DROP] Campos disponibles:', Object.keys(resource));

        // ACTIVIDAD - Detectar PRIMERO por type === 'actividad' O por subject + duration
        if (resource.type === 'actividad' || (resource.subject && resource.duration !== undefined)) {
          console.log('📅 [PIZARRA DROP] Detectado ACTIVIDAD');
          
          // Verificar si ya existe una card de actividad
          const hasActividad = cards.some(card => card.type === 'actividad');
          if (hasActividad) {
            console.log('⚠️ [PIZARRA DROP] Ya existe una card de actividad, no se puede agregar otra');
            return;
          }
          
          setCards(prev => [...prev, {
            id: generateUniqueId('actividad', existingIds),
            type: 'actividad',
            title: resource.subject || 'Actividad',
            content: `Reunión: ${resource.subject}`,
            x, y,
            width: 300,
            height: 250,
            fontSize: 18,
            activityData: {
              subject: resource.subject || 'Reunión con cliente',
              participants: resource.participants || [
                { name: 'Usuario', initial: 'U', color: 'bg-blue-500' }
              ],
              date: resource.date || new Date().toLocaleDateString('es-ES'),
              time: resource.time || 'Sin hora definida',
              duration: resource.duration || 60,
              isRunning: false,
              timeLeft: resource.timeLeft || (resource.duration || 60) * 60
            }
          }]);
          return;
        }
        // PROYECTO
        else if (resource.nombre && resource.colors && resource.palette !== undefined) {
          console.log('📁 [PIZARRA DROP] Detectado PROYECTO');
          setCards(prev => [...prev, {
            id: generateUniqueId('proyecto', existingIds),
            type: 'proyecto',
            title: resource.nombre || 'Proyecto',
            content: `Proyecto: ${resource.nombre}`,
            x, y,
            width: 280,
            height: 380,
            fontSize: 14,
            proyectoData: {
              nombre: resource.nombre || 'Proyecto',
              description: resource.description || null,
              imagen_url: resource.imagen_url || null,
              type: resource.type || null,
              utility: resource.utility || null,
              palette: resource.palette || null,
              colors: resource.colors || null,
              producto: resource.producto || null,
              publico: resource.publico !== undefined ? resource.publico : true
            }
          }]);
          return;
        }
        // USUARIO
        else if (resource.name && resource.avatar && resource.color && resource.online !== undefined) {
          console.log('👤 [PIZARRA DROP] Detectado USUARIO');
          setCards(prev => [...prev, {
            id: generateUniqueId('usuario', existingIds),
            type: 'usuario',
            title: resource.name || 'Usuario',
            content: `Usuario: ${resource.name}`,
            x, y,
            width: 280,
            height: 400,
            fontSize: 18,
            usuarioData: {
              userId: resource.userId || '',
              name: resource.name || 'Usuario',
              avatar: resource.avatar || 'US',
              color: resource.color || 'bg-blue-500',
              online: resource.online || false,
              messages: []
            }
          }]);
          return;
        }
        // MISIÓN
        else if (resource.title && resource.hours !== undefined) {
          console.log('🎯 [PIZARRA DROP] Detectado MISIÓN');
          
          // Verificar si ya existe una card de misión
          const hasMision = cards.some(card => card.type === 'mision');
          if (hasMision) {
            console.log('⚠️ [PIZARRA DROP] Ya existe una card de misión, no se puede agregar otra');
            return;
          }
          
          setCards(prev => [...prev, {
            id: generateUniqueId('mision', existingIds),
            type: 'mision',
            title: resource.title || 'Nueva Misión',
            content: `${resource.hours}h - ${resource.description || resource.title}`,
            x, y,
            width: 250,
            height: 300,
            fontSize: 18,
            misionData: {
              title: resource.title || 'Nueva Misión',
              hours: resource.hours || 1,
              description: resource.description || resource.title
            }
          }]);
          return;
        }
        // RECURSO
        else if (resource.name && resource.resourceType) {
          console.log('📦 [PIZARRA DROP] Detectado RECURSO');
          setCards(prev => [...prev, {
            id: generateUniqueId('resource', existingIds),
            type: 'resource',
            title: resource.name,
            content: `Tipo: ${resource.resourceType}`,
            x, y,
            width: 180,
            height: 110,
            fontSize: 18
          }]);
          return;
        }
      } catch (error) {
        console.log('❌ [PIZARRA DROP] Error parseando JSON:', error);
      }
    }

    // Manejar archivos
    if (e.dataTransfer.files.length > 0) {
      console.log('📂 [PIZARRA DROP] Procesando archivos');
      const files = Array.from(e.dataTransfer.files);
      files.forEach((file, index) => {
        setCards(prev => [...prev, {
          id: generateUniqueId(`file-${index}`, existingIds),
          type: 'file',
          title: (file as File).name,
          content: `Tamaño: ${((file as File).size / 1024).toFixed(2)} KB`,
          x: x + (index * 20),
          y: y + (index * 20),
          width: 200,
          height: 120
        }]);
      });
      return;
    }

    // Manejar texto
    const text = e.dataTransfer.getData('text/plain');
    if (text) {
      console.log('📝 [PIZARRA DROP] Creando card de texto');
      setCards(prev => [...prev, {
        id: generateUniqueId('text', existingIds),
        type: 'text',
        title: 'Texto',
        content: text.length > 50 ? text.substring(0, 50) + '...' : text,
        x, y,
        width: 200,
        height: 100
      }]);
    }
  }, [panOffset, canvasRef, setCards, cards]);

  return {
    isDragOver,
    isReceivingDrag,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop
  };
};
