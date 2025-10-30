import { useState, useCallback } from 'react';
import { Card } from '../types';
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
              timeLeft: resource.timeLeft || (resource.duration || 60) * 60,
              id_usuario: resource.id_usuario,
              id_actividad: resource.id?.toString()
            }
          }]);
          return;
        }
        // PROYECTO - Detectar por dragType === 'proyecto'
        else if (resource.dragType === 'proyecto') {
          console.log('📁 [PIZARRA DROP] Detectado PROYECTO');
          console.log('📁 [PIZARRA DROP] Datos de proyecto recibidos:', resource);
          setCards(prev => [...prev, {
            id: generateUniqueId('proyecto', existingIds),
            type: 'proyecto',
            title: resource.nombre || 'Proyecto',
            content: resource.descripcion || `Proyecto: ${resource.nombre}`,
            x, y,
            width: 350,
            height: 500,
            fontSize: 14,
            proyectoData: {
              id: resource.id,
              nombre: resource.nombre || 'Proyecto',
              descripcion: resource.descripcion || null,
              icono: resource.icono || null
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
        // MISIÓN ORGANIZACIÓN
        else if (resource.type === 'mision-organizacion') {
          console.log('🎯 [PIZARRA DROP] Detectado MISIÓN ORGANIZACIÓN');
          console.log('🎯 [PIZARRA DROP] Datos de misión recibidos:', resource);

          setCards(prev => [...prev, {
            id: generateUniqueId('mision-org', existingIds),
            type: 'mision-organizacion',
            title: resource.title || 'Nueva Misión',
            content: resource.description || '',
            x, y,
            width: 350,
            height: 500,
            fontSize: 14,
            misionData: {
              id_mision: resource.id_mision,
              title: resource.title || 'Nueva Misión',
              hours: resource.hours || 1,
              description: resource.description || '',
              estado: 'pendiente',
              subtareas: [],
              entregas: [],
              id_usuario_asignado: resource.id_usuario || null,
              idCreador: resource.id_creador,
              isRunning: false,
              card_todos: resource.card_todos || []
            }
          }]);
          console.log('✅ [PIZARRA DROP] Card de misión organización creada');
          return;
        }
        // MISIÓN (legacy)
        else if (resource.title && resource.hours !== undefined) {
          console.log('🎯 [PIZARRA DROP] Detectado MISIÓN (legacy)');
          console.log('🎯 [PIZARRA DROP] Datos de misión recibidos:', {
            id_usuario: resource.id_usuario,
            id_creador: resource.id_creador,
            id: resource.id,
            title: resource.title,
            hours: resource.hours,
            card_todos: resource.card_todos
          });

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
            width: 280,
            height: 400,
            fontSize: 18,
            misionData: {
              title: resource.title || 'Nueva Misión',
              hours: resource.hours || 1,
              description: resource.description || resource.title,
              idCreador: resource.id_creador,
              id_usuario: resource.id_usuario,
              id_mision: resource.id?.toString(),
              card_todos: resource.card_todos || []
            }
          }]);
          console.log('✅ [PIZARRA DROP] Card de misión creada con id_usuario:', resource.id_usuario, 'y id_creador:', resource.id_creador, 'y card_todos:', resource.card_todos);
          return;
        }
        // RECURSO
        else if (resource.name && resource.resourceType) {
          console.log('📦 [PIZARRA DROP] Detectado RECURSO');
          console.log('📦 [PIZARRA DROP] Datos de recurso recibidos:', resource);
          setCards(prev => [...prev, {
            id: generateUniqueId('resource', existingIds),
            type: 'resource',
            title: resource.name,
            content: `Tipo: ${resource.resourceType}`,
            x, y,
            width: 280,
            height: 220,
            fontSize: 18,
            recursoData: {
              name: resource.name,
              resourceType: resource.resourceType,
              url: resource.url || null,
              icon: resource.icon || null,
              color: resource.color || 'bg-blue-500'
            }
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
