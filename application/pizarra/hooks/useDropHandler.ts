import { useState, useCallback } from 'react';
import { Card } from '../types';
import { generateUniqueId } from '../utils/idGenerator';

export const useDropHandler = (
  setCards: React.Dispatch<React.SetStateAction<Card[]>>,
  panOffset: { x: number; y: number },
  canvasRef: React.RefObject<HTMLDivElement>,
  cards: Card[],
  readOnly: boolean = false,
  isOrganizacion: boolean = false,
  autoConnectMisionToProyecto?: (misionCardId: string, misionId: number) => void,
  autoConnectProyectoToMisiones?: (proyectoCardId: string, proyectoId: number) => void,
  centerOnCard?: (cardId: string) => void,
  findCardByMisionId?: (misionId: number) => string | null,
  addUsuarioCard?: (userData: { userId: string; name: string; avatar?: string; color?: string; online?: boolean }) => void,
  addProyectoCard?: (proyectoData: { id: number; nombre: string; descripcion?: string | null; icono?: string | null; id_organizacion?: number | null; colors?: any; created_at?: string; github_url?: string | null; sitio_web_url?: string | null; tecnologias?: string[] | null }, isOrganizacion: boolean) => void,
  addRecursoCard?: (recursoData: { id: number; name: string; resourceType: string; url?: string | null; icon?: string | null; color?: string }) => void
) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isReceivingDrag, setIsReceivingDrag] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
    setIsReceivingDrag(true);
  }, [readOnly]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    if (!(e.relatedTarget instanceof Node) || !e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
      setIsReceivingDrag(false);
    }
  }, [readOnly]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
  }, [readOnly]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (readOnly) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      setIsReceivingDrag(false);
      return;
    }

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
          console.log('📁 [PIZARRA DROP] Es organización:', isOrganizacion);

          // Usar addProyectoCard si está disponible (tiene validación de duplicados)
          if (addProyectoCard) {
            console.log('📁 [PIZARRA DROP] Usando addProyectoCard con validación');
            addProyectoCard({
              id: resource.id,
              nombre: resource.nombre || 'Proyecto',
              descripcion: resource.descripcion || null,
              icono: resource.icono || null,
              id_organizacion: resource.id_organizacion || null,
              colors: resource.colors || null,
              created_at: resource.created_at,
              github_url: resource.github_url || null,
              sitio_web_url: resource.sitio_web_url || null,
              tecnologias: resource.tecnologias || null
            }, isOrganizacion);
          } else {
            // Fallback: crear directamente (sin validación)
            console.log('📁 [PIZARRA DROP] Creando proyecto directamente (sin validación)');
            const cardType = isOrganizacion ? 'proyecto-organizacion' : 'proyecto';
            const newProyectoCardId = generateUniqueId(cardType, existingIds);

            setCards(prev => [...prev, {
              id: newProyectoCardId,
              type: cardType,
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
                icono: resource.icono || null,
                id_organizacion: resource.id_organizacion || null,
                colors: resource.colors || null,
                created_at: resource.created_at,
                github_url: resource.github_url || null,
                sitio_web_url: resource.sitio_web_url || null,
                tecnologias: resource.tecnologias || null
              }
            }]);

            // Auto-conectar proyecto a sus misiones si existen en la pizarra
            if (resource.id && autoConnectProyectoToMisiones && isOrganizacion) {
              console.log('🔗 [AUTO-CONEXIÓN] Iniciando auto-conexión para ProyectoCardOrganizacion...');
              autoConnectProyectoToMisiones(newProyectoCardId, resource.id);
            }
          }

          return;
        }
        // USUARIO
        else if (resource.name && resource.avatar && resource.color && resource.online !== undefined) {
          console.log('👤 [PIZARRA DROP] Detectado USUARIO');
          
          // Usar addUsuarioCard si está disponible (tiene validación de duplicados)
          if (addUsuarioCard) {
            console.log('👤 [PIZARRA DROP] Usando addUsuarioCard con validación');
            addUsuarioCard({
              userId: resource.userId || '',
              name: resource.name || 'Usuario',
              avatar: resource.avatar || 'US',
              color: resource.color || 'bg-blue-500',
              online: resource.online || false
            });
          } else {
            // Fallback: crear directamente CON validación
            console.log('👤 [PIZARRA DROP] Creando usuario directamente con validación');

            // Verificar si ya existe una card con este usuario
            const existingUser = cards.find(card =>
              card.type === 'usuario' &&
              card.usuarioData?.userId === resource.userId
            );

            if (existingUser) {
              console.log('⚠️ [PIZARRA DROP] Ya existe una card de este usuario:', resource.userId);
              return;
            }

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
          }
          return;
        }
        // MISIÓN ORGANIZACIÓN
        else if (resource.type === 'mision-organizacion') {
          console.log('🎯 [PIZARRA DROP] Detectado MISIÓN ORGANIZACIÓN');
          console.log('🎯 [PIZARRA DROP] Datos de misión recibidos:', resource);

          // Verificar si ya existe una card con esta misión
          const existingMision = cards.find(card =>
            card.type === 'mision-organizacion' &&
            card.misionData?.id_mision === resource.id_mision
          );

          if (existingMision) {
            console.log('⚠️ [PIZARRA DROP] Ya existe una card de esta misión, redirigiendo...', resource.id_mision);
            if (centerOnCard) {
              centerOnCard(existingMision.id);
            }
            return;
          }

          const newMisionCardId = generateUniqueId('mision-org', existingIds);

          setCards(prev => [...prev, {
            id: newMisionCardId,
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
              estado: resource.estado || 'pendiente',
              subtareas: [],
              entregas: [],
              id_usuario_asignado: resource.id_usuario || null,
              idCreador: resource.id_creador,
              isRunning: false,
              card_todos: resource.card_todos || [] // 📋 Pasar card_todos
            }
          }]);
          console.log('✅ [PIZARRA DROP] Card de misión organización creada');

          // Auto-conectar misión a su proyecto si existe
          // SOLO en pizarra de organización
          if (resource.id_mision && autoConnectMisionToProyecto && isOrganizacion) {
            console.log('🔗 [AUTO-CONEXIÓN] Iniciando auto-conexión de MisionCardOrganizacion a su proyecto...');
            autoConnectMisionToProyecto(newMisionCardId, resource.id_mision);
          }

          // 📋 Si la misión tiene card_todos, crear los TODO cards (ocultos fuera de vista)
          // Esto es necesario para que las tareas puedan guardarse en la BD con la foreign key correcta
          if (resource.card_todos && Array.isArray(resource.card_todos) && resource.card_todos.length > 0) {
            console.log('📋 [PIZARRA DROP] Misión tiene', resource.card_todos.length, 'TODOs asociados. Creando cards TODO ocultos...');

            // Crear cards TODO para cada referencia (posicionados muy lejos, fuera de vista)
            resource.card_todos.forEach((todoCardId: string, index: number) => {
              // Posicionar muy lejos para que no estorben visualmente
              const todoX = x + 10000; // 10000px a la derecha (fuera de vista)
              const todoY = y + (index * 220);

              setCards(prev => {
                // Verificar que no exista ya un TODO card con ese ID
                const exists = prev.some(card => card.id === todoCardId);
                if (exists) {
                  console.log('ℹ️ [PIZARRA DROP] TODO card ya existe:', todoCardId);
                  return prev;
                }

                console.log('📋 [PIZARRA DROP] Creando TODO card oculto:', todoCardId);
                return [...prev, {
                  id: todoCardId, // Usar el UUID de la BD directamente
                  type: 'todo',
                  title: 'Lista de Tareas (oculto)',
                  content: '',
                  x: todoX,
                  y: todoY,
                  width: 250,
                  height: 200,
                  fontSize: 18,
                  todos: [] // Las tareas se cargarán desde la BD automáticamente
                }];
              });
            });
          }

          return;
        }
        // ACTIVIDAD ORGANIZACIÓN
        else if (resource.type === 'actividad-organizacion') {
          console.log('📅 [PIZARRA DROP] Detectado ACTIVIDAD ORGANIZACIÓN');
          console.log('📅 [PIZARRA DROP] Datos de actividad recibidos:', resource);

          // Verificar si ya existe una card con esta actividad
          const existingActividad = cards.find(card =>
            card.type === 'actividad-organizacion' &&
            card.actividadData?.id_actividad === resource.id_actividad
          );

          if (existingActividad) {
            console.log('⚠️ [PIZARRA DROP] Ya existe una card de esta actividad, redirigiendo...', resource.id_actividad);
            if (centerOnCard) {
              centerOnCard(existingActividad.id);
            }
            return;
          }

          const newActividadCardId = generateUniqueId('actividad-org', existingIds);

          setCards(prev => [...prev, {
            id: newActividadCardId,
            type: 'actividad-organizacion',
            title: resource.descripcion || 'Nueva Actividad',
            content: `📅 ${resource.fecha ? new Date(resource.fecha).toLocaleDateString('es-ES') : 'Sin fecha'}\n⏰ ${resource.hora_inicio ? new Date(resource.hora_inicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'Sin hora'}\n⌛ ${resource.cant_horas || 0}h estimadas${resource.link ? `\n🔗 ${resource.link}` : ''}`,
            x, y,
            width: 350,
            height: 300,
            fontSize: 14,
            actividadData: {
              id_actividad: resource.id_actividad,
              descripcion: resource.descripcion || 'Nueva Actividad',
              fecha: resource.fecha,
              hora_inicio: resource.hora_inicio,
              cant_horas: resource.cant_horas,
              link: resource.link,
              id_usuario: resource.id_usuario,
              id_proyecto: resource.id_proyecto,
              tiempo_dedicado: resource.tiempo_dedicado
            }
          }]);
          console.log('✅ [PIZARRA DROP] Card de actividad organización creada');

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
            hours: resource.hours
          });

          // Verificar si ya existe una card de esta misión específica
          const misionId = typeof resource.id === 'string' ? parseInt(resource.id) : resource.id;
          const existingCardId = findCardByMisionId ? findCardByMisionId(misionId) : null;

          if (existingCardId) {
            console.log('🎯 [PIZARRA DROP] La misión ya existe en la pizarra, navegando a ella...');
            if (centerOnCard) {
              centerOnCard(existingCardId);
            }
            return;
          }

          const newMisionCardId = generateUniqueId('mision', existingIds);

          setCards(prev => [...prev, {
            id: newMisionCardId,
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
              id_mision: resource.id?.toString()
            }
          }]);
          console.log('✅ [PIZARRA DROP] Card de misión creada con id_usuario:', resource.id_usuario, 'y id_creador:', resource.id_creador);

          // Auto-conectar misión a su proyecto si existe
          if (resource.id && autoConnectMisionToProyecto) {
            const misionId = typeof resource.id === 'string' ? parseInt(resource.id) : resource.id;
            autoConnectMisionToProyecto(newMisionCardId, misionId);
          }

          return;
        }
        // RECURSO
        else if (resource.name && resource.resourceType) {
          console.log('📦 [PIZARRA DROP] Detectado RECURSO');
          console.log('📦 [PIZARRA DROP] Datos de recurso recibidos:', resource);
          
          // Usar addRecursoCard si está disponible (tiene validación de duplicados)
          if (addRecursoCard && resource.id) {
            console.log('📦 [PIZARRA DROP] Usando addRecursoCard con validación');
            addRecursoCard({
              id: resource.id,
              name: resource.name,
              resourceType: resource.resourceType,
              url: resource.url || null,
              icon: resource.icon || null,
              color: resource.color || 'bg-blue-500'
            });
          } else {
            // Fallback: crear directamente CON validación
            console.log('📦 [PIZARRA DROP] Creando recurso directamente con validación');

            // Verificar si ya existe una card con este recurso
            const existingRecurso = cards.find(card =>
              card.type === 'resource' &&
              card.recursoData?.id === resource.id
            );

            if (existingRecurso) {
              console.log('⚠️ [PIZARRA DROP] Ya existe una card de este recurso:', resource.id);
              return;
            }

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
                id: resource.id,
                name: resource.name,
                resourceType: resource.resourceType,
                url: resource.url || null,
                icon: resource.icon || null,
                color: resource.color || 'bg-blue-500'
              }
            }]);
          }
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
        content: text, // Guardar todo el texto sin cortar
        x, y,
        width: 200,
        height: 100
      }]);
    }
  }, [panOffset, canvasRef, setCards, cards, readOnly, isOrganizacion, autoConnectMisionToProyecto, autoConnectProyectoToMisiones, centerOnCard, findCardByMisionId, addUsuarioCard, addProyectoCard, addRecursoCard]);

  return {
    isDragOver,
    isReceivingDrag,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop
  };
};
