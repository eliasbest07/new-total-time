import React from 'react';
import { Card, TodoItem } from '../../types';
import { TodoInput } from '../ui/TodoInput';

interface TodoCardProps {
  card: Card;
  editingTitle: string | null;
  editingTodo: { cardId: string; todoId: number } | null;
  updateCardTitle: (cardId: string, newTitle: string) => void;
  setEditingTitle: (id: string | null) => void;
  setEditingTodo: (edit: { cardId: string; todoId: number } | null) => void;
  toggleTodo: (cardId: string, todoId: number) => void;
  addTodoToCard: (cardId: string, text: string) => void;
  deleteTodoFromCard: (cardId: string, todoId: number) => void;
  updateTodoInCard: (cardId: string, todoId: number, newText: string) => void;
}

export const TodoCard: React.FC<TodoCardProps> = ({
  card,
  editingTitle,
  editingTodo,
  updateCardTitle,
  setEditingTitle,
  setEditingTodo,
  toggleTodo,
  addTodoToCard,
  deleteTodoFromCard,
  updateTodoInCard
}) => {
  return (
    <div className="flex flex-col h-full w-full p-2">
      <div className="flex items-center gap-2 mb-2">
        <div style={{ fontSize: `${Math.max(16, (card.fontSize || 18) + 4)}px` }}>📝</div>
        {editingTitle === card.id ? (
          <input
            type="text"
            defaultValue={card.title}
            onBlur={(e) => updateCardTitle(card.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateCardTitle(card.id, e.currentTarget.value);
              }
              if (e.key === 'Escape') {
                setEditingTitle(null);
              }
            }}
            className="font-semibold text-sm text-gray-800 flex-1 bg-transparent border-b border-gray-400 focus:outline-none"
            autoFocus
            data-todo-interactive
          />
        ) : (
          <h3
            className="font-semibold text-gray-800 truncate flex-1"
            style={{ fontSize: `${card.fontSize || 18}px` }}
          >
            {card.title}
          </h3>
        )}
      </div>

      <div className="flex-1 overflow-y-auto todo-scroll pr-1">
        {card.todos?.map(todo => (
          <div
            key={todo.id}
            className="flex items-center gap-2 mb-1"
            style={{ fontSize: `${(card.fontSize || 18) - 3}px` }}
            data-todo-interactive
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleTodo(card.id, todo.id);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className={`rounded border flex items-center justify-center hover:scale-110 transition-transform ${todo.completed ? 'bg-green-500 text-white' : 'border-gray-400 hover:border-gray-600'
                }`}
              style={{
                width: `${Math.max(12, (card.fontSize || 18) - 1)}px`,
                height: `${Math.max(12, (card.fontSize || 18) - 1)}px`,
                fontSize: `${Math.max(8, (card.fontSize || 18) - 4)}px`
              }}
              data-todo-interactive
            >
              {todo.completed && '✓'}
            </button>
            {editingTodo && editingTodo.cardId === card.id && editingTodo.todoId === todo.id ? (
              <input
                type="text"
                defaultValue={todo.text}
                className="flex-1 px-1 py-0.5 border rounded focus:border-blue-400 focus:outline-none bg-white text-black"
                style={{ fontSize: `${(card.fontSize || 18) - 3}px` }}
                autoFocus
                onBlur={(e) => {
                  if (e.target.value.trim()) {
                    updateTodoInCard(card.id, todo.id, e.target.value.trim());
                  } else {
                    setEditingTodo(null);
                  }
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') {
                    if (e.currentTarget.value.trim()) {
                      updateTodoInCard(card.id, todo.id, e.currentTarget.value.trim());
                    } else {
                      setEditingTodo(null);
                    }
                  }
                  if (e.key === 'Escape') {
                    setEditingTodo(null);
                  }
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                data-todo-interactive
              />
            ) : (
              <span
                className={`flex-1 cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5 transition-colors ${todo.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!todo.completed) {
                    setEditingTodo({ cardId: card.id, todoId: todo.id });
                  }
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                data-todo-interactive
              >
                {todo.text}
              </span>
            )}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                deleteTodoFromCard(card.id, todo.id);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded px-1 transition-colors"
              style={{ fontSize: `${Math.max(10, (card.fontSize || 18) - 2)}px` }}
              data-todo-interactive
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <TodoInput cardId={card.id} onAddTodo={addTodoToCard} fontSize={card.fontSize} />
    </div>
  );
};
