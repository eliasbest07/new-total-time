import { useEffect, useCallback } from 'react';
import { Card, Connection } from '../types';

const PIZARRA_STORAGE_KEY = 'pizarra-cards-v1';
const CONNECTIONS_STORAGE_KEY = 'pizarra-connections-v1';
const PAN_OFFSET_STORAGE_KEY = 'pizarra-pan-offset-v1';

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
  setPanOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
) => {

  // Cargar datos desde localStorage al montar
  const loadFromLocalStorage = useCallback(() => {
    try {
      const savedCards = localStorage.getItem(PIZARRA_STORAGE_KEY);
      const savedConnections = localStorage.getItem(CONNECTIONS_STORAGE_KEY);
      const savedPanOffset = localStorage.getItem(PAN_OFFSET_STORAGE_KEY);

      if (savedCards) {
        const parsedCards = JSON.parse(savedCards) as Card[];
        console.log('📦 [PIZARRA STORAGE] Cards cargadas desde localStorage:', parsedCards.length);

        // Restaurar Date objects en ChatMessages
        const cardsWithDates = parsedCards.map(card => {
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

      if (savedConnections) {
        const parsedConnections = JSON.parse(savedConnections) as Connection[];
        console.log('🔗 [PIZARRA STORAGE] Conexiones cargadas desde localStorage:', parsedConnections.length);
        setConnections(parsedConnections);
      }

      if (savedPanOffset) {
        const parsedPanOffset = JSON.parse(savedPanOffset);
        console.log('🗺️ [PIZARRA STORAGE] Pan offset cargado desde localStorage:', parsedPanOffset);
        setPanOffset(parsedPanOffset);
      }
    } catch (error) {
      console.error('❌ [PIZARRA STORAGE] Error cargando desde localStorage:', error);
    }
  }, [setCards, setConnections, setPanOffset]);

  // Guardar datos en localStorage cuando cambien
  const saveToLocalStorage = useCallback(() => {
    try {
      const data: PizarraStorageData = {
        cards,
        connections,
        panOffset,
        lastSaved: new Date().toISOString()
      };

      localStorage.setItem(PIZARRA_STORAGE_KEY, JSON.stringify(cards));
      localStorage.setItem(CONNECTIONS_STORAGE_KEY, JSON.stringify(connections));
      localStorage.setItem(PAN_OFFSET_STORAGE_KEY, JSON.stringify(panOffset));

      console.log('💾 [PIZARRA STORAGE] Datos guardados en localStorage:', {
        cards: cards.length,
        connections: connections.length,
        panOffset
      });
    } catch (error) {
      console.error('❌ [PIZARRA STORAGE] Error guardando en localStorage:', error);
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
      const data = JSON.parse(jsonString) as PizarraStorageData;

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
    importFromJSON
  };
};
