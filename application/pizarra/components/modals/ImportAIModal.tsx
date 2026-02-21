import React, { useState } from 'react';
import { Card, TodoItem } from '../../types';
import { generateUniqueId } from '../../utils/idGenerator';
import { X, Globe, Check, Loader, FileJson, FileText } from 'lucide-react';

interface ImportAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (cards: Card[]) => void;
  currentCardCount: number;
  initialUrl?: string;
}

interface ExternalCardData {
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
}

export const ImportAIModal: React.FC<ImportAIModalProps> = ({
  isOpen,
  onClose,
  onImport,
  currentCardCount,
  initialUrl
}) => {
  const [inputType, setInputType] = useState<'url' | 'text'>('url');
  const [url, setUrl] = useState(initialUrl || '');
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedCards, setFetchedCards] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<'input' | 'selection'>('input');

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

  const mapExternalToCard = (item: any, index: number): Card | null => {
    const existingIds = [`import-${Date.now()}-${index}`]; // Placeholder
    const id = generateUniqueId('import', existingIds);
    
    // Default position (will be adjusted later)
    const x = 100 + (index * 20);
    const y = 100 + (index * 20);

    if (item.action === 'create_note' && item.note) {
      let content = item.note.content || '';
      if (item.note.tags && Array.isArray(item.note.tags)) {
        content += `\n\nTags: ${item.note.tags.map((t: string) => `#${t}`).join(' ')}`;
      }
      
      return {
        id,
        type: 'text',
        title: item.note.title || 'Nota Importada',
        content,
        x,
        y,
        width: 300,
        height: 200,
        fontSize: 14
      };
    }

    if (item.action === 'create_todo' && item.todo) {
      const todos: TodoItem[] = (item.todo.items || []).map((text: string, i: number) => ({
        id: i + 1,
        text,
        completed: false
      }));

      return {
        id,
        type: 'todo',
        title: item.todo.title || 'Lista de Tareas',
        content: '',
        x,
        y,
        width: 300,
        height: 300,
        fontSize: 14,
        todos
      };
    }

    // Support for single object structure provided by user
    if (item.action === 'create_ticket' || item.action === 'create_mission') {
        const ticketData = item.ticket || item.mission;
        if (!ticketData) return null;

        return {
            id,
            type: 'text', // Fallback to text for safety, or implement specific ticket type if needed
            title: ticketData.title || 'Misión Importada',
            content: `${ticketData.hours || 1}h - ${ticketData.description || ''}`,
            x, y,
            width: 280,
            height: 250,
            fontSize: 14
        }
    }

    return null;
  };

  const processData = (data: any) => {
    console.log('📦 JSON Importado:', data);

    let itemsToProcess = [];
    if (Array.isArray(data)) {
      itemsToProcess = data;
    } else {
      itemsToProcess = [data]; // Handle single object
    }

    const validCards: Card[] = [];
    itemsToProcess.forEach((item, index) => {
      const card = mapExternalToCard(item, index);
      if (card) validCards.push(card);
    });

    if (validCards.length === 0) {
      setError('No se encontraron cards válidas en el JSON');
    } else {
      setFetchedCards(validCards);
      // Select all by default
      setSelectedCards(new Set(validCards.map(c => c.id)));
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
    const newSelected = new Set(selectedCards);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCards(newSelected);
  };

  const handleFinalImport = () => {
    const cardsToImport = fetchedCards.filter(c => selectedCards.has(c.id));
    onImport(cardsToImport);
    handleClose();
  };

  if (!isOpen) return null;

  const handleClose = () => {
    hasAutoFetched.current = false;
    setStep('input');
    setUrl('');
    setJsonText('');
    setFetchedCards([]);
    setSelectedCards(new Set());
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
                  {selectedCards.size} seleccionados de {fetchedCards.length}
                </span>
                <button 
                  onClick={() => setSelectedCards(selectedCards.size === fetchedCards.length ? new Set() : new Set(fetchedCards.map(c => c.id)))}
                  className="text-xs text-purple-600 font-medium hover:underline"
                >
                  {selectedCards.size === fetchedCards.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fetchedCards.map((card) => (
                  <div 
                    key={card.id}
                    onClick={() => toggleSelection(card.id)}
                    className={`
                      relative p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md
                      ${selectedCards.has(card.id) ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white hover:border-gray-300'}
                    `}
                  >
                    <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                      selectedCards.has(card.id) ? 'bg-purple-500 border-purple-500' : 'border-gray-300 bg-white'
                    }`}>
                      {selectedCards.has(card.id) && <Check size={12} className="text-white" />}
                    </div>

                    <div className="pr-6">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          card.type === 'todo' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {card.type === 'text' ? 'Nota' : card.type}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-800 text-sm truncate">{card.title}</h3>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                        {card.type === 'text' ? card.content : `${(card.todos || []).length} items`}
                      </p>
                    </div>
                  </div>
                ))}
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
                disabled={selectedCards.size === 0}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 text-sm flex items-center gap-2"
              >
                <Check size={16} />
                Importar {selectedCards.size} Cards
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
