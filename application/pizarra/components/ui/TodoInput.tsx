import React, { useState, useCallback } from 'react';

interface TodoInputProps {
  cardId: string;
  onAddTodo: (cardId: string, text: string) => void;
  fontSize?: number;
}

export const TodoInput: React.FC<TodoInputProps> = React.memo(({ cardId, onAddTodo, fontSize = 18 }) => {
  const [localText, setLocalText] = useState('');

  const handleSubmit = useCallback(() => {
    if (localText.trim()) {
      onAddTodo(cardId, localText.trim());
      setLocalText('');
    }
  }, [cardId, localText, onAddTodo]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <div className="flex gap-1 mt-1 ml-0 mr-1" data-todo-interactive>
      <input
        type="text"
        placeholder="Nueva tarea..."
        value={localText}
        onChange={(e) => {
          e.stopPropagation();
          setLocalText(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onFocus={(e) => {
          e.stopPropagation();
        }}
        className="flex-1 px-2 py-1 border rounded focus:border-blue-400 focus:outline-none bg-white text-black"
        style={{ fontSize: `${Math.max(8, fontSize - 3)}px` }}
        data-todo-interactive
      />
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleSubmit();
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors flex items-center justify-center min-w-[20px]"
        style={{ fontSize: `${Math.max(8, fontSize - 3)}px` }}
        data-todo-interactive
      >
        +
      </button>
    </div>
  );
});

TodoInput.displayName = 'TodoInput';
