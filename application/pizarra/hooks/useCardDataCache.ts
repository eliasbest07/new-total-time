import { useCallback } from 'react';
import { CardDB } from '@/domain/entities/Card';

/**
 * Hook para gestionar caché de datos de cards en localStorage
 * Permite cachear datos específicos de cada tipo de card (misión, proyecto, etc.)
 * y cards persistentes del usuario para reducir peticiones a Supabase
 */
export const useCardDataCache = (storagePrefix: string = 'real') => {

    /**
     * Genera la fecha actual en formato YYYY-MM-DD
     */
    const getTodayDate = (): string => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    };

    /**
     * Verifica si el caché es válido (del mismo día)
     * @param savedDate - Fecha guardada en el caché
     * @returns true si el caché es del mismo día
     */
    const isCacheValid = useCallback((savedDate: string | null): boolean => {
        if (!savedDate) return false;
        const todayDate = getTodayDate();
        return savedDate === todayDate;
    }, []);

    /**
     * Guarda datos específicos de una card en localStorage
     * @param cardId - ID de la card (card_id del frontend)
     * @param data - Datos a cachear (misionData, proyectoData, etc.)
     */
    const saveCardData = useCallback((cardId: string, data: any) => {
        try {
            const storageKey = `pizarra-${storagePrefix}-card-data-${cardId}-v1`;
            const cacheData = {
                ...data,
                cachedAt: new Date().toISOString(),
                date: getTodayDate()
            };
            localStorage.setItem(storageKey, JSON.stringify(cacheData));
            // console.log('💾 [CARD-CACHE] Datos guardados para card:', cardId);
        } catch (error) {
            console.error('❌ [CARD-CACHE] Error guardando datos de card:', cardId, error);
        }
    }, [storagePrefix]);

    /**
     * Carga datos específicos de una card desde localStorage
     * @param cardId - ID de la card (card_id del frontend)
     * @returns Datos cacheados o null si no existe o es inválido
     */
    const loadCardData = useCallback((cardId: string): any | null => {
        try {
            const storageKey = `pizarra-${storagePrefix}-card-data-${cardId}-v1`;
            const savedData = localStorage.getItem(storageKey);

            if (!savedData) {
                return null;
            }

            const parsed = JSON.parse(savedData);

            // Verificar si el caché es del mismo día
            if (!isCacheValid(parsed.date)) {
                // console.log('🗑️ [CARD-CACHE] Caché expirado para card:', cardId);
                localStorage.removeItem(storageKey);
                return null;
            }

            // console.log('✅ [CARD-CACHE] Datos cargados desde caché para card:', cardId);
            return parsed;
        } catch (error) {
            console.error('❌ [CARD-CACHE] Error cargando datos de card:', cardId, error);
            return null;
        }
    }, [storagePrefix, isCacheValid]);

    /**
     * Limpia el caché de datos de una card específica
     * @param cardId - ID de la card
     */
    const clearCardCache = useCallback((cardId: string) => {
        try {
            const storageKey = `pizarra-${storagePrefix}-card-data-${cardId}-v1`;
            localStorage.removeItem(storageKey);
            console.log('🗑️ [CARD-CACHE] Caché limpiado para card:', cardId);
        } catch (error) {
            console.error('❌ [CARD-CACHE] Error limpiando caché de card:', cardId, error);
        }
    }, [storagePrefix]);

    /**
     * Limpia TODO el caché de datos de cards
     */
    const clearAllCardCache = useCallback(() => {
        try {
            const keys = Object.keys(localStorage);
            const cardCacheKeys = keys.filter(key => key.startsWith(`pizarra-${storagePrefix}-card-data-`));

            cardCacheKeys.forEach(key => localStorage.removeItem(key));
            console.log('🗑️ [CARD-CACHE] Todo el caché de cards limpiado:', cardCacheKeys.length, 'items');
        } catch (error) {
            console.error('❌ [CARD-CACHE] Error limpiando todo el caché:', error);
        }
    }, [storagePrefix]);

    /**
     * Guarda cards persistentes en localStorage
     * @param cards - Array de cards persistentes
     * @param userId - ID del usuario (para validar)
     */
    const savePersistentCards = useCallback((cards: CardDB[], userId: string) => {
        try {
            const storageKey = `pizarra-${storagePrefix}-persistent-cards-v1`;
            const cacheData = {
                cards,
                date: getTodayDate(),
                userId,
                cachedAt: new Date().toISOString()
            };
            localStorage.setItem(storageKey, JSON.stringify(cacheData));
            console.log('💾 [CARD-CACHE] Cards persistentes guardadas:', cards.length, 'cards');
        } catch (error) {
            console.error('❌ [CARD-CACHE] Error guardando cards persistentes:', error);
        }
    }, [storagePrefix]);

    /**
     * Carga cards persistentes desde localStorage
     * @param userId - ID del usuario (para validar que sean del usuario correcto)
     * @returns Array de cards persistentes o null si no existe o es inválido
     */
    const loadPersistentCards = useCallback((userId: string): CardDB[] | null => {
        try {
            const storageKey = `pizarra-${storagePrefix}-persistent-cards-v1`;
            const savedData = localStorage.getItem(storageKey);

            if (!savedData) {
                console.log('📭 [CARD-CACHE] No hay cards persistentes en caché');
                return null;
            }

            const parsed = JSON.parse(savedData);

            // Verificar que sea del mismo usuario
            if (parsed.userId !== userId) {
                console.log('⚠️ [CARD-CACHE] Cards persistentes son de otro usuario, ignorando caché');
                localStorage.removeItem(storageKey);
                return null;
            }

            // Verificar si el caché es del mismo día
            if (!isCacheValid(parsed.date)) {
                console.log('🗑️ [CARD-CACHE] Caché de cards persistentes expirado');
                localStorage.removeItem(storageKey);
                return null;
            }

            console.log('✅ [CARD-CACHE] Cards persistentes cargadas desde caché:', parsed.cards?.length || 0);
            return parsed.cards || [];
        } catch (error) {
            console.error('❌ [CARD-CACHE] Error cargando cards persistentes:', error);
            return null;
        }
    }, [storagePrefix, isCacheValid]);

    /**
     * Limpia el caché de cards persistentes
     */
    const clearPersistentCardsCache = useCallback(() => {
        try {
            const storageKey = `pizarra-${storagePrefix}-persistent-cards-v1`;
            localStorage.removeItem(storageKey);
            console.log('🗑️ [CARD-CACHE] Caché de cards persistentes limpiado');
        } catch (error) {
            console.error('❌ [CARD-CACHE] Error limpiando caché de cards persistentes:', error);
        }
    }, [storagePrefix]);

    return {
        // Funciones para datos de cards individuales
        saveCardData,
        loadCardData,
        clearCardCache,
        clearAllCardCache,

        // Funciones para cards persistentes
        savePersistentCards,
        loadPersistentCards,
        clearPersistentCardsCache,

        // Utilidades
        isCacheValid
    };
};
