import { useState, useEffect, useCallback, RefObject } from 'react';
import { supabase } from '@/infrastructure/services/SupabaseClient';
import { PizarraRef } from '@/application/pizarra/pizarra';
import { SupabasePizarraRepository } from '@/infrastructure/datasource/SupabasePizarraRepository';

export interface BoardHistoryItem {
  id: string;
  title: string;
  type: 'Nota' | 'Tarea' | 'Actividad' | 'Mision' | 'Proyecto' | 'Chat' | 'Recurso' | 'Imagen' |'Ticket' ;
  owner: string;
  summary: string;
  lastUpdated: string;
  cardData?: any; // Datos completos del card para restaurar
}

export interface BoardHistorySnapshot {
  id: string;
  label: string;
  value: number;
  savedAt: string;
  summary: string;
  highlights: string[];
  items: BoardHistoryItem[];
  pizarraId?: string; // ID de la pizarra en Supabase
}

interface UseChartHistoryReturn {
  snapshots: BoardHistorySnapshot[];
  loading: boolean;
  error: string | null;
  getSnapshotById: (id: string) => Promise<BoardHistorySnapshot | null>;
}

/**
 * Hook para obtener datos históricos de la pizarra agrupados por fecha
 * para generar el gráfico de barras
 */
export const useChartHistory = (pizarraRef: RefObject<PizarraRef | null>, userId?: string): UseChartHistoryReturn => {
  const [historyData, setHistoryData] = useState<BoardHistorySnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistoryData = useCallback(async () => {
    if (!pizarraRef?.current) {
      setHistoryData([]);
      return;
    }

    // Solo ejecutar en el cliente
    if (typeof window === 'undefined') {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Si tenemos userId, cargar desde Supabase
      if (userId) {
        const pizarraRepo = new SupabasePizarraRepository();
        const pizarras = await pizarraRepo.getUltimasPizarras(userId, 5);

        if (pizarras.length > 0) {
          // Obtener conteo de cards para cada pizarra
          const { supabase } = await import('@/infrastructure/services/SupabaseClient');

          const snapshotsPromises = pizarras.map(async (pizarra) => {
            const date = new Date(pizarra.created_at);

            // Obtener conteo de cards para esta pizarra
            const { count, error } = await supabase
              .from('cards')
              .select('*', { count: 'exact', head: true })
              .eq('id_pizarra', pizarra.id);

            const cardCount = error ? 0 : (count || 0);

            return {
              id: pizarra.id,
              pizarraId: pizarra.id,
              label: date.toLocaleDateString('es-ES', { weekday: 'short' }),
              value: cardCount,
              savedAt: date.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              }),
              summary: `${cardCount} elementos guardados`,
              highlights: cardCount > 0 ? [`${cardCount} elementos`] : ['Sin elementos'],
              items: []
            };
          });

          const snapshots = await Promise.all(snapshotsPromises);

          setHistoryData(snapshots);
          setLoading(false);
          return;
        }
      }
      // Obtener historial desde localStorage usando el storagePrefix de la pizarra
      const storagePrefix = 'real'; // MainScreen usa 'real' como prefijo
      const historyKey = `pizarra-${storagePrefix}-history`;

      const storedHistory = localStorage.getItem(historyKey);

      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory);

        // Convertir el historial guardado a snapshots
        const snapshots: BoardHistorySnapshot[] = Object.entries(parsedHistory)
          .map(([dateKey, data]: [string, any]) => {
            const cards = data.cards || [];
            const date = new Date(data.timestamp || dateKey);

            // Contar tipos de cards
            const notasCount = cards.filter((c: any) => c.type === 'text' || c.type === 'note').length;
            const tareasCount = cards.filter((c: any) => c.type === 'todo').length;
            const actividadesCount = cards.filter((c: any) => c.type === 'actividad').length;
            const misionesCount = cards.filter((c: any) => c.type === 'mision').length;
            const recursosCount = cards.filter((c: any) =>
              c.type === 'resource' ||
              c.type === 'usuario' ||
              c.type === 'proyecto'
            ).length;

            // Crear items del snapshot
            const items: BoardHistoryItem[] = cards.map((card: any) => ({
              id: card.id,
              title: card.title || 'Sin título',
              type: getCardTypeLabel(card.type),
              owner: 'Usuario',
              summary: card.content || card.description || 'Sin contenido',
              lastUpdated: date.toLocaleDateString('es-ES') + ' • ' +
                          date.toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit'
                          }),
              cardData: card
            }));

            // Determinar el tipo principal de snapshot
            let snapshotType = 'Elementos';
            let highlights: string[] = [];

            if (notasCount > tareasCount && notasCount > recursosCount) {
              snapshotType = 'Notas';
              highlights = [
                `${notasCount} notas creadas`,
                `${tareasCount} tareas`,
                'Ideas capturadas'
              ];
            } else if (tareasCount >= notasCount && tareasCount >= recursosCount) {
              snapshotType = 'Tareas';
              highlights = [
                `${tareasCount} tareas`,
                `${notasCount} notas`,
                'Organización de pendientes'
              ];
            } else {
              snapshotType = 'Recursos';
              highlights = [
                `${recursosCount} recursos`,
                `${notasCount + tareasCount} otros elementos`,
                'Material organizado'
              ];
            }

            return {
              id: dateKey,
              label: date.toLocaleDateString('es-ES', { weekday: 'short' }),
              value: cards.length,
              savedAt: date.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              }),
              summary: `${cards.length} elementos guardados`,
              highlights,
              items
            };
          })
          .sort((a, b) => {
            // Ordenar por fecha más reciente primero
            const dateA = new Date(a.id);
            const dateB = new Date(b.id);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 5); // Solo los últimos 5 días

        setHistoryData(snapshots);
      } else {
        // Si no hay historial, crear datos de ejemplo
        setHistoryData(createFallbackData());
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('❌ Error cargando datos históricos:', errorMessage);
      setError(errorMessage);

      // En caso de error, usar datos de ejemplo
      setHistoryData(createFallbackData());
    } finally {
      setLoading(false);
    }
  }, [pizarraRef, userId]);

  // Función auxiliar para obtener etiqueta del tipo de card
  const getCardTypeLabel = (type: string): 'Nota' | 'Tarea' | 'Actividad' | 'Mision' | 'Proyecto' | 'Chat' | 'Recurso' | 'Imagen' => {
    switch(type) {
      case 'note':
      case 'nota':
      case 'text':
        return 'Nota';
      case 'todo':
      case 'tarea':
        return 'Tarea';
      case 'actividad':
        return 'Actividad';
      case 'mision':
        return 'Mision';
      case 'proyecto':
        return 'Proyecto';
      case 'usuario':
        return 'Chat';
      case 'image':
        return 'Imagen';
      case 'resource':
      case 'file':
      case 'link':
        return 'Recurso';
      default:
        return 'Nota';
    }
  };

  // Función para crear datos de ejemplo cuando no hay datos reales
  const createFallbackData = (): BoardHistorySnapshot[] => {
    const today = new Date();
    return [
      {
        id: 'notas-ejemplo',
        label: 'Notas',
        value: 8,
        savedAt: today.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
        summary: 'Notas y recordatorios del día',
        highlights: [
          'Ideas principales capturadas',
          'Recordatorios importantes',
          'Notas de reuniones'
        ],
        items: [
          {
            id: 'nota-1',
            title: 'Reunión de equipo',
            type: 'Nota',
            owner: 'Usuario',
            summary: 'Puntos clave de la reunión semanal',
            lastUpdated: 'Hoy • 14:30'
          }
        ]
      },
      {
        id: 'tareas-ejemplo',
        label: 'Tareas',
        value: 5,
        savedAt: new Date(today.getTime() - 24 * 60 * 60 * 1000).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
        summary: 'Lista de tareas pendientes',
        highlights: [
          'Tareas organizadas por prioridad',
          'Deadlines establecidos',
          'Progreso documentado'
        ],
        items: [
          {
            id: 'tarea-1',
            title: 'Revisar documentación',
            type: 'Tarea',
            owner: 'Usuario',
            summary: 'Actualizar docs del proyecto',
            lastUpdated: 'Ayer • 16:45'
          }
        ]
      }
    ];
  };

  // Función para obtener un snapshot específico por ID
  const getSnapshotById = useCallback(async (id: string): Promise<BoardHistorySnapshot | null> => {
    try {
      // Buscar en los datos ya cargados
      const snapshot = historyData.find(s => s.id === id);
      if (snapshot) {
        // Si el snapshot tiene pizarraId, cargar las cards desde Supabase
        if (snapshot.pizarraId) {
          try {
            const { supabase } = await import('@/infrastructure/services/SupabaseClient');
            const { data: cardsEnBD, error: cardsError } = await supabase
              .from('cards')
              .select('*')
              .eq('id_pizarra', snapshot.pizarraId);

            if (!cardsError && cardsEnBD && cardsEnBD.length > 0) {
              // Cargar datos relacionados para cada card
              const cardsConDatosCompletos = await Promise.all(cardsEnBD.map(async (cardDB: any) => {
                let cardConDatos = { ...cardDB };

                // Para cards de tipo imagen, cargar la URL desde card_images
                if (cardDB.type === 'image') {
                  const { data: cardImage } = await supabase
                    .from('card_images')
                    .select('image_url')
                    .eq('id_card', cardDB.id)
                    .single();

                  if (cardImage?.image_url) {
                    cardConDatos.image_url = cardImage.image_url;
                  }
                }

                // Para cards de tipo todo, cargar los todos desde card_todos
                if (cardDB.type === 'todo') {
                  const { data: cardTodos } = await supabase
                    .from('card_todos')
                    .select('*')
                    .eq('id_card', cardDB.id)
                    .order('position', { ascending: true });

                  if (cardTodos && cardTodos.length > 0) {
                    cardConDatos.todos = cardTodos.map((todo: any) => ({
                      id: todo.todo_id,
                      text: todo.text,
                      completed: todo.completed
                    }));
                  }
                }

                // Para cards de tipo proyecto, cargar datos desde card_proyectos y proyectos
                if (cardDB.type === 'proyecto' || cardDB.type === 'proyecto-organizacion') {
                  const { data: cardProyecto } = await supabase
                    .from('card_proyectos')
                    .select('id_proyecto')
                    .eq('id_card', cardDB.id)
                    .single();

                  if (cardProyecto?.id_proyecto) {
                    const { data: proyecto } = await supabase
                      .from('proyecto')
                      .select('*')
                      .eq('id', cardProyecto.id_proyecto)
                      .single();

                    if (proyecto) {
                      cardConDatos.proyectoData = {
                        id: proyecto.id,
                        nombre: proyecto.nombre,
                        descripcion: proyecto.descripcion,
                        icono: proyecto.icono,
                        id_organizacion: proyecto.id_organizacion,
                        colors: proyecto.colors,
                        created_at: proyecto.created_at,
                        github_url: proyecto.github_url,
                        sitio_web_url: proyecto.sitio_web_url,
                        tecnologias: proyecto.tecnologias
                      };
                    }
                  }
                }

                return cardConDatos;
              }));

              // Convertir las cards a items del snapshot
              const items: BoardHistoryItem[] = cardsConDatosCompletos.map((cardConDatos: any) => ({
                id: cardConDatos.id,
                title: cardConDatos.title || 'Sin título',
                type: getCardTypeLabel(cardConDatos.type),
                owner: 'Usuario',
                summary: cardConDatos.content || 'Sin contenido',
                lastUpdated: new Date(cardConDatos.created_at).toLocaleDateString('es-ES') + ' • ' +
                            new Date(cardConDatos.created_at).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit'
                            }),
                cardData: cardConDatos
              }));

              // Contar tipos de cards
              const notasCount = cardsEnBD.filter((c: any) => c.type === 'text' || c.type === 'note').length;
              const tareasCount = cardsEnBD.filter((c: any) => c.type === 'todo').length;
              const actividadesCount = cardsEnBD.filter((c: any) => c.type === 'actividad').length;
              const misionesCount = cardsEnBD.filter((c: any) => c.type === 'mision').length;

              let highlights: string[] = [];
              if (notasCount > 0) highlights.push(`${notasCount} notas`);
              if (tareasCount > 0) highlights.push(`${tareasCount} tareas`);
              if (actividadesCount > 0) highlights.push(`${actividadesCount} actividades`);
              if (misionesCount > 0) highlights.push(`${misionesCount} misiones`);

              return {
                ...snapshot,
                value: cardsEnBD.length,
                summary: `${cardsEnBD.length} elementos guardados`,
                highlights: highlights.length > 0 ? highlights : ['Sin elementos'],
                items
              };
            }
          } catch (error) {
            console.error('Error cargando cards de la pizarra:', error);
          }
        }

        return snapshot;
      }

      // Si no está en los datos cargados, buscar en localStorage
      const storagePrefix = 'real';
      const historyKey = `pizarra-${storagePrefix}-history`;
      const storedHistory = localStorage.getItem(historyKey);

      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory);
        const data = parsedHistory[id];

        if (data) {
          const cards = data.cards || [];
          const date = new Date(data.timestamp || id);

          // Contar tipos de cards
          const notasCount = cards.filter((c: any) => c.type === 'text' || c.type === 'note').length;
          const tareasCount = cards.filter((c: any) => c.type === 'todo').length;
          const recursosCount = cards.filter((c: any) =>
            c.type === 'resource' ||
            c.type === 'usuario' ||
            c.type === 'proyecto'
          ).length;

          // Crear items del snapshot
          const items: BoardHistoryItem[] = cards.map((card: any) => ({
            id: card.id,
            title: card.title || 'Sin título',
            type: getCardTypeLabel(card.type),
            owner: 'Usuario',
            summary: card.content || card.description || 'Sin contenido',
            lastUpdated: date.toLocaleDateString('es-ES') + ' • ' +
                        date.toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit'
                        }),
            cardData: card
          }));

          // Determinar el tipo principal
          let snapshotType = 'Elementos';
          let highlights: string[] = [];

          if (notasCount > tareasCount && notasCount > recursosCount) {
            snapshotType = 'Notas';
            highlights = [
              `${notasCount} notas creadas`,
              `${tareasCount} tareas`,
              'Ideas capturadas'
            ];
          } else if (tareasCount >= notasCount && tareasCount >= recursosCount) {
            snapshotType = 'Tareas';
            highlights = [
              `${tareasCount} tareas`,
              `${notasCount} notas`,
              'Organización de pendientes'
            ];
          } else {
            snapshotType = 'Recursos';
            highlights = [
              `${recursosCount} recursos`,
              `${notasCount + tareasCount} otros elementos`,
              'Material organizado'
            ];
          }

          return {
            id,
            label: date.toLocaleDateString('es-ES', { weekday: 'short' }),
            value: cards.length,
            savedAt: date.toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            }),
            summary: `${cards.length} elementos guardados`,
            highlights,
            items
          };
        }
      }

      return null;
    } catch (err) {
      console.error('❌ Error obteniendo snapshot:', err);
      return null;
    }
  }, [historyData]);

  // Cargar datos al montar el componente
  useEffect(() => {
    loadHistoryData();
  }, [loadHistoryData]);

  return {
    snapshots: historyData,
    loading,
    error,
    getSnapshotById
  };
};