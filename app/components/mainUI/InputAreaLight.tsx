"use client";

import { useState, useRef, useMemo } from 'react';
import { StickyNote, CheckSquare, Send, X } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useUsuariosOrganizacion } from '@/hooks/useUsuariosOrganizacion';
import Image from 'next/image';

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
  const [showUserList, setShowUserList] = useState(false);
  const [showAllUsers, setShowAllUsers] = useState(false);
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

  // Mostrar los primeros 3 usuarios conectados
  const usuariosVisible = showAllUsers ? usuariosFiltrados : usuariosFiltrados.slice(0, 3);

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

  const handleSendClick = (): void => {
    if (!inputText.trim()) return;
    setShowUserList(true);
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
      setShowUserList(false);
      setShowAllUsers(false);
      resetTextareaHeight();
    }
  };

  return (
    <div className={`flex flex-col items-center pointer-events-auto ${className}`}>
      {/* Lista de usuarios */}
      {showUserList && (
        <div className="bg-white rounded-2xl shadow-2xl p-4 mb-3 w-96 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Enviar a:</h3>
            <button
              onClick={() => {
                setShowUserList(false);
                setShowAllUsers(false);
              }}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="space-y-2">
            {usuariosVisible.map((user) => {
              const colorMarco = user.profile.marco || '#3b82f6';
              const isOnline = true; // TODO: Implementar lógica real

              return (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: colorMarco }}
                  >
                    <div className="relative w-8 h-8 rounded-full overflow-hidden">
                      <Image
                        src={user.profile.avatar || '/total-time_logo.png'}
                        alt={user.getNombreCompleto()}
                        fill
                        className="object-cover"
                      />
                    </div>
                    {isOnline && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">{user.getNombreCompleto()}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>

                  {/* Badge online */}
                  {isOnline && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                      En línea
                    </span>
                  )}
                </button>
              );
            })}

            {/* Botón ver más */}
            {!showAllUsers && usuariosFiltrados.length > 3 && (
              <button
                onClick={() => setShowAllUsers(true)}
                className="w-full p-3 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
              >
                Ver {usuariosFiltrados.length - 3} más...
              </button>
            )}

            {showAllUsers && usuariosFiltrados.length > 3 && (
              <button
                onClick={() => setShowAllUsers(false)}
                className="w-full p-3 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors font-medium"
              >
                Ver menos
              </button>
            )}
          </div>
        </div>
      )}

      {/* Botones de acción */}
      {showButtons && !showUserList && (
        <div className="bg-white rounded-2xl shadow-lg p-3 mb-3 flex gap-3 w-96">
          <button
            onClick={handleCreateNote}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 text-sm font-medium transition-colors"
            title="Crear Nota"
          >
            <StickyNote size={16} />
            <span>Nota</span>
          </button>
          <button
            onClick={handleCreateTodoList}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 rounded-lg text-green-700 text-sm font-medium transition-colors"
            title="Crear Lista de Tareas"
          >
            <CheckSquare size={16} />
            <span>Tareas</span>
          </button>
          <button
            onClick={handleSendClick}
            className="flex items-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-700 text-sm font-medium transition-colors"
            title="Enviar a usuario"
          >
            <Send size={16} />
            <span>Enviar</span>
          </button>
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
            if (e.key === 'Enter' && e.shiftKey) {
              // Allow new line with Shift+Enter
              return;
            } else if (e.key === 'Enter') {
              // Send on Enter without Shift
              e.preventDefault();
              if (inputText.trim() && !showUserList) {
                handleSendClick();
              }
            }
          }}
        />
      </div>
    </div>
  );
}
