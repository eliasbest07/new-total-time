"use client";

import { useState, useRef } from 'react';
import { StickyNote, CheckSquare, Send } from 'lucide-react';

interface InputAreaProps {
  onCreateNote?: (text: string) => void;
  onCreateTodoList?: (text: string) => void;
  onSendMessage?: (text: string) => void;
  placeholder?: string;
  className?: string;
}

export default function InputArea({ 
  onCreateNote, 
  onCreateTodoList, 
  onSendMessage, 
  placeholder = "Escribe aquí",
  className = ""
}: InputAreaProps) {
  const [inputText, setInputText] = useState('');
  const [showButtons, setShowButtons] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  const handleSendMessage = (): void => {
    if (inputText.trim() && onSendMessage) {
      onSendMessage(inputText.trim());
      setInputText('');
      setShowButtons(false);
      resetTextareaHeight();
    }
  };

  return (
    <div className={`flex flex-col items-center pointer-events-auto ${className}`}>
      {/* Botones de acción */}
      {showButtons && (
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 mb-3 flex gap-3 w-96">
          <button
            onClick={handleCreateNote}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-white text-sm font-medium transition-colors"
            title="Crear Nota"
          >
            <StickyNote size={16} />
            <span>Nota</span>
          </button>
          <button
            onClick={handleCreateTodoList}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg text-white text-sm font-medium transition-colors"
            title="Crear Lista de Tareas"
          >
            <CheckSquare size={16} />
            <span>Tareas</span>
          </button>
          <button
            onClick={handleSendMessage}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-white text-sm font-medium transition-colors"
            title="Enviar"
          >
            <Send size={16} />
            <span>Enviar</span>
          </button>
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
            if (e.key === 'Enter' && e.shiftKey) {
              // Allow new line with Shift+Enter
              return;
            } else if (e.key === 'Enter') {
              // Send on Enter without Shift
              e.preventDefault();
              if (inputText.trim()) {
                handleSendMessage();
              }
            }
          }}
        />
      </div>
    </div>
  );
}