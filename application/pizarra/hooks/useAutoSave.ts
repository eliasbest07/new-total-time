import { useState, useEffect, useRef, useCallback } from 'react';

interface UseAutoSaveOptions {
    enabled: boolean;
    data: any;
    onSave: () => Promise<boolean | undefined>;
    debounceMs?: number;
}

interface UseAutoSaveReturn {
    hasUnsavedChanges: boolean;
    isSaving: boolean;
    lastSaved: Date | null;
    manualSave: () => Promise<void>;
}

/**
 * Hook para auto-guardar cambios con detección automática y debounce
 * @param enabled - Si el auto-save está habilitado
 * @param data - Datos a monitorear para detectar cambios
 * @param onSave - Función asíncrona para guardar los datos
 * @param debounceMs - Milisegundos de debounce (por defecto 2000ms)
 */
export const useAutoSave = ({
    enabled,
    data,
    onSave,
    debounceMs = 2000
}: UseAutoSaveOptions): UseAutoSaveReturn => {
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    const dataHashRef = useRef<string | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isInitializedRef = useRef(false);

    // Función para calcular hash simple de los datos
    const calculateHash = useCallback((data: any): string => {
        try {
            return JSON.stringify(data);
        } catch (error) {
            console.error('Error calculando hash para auto-save:', error);
            return '';
        }
    }, []);

    // Función para ejecutar el guardado
    const executeSave = useCallback(async (currentHash: string) => {
        setIsSaving(true);
        console.log('💾 [AUTO-SAVE] Ejecutando guardado automático...');

        try {
            const result = await onSave();

            if (result !== false) {
                dataHashRef.current = currentHash;
                setHasUnsavedChanges(false);
                setLastSaved(new Date());
                console.log('✅ [AUTO-SAVE] Guardado exitoso');
            } else {
                console.error('❌ [AUTO-SAVE] Error en el guardado');
            }
        } catch (error) {
            console.error('❌ [AUTO-SAVE] Error ejecutando guardado:', error);
        } finally {
            setIsSaving(false);
        }
    }, [onSave]);

    // Función para guardado manual
    const manualSave = useCallback(async () => {
        if (isSaving) {
            console.log('⏳ [AUTO-SAVE] Ya hay un guardado en progreso');
            return;
        }

        // Cancelar guardado automático pendiente
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }

        const currentHash = calculateHash(data);
        await executeSave(currentHash);
    }, [isSaving, data, calculateHash, executeSave]);

    // Detectar cambios en los datos
    useEffect(() => {
        if (!enabled) {
            // Si el auto-save está deshabilitado, limpiar estado
            setHasUnsavedChanges(false);
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }
            return;
        }

        const currentHash = calculateHash(data);

        // Primera inicialización
        if (!isInitializedRef.current) {
            dataHashRef.current = currentHash;
            isInitializedRef.current = true;
            console.log('🔄 [AUTO-SAVE] Inicializado');
            return;
        }

        // Si no ha habido cambios, no hacer nada
        if (currentHash === dataHashRef.current) {
            return;
        }

        // Detectado cambio
        console.log('⚠️ [AUTO-SAVE] Cambios detectados, programando guardado...');
        setHasUnsavedChanges(true);

        // Cancelar timeout anterior
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Programar guardado automático con debounce
        saveTimeoutRef.current = setTimeout(() => {
            executeSave(currentHash);
        }, debounceMs);

    }, [data, enabled, calculateHash, executeSave, debounceMs]);

    // Limpiar timeout al desmontar o cambiar enabled
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }
        };
    }, []);

    // Reset cuando se deshabilita
    useEffect(() => {
        if (!enabled) {
            isInitializedRef.current = false;
            dataHashRef.current = null;
        }
    }, [enabled]);

    return {
        hasUnsavedChanges,
        isSaving,
        lastSaved,
        manualSave
    };
};
