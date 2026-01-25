import { useEffect, useCallback } from 'react';
import { Card, Connection } from '../types';

interface PizarraStorageData {
  cards: Card[];
  connections: Connection[];
  panOffset: { x: number; y: number };
  lastSaved: string;
  savedDate: string; // Fecha en formato YYYY-MM-DD para comparar días
}

export const usePizarraLocalStorage = (
  cards: Card[],
  connections: Connection[],
  panOffset: { x: number; y: number },
  setCards: React.Dispatch<React.SetStateAction<Card[]>>,
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>,
  setPanOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>,
  storagePrefix: string = 'real',
  isOrganizacionPizarra: boolean = false, // Nueva prop para identificar pizarras de organización
  isInitialized: boolean = false // Estado de inicialización de la pizarra
) => {
  // Generar claves de almacenamiento con prefijo
  const PIZARRA_STORAGE_KEY = `pizarra-${storagePrefix}-cards-v1`;
  const CONNECTIONS_STORAGE_KEY = `pizarra-${storagePrefix}-connections-v1`;
  const PAN_OFFSET_STORAGE_KEY = `pizarra-${storagePrefix}-pan-offset-v1`;
  const DATE_STORAGE_KEY = `pizarra-${storagePrefix}-date-v1`;
  const HISTORY_STORAGE_KEY = `pizarra-${storagePrefix}-history`;
  const LAST_SUPABASE_LOAD_KEY = `pizarra-${storagePrefix}-last-supabase-load`;

  // Función helper para obtener la fecha del día en formato YYYY-MM-DD
  const getTodayDate = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Función helper para validar y parsear JSON
  const safeJsonParse = (jsonString: string | null, fallback: any = null) => {
    if (!jsonString || jsonString.trim() === '') {
      return fallback;
    }

    try {
      // Verificar que el string comience y termine correctamente
      const trimmed = jsonString.trim();
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        // console.warn('❌ [PIZARRA STORAGE] JSON no válido - no comienza con { o [');
        return fallback;
      }

      const parsed = JSON.parse(trimmed);
      return parsed;
    } catch (error) {
      // console.error('❌ [PIZARRA STORAGE] Error parseando JSON:', error);
      // console.error('❌ [PIZARRA STORAGE] JSON problemático:', jsonString.substring(0, 200) + '...');
      return fallback;
    }
  };

  // Función para guardar snapshot histórico
  const saveHistorySnapshot = useCallback((date: string, cardsToSave: Card[]) => {
    try {
      if (!cardsToSave || cardsToSave.length === 0) {
        console.log('📊 [HISTORY] No hay cards para guardar en el historial');
        return;
      }

      // Obtener historial existente
      const existingHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      const history = existingHistory ? safeJsonParse(existingHistory, {}) : {};

      // Agregar snapshot del día
      history[date] = {
        cards: cardsToSave,
        timestamp: new Date().toISOString(),
        cardCount: cardsToSave.length
      };

      // Limpiar snapshots antiguos (mantener solo últimos 30 días)
      const allDates = Object.keys(history).sort();
      if (allDates.length > 30) {
        const datesToKeep = allDates.slice(-30);
        const cleanedHistory: any = {};
        datesToKeep.forEach(d => {
          cleanedHistory[d] = history[d];
        });
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(cleanedHistory));
        console.log('📊 [HISTORY] Historial limpiado, manteniendo últimos 30 días');
      } else {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
      }

      console.log(`📊 [HISTORY] Snapshot guardado para ${date}:`, cardsToSave.length, 'cards');
    } catch (error) {
      console.error('❌ [HISTORY] Error guardando snapshot:', error);
    }
  }, [HISTORY_STORAGE_KEY]);

  // Función para verificar si necesita cargar desde Supabase (solo para pizarras de organización)
  const shouldLoadFromSupabase = useCallback((): boolean => {
    if (!isOrganizacionPizarra) return false;

    const todayDate = getTodayDate();
    const lastSupabaseLoad = localStorage.getItem(LAST_SUPABASE_LOAD_KEY);

    // Si nunca ha cargado desde Supabase, debe cargar
    if (!lastSupabaseLoad) {
      console.log('📥 [PIZARRA ORG] Primera carga del día - debe cargar desde Supabase');
      return true;
    }

    // Si la última carga fue en otro día, debe cargar
    if (lastSupabaseLoad !== todayDate) {
      console.log('📥 [PIZARRA ORG] Nuevo día detectado - debe cargar desde Supabase');
      return true;
    }

    console.log('💾 [PIZARRA ORG] Ya cargó desde Supabase hoy - usar localStorage');
    return false;
  }, [isOrganizacionPizarra, LAST_SUPABASE_LOAD_KEY]);

  // Función para marcar que se cargó desde Supabase
  const markSupabaseLoaded = useCallback(() => {
    const todayDate = getTodayDate();
    localStorage.setItem(LAST_SUPABASE_LOAD_KEY, todayDate);
    console.log('✅ [PIZARRA ORG] Marcado como cargado desde Supabase hoy:', todayDate);
  }, [LAST_SUPABASE_LOAD_KEY]);

  // Cargar datos desde localStorage al montar
  const loadFromLocalStorage = useCallback(() => {
    try {
      // Primero verificar si es el mismo día
      const savedDate = localStorage.getItem(DATE_STORAGE_KEY);
      const todayDate = getTodayDate();

      // console.log('📅 [PIZARRA STORAGE] Verificando fecha...');
      // console.log('   - Fecha guardada:', savedDate);
      // console.log('   - Fecha actual:', todayDate);

      // Si hay una fecha guardada y NO es el mismo día, guardar snapshot histórico antes de limpiar
      // EXCEPCIÓN: Las pizarras de organización NO se renuevan diariamente (persistencia permanente)
      if (savedDate && savedDate !== todayDate && !isOrganizacionPizarra) {
        console.log('🗑️ [PIZARRA STORAGE] ¡Nuevo día detectado! Guardando snapshot histórico antes de limpiar...');

        // Guardar snapshot del día anterior
        const savedCards = localStorage.getItem(PIZARRA_STORAGE_KEY);
        if (savedCards) {
          const parsedCards = safeJsonParse(savedCards, []) as Card[];
          if (parsedCards && Array.isArray(parsedCards) && parsedCards.length > 0) {
            saveHistorySnapshot(savedDate, parsedCards);
          }
        }

        // Ahora sí limpiar todo
        localStorage.removeItem(PIZARRA_STORAGE_KEY);
        localStorage.removeItem(CONNECTIONS_STORAGE_KEY);
        localStorage.removeItem(PAN_OFFSET_STORAGE_KEY);
        localStorage.removeItem(DATE_STORAGE_KEY);
        console.log('✅ [PIZARRA STORAGE] Pizarra limpiada. Comenzando con pizarra nueva del día:', todayDate);
        return; // Salir sin cargar nada
      }

      // Para pizarras de organización, actualizar la fecha sin limpiar
      if (isOrganizacionPizarra && savedDate !== todayDate) {
        console.log('📅 [PIZARRA STORAGE] Pizarra de organización: actualizando fecha sin limpiar datos');
        localStorage.setItem(DATE_STORAGE_KEY, todayDate);
      }

      const savedCards = localStorage.getItem(PIZARRA_STORAGE_KEY);
      const savedConnections = localStorage.getItem(CONNECTIONS_STORAGE_KEY);
      const savedPanOffset = localStorage.getItem(PAN_OFFSET_STORAGE_KEY);

      if (savedCards) {
        const parsedCards = safeJsonParse(savedCards, []) as Card[];
        if (parsedCards && Array.isArray(parsedCards)) {
          console.log('📦 [PIZARRA STORAGE] Cards cargadas desde localStorage:', parsedCards.length);

          // Restaurar Date objects en ChatMessages
          const cardsWithDates = parsedCards.map(card => {
            try {
              if (card.usuarioData?.messages) {
                return {
                  ...card,
                  usuarioData: {
                    ...card.usuarioData,
                    messages: card.usuarioData.messages.map(msg => {
                      try {
                        return {
                          ...msg,
                          timestamp: new Date(msg.timestamp)
                        };
                      } catch (dateError) {
                        console.warn('❌ [PIZARRA STORAGE] Error parseando fecha en mensaje:', dateError);
                        return {
                          ...msg,
                          timestamp: new Date() // Fallback a fecha actual
                        };
                      }
                    })
                  }
                };
              }
              return card;
            } catch (cardError) {
              console.warn('❌ [PIZARRA STORAGE] Error procesando card:', cardError);
              return card;
            }
          });

          console.log('📦 [PIZARRA STORAGE] Ejecutando setCards() con', cardsWithDates.length, 'cards desde localStorage');
          setCards(cardsWithDates);
        } else {
          console.warn('❌ [PIZARRA STORAGE] Cards no válidas, usando array vacío');
          localStorage.removeItem(PIZARRA_STORAGE_KEY);
        }
      }

      if (savedConnections) {
        const parsedConnections = safeJsonParse(savedConnections, []) as Connection[];
        if (parsedConnections && Array.isArray(parsedConnections)) {
          // console.log('🔗 [PIZARRA STORAGE] Conexiones cargadas desde localStorage:', parsedConnections.length);
          setConnections(parsedConnections);
        } else {
          console.warn('❌ [PIZARRA STORAGE] Conexiones no válidas, usando array vacío');
          localStorage.removeItem(CONNECTIONS_STORAGE_KEY);
        }
      }

      if (savedPanOffset) {
        const parsedPanOffset = safeJsonParse(savedPanOffset, { x: 0, y: 0 });
        if (parsedPanOffset && typeof parsedPanOffset === 'object' && 'x' in parsedPanOffset && 'y' in parsedPanOffset) {
          // console.log('🗺️ [PIZARRA STORAGE] Pan offset cargado desde localStorage:', parsedPanOffset);
          setPanOffset(parsedPanOffset);
        } else {
          console.warn('❌ [PIZARRA STORAGE] Pan offset no válido, usando {x: 0, y: 0}');
          localStorage.removeItem(PAN_OFFSET_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('❌ [PIZARRA STORAGE] Error crítico cargando desde localStorage:', error);
      // Limpiar localStorage corrupto
      try {
        localStorage.removeItem(PIZARRA_STORAGE_KEY);
        localStorage.removeItem(CONNECTIONS_STORAGE_KEY);
        localStorage.removeItem(PAN_OFFSET_STORAGE_KEY);
        localStorage.removeItem(DATE_STORAGE_KEY);
        console.log('🗑️ [PIZARRA STORAGE] localStorage corrupto limpiado');
      } catch (cleanError) {
        console.error('❌ [PIZARRA STORAGE] Error limpiando localStorage:', cleanError);
      }
    }
  }, [setCards, setConnections, setPanOffset, saveHistorySnapshot]);

  // Guardar datos en localStorage cuando cambien
  const saveToLocalStorage = useCallback(() => {
    try {
      // Validar datos antes de guardar
      if (!Array.isArray(cards)) {
        console.error('❌ [PIZARRA STORAGE] Cards no es un array válido');
        return;
      }

      if (!Array.isArray(connections)) {
        console.error('❌ [PIZARRA STORAGE] Connections no es un array válido');
        return;
      }

      if (!panOffset || typeof panOffset.x !== 'number' || typeof panOffset.y !== 'number') {
        console.error('❌ [PIZARRA STORAGE] PanOffset no es un objeto válido');
        return;
      }

      const todayDate = getTodayDate();

      const data: PizarraStorageData = {
        cards,
        connections,
        panOffset,
        lastSaved: new Date().toISOString(),
        savedDate: todayDate
      };

      // Intentar stringify con manejo de errores
      const cardsJson = JSON.stringify(cards);
      const connectionsJson = JSON.stringify(connections);
      const panOffsetJson = JSON.stringify(panOffset);

      localStorage.setItem(PIZARRA_STORAGE_KEY, cardsJson);
      localStorage.setItem(CONNECTIONS_STORAGE_KEY, connectionsJson);
      localStorage.setItem(PAN_OFFSET_STORAGE_KEY, panOffsetJson);
      localStorage.setItem(DATE_STORAGE_KEY, todayDate);

      console.log('💾 [PIZARRA STORAGE] Datos guardados en localStorage:', {
        cards: cards.length,
        connections: connections.length,
        panOffset,
        date: todayDate
      });
    } catch (error) {
      console.error('❌ [PIZARRA STORAGE] Error guardando en localStorage:', error);

      // Si hay error por memoria llena, intentar limpiar y guardar solo lo esencial
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('⚠️ [PIZARRA STORAGE] Cuota de localStorage excedida, limpiando datos antiguos');
        try {
          // Limpiar otros datos no esenciales
          const allKeys = Object.keys(localStorage);
          allKeys.forEach(key => {
            if (!key.startsWith('pizarra-') && !key.startsWith('user-')) {
              localStorage.removeItem(key);
            }
          });

          // Intentar guardar de nuevo
          localStorage.setItem(PIZARRA_STORAGE_KEY, JSON.stringify(cards));
          localStorage.setItem(CONNECTIONS_STORAGE_KEY, JSON.stringify(connections));
          localStorage.setItem(PAN_OFFSET_STORAGE_KEY, JSON.stringify(panOffset));
        } catch (retryError) {
          console.error('❌ [PIZARRA STORAGE] Error en segundo intento de guardado:', retryError);
        }
      }
    }
  }, [cards, connections, panOffset]);

  // Limpiar localStorage
  const clearLocalStorage = useCallback(() => {
    try {
      console.log('🚨 [CLEAR] ========== INICIANDO LIMPIEZA ==========');
      console.log('🚨 [CLEAR] Removiendo items de localStorage...');

      localStorage.removeItem(PIZARRA_STORAGE_KEY);
      localStorage.removeItem(CONNECTIONS_STORAGE_KEY);
      localStorage.removeItem(PAN_OFFSET_STORAGE_KEY);
      localStorage.removeItem(DATE_STORAGE_KEY);
      localStorage.removeItem(LAST_SUPABASE_LOAD_KEY);

      console.log('🚨 [CLEAR] localStorage limpiado completamente');
      console.log('🚨 [CLEAR] Estableciendo arrays vacíos...');

      setCards([]);
      setConnections([]);
      setPanOffset({ x: 0, y: 0 });

      console.log('🚨 [CLEAR] ========== LIMPIEZA COMPLETADA ==========');
      console.log('🚨 [CLEAR] Cards establecidas a: []');
      console.log('🚨 [CLEAR] Connections establecidas a: []');
    } catch (error) {
      console.error('❌ [PIZARRA STORAGE] Error limpiando localStorage:', error);
    }
  }, [setCards, setConnections, setPanOffset, LAST_SUPABASE_LOAD_KEY]);

  // Exportar datos como JSON
  const exportToJSON = useCallback(() => {
    const data: PizarraStorageData = {
      cards,
      connections,
      panOffset,
      lastSaved: new Date().toISOString(),
      savedDate: getTodayDate()
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `pizarra-backup-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    console.log('📤 [PIZARRA STORAGE] Datos exportados a JSON');
  }, [cards, connections, panOffset]);

  // Importar datos desde JSON
  const importFromJSON = useCallback((jsonString: string) => {
    try {
      const data = safeJsonParse(jsonString, null) as PizarraStorageData;

      if (!data) {
        throw new Error('JSON no válido o vacío');
      }

      if (data.cards) {
        const cardsWithDates = data.cards.map(card => {
          if (card.usuarioData?.messages) {
            return {
              ...card,
              usuarioData: {
                ...card.usuarioData,
                messages: card.usuarioData.messages.map(msg => ({
                  ...msg,
                  timestamp: new Date(msg.timestamp)
                }))
              }
            };
          }
          return card;
        });
        setCards(cardsWithDates);
      }

      if (data.connections) {
        setConnections(data.connections);
      }

      if (data.panOffset) {
        setPanOffset(data.panOffset);
      }

      // Guardar en localStorage
      saveToLocalStorage();

      console.log('📥 [PIZARRA STORAGE] Datos importados desde JSON');
    } catch (error) {
      console.error('❌ [PIZARRA STORAGE] Error importando desde JSON:', error);
      throw error;
    }
  }, [setCards, setConnections, setPanOffset, saveToLocalStorage]);

  // Función para forzar limpieza de localStorage
  const forceCleanStorage = useCallback(() => {
    console.log('🗑️ [PIZARRA STORAGE] Forzando limpieza de localStorage...');
    try {
      localStorage.removeItem(PIZARRA_STORAGE_KEY);
      localStorage.removeItem(CONNECTIONS_STORAGE_KEY);
      localStorage.removeItem(PAN_OFFSET_STORAGE_KEY);
      localStorage.removeItem(DATE_STORAGE_KEY);
      setCards([]);
      setConnections([]);
      setPanOffset({ x: 0, y: 0 });
      console.log('✅ [PIZARRA STORAGE] localStorage forzosamente limpiado');
    } catch (error) {
      console.error('❌ [PIZARRA STORAGE] Error en limpieza forzosa:', error);
    }
  }, [setCards, setConnections, setPanOffset]);

  // Cargar al montar el componente
  // NUNCA cargar desde localStorage al inicio - las cards deben venir desde Supabase
  // localStorage solo se usa para guardar cambios posteriores
  useEffect(() => {
    console.log('⏭️ [PIZARRA STORAGE] NO cargar desde localStorage - solo Supabase carga las cards iniciales');

    // Si no está inicializado, limpiar localStorage para evitar conflictos
    if (!isInitialized) {
      console.log('🧹 [PIZARRA STORAGE] Limpiando localStorage para permitir carga limpia desde Supabase');
      localStorage.removeItem(PIZARRA_STORAGE_KEY);
      localStorage.removeItem(CONNECTIONS_STORAGE_KEY);
    }
  }, []); // Solo se ejecuta una vez al montar

  // Guardar automáticamente cuando cambien los datos (con debounce)
  useEffect(() => {
    // No guardar si el localStorage fue limpiado recientemente
    const wasCleared = !localStorage.getItem(PIZARRA_STORAGE_KEY) &&
      !localStorage.getItem(CONNECTIONS_STORAGE_KEY) &&
      cards.length === 0 &&
      connections.length === 0;

    if (wasCleared) {
      console.log('🚫 [AUTO-SAVE] localStorage fue limpiado, NO auto-guardar');
      return;
    }

    const timeoutId = setTimeout(() => {
      if (cards.length > 0 || connections.length > 0) {
        console.log('💾 [AUTO-SAVE] Guardando automáticamente...', cards.length, 'cards');
        saveToLocalStorage();
      } else {
        console.log('⏭️ [AUTO-SAVE] No hay cards, skip auto-save');
      }
    }, 1000); // Esperar 1 segundo después del último cambio

    return () => clearTimeout(timeoutId);
  }, [cards, connections, panOffset, saveToLocalStorage]);

  return {
    loadFromLocalStorage,
    saveToLocalStorage,
    clearLocalStorage,
    exportToJSON,
    importFromJSON,
    forceCleanStorage,
    saveHistorySnapshot,
    shouldLoadFromSupabase,
    markSupabaseLoaded
  };
};
