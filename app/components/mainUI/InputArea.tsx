"use client";

import { useState, useRef, useMemo } from 'react';
import { StickyNote, CheckSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useUsuariosOrganizacion } from '@/hooks/useUsuariosOrganizacion';
import Image from 'next/image';

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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { usuario } = useAuth();
  const { usuarios: usuariosOrganizacion } = useUsuariosOrganizacion(
    usuario?.idOrganizacion || null
  );

  // Filtrar usuarios excluyendo al usuario actual y ordenar por estado de conexión
  const usuariosFiltrados = useMemo(() => {
    if (!usuario) return usuariosOrganizacion;

    const filtrados = usuariosOrganizacion.filter(u => {
      return u.email !== usuario.email;
    });

    // Ordenar: conectados primero (simular todos online por ahora)
    return filtrados.sort((a, b) => {
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
      {/* Área de acciones cuando hay texto */}
      {showButtons && (
        <div className="mb-3 flex items-center gap-3">
          {/* Botones de Nota y Tareas */}
          <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
            <button
              onClick={handleCreateNote}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-full text-white text-sm font-medium transition-colors"
              title="Crear Nota"
            >
              <StickyNote size={16} />
              <span>Nota</span>
            </button>
            <button
              onClick={handleCreateTodoList}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 rounded-full text-white text-sm font-medium transition-colors"
              title="Crear Lista de Tareas"
            >
              <CheckSquare size={16} />
              <span>Tareas</span>
            </button>
          </div>

          {/* Barra de usuarios conectados */}
          <div className="bg-white/20 backdrop-blur-sm rounded-full px-2 py-2 flex items-center gap-2">
            {/* Flecha izquierda */}
            {usuariosFiltrados.length > 2 && userScrollIndex > 0 && (
              <button
                onClick={() => setUserScrollIndex(Math.max(0, userScrollIndex - 1))}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
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
                  className="relative group"
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
            {usuariosFiltrados.length > 2 && userScrollIndex + 8 < usuariosFiltrados.length && (
              <button
                onClick={() => setUserScrollIndex(Math.min(usuariosFiltrados.length - 8, userScrollIndex + 1))}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
                title="Siguiente"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Input principal */}
      <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 flex items-start gap-3 w-96">
        <div className="w-8 h-8 bg-white/30 rounded flex-shrink-0 mt-1"></div>
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white placeholder-white/70 outline-none resize-none"
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
              // Prevenir envío en Enter, solo crear nota/tarea con botones o seleccionar usuario
              e.preventDefault();
            }
          }}
        />
      </div>
    </div>
  );
}