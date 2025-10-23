import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/infrastructure/services/SupabaseClient';

export interface BoardHistoryItem {
  id: string;
  title: string;
  type: 'Nota' | 'Tarea' | 'Actividad' | 'Mision' | 'Proyecto' | 'Chat' | 'Recurso' | 'Imagen';
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
}

interface UseChartHistoryReturn {
  historyData: BoardHistorySnapshot[];
  chartBarHeights: number[];
  chartMaxHeight: number;
  loading: boolean;
  error: string | null;
}

/**
 * Hook para obtener datos históricos de la pizarra agrupados por fecha
 * para generar el gráfico de barras
 */
export const useChartHistory = (idUsuario: string | null): UseChartHistoryReturn => {
  const [historyData, setHistoryData] = useState<BoardHistorySnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistoryData = useCallback(async () => {
    if (!idUsuario) {
      setHistoryData([]);
      return;
    }

    // Solo ejecutar en el cliente
    if (typeof window === 'undefined') {
      // console.log('⚠️ useChartHistory ejecutándose en el servidor, saltando...');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // console.log('📊 Cargando datos históricos para el chart:', idUsuario);

      // Obtener los últimos 7 días de datos
      // NO verificar sesión aquí para evitar rate limiting
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);

      // Query para obtener cards agrupadas por fecha desde pizarras del usuario
      const { data: pizarrasData, error: pizarrasError } = await supabase
        .from('pizarras')
        .select('id, created_at')
        .eq('id_usuario', idUsuario)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (pizarrasError) {
        throw new Error(pizarrasError.message);
      }

      const historySnapshots: BoardHistorySnapshot[] = [];

      // Para cada pizarra, obtener las cards y agrupar por fecha
      for (const pizarra of pizarrasData || []) {
        const { data: cardsData, error: cardsError } = await supabase
          .from('cards')
          .select('*')
          .eq('id_pizarra', pizarra.id);

        if (cardsError) {
          console.error('Error obteniendo cards:', cardsError);
          continue;
        }

        if (cardsData && cardsData.length > 0) {
          const fecha = new Date(pizarra.created_at);
          const fechaFormateada = fecha.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });

          // Contar tipos de cards
          const notasCount = cardsData.filter(c => c.type === 'note' || c.type === 'nota').length;
          const tareasCount = cardsData.filter(c => c.type === 'todo' || c.type === 'tarea').length;
          const recursosCount = cardsData.filter(c => 
            c.type === 'mision' || 
            c.type === 'usuario' || 
            c.type === 'proyecto' ||
            c.type === 'recurso'
          ).length;

          // Crear items de ejemplo basados en las cards reales
          const items: BoardHistoryItem[] = cardsData.map((card, index) => ({
            id: card.id,
            title: card.title || 'Sin título',
            type: getCardTypeLabel(card.type),
            owner: 'Usuario',
            summary: card.content || 'Sin contenido',
            lastUpdated: new Date(card.updated_at).toLocaleDateString('es-ES') + ' • ' +
                        new Date(card.updated_at).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit'
                        }),
            cardData: card // Guardar todos los datos del card
          }));

          // Determinar el tipo principal de snapshot
          let snapshotType = 'Elementos';
          let highlights: string[] = [];

          if (notasCount > tareasCount && notasCount > recursosCount) {
            snapshotType = 'Notas';
            highlights = [
              `${notasCount} notas creadas`,
              `${tareasCount} tareas registradas`,
              'Ideas y recordatorios capturados'
            ];
          } else if (tareasCount > recursosCount) {
            snapshotType = 'Tareas';
            highlights = [
              `${tareasCount} tareas creadas`,
              `${notasCount} notas de apoyo`,
              'Organización de pendientes'
            ];
          } else {
            snapshotType = 'Recursos';
            highlights = [
              `${recursosCount} recursos agregados`,
              `${notasCount + tareasCount} elementos adicionales`,
              'Material de trabajo organizado'
            ];
          }

          historySnapshots.push({
            id: `${snapshotType.toLowerCase()}-${pizarra.id}`,
            label: snapshotType,
            value: cardsData.length,
            savedAt: fechaFormateada,
            summary: `Elementos guardados en la pizarra del ${fechaFormateada}`,
            highlights,
            items
          });
        }
      }

      // Si no hay datos reales, crear datos de ejemplo
      if (historySnapshots.length === 0) {
        const fallbackData = createFallbackData();
        setHistoryData(fallbackData);
      } else {
        // Limitar a los últimos 5 días y ordenar
        const sortedData = historySnapshots
          .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
          .slice(0, 5);
        setHistoryData(sortedData);
      }

      // console.log('✅ Datos históricos cargados:', historySnapshots.length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('❌ Error cargando datos históricos:', errorMessage);
      setError(errorMessage);
      
      // En caso de error, usar datos de ejemplo
      setHistoryData(createFallbackData());
    } finally {
      setLoading(false);
    }
  }, [idUsuario]);

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

  // Calcular alturas de las barras basadas en los valores
  const chartBarHeights = historyData.map(snapshot => {
    const maxValue = 20; // Valor máximo esperado
    const minHeight = 24; // Altura mínima de la barra
    const maxHeight = 80; // Altura máxima de la barra
    const ratio = Math.min(snapshot.value / maxValue, 1);
    return Math.max(minHeight, ratio * maxHeight);
  });

  const chartMaxHeight = Math.max(...chartBarHeights, 80);

  // Cargar datos al montar el componente con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadHistoryData();
    }, 1000); // Esperar 1 segundo antes de cargar para evitar rate limiting

    return () => clearTimeout(timer);
  }, [loadHistoryData]);

  return {
    historyData,
    chartBarHeights,
    chartMaxHeight,
    loading,
    error
  };
};