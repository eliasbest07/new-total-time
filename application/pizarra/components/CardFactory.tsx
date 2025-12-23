import React from 'react';
import { Card } from '../types/index';
import { ActivityCard } from './cards/ActivityCard';
import { TodoCard } from './cards/TodoCard';
import { MisionCard } from './cards/MisionCard';
import { MisionCardOrganizacion } from './cards/MisionCardOrganizacion';
import { ActividadCardOrganizacion } from './cards/ActividadCardOrganizacion';
import { UsuarioCard } from './cards/UsuarioCard';
import { ProyectoCard } from './cards/ProyectoCard';
import { ProyectoCardOrganizacion } from './cards/ProyectoCardOrganizacion';
import { ImageCard } from './cards/ImageCard';
import { GenericCard } from './cards/GenericCard';
import { NoteCard } from './cards/NoteCard';
import { RecursoCard } from './cards/RecursoCard';
import { SupabaseCardRepository } from '@/infrastructure/datasource/SupabaseCardRepository';

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
  captureNow: () => Promise<string | null>;
  setCards: React.Dispatch<React.SetStateAction<Card[]>>;
  pastedImages: { [key: string]: string };
  usuarios?: any[];
  currentUserId?: string;
  onOpenUserChat?: (userData: {
    userId: string;
    name: string;
    avatar?: string;
    color?: string;
    online?: boolean;
  }) => void;
  addTodoCard?: (text?: string) => string; // ✅ Función para crear TODO cards
  addNoteCard?: (text: string, position?: { x: number; y: number }) => string; // ✅ Función para crear cards de texto
  addConnection?: (fromCardId: string, toCardId: string, skipValidation?: boolean) => void; // ✅ Función para crear conexiones
  addMisionCardOrganizacion?: (misionData: any) => string | void; // ✅ Función para crear cards de misión organizacion
  addMisionCard?: (misionData: any) => string | void; // ✅ Función para crear cards de misión normal
  openImageWindow?: (imageUrl: string, title: string) => void;
  cards?: Card[]; // ✅ Todas las cards para buscar notas asociadas
  onOpenCapturasModal?: (misionActivaId: number, misionTitle: string) => void; // ✅ Callback para abrir modal de capturas
  idPizarra?: string | null; // ✅ ID de la pizarra para sincronizar cambios en DB
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
          captureNow={props.captureNow}
          updateCard={(cardId, updates) => {
            props.setCards((prevCards) =>
              prevCards.map((c): Card => {
                if (c.id !== cardId) return c;

                // Si updates tiene misionData, hacer merge profundo
                if (updates.misionData && c.misionData) {
                  return {
                    ...c,
                    ...updates,
                    misionData: {
                      ...c.misionData,
                      ...updates.misionData
                    }
                  } as Card;
                }

                return { ...c, ...updates } as Card;
              })
            );
          }}
        />
      );

    case 'mision-organizacion':
      return (
        <MisionCardOrganizacion
          card={card}
          updateCard={async (cardId, updates) => {
            // 1. Actualizar estado local inmediatamente
            props.setCards((prevCards) =>
              prevCards.map((c): Card => {
                if (c.id !== cardId) return c;

                // Si updates tiene misionData, hacer merge profundo
                if (updates.misionData && c.misionData) {
                  return {
                    ...c,
                    ...updates,
                    misionData: {
                      ...c.misionData,
                      ...updates.misionData
                    }
                  } as Card;
                }

                return { ...c, ...updates } as Card;
              })
            );

            // 2. Sincronizar con Supabase si hay cambios de title
            if (updates.title !== undefined && props.idPizarra) {
              try {
                const repository = new SupabaseCardRepository();
                await repository.updateCard(props.idPizarra, cardId, {
                  title: updates.title
                });
                console.log('✅ [CardFactory] Título sincronizado con Supabase:', updates.title);
              } catch (error) {
                console.error('❌ [CardFactory] Error sincronizando título con Supabase:', error);
              }
            }
          }}
          usuarios={props.usuarios}
          currentUserId={props.currentUserId}
          addTodoCard={props.addTodoCard}
          addConnection={props.addConnection}
          allCards={props.setCards}
          onOpenCapturasModal={props.onOpenCapturasModal}
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
          onOpenUserChat={props.onOpenUserChat}
        />
      );

    case 'proyecto':
      return (
        <ProyectoCard
          card={card}
          editingTitle={props.editingTitle}
          updateCardTitle={props.updateCardTitle}
          setEditingTitle={props.setEditingTitle}
          addTodoCard={props.addTodoCard}
          addNoteCard={props.addNoteCard}
          addConnection={props.addConnection}
          addMisionCardOrganizacion={props.addMisionCardOrganizacion}
          addMisionCard={props.addMisionCard}
          cards={props.cards}
        />
      );

    case 'actividad-organizacion':
      return (
        <ActividadCardOrganizacion
          card={card}
          updateCard={(cardId, updates) => {
            props.setCards((prevCards) =>
              prevCards.map((c): Card => {
                if (c.id !== cardId) return c;

                // Si updates tiene activityData, hacer merge profundo
                if (updates.activityData && c.activityData) {
                  return {
                    ...c,
                    ...updates,
                    activityData: {
                      ...c.activityData,
                      ...updates.activityData
                    }
                  } as Card;
                }

                return { ...c, ...updates } as Card;
              })
            );
          }}
          usuarios={props.usuarios}
          currentUserId={props.currentUserId}
        />
      );

    case 'proyecto-organizacion':
      return (
        <ProyectoCardOrganizacion
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
          openImageWindow={props.openImageWindow}
        />
      );

    case 'resource':
      return (
        <RecursoCard
          card={card}
          editingTitle={props.editingTitle}
          updateCardTitle={props.updateCardTitle}
          setEditingTitle={props.setEditingTitle}
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
