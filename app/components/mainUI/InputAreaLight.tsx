"use client";

import { useState, useRef, useMemo } from 'react';
import { StickyNote, CheckSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useUsuariosOrganizacionContext } from '@/app/contexts/UsuariosOrganizacionContext';
import Image from 'next/image';

type CreateMode = 'note' | 'todo';

interface InputAreaLightProps {
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

export default function InputAreaLight({
  onCreateNote,
  onCreateTodoList,
  onSendToUser,
  placeholder = "Escribe aquí",
  className = ""
}: InputAreaLightProps) {
  const [inputText, setInputText] = useState('');
  const [showButtons, setShowButtons] = useState(false);
  const [userScrollIndex, setUserScrollIndex] = useState(0);
  const [createMode, setCreateMode] = useState<CreateMode>('note');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { usuario } = useAuth();

  const { usuariosFiltrados: usuariosOrganizacion } = useUsuariosOrganizacionContext();

  const usuariosFiltrados = useMemo(() => {
    return [...usuariosOrganizacion].sort((a, b) => {
      return 0;
    });
  }, [usuariosOrganizacion]);

  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const value = e.target.value;
    setInputText(value);
    setShowButtons(value.trim().length > 0);

    const textarea = e.target;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const lineHeight = 24;
    const maxHeight = lineHeight * 5;
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
        online: true
      });
      setInputText('');
      setShowButtons(false);
      resetTextareaHeight();
    }
  };

  return (
    <div className={`flex flex-col items-center pointer-events-auto ${className}`}>
      {/* Botones + Usuarios conectados (cuando hay texto) */}
      {showButtons && (
        <div className="mb-3">
          <div className="bg-white/90 backdrop-blur-sm rounded-full shadow-lg px-4 py-2 flex items-center gap-2">
            {/* Radio Nota + Botón Nota */}
            <div
              className="flex items-center gap-1.5 cursor-pointer"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setCreateMode('note')}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                createMode === 'note' ? 'border-blue-600' : 'border-gray-400'
              }`}>
                {createMode === 'note' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
              </div>
            </div>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCreateNote}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-full text-blue-700 text-sm font-medium transition-colors"
              title="Crear Nota"
            >
              <StickyNote size={14} />
              <span>Nota</span>
            </button>

            <div className="w-px h-5 bg-gray-300" />

            {/* Radio Tarea + Botón Tarea */}
            <div
              className="flex items-center gap-1.5 cursor-pointer"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setCreateMode('todo')}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                createMode === 'todo' ? 'border-green-600' : 'border-gray-400'
              }`}>
                {createMode === 'todo' && <div className="w-2 h-2 rounded-full bg-green-600" />}
              </div>
            </div>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCreateTodoList}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 rounded-full text-green-700 text-sm font-medium transition-colors"
              title="Crear Lista de Tareas"
            >
              <CheckSquare size={14} />
              <span>Tarea</span>
            </button>

            {/* Separador antes de usuarios */}
            {usuariosFiltrados.length > 0 && <div className="w-px h-5 bg-gray-300" />}

            {/* Usuarios conectados */}
            {usuariosFiltrados.length > 8 && userScrollIndex > 0 && (
              <button
                onClick={() => setUserScrollIndex(Math.max(0, userScrollIndex - 1))}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                title="Anterior"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}

            {usuariosFiltrados.slice(userScrollIndex, userScrollIndex + 8).map((user) => {
              const colorMarco = user.profile.marco || '#3b82f6';
              const isOnline = true;

              return (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className="relative group"
                  title={`Enviar a ${user.getNombreCompleto()}`}
                >
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

                  {isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                  )}

                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {user.getNombreCompleto()}
                    </div>
                  </div>
                </button>
              );
            })}

            {usuariosFiltrados.length > 8 && userScrollIndex + 8 < usuariosFiltrados.length && (
              <button
                onClick={() => setUserScrollIndex(Math.min(usuariosFiltrados.length - 8, userScrollIndex + 1))}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                title="Siguiente"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Input principal */}
      <div className="bg-white rounded-2xl shadow-lg p-4 flex items-start gap-3 w-96 border border-gray-200">
        <div className="w-8 h-8 bg-gray-200 rounded flex-shrink-0 mt-1"></div>
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={handleInputChange}
          placeholder={placeholder}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 outline-none resize-none"
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
