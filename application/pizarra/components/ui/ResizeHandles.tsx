import React from 'react';

interface ResizeHandlesProps {
  cardId: string;
  onResizeStart: (e: React.MouseEvent, cardId: string) => void;
}

export const ResizeHandles: React.FC<ResizeHandlesProps> = ({ cardId, onResizeStart }) => {
  return (
    <>
      <div
        className="absolute -bottom-1 -right-1 w-4 h-4 bg-transparent hover:bg-gray-600 cursor-se-resize rounded-tl-lg hover:opacity-100 transition-all duration-200"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onResizeStart(e, cardId);
        }}
        data-todo-interactive
      />
      <div
        className="absolute -top-1 -right-1 w-4 h-4 bg-transparent hover:bg-gray-600 cursor-ne-resize rounded-bl-lg hover:opacity-100 transition-all duration-200"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onResizeStart(e, cardId);
        }}
        data-todo-interactive
      />
      <div
        className="absolute -top-1 -left-1 w-4 h-4 bg-transparent hover:bg-gray-600 cursor-nw-resize rounded-br-lg hover:opacity-100 transition-all duration-200"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onResizeStart(e, cardId);
        }}
        data-todo-interactive
      />
      <div
        className="absolute -bottom-1 -left-1 w-4 h-4 bg-transparent hover:bg-gray-600 cursor-sw-resize rounded-tr-lg hover:opacity-100 transition-all duration-200"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onResizeStart(e, cardId);
        }}
        data-todo-interactive
      />
    </>
  );
};
