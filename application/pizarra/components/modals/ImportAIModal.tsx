import React, { useState } from 'react';
import { Card, TodoItem } from '../../types';
import { Mision } from '@/domain/entities/Mision';
import { Actividad } from '@/domain/entities/Actividad';
import { generateUniqueId } from '../../utils/idGenerator';
import { X, Globe, Check, Loader, FileJson, FileText } from 'lucide-react';

interface ImportAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: ImportResult) => void;
  currentCardCount: number;
  initialUrl?: string;
  idUsuario?: number;
  usuarioAuth?: string;
  onCreateMision?: (mision: Omit<Mision, 'id' | 'created_at'>) => Promise<Mision | null>;
  onCreateActividad?: (actividad: Omit<Actividad, 'id' | 'created_at'>) => Promise<Actividad | null>;
}

interface ImportResult {
  cards: Card[];
  misiones: Omit<Mision, 'id' | 'created_at'>[];
  actividades: Omit<Actividad, 'id' | 'created_at'>[];
  connections?: Array<{ from_index: number; to_index: number }>;
}

interface ExternalData {
  action: string;
  note?: {
    title: string;
    content: string;
    category?: string;
    tags?: string[];
  };
  todo?: {
    title: string;
    items: string[];
  };
  ticket?: {
    title: string;
    description: string;
    hours: number;
  };
  mision?: {
    nombre: string;
    descripcion?: string;
    horas?: number;
    fecha_start?: string;
    fecha_end?: string;
    estado?: string;
  };
  actividad?: {
    descripcion: string;
    fecha?: string;
    hora_inicio?: string;
    cant_horas?: number;
    link?: string;
  };
}

interface ImportItem {
  id: string;
  type: 'card' | 'mision' | 'actividad';
  title: string;
  subtitle?: string;
  data: Card | Omit<Mision, 'id' | 'created_at'> | Omit<Actividad, 'id' | 'created_at'>;
}

export const ImportAIModal: React.FC<ImportAIModalProps> = ({
  isOpen,
  onClose,
  onImport,
  currentCardCount,
  initialUrl,
  idUsuario,
  usuarioAuth,
  onCreateMision,
  onCreateActividad
}) => {
  const [inputType, setInputType] = useState<'url' | 'text'>('url');
  const [url, setUrl] = useState(initialUrl || '');
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedItems, setFetchedItems] = useState<ImportItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<'input' | 'selection'>('input');
  const [rawConnections, setRawConnections] = useState<Array<{ from_index: number; to_index: number }>>([]);

  // Effect to auto-fetch/parse if initialUrl is provided
  const hasAutoFetched = React.useRef(false);
  
  React.useEffect(() => {
    if (isOpen && initialUrl && !hasAutoFetched.current) {
      hasAutoFetched.current = true;
      setLoading(true);
      setError(null);
      
      try {
        // Intentar parsear como JSON directo primero
        const decodedUrl = decodeURIComponent(initialUrl);
        const jsonData = JSON.parse(decodedUrl);
        console.log('✅ [IMPORT] JSON parseado directamente desde URL');
        processData(jsonData);
      } catch (parseErr) {
        // Si no es JSON, intentar fetchar como URL
        console.log('🚀 [IMPORT] No es JSON directo, auto-fetching como URL:', initialUrl);
        setUrl(initialUrl);
        
        fetch(initialUrl, { mode: 'cors' })
          .then(res => res.json())
          .then(data => {
            console.log('✅ [IMPORT] JSON cargado desde URL');
            processData(data);
          })
          .catch(err => {
            console.error('❌ [IMPORT] Error:', err);
            setError(`Error: ${err.message}`);
            setLoading(false);
          });
      }
    }
  }, [isOpen, initialUrl]);

  const mapExternalToItems = (item: any, index: number): ImportItem | null => {
    if (item.action === 'create_note' && item.note) {
      let content = item.note.content || '';
      if (item.note.tags && Array.isArray(item.note.tags)) {
        content += `\n\nTags: ${item.note.tags.map((t: string) => `#${t}`).join(' ')}`;
      }
      
      const card: Card = {
        id: generateUniqueId('import', []),
        type: 'text',
        title: item.note.title || 'Nota Importada',
        content,
        x: 100 + (index * 20),
        y: 100 + (index * 20),
        width: 300,
        height: 200,
        fontSize: 14
      };

      return {
        id: card.id,
        type: 'card',
        title: card.title,
        subtitle: 'Nota',
        data: card
      };
    }

    if (item.action === 'create_todo' && item.todo) {
      const todos: TodoItem[] = (item.todo.items || []).map((text: string, i: number) => ({
        id: i + 1,
        text,
        completed: false
      }));

      const card: Card = {
        id: generateUniqueId('import', []),
        type: 'todo',
        title: item.todo.title || 'Lista de Tareas',
        content: '',
        x: 100 + (index * 20),
        y: 100 + (index * 20),
        width: 300,
        height: 300,
        fontSize: 14,
        todos
      };

      return {
        id: card.id,
        type: 'card',
        title: card.title,
        subtitle: `${todos.length} items`,
        data: card
      };
    }

    if ((item.action === 'create_ticket' || item.action === 'create_mission') && (item.ticket || item.mission)) {
      const ticketData = item.ticket || item.mission;
      
      const card: Card = {
        id: generateUniqueId('import', []),
        type: 'text',
        title: ticketData.title || 'Misión Importada',
        content: `${ticketData.hours || 1}h - ${ticketData.description || ''}`,
        x: 100 + (index * 20),
        y: 100 + (index * 20),
        width: 280,
        height: 250,
        fontSize: 14
      };

      return {
        id: card.id,
        type: 'card',
        title: card.title,
        subtitle: `${ticketData.hours || 1}h`,
        data: card
      };
    }

    if (item.action === 'create_mision' && item.mision) {
      const mision: Omit<Mision, 'id' | 'created_at'> = {
        nombre: item.mision.nombre || 'Misión Importada',
        descripcion: item.mision.descripcion || null,
        horas: item.mision.horas || null,
        fecha_start: item.mision.fecha_start || null,
        fecha_end: item.mision.fecha_end || null,
        id_usuario: idUsuario || null,
        id_proyecto: null,
        id_creador: usuarioAuth || null,
        card_todos: null,
        estado: item.mision.estado || 'pendiente'
      };

      return {
        id: `mision-${index}`,
        type: 'mision',
        title: mision.nombre || 'Misión',
        subtitle: mision.horas ? `${mision.horas}h` : undefined,
        data: mision
      };
    }

    if (item.action === 'create_actividad' && item.actividad) {
      const actividad: Omit<Actividad, 'id' | 'created_at'> = {
        id_usuario: usuarioAuth || null,
        descripcion: item.actividad.descripcion || null,
        fecha: item.actividad.fecha || null,
        cant_horas: item.actividad.cant_horas ? Math.round(item.actividad.cant_horas) : null,
        link: item.actividad.link || null,
        captures: null,
        tiempo_dedicado: null,
        hora_inicio: item.actividad.hora_inicio 
          ? item.actividad.fecha 
            ? `${item.actividad.fecha}T${item.actividad.hora_inicio}:00`
            : null
          : null,
        id_proyecto: null
      };

      return {
        id: `actividad-${index}`,
        type: 'actividad',
        title: actividad.descripcion?.substring(0, 50) || 'Actividad',
        subtitle: actividad.cant_horas ? `${actividad.cant_horas}h` : undefined,
        data: actividad
      };
    }

    return null;
  };

  const processData = (data: any) => {
    console.log('📦 JSON Importado:', data);

    let itemsToProcess = [];
    if (Array.isArray(data)) {
      itemsToProcess = data;
    } else {
      itemsToProcess = [data];
    }

    // Separar conexiones de items normales
    const connections: Array<{ from_index: number; to_index: number }> = [];
    const normalItems = itemsToProcess.filter((item, index) => {
      if (item.action === 'create_connection' && item.connection) {
        connections.push({
          from_index: item.connection.from_index,
          to_index: item.connection.to_index
        });
        return false; // Excluir de items normales
      }
      return true;
    });

    // Guardar conexiones para usarlas después
    setRawConnections(connections);
    console.log('🔗 Conexiones detectadas:', connections);

    const validItems: ImportItem[] = [];
    normalItems.forEach((item, index) => {
      const importItem = mapExternalToItems(item, index);
      if (importItem) validItems.push(importItem);
    });

    if (validItems.length === 0) {
      setError('No se encontraron items válidos en el JSON');
    } else {
      setFetchedItems(validItems);
      // Select all by default
      setSelectedItems(new Set(validItems.map(c => c.id)));
      setStep('selection');
    }
  };

  const handleProcess = async () => {
    setLoading(true);
    setError(null);

    try {
      let data;
      
      if (inputType === 'url') {
        if (!url) return;
        const response = await fetch(url, { mode: 'cors' });
        data = await response.json();
      } else {
        if (!jsonText) return;
        data = JSON.parse(jsonText);
      }

      processData(data);

    } catch (err: any) {
      console.error(err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleFinalImport = async () => {
    const selectedItemObjects = fetchedItems.filter(item => selectedItems.has(item.id));
    
    const result: ImportResult = {
      cards: [],
      misiones: [],
      actividades: [],
      connections: []
    };

    // Separar items por tipo
    for (const item of selectedItemObjects) {
      if (item.type === 'card') {
        result.cards.push(item.data as Card);
      } else if (item.type === 'mision') {
        const misionData = item.data as Omit<Mision, 'id' | 'created_at'>;
        result.misiones.push(misionData);
      } else if (item.type === 'actividad') {
        const actividadData = item.data as Omit<Actividad, 'id' | 'created_at'>;
        result.actividades.push(actividadData);
      }
    }

    // Procesar conexiones: mapear índices originales a indices de items seleccionados
    if (rawConnections.length > 0) {
      console.log('🔗 Procesando conexiones:', rawConnections);
      
      // Crear mapping de índices del fetchedItems al índice en el resultado
      const indexMapping = new Map<string, number>();
      let cardResultIndex = 0;
      let misionResultIndex = 0;
      let actividadResultIndex = 0;

      for (const item of selectedItemObjects) {
        const itemId = item.id;
        if (item.type === 'card') {
          indexMapping.set(`card-${item.id}`, cardResultIndex++);
        } else if (item.type === 'mision') {
          indexMapping.set(`mision-${item.id}`, misionResultIndex++);
        } else if (item.type === 'actividad') {
          indexMapping.set(`actividad-${item.id}`, actividadResultIndex++);
        }
      }

      // Mapear conexiones basadas en los índices seleccionados
      for (const conn of rawConnections) {
        // Buscar el item en fetchedItems que corresponde al índice original
        // En realidad, fetch Items tiene el mismo orden que el JSON original (sin conexiones)
        // Así que fetchedItems[from_index] = item que corresponde a from_index del JSON original
        
        if (conn.from_index < fetchedItems.length && conn.to_index < fetchedItems.length) {
          const fromItem = fetchedItems[conn.from_index];
          const toItem = fetchedItems[conn.to_index];

          // Verificar si ambos items están seleccionados
          if (selectedItems.has(fromItem.id) && selectedItems.has(toItem.id)) {
            // Calcular espacios índices en el resultado
            const fromResultIndex = selectedItemObjects.findIndex(item => item.id === fromItem.id);
            const toResultIndex = selectedItemObjects.findIndex(item => item.id === toItem.id);

            if (fromResultIndex !== -1 && toResultIndex !== -1) {
              result.connections!.push({
                from_index: fromResultIndex,
                to_index: toResultIndex
              });
              console.log(`  ✓ Conexión mapeada: ${fromResultIndex} → ${toResultIndex}`);
            }
          }
        }
      }
    }

    console.log('✅ Items a crear:', {
      cards: result.cards.length,
      misiones: result.misiones.length,
      actividades: result.actividades.length,
      connections: result.connections?.length || 0
    });

    // Crear misiones si existe el hook
    if (result.misiones.length > 0 && onCreateMision) {
      try {
        console.log('🎯 Creando misiones...');
        const createdMisiones: Array<Mision> = [];
        for (const mision of result.misiones) {
          console.log('   Creando misión:', mision.nombre);
          const created = await onCreateMision(mision);
          if (created?.id) {
            console.log('   ✓ Misión creada con ID:', created.id);
            createdMisiones.push(created);
          }
        }
        // Actualizar result.misiones con los datos completos (incluyendo ID)
        result.misiones = createdMisiones;
      } catch (err) {
        console.error('❌ Error creating misiones:', err);
      }
    }

    // Crear actividades si existe el hook
    if (result.actividades.length > 0 && onCreateActividad) {
      try {
        console.log('📅 Creando actividades...');
        const createdActividades: Array<Actividad> = [];
        for (const actividad of result.actividades) {
          console.log('   Creando actividad:', actividad.descripcion);
          const created = await onCreateActividad(actividad);
          if (created?.id) {
            console.log('   ✓ Actividad creada con ID:', created.id);
            createdActividades.push(created);
          }
        }
        // Actualizar result.actividades con los datos completos (incluyendo ID)
        result.actividades = createdActividades;
      } catch (err) {
        console.error('❌ Error creating actividades:', err);
      }
    }

    console.log('📤 Llamando onImport callback...');
    onImport(result);
    handleClose();
  };

  if (!isOpen) return null;

  const handleClose = () => {
    hasAutoFetched.current = false;
    setStep('input');
    setUrl('');
    setJsonText('');
    setFetchedItems([]);
    setSelectedItems(new Set());
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
              {loading && step === 'input' ? (
                <Loader size={20} className="animate-spin" />
              ) : (
                <FileJson size={20} />
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              {step === 'input' ? 'Importar desde IA / JSON' : 'Seleccionar Cards'}
              {loading && <Loader size={16} className="animate-spin text-purple-600" />}
            </h2>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {step === 'input' ? (
            <div className="space-y-4">
              {loading && initialUrl ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader size={32} className="animate-spin text-purple-600 mb-4" />
                  <p className="text-gray-600 font-medium">Cargando JSON desde la URL...</p>
                  <p className="text-gray-400 text-sm mt-2">{initialUrl}</p>
                </div>
              ) : (
                <>
              <div className="flex gap-4 border-b border-gray-200">
                <button
                  className={`pb-2 px-1 text-sm font-medium transition-colors ${inputType === 'url' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setInputType('url')}
                >
                  Desde URL
                </button>
                <button
                  className={`pb-2 px-1 text-sm font-medium transition-colors ${inputType === 'text' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setInputType('text')}
                >
                  Pegar JSON
                </button>
              </div>

              <p className="text-gray-600 text-sm">
                {inputType === 'url' 
                  ? 'Ingresa la URL pública de un archivo JSON.' 
                  : 'Pega el código JSON generado por la IA directamente aquí.'}
              </p>
              
              {inputType === 'url' ? (
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="url"
                    placeholder="https://ejemplo.com/data.json"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleProcess()}
                  />
                </div>
              ) : (
                <div className="relative">
                  <FileText className="absolute left-3 top-3 text-gray-400" size={18} />
                  <textarea
                    placeholder='[{"action": "create_note", ...}]'
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm font-mono h-40 resize-none"
                  />
                </div>
              )}

              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                  <X size={16} />
                  {error}
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Formato esperado</h4>
                <pre className="text-xs text-gray-600 overflow-x-auto font-mono">
{`[
  {
    "action": "create_note",
    "note": { "title": "...", "content": "..." }
  }
]`}
                </pre>
              </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">
                  {selectedItems.size} seleccionados de {fetchedItems.length}
                </span>
                <button 
                  onClick={() => setSelectedItems(selectedItems.size === fetchedItems.length ? new Set() : new Set(fetchedItems.map(c => c.id)))}
                  className="text-xs text-purple-600 font-medium hover:underline"
                >
                  {selectedItems.size === fetchedItems.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fetchedItems.map((item) => {
                  const typeColors = {
                    'card': 'bg-blue-100 text-blue-700',
                    'mision': 'bg-purple-100 text-purple-700',
                    'actividad': 'bg-amber-100 text-amber-700'
                  };

                  const typeLabels = {
                    'card': 'Card',
                    'mision': 'Misión',
                    'actividad': 'Actividad'
                  };

                  return (
                    <div 
                      key={item.id}
                      onClick={() => toggleSelection(item.id)}
                      className={`
                        relative p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md
                        ${selectedItems.has(item.id) ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white hover:border-gray-300'}
                      `}
                    >
                      <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                        selectedItems.has(item.id) ? 'bg-purple-500 border-purple-500' : 'border-gray-300 bg-white'
                      }`}>
                        {selectedItems.has(item.id) && <Check size={12} className="text-white" />}
                      </div>

                      <div className="pr-6">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${typeColors[item.type]}`}>
                            {typeLabels[item.type]}
                          </span>
                        </div>
                        <h3 className="font-bold text-gray-800 text-sm truncate">{item.title}</h3>
                        {item.subtitle && (
                          <p className="text-xs text-gray-500 mt-1">{item.subtitle}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          {step === 'input' ? (
            loading && initialUrl ? (
              <div className="flex items-center gap-2 text-gray-600 text-sm font-medium">
                <Loader size={16} className="animate-spin" />
                Procesando automáticamente...
              </div>
            ) : (
              <button
                onClick={handleProcess}
                disabled={loading || (inputType === 'url' ? !url : !jsonText)}
                className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader size={18} className="animate-spin" /> : <Globe size={18} />}
                Procesar
              </button>
            )
          ) : (
            <>
              <button
                onClick={() => setStep('input')}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors text-sm"
              >
                Atrás
              </button>
              <button
                onClick={handleFinalImport}
                disabled={selectedItems.size === 0}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 text-sm flex items-center gap-2"
              >
                <Check size={16} />
                Importar {selectedItems.size} Items
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
