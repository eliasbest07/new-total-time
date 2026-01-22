import React from 'react';
import { Card } from '../types/index';
import { CardFactory } from './CardFactory';
import { ResizeHandles } from './ui/ResizeHandles';
import { CardConfigPanel } from './ui/CardConfigPanel';
import { DeleteConfirmModal } from './ui/DeleteConfirmModal';
import { getCardStyle, getCardBorderColor } from '../utils/cardHelpers';

interface CardWrapperProps {
  card: Card;
  draggedCard: string | null;
  isConnecting: boolean;
  connectingFrom: string | null;
  hoveredCard: string | null;
  panOffset: { x: number; y: number };
  editingTitle: string | null;
  editingTodo: { cardId: string; todoId: number } | null;
  configOpenCard: string | null;
  confirmDelete: string | null;
  cardZIndex: number;
  handleCardMouseDown: (e: React.MouseEvent<HTMLDivElement>, card: Card) => void;
  setHoveredCard: (id: string | null) => void;
  handleCardClick: (e: React.MouseEvent<HTMLDivElement>, cardId: string) => void;
  handleResizeStart: (e: React.MouseEvent, cardId: string) => void;
  handleConnectionPointClick: (e: React.MouseEvent<HTMLDivElement>, cardId: string) => void;
  setConfigOpenCard: (id: string | null) => void;
  changeFontSize: (cardId: string, increment: number) => void;
  setEditingTitle: (id: string | null) => void;
  setConfirmDelete: (id: string | null) => void;
  deleteCard: (cardId: string) => void;
  updateCardTitle: (cardId: string, newTitle: string) => void;
  updateCardContent: (cardId: string, newContent: string) => void;
  setEditingTodo: (edit: { cardId: string; todoId: number } | null) => void;
  toggleTodo: (cardId: string, todoId: number) => void;
  addTodoToCard: (cardId: string, text: string) => void;
  deleteTodoFromCard: (cardId: string, todoId: number) => void;
  updateTodoInCard: (cardId: string, todoId: number, newText: string) => void;
  handleActivityPlayPause: (cardId: string, isRunning: boolean) => void;
  handleMisionPlayPause: (cardId: string, isRunning: boolean) => void;
  onShowScreenshots?: (cardId: string) => void;
  screenshots: any[];
  isCapturing: boolean;
  captureNow: () => Promise<string | null>;
  setCards: React.Dispatch<React.SetStateAction<Card[]>>;
  pastedImages: { [key: string]: string };
  bringCardToFront: (cardId: string) => void;
  usuarios?: any[];
  currentUserId?: string;
  onOpenUserChat?: (userData: {
    userId: string;
    name: string;
    avatar?: string;
    color?: string;
    online?: boolean;
  }) => void;
  openImageWindow?: (imageUrl: string, title: string) => void;
  addTodoCard?: (text?: string) => string;
  addNoteCard?: (text: string, position?: { x: number; y: number }) => string;
  addConnection?: (fromCardId: string, toCardId: string, skipValidation?: boolean) => void;
  addMisionCardOrganizacion?: (misionData: any) => string | void;
  addMisionCard?: (misionData: any) => string | void;
  cards?: Card[];
  onOpenCapturasModal?: (misionActivaId: string, misionTitle: string) => void;
  idPizarra?: string | null;
  readOnly?: boolean; // Si es true, oculta botones de play/pause (para pizarras ajenas)
  openEditarProyecto?: (
    proyectoId: number,
    initialData: { nombre: string; descripcion: string; icono: string | null; github_url: string; sitio_web_url: string; tecnologias: string[] },
    onRefresh?: () => void
  ) => void;
}

export const CardWrapperComponent: React.FC<CardWrapperProps> = React.memo((props) => {
  const { card } = props;

  // Determinar si es una misión corriendo para cambiar colores
  const isMisionRunning = card.type === 'mision' && card.misionData?.isRunning;
  
  // Determinar el color de la barra superior
  const getTopBarColor = () => {
    if (isMisionRunning) {
      return 'bg-orange-600';
    }
    // Si es mision-organizacion y está en progreso, usar verde
    if (card.type === 'mision-organizacion' && card.misionData?.estado === 'en_progreso') {
      return 'bg-green-500';
    }
    return getCardBorderColor(card.type);
  };

  return (
    <div
      className={`
        ${isMisionRunning
          ? 'absolute rounded-lg shadow-lg border-2 p-2 cursor-move transition-colors duration-200 select-none bg-orange-50 border-orange-300'
          : getCardStyle(card.type)
        }
        ${props.draggedCard === card.id ? 'shadow-2xl border-blue-500' : ''}
        ${props.isConnecting && props.connectingFrom === card.id ? 'ring-4 ring-blue-400' : ''}
        ${props.hoveredCard === card.id ? 'ring-2 ring-gray-300' : ''}
      `}
      style={{
        left: card.x,
        top: card.y,
        width: card.width,
        height: card.height,
        transform: `translate(${props.panOffset.x}px, ${props.panOffset.y}px)`,
        zIndex: props.cardZIndex
      }}
      onMouseDown={(e) => {
        props.bringCardToFront(card.id);
        props.handleCardMouseDown(e, card);
      }}
      onMouseEnter={() => props.setHoveredCard(card.id)}
      onMouseLeave={() => props.setHoveredCard(null)}
      onClick={(e) => {
        props.bringCardToFront(card.id);
        props.handleCardClick(e, card.id);
      }}
    >
      {/* Resize handles */}
      <ResizeHandles cardId={card.id} onResizeStart={props.handleResizeStart} />

      {/* Top border line */}
      <div className={`absolute top-0 left-0 right-0 h-2 rounded-t-lg ${getTopBarColor()}`}></div>

      {/* Card content using factory */}
      <CardFactory
        card={card}
        editingTitle={props.editingTitle}
        editingTodo={props.editingTodo}
        updateCardTitle={props.updateCardTitle}
        updateCardContent={props.updateCardContent}
        setEditingTitle={props.setEditingTitle}
        setEditingTodo={props.setEditingTodo}
        toggleTodo={props.toggleTodo}
        addTodoToCard={props.addTodoToCard}
        deleteTodoFromCard={props.deleteTodoFromCard}
        updateTodoInCard={props.updateTodoInCard}
        handleActivityPlayPause={props.handleActivityPlayPause}
        handleMisionPlayPause={props.handleMisionPlayPause}
        onShowScreenshots={props.onShowScreenshots}
        screenshots={props.screenshots}
        isCapturing={props.isCapturing}
        captureNow={props.captureNow}
        setCards={props.setCards}
        pastedImages={props.pastedImages}
        usuarios={props.usuarios}
        currentUserId={props.currentUserId}
        onOpenUserChat={props.onOpenUserChat}
        openImageWindow={props.openImageWindow}
        addTodoCard={props.addTodoCard}
        addNoteCard={props.addNoteCard}
        addConnection={props.addConnection}
        addMisionCardOrganizacion={props.addMisionCardOrganizacion}
        addMisionCard={props.addMisionCard}
        cards={props.cards}
        onOpenCapturasModal={props.onOpenCapturasModal}
        idPizarra={props.idPizarra}
        deleteCard={props.deleteCard}
        readOnly={props.readOnly}
        openEditarProyecto={props.openEditarProyecto}
      />

      {/* Connection point */}
      {(props.hoveredCard === card.id || props.isConnecting) && (
        <div
          data-connection-button="true"
          className={`
            absolute -top-2 right-2 px-2 py-1 rounded-md cursor-pointer z-20
            transition-all duration-200 hover:scale-110 flex items-center justify-center
            ${props.isConnecting && props.connectingFrom === card.id
              ? 'bg-blue-500 ring-2 ring-blue-300'
              : 'bg-green-500 hover:bg-green-600'
            }
          `}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            props.handleConnectionPointClick(e, card.id);
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <span className="text-xs">📌</span>
        </div>
      )}

      {/* Config panel */}
      {(props.hoveredCard === card.id || props.configOpenCard === card.id) && (
        <CardConfigPanel
          card={card}
          isOpen={props.configOpenCard === card.id}
          onClose={() => props.setConfigOpenCard(null)}
          onOpenConfig={() => props.setConfigOpenCard(card.id)}
          onChangeFontSize={props.changeFontSize}
          onEditTitle={props.setEditingTitle}
          onDeleteCard={() => props.setConfirmDelete(card.id)}
        />
      )}

      {/* Delete confirmation modal */}
      {props.confirmDelete === card.id && (
        <DeleteConfirmModal
          onConfirm={() => props.deleteCard(card.id)}
          onCancel={() => props.setConfirmDelete(null)}
        />
      )}
    </div>
  );
});

CardWrapperComponent.displayName = 'CardWrapper';
