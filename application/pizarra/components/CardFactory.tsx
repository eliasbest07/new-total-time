import React from 'react';
import { Card } from '../types/index';
import { ActivityCard } from './cards/ActivityCard';
import { TodoCard } from './cards/TodoCard';
import { MisionCard } from './cards/MisionCard';
import { UsuarioCard } from './cards/UsuarioCard';
import { ProyectoCard } from './cards/ProyectoCard';
import { ImageCard } from './cards/ImageCard';
import { GenericCard } from './cards/GenericCard';
import { NoteCard } from './cards/NoteCard';

interface CardFactoryProps {
  card: Card;
  editingTitle: string | null;
  editingTodo: { cardId: string; todoId: number } | null;
  updateCardTitle: (cardId: string, newTitle: string) => void;
  updateCardContent: (cardId: string, newContent: string) => void;
  setEditingTitle: (id: string | null) => void;
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
  setCards: React.Dispatch<React.SetStateAction<Card[]>>;
  pastedImages: { [key: string]: string };
}

export const CardFactory: React.FC<CardFactoryProps> = (props) => {
  const { card } = props;

  switch (card.type) {
    case 'text':
      return (
        <NoteCard
          card={card}
          editingTitle={props.editingTitle}
          updateCardTitle={props.updateCardTitle}
          setEditingTitle={props.setEditingTitle}
          updateCardContent={props.updateCardContent}
        />
      );

    case 'actividad':
      return (
        <ActivityCard
          card={card}
          editingTitle={props.editingTitle}
          updateCardTitle={props.updateCardTitle}
          setEditingTitle={props.setEditingTitle}
          handleActivityPlayPause={props.handleActivityPlayPause}
          onShowScreenshots={props.onShowScreenshots}
          screenshots={props.screenshots}
          isCapturing={props.isCapturing}
        />
      );

    case 'todo':
      return (
        <TodoCard
          card={card}
          editingTitle={props.editingTitle}
          editingTodo={props.editingTodo}
          updateCardTitle={props.updateCardTitle}
          setEditingTitle={props.setEditingTitle}
          setEditingTodo={props.setEditingTodo}
          toggleTodo={props.toggleTodo}
          addTodoToCard={props.addTodoToCard}
          deleteTodoFromCard={props.deleteTodoFromCard}
          updateTodoInCard={props.updateTodoInCard}
        />
      );

    case 'mision':
      return (
        <MisionCard
          card={card}
          editingTitle={props.editingTitle}
          updateCardTitle={props.updateCardTitle}
          setEditingTitle={props.setEditingTitle}
          handleMisionPlayPause={props.handleMisionPlayPause}
          screenshots={props.screenshots}
          isCapturing={props.isCapturing}
        />
      );

    case 'usuario':
      return (
        <UsuarioCard
          card={card}
          editingTitle={props.editingTitle}
          updateCardTitle={props.updateCardTitle}
          setEditingTitle={props.setEditingTitle}
          setCards={props.setCards}
        />
      );

    case 'proyecto':
      return (
        <ProyectoCard
          card={card}
          editingTitle={props.editingTitle}
          updateCardTitle={props.updateCardTitle}
          setEditingTitle={props.setEditingTitle}
        />
      );

    case 'image':
      return (
        <ImageCard
          card={card}
          editingTitle={props.editingTitle}
          updateCardTitle={props.updateCardTitle}
          setEditingTitle={props.setEditingTitle}
          pastedImages={props.pastedImages}
        />
      );

    default:
      return (
        <GenericCard
          card={card}
          editingTitle={props.editingTitle}
          updateCardTitle={props.updateCardTitle}
          setEditingTitle={props.setEditingTitle}
        />
      );
  }
};
