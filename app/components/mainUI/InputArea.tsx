"use client";

import { useState, useRef, useMemo } from 'react';
import { StickyNote, CheckSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useUsuariosOrganizacionContext } from '@/app/contexts/UsuariosOrganizacionContext';
import Image from 'next/image';

type CreateMode = 'note' | 'todo';

interface InputAreaProps {
  onCreateNote?: (text: string) => void;
  onCreateTodoList?: (text: string) => void;
  onSendToUser?: (text: string, user: {
    userId: string;
    name: string;
    avatar?: string;
    color?: string;
    online?: boolean;
  }) => void;
  placeholder?: string;
  className?: string;
}

export default function InputArea({
  onCreateNote,
  onCreateTodoList,
  onSendToUser,
  placeholder = "Escribe aquí",
  className = ""
}: InputAreaProps) {
  const [inputText, setInputText] = useState('');
  const [showButtons, setShowButtons] = useState(false);
  const [userScrollIndex, setUserScrollIndex] = useState(0);
  const [createMode, setCreateMode] = useState<CreateMode>('note');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { usuario } = useAuth();

  // Usar el context de usuarios (ya filtrados, excluyendo usuario actual)
  const { usuariosFiltrados: usuariosOrganizacion } = useUsuariosOrganizacionContext();

  // Ordenar por estado de conexión (los conectados primero)
  const usuariosFiltrados = useMemo(() => {
    // Ordenar: conectados primero
    return [...usuariosOrganizacion].sort((a, b) => {
      // TODO: Implementar ordenamiento real por estado online
      return 0;
    });
  }, [usuariosOrganizacion, usuario]);

  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const value = e.target.value;
    setInputText(value);
    setShowButtons(value.trim().length > 0);

    // Auto-resize the textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const lineHeight = 24; // 1.5rem = 24px
    const maxHeight = lineHeight * 5; // 5 lines max
    textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
  };

  const handleCreateNote = (): void => {
    if (inputText.trim() && onCreateNote) {
      onCreateNote(inputText.trim());
      setInputText('');
      setShowButtons(false);
      resetTextareaHeight();
    }
  };

  const handleCreateTodoList = (): void => {
    if (inputText.trim() && onCreateTodoList) {
      onCreateTodoList(inputText.trim());
      setInputText('');
      setShowButtons(false);
      resetTextareaHeight();
    }
  };

  const handleCreate = (): void => {
    if (createMode === 'note') {
      handleCreateNote();
    } else {
      handleCreateTodoList();
    }
  };

  const handleUserSelect = (user: typeof usuariosFiltrados[0]): void => {
    if (onSendToUser && inputText.trim()) {
      onSendToUser(inputText.trim(), {
        userId: user.userAuth,
        name: user.getNombreCompleto(),
        avatar: user.profile.avatar,
        color: user.profile.marco || '#3b82f6',
        online: true // TODO: Implementar lógica real
      });
      setInputText('');
      setShowButtons(false);
      resetTextareaHeight();
    }
  };

  return (
    <div className={`flex flex-col items-center pointer-events-auto ${className}`}>
      {/* Barra: checkboxes/radio Nota+Tarea + usuarios (solo cuando hay texto) */}
      {showButtons && (
        <div className="mb-3">
          <div
            className={`rounded-full px-2 py-2 flex items-center gap-2 shadow-lg transition-colors duration-200 ${
              isFocused ? 'bg-white/50 backdrop-blur-md' : 'bg-white/20 backdrop-blur-sm'
            }`}
          >
            {/* Checkbox/radio Nota + Botón Nota */}
            <div
              className="flex items-center gap-1.5 cursor-pointer shrink-0"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setCreateMode('note')}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                createMode === 'note' ? 'border-blue-400' : isFocused ? 'border-gray-400' : 'border-white/40'
              }`}>
                {createMode === 'note' && <div className="w-2 h-2 rounded-full bg-blue-400" />}
              </div>
            </div>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCreateNote}
              className={`flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 rounded-full text-sm font-medium transition-colors shrink-0 ${
                isFocused ? 'text-blue-900' : 'text-white'
              }`}
              title="Crear Nota"
            >
              <StickyNote size={14} />
              <span>Nota</span>
            </button>

            <div className={`w-px h-5 shrink-0 ${isFocused ? 'bg-gray-300' : 'bg-white/30'}`} />

            {/* Checkbox/radio Tarea + Botón Tarea */}
            <div
              className="flex items-center gap-1.5 cursor-pointer shrink-0"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setCreateMode('todo')}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                createMode === 'todo' ? 'border-green-400' : isFocused ? 'border-gray-400' : 'border-white/40'
              }`}>
                {createMode === 'todo' && <div className="w-2 h-2 rounded-full bg-green-400" />}
              </div>
            </div>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCreateTodoList}
              className={`flex items-center gap-1.5 px-3 py-1.5 bg-green-600/30 hover:bg-green-600/50 rounded-full text-sm font-medium transition-colors shrink-0 ${
                isFocused ? 'text-green-900' : 'text-white'
              }`}
              title="Crear Lista de Tareas"
            >
              <CheckSquare size={14} />
              <span>Tarea</span>
            </button>

            {/* Lista de usuarios (solo cuando hay texto) */}
            {showButtons && usuariosFiltrados.length > 0 && (
              <>
                <div className="w-px h-5 bg-white/30 shrink-0" />
                {usuariosFiltrados.length > 8 && userScrollIndex > 0 && (
                  <button
                    onClick={() => setUserScrollIndex(Math.max(0, userScrollIndex - 1))}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors shrink-0"
                    title="Anterior"
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                )}

                {/* Usuarios visibles */}
                {usuariosFiltrados.slice(userScrollIndex, userScrollIndex + 8).map((user) => {
                  const colorMarco = user.profile.marco || '#3b82f6';
                  const isOnline = true; // TODO: Implementar lógica real

                  return (
                    <button
                      key={user.id}
                      onClick={() => handleUserSelect(user)}
                      className="relative group shrink-0"
                      title={`Enviar a ${user.getNombreCompleto()}`}
                    >
                      {/* Avatar con marco de color */}
                      <div
                        className="w-12 h-12 rounded-full border-3 flex items-center justify-center transition-transform group-hover:scale-110"
                        style={{ borderColor: colorMarco, borderWidth: '3px' }}
                      >
                        <div className="relative w-10 h-10 rounded-full overflow-hidden">
                          <Image
                            src={user.profile.avatar || '/total-time_logo.png'}
                            alt={user.getNombreCompleto()}
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>

                      {/* Indicador de estado online */}
                      {isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                      )}

                      {/* Tooltip con nombre */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          {user.getNombreCompleto()}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* Flecha derecha */}
                {usuariosFiltrados.length > 8 && userScrollIndex + 8 < usuariosFiltrados.length && (
                  <button
                    onClick={() => setUserScrollIndex(Math.min(usuariosFiltrados.length - 8, userScrollIndex + 1))}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors shrink-0"
                    title="Siguiente"
                  >
                    <ChevronRight className="w-5 h-5 text-white" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Input principal: fondo sólido y sombra al hacer click (focus) */}
      <div
        className={`rounded-2xl p-4 flex items-start gap-3 w-96 transition-all duration-200 ${
          isFocused
            ? 'bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]'
            : 'bg-white/20 backdrop-blur-sm'
        }`}
      >
        <div
          className={`w-8 h-8 rounded flex-shrink-0 mt-1 transition-colors ${
            isFocused ? 'bg-gray-200' : 'bg-white/30'
          }`}
        />
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={handleInputChange}
          placeholder={placeholder}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`flex-1 bg-transparent outline-none resize-none placeholder-gray-800 ${
            isFocused ? 'text-gray-900' : 'text-white'
          }`}
          style={{
            minHeight: '24px',
            maxHeight: '120px',
            lineHeight: '24px',
            overflowY: 'auto',
            wordWrap: 'break-word',
            whiteSpace: 'pre-wrap'
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (inputText.trim()) {
                handleCreate();
              }
            }
          }}
        />
      </div>

    </div>
  );
}