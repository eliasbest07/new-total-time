import { useEffect, useCallback } from 'react';
import { Card, Connection } from '../types/index';

interface PizarraStorageData {
  cards: Card[];
  connections: Connection[];
  panOffset: { x: number; y: number };
  lastSaved: string;
}

export const usePizarraLocalStorage = (
  cards: Card[],
  connections: Connection[],
  panOffset: { x: number; y: number },
  setCards: React.Dispatch<React.SetStateAction<Card[]>>,
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>,
  setPanOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>,
  storagePrefix: string = 'real'
) => {
  // Generar claves de almacenamiento con prefijo
  const PIZARRA_STORAGE_KEY = `pizarra-${storagePrefix}-cards-v1`;
  const CONNECTIONS_STORAGE_KEY = `pizarra-${storagePrefix}-connections-v1`;
  const PAN_OFFSET_STORAGE_KEY = `pizarra-${storagePrefix}-pan-offset-v1`;

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

  // Cargar datos desde localStorage al montar
  const loadFromLocalStorage = useCallback(() => {
    try {
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

          setCards(cardsWithDates);
        } else {
          console.warn('❌ [PIZARRA STORAGE] Cards no válidas, usando array vacío');
          localStorage.removeItem(PIZARRA_STORAGE_KEY);
        }
      }

      if (savedConnections) {
        const parsedConnections = safeJsonParse(savedConnections, []) as Connection[];
        if (parsedConnections && Array.isArray(parsedConnections)) {
          console.log('🔗 [PIZARRA STORAGE] Conexiones cargadas desde localStorage:', parsedConnections.length);
          setConnections(parsedConnections);
        } else {
          console.warn('❌ [PIZARRA STORAGE] Conexiones no válidas, usando array vacío');
          localStorage.removeItem(CONNECTIONS_STORAGE_KEY);
        }
      }

      if (savedPanOffset) {
        const parsedPanOffset = safeJsonParse(savedPanOffset, { x: 0, y: 0 });
        if (parsedPanOffset && typeof parsedPanOffset === 'object' && 'x' in parsedPanOffset && 'y' in parsedPanOffset) {
          console.log('🗺️ [PIZARRA STORAGE] Pan offset cargado desde localStorage:', parsedPanOffset);
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
        console.log('🗑️ [PIZARRA STORAGE] localStorage corrupto limpiado');
      } catch (cleanError) {
        console.error('❌ [PIZARRA STORAGE] Error limpiando localStorage:', cleanError);
      }
    }
  }, [setCards, setConnections, setPanOffset]);

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

      const data: PizarraStorageData = {
        cards,
        connections,
        panOffset,
        lastSaved: new Date().toISOString()
      };

      // Intentar stringify con manejo de errores
      const cardsJson = JSON.stringify(cards);
      const connectionsJson = JSON.stringify(connections);
      const panOffsetJson = JSON.stringify(panOffset);
      
      localStorage.setItem(PIZARRA_STORAGE_KEY, cardsJson);
      localStorage.setItem(CONNECTIONS_STORAGE_KEY, connectionsJson);
      localStorage.setItem(PAN_OFFSET_STORAGE_KEY, panOffsetJson);

      console.log('💾 [PIZARRA STORAGE] Datos guardados en localStorage:', {
        cards: cards.length,
        connections: connections.length,
        panOffset
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
      localStorage.removeItem(PIZARRA_STORAGE_KEY);
      localStorage.removeItem(CONNECTIONS_STORAGE_KEY);
      localStorage.removeItem(PAN_OFFSET_STORAGE_KEY);
      console.log('🗑️ [PIZARRA STORAGE] localStorage limpiado');

      setCards([]);
      setConnections([]);
      setPanOffset({ x: 0, y: 0 });
    } catch (error) {
      console.error('❌ [PIZARRA STORAGE] Error limpiando localStorage:', error);
    }
  }, [setCards, setConnections, setPanOffset]);

  // Exportar datos como JSON
  const exportToJSON = useCallback(() => {
    const data: PizarraStorageData = {
      cards,
      connections,
      panOffset,
      lastSaved: new Date().toISOString()
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

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
      setCards([]);
      setConnections([]);
      setPanOffset({ x: 0, y: 0 });
      console.log('✅ [PIZARRA STORAGE] localStorage forzosamente limpiado');
    } catch (error) {
      console.error('❌ [PIZARRA STORAGE] Error en limpieza forzosa:', error);
    }
  }, [setCards, setConnections, setPanOffset]);

  // Cargar al montar el componente
  useEffect(() => {
    loadFromLocalStorage();
  }, []); // Solo se ejecuta una vez al montar

  // Guardar automáticamente cuando cambien los datos (con debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (cards.length > 0 || connections.length > 0) {
        saveToLocalStorage();
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
    forceCleanStorage
  };
};
