import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card } from '../../types';
import { Pencil, ListChecks, AlignLeft } from 'lucide-react';
import { isTaskListContent, contentToTaskItems, taskItemsToHtml, parseTaskItems } from './note/taskListUtils';
import { TaskListView } from './note/TaskListView';

interface NoteCardProps {
  card: Card;
  editingTitle: string | null;
  updateCardTitle: (cardId: string, newTitle: string) => void;
  setEditingTitle: (id: string | null) => void;
  updateCardContent: (cardId: string, newContent: string) => void;
  idPizarra?: string | null;
}

const hasHtmlTags = (text: string): boolean => /<[a-z][\s\S]*>/i.test(text);

const plainTextToHtml = (text: string): string => {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped.replace(/\n/g, '<br>');
};

const getDisplayHtml = (content: string | null): string => {
  if (!content) return '';
  return hasHtmlTags(content) ? content : plainTextToHtml(content);
};

export const NoteCard: React.FC<NoteCardProps> = ({
  card,
  editingTitle,
  updateCardTitle,
  setEditingTitle,
  updateCardContent,
}) => {
  const [editingContent, setEditingContent] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const isTaskList = isTaskListContent(card.content);

  // Setear contenido inicial UNA sola vez al entrar en modo edición
  useEffect(() => {
    if (editingContent && editorRef.current) {
      editorRef.current.innerHTML = getDisplayHtml(card.content);
      const sel = window.getSelection();
      if (sel) {
        sel.selectAllChildren(editorRef.current);
        sel.collapseToEnd();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingContent]);

  // Registrar listeners nativos en el toolbar para evitar problemas con delegación de React
  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    toolbar.addEventListener('mousedown', handleMouseDown);
    return () => toolbar.removeEventListener('mousedown', handleMouseDown);
  }, [editingContent]);

  const handleContentDoubleClick = () => {
    if (!isTaskList) {
      setEditingContent(true);
    }
  };

  const saveAndClose = useCallback(() => {
    if (editorRef.current) {
      updateCardContent(card.id, editorRef.current.innerHTML);
    }
    setEditingContent(false);
  }, [card.id, updateCardContent]);

  const handleEditorBlur = useCallback(
    (e: React.FocusEvent) => {
      if (toolbarRef.current?.contains(e.relatedTarget as Node)) {
        return;
      }
      saveAndClose();
    },
    [saveAndClose]
  );

  const handleContentKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      saveAndClose();
    }
    if (e.key === 'Escape') {
      setEditingContent(false);
    }
    if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      document.execCommand('bold', false);
      setIsBold(document.queryCommandState('bold'));
    }
  };

  const execFormat = (command: string) => {
    document.execCommand(command, false);
    setIsBold(document.queryCommandState('bold'));
  };

  const handleSelectionChange = () => {
    setIsBold(document.queryCommandState('bold'));
  };

  const toolbarBtnClass = (active: boolean) =>
    `px-1.5 py-0.5 rounded text-xs font-medium cursor-pointer select-none transition-colors inline-flex items-center justify-center ${
      active
        ? 'bg-blue-500 text-white'
        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
    }`;

  // ── Toggle handlers ──

  const toggleToTaskList = () => {
    const items = contentToTaskItems(card.content);
    updateCardContent(card.id, taskItemsToHtml(items));
  };

  const toggleToNote = () => {
    if (!card.content) return;
    const items = parseTaskItems(card.content);
    const plainHtml = items.map((i) => i.text).join('<br>');
    updateCardContent(card.id, plainHtml || '');
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header con emoji y título */}
      <div className="flex items-center gap-2 flex-shrink-0 mb-2">
        <div style={{ fontSize: `${Math.max(20, (card.fontSize || 18) + 8)}px` }}>
          {isTaskList ? '☑️' : '📝'}
        </div>
        <div className="flex-1 min-w-0">
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
              className="font-semibold text-gray-800 w-full bg-transparent border-b border-gray-400 focus:outline-none"
              autoFocus
              data-todo-interactive
            />
          ) : (
            <div className="group inline-flex items-center gap-1 max-w-full">
              <Pencil
                size={14}
                className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 cursor-pointer hover:text-gray-600"
                onClick={() => setEditingTitle(card.id)}
                data-todo-interactive
              />
              <h3
                className="font-semibold text-gray-800 truncate"
                style={{ fontSize: `${card.fontSize || 18}px` }}
              >
                {card.title}
              </h3>
            </div>
          )}
        </div>
        {/* Toggle note ↔ task list */}
        <button
          className="p-1 rounded hover:bg-gray-200 transition-colors flex-shrink-0"
          onClick={isTaskList ? toggleToNote : toggleToTaskList}
          title={isTaskList ? 'Convertir a nota' : 'Convertir a lista de tareas'}
          data-todo-interactive
        >
          {isTaskList ? (
            <AlignLeft size={16} className="text-gray-500" />
          ) : (
            <ListChecks size={16} className="text-gray-500" />
          )}
        </button>
      </div>

      {/* Área de contenido */}
      <div className="flex-1 min-h-0 w-full flex flex-col">
        {isTaskList ? (
          <TaskListView
            content={card.content}
            cardId={card.id}
            fontSize={card.fontSize || 18}
            updateCardContent={updateCardContent}
          />
        ) : editingContent ? (
          <>
            {/* Toolbar */}
            <div ref={toolbarRef} className="flex items-center gap-1 mb-1 flex-shrink-0">
              <span
                className={toolbarBtnClass(isBold)}
                onClick={() => execFormat('bold')}
                title="Negrita (Ctrl+B)"
              >
                B
              </span>
              <div className="w-px h-4 bg-gray-300 mx-0.5" />
              <span
                className={toolbarBtnClass(false)}
                onClick={() => execFormat('justifyLeft')}
                title="Alinear izquierda"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" />
                </svg>
              </span>
              <span
                className={toolbarBtnClass(false)}
                onClick={() => execFormat('justifyCenter')}
                title="Centrar"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
                </svg>
              </span>
              <span
                className={toolbarBtnClass(false)}
                onClick={() => execFormat('justifyRight')}
                title="Alinear derecha"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" />
                </svg>
              </span>
              <span
                className={toolbarBtnClass(false)}
                onClick={() => execFormat('justifyFull')}
                title="Justificar"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </span>
            </div>
            {/* Editor contentEditable */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onBlur={handleEditorBlur}
              onKeyDown={handleContentKeyDown}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onMouseUp={handleSelectionChange}
              onKeyUp={handleSelectionChange}
              className="text-gray-600 w-full flex-1 min-h-0 bg-transparent border border-gray-400 rounded px-2 py-1 focus:outline-none focus:border-blue-500 overflow-y-auto break-words"
              style={{ fontSize: `${(card.fontSize || 18) - 2}px` }}
              data-todo-interactive
            />
          </>
        ) : (
          <div
            className="text-gray-600 cursor-pointer hover:bg-gray-100 rounded px-2 py-1 transition-colors w-full h-full overflow-y-auto break-words"
            style={{ fontSize: `${(card.fontSize || 18) - 2}px` }}
            onDoubleClick={handleContentDoubleClick}
            dangerouslySetInnerHTML={{ __html: getDisplayHtml(card.content) }}
            data-todo-interactive
          />
        )}
      </div>
    </div>
  );
};
