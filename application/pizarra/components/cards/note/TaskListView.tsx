import React, { useState, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { TaskItem, parseTaskItems, taskItemsToHtml } from './taskListUtils';

interface TaskListViewProps {
  content: string | null;
  cardId: string;
  fontSize: number;
  updateCardContent: (cardId: string, newContent: string) => void;
}

export const TaskListView: React.FC<TaskListViewProps> = ({
  content,
  cardId,
  fontSize,
  updateCardContent,
}) => {
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  const taskItems = parseTaskItems(content || '');
  const completedCount = taskItems.filter((i) => i.checked).length;

  const updateItems = (updater: (items: TaskItem[]) => void) => {
    const items = parseTaskItems(content || '');
    updater(items);
    updateCardContent(cardId, taskItemsToHtml(items));
  };

  const toggleItemChecked = (index: number) => {
    updateItems((items) => {
      if (items[index]) items[index].checked = !items[index].checked;
    });
  };

  const updateItemText = (index: number, newText: string) => {
    updateItems((items) => {
      if (items[index]) items[index].text = newText;
    });
    setEditingItemIndex(null);
  };

  const addTaskItem = (text: string) => {
    if (!text.trim()) return;
    updateItems((items) => {
      items.push({ text: text.trim(), checked: false });
    });
  };

  const removeTaskItem = (index: number) => {
    updateItems((items) => {
      items.splice(index, 1);
    });
  };

  return (
    <div className="flex flex-col gap-0.5 overflow-y-auto flex-1 min-h-0">
      {/* Progreso */}
      {taskItems.length > 0 && (
        <div className="flex items-center gap-2 mb-1 flex-shrink-0">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{
                width: `${(completedCount / taskItems.length) * 100}%`,
              }}
            />
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {completedCount}/{taskItems.length}
          </span>
        </div>
      )}

      {/* Items */}
      {taskItems.map((item, i) => (
        <div
          key={i}
          className="flex items-start gap-2 group py-0.5 px-1 rounded hover:bg-gray-50"
          data-todo-interactive
        >
          <input
            type="checkbox"
            checked={item.checked}
            onChange={() => toggleItemChecked(i)}
            className="mt-1 flex-shrink-0 accent-green-500 cursor-pointer"
            data-todo-interactive
          />
          {editingItemIndex === i ? (
            <input
              type="text"
              defaultValue={item.text}
              autoFocus
              onBlur={(e) => updateItemText(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateItemText(i, e.currentTarget.value);
                }
                if (e.key === 'Escape') {
                  setEditingItemIndex(null);
                }
              }}
              className="flex-1 bg-transparent border-b border-gray-300 focus:outline-none focus:border-blue-500 text-sm"
              style={{ fontSize: `${fontSize - 2}px` }}
              data-todo-interactive
              onMouseDown={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className={`flex-1 text-sm cursor-pointer ${
                item.checked ? 'line-through text-gray-400' : 'text-gray-700'
              }`}
              style={{ fontSize: `${fontSize - 2}px` }}
              onDoubleClick={() => setEditingItemIndex(i)}
              data-todo-interactive
            >
              {item.text}
            </span>
          )}
          <button
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 text-gray-400 transition-all flex-shrink-0"
            onClick={() => removeTaskItem(i)}
            data-todo-interactive
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}

      {/* Agregar nuevo item */}
      <div className="flex items-center gap-2 mt-1 flex-shrink-0">
        <Plus size={14} className="text-gray-400 flex-shrink-0" />
        <input
          ref={addInputRef}
          type="text"
          placeholder="Agregar tarea..."
          className="flex-1 bg-transparent text-sm text-gray-500 placeholder-gray-300 focus:outline-none border-b border-transparent focus:border-gray-300"
          style={{ fontSize: `${fontSize - 4}px` }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              addTaskItem(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
          data-todo-interactive
        />
      </div>
    </div>
  );
};
