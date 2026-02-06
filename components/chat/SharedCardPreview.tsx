'use client';

import React, { useEffect, useState } from 'react';
import { CardDB } from '@/domain/entities/Card';
import { SupabaseCardRepository } from '@/infrastructure/datasource/SupabaseCardRepository';
import { supabase } from '@/infrastructure/services/SupabaseClient';

interface SharedCardPreviewProps {
  cardId: string;
  esMio: boolean;
  onAddToPizarra?: () => void;
}

interface EnrichedCardData {
  card: CardDB;
  // Datos enriquecidos según tipo
  misionNombre?: string;
  misionDescripcion?: string;
  misionHoras?: number;
  todos?: { text: string; completed: boolean }[];
  actividadSubject?: string;
  actividadDuration?: number;
  proyectoNombre?: string;
  proyectoDescripcion?: string;
  proyectoIcono?: string;
  imageUrl?: string;
  usuarioNombre?: string;
  usuarioAvatar?: string;
}

const cardTypeLabels: Record<string, string> = {
  mision: 'Mision',
  todo: 'Todo',
  text: 'Nota',
  actividad: 'Actividad',
  usuario: 'Usuario',
  proyecto: 'Proyecto',
  image: 'Imagen',
  resource: 'Recurso',
  'mision-organizacion': 'Mision Org.',
  'actividad-organizacion': 'Actividad Org.',
  'proyecto-organizacion': 'Proyecto Org.',
};

const cardTypeColors: Record<string, string> = {
  mision: 'bg-green-500',
  todo: 'bg-orange-500',
  text: 'bg-yellow-500',
  actividad: 'bg-blue-500',
  usuario: 'bg-purple-500',
  proyecto: 'bg-indigo-500',
  image: 'bg-pink-500',
  resource: 'bg-teal-500',
  'mision-organizacion': 'bg-green-600',
  'actividad-organizacion': 'bg-blue-600',
  'proyecto-organizacion': 'bg-indigo-600',
};

const cardTypeIcons: Record<string, string> = {
  mision: '🎯',
  todo: '✅',
  text: '📝',
  actividad: '⏱️',
  usuario: '👤',
  proyecto: '📁',
  image: '🖼️',
  resource: '🔗',
  'mision-organizacion': '🎯',
  'actividad-organizacion': '⏱️',
  'proyecto-organizacion': '📁',
};

const cardRepo = new SupabaseCardRepository();

async function loadEnrichedData(card: CardDB): Promise<EnrichedCardData> {
  const result: EnrichedCardData = { card };

  try {
    switch (card.type) {
      case 'mision':
      case 'mision-organizacion': {
        const { data: cardMision } = await supabase
          .from('card_misions')
          .select('id_mision')
          .eq('id_card', card.id)
          .single();
        if (cardMision) {
          const { data: mision } = await supabase
            .from('misiones')
            .select('nombre, descripcion, horas')
            .eq('id', cardMision.id_mision)
            .single();
          if (mision) {
            result.misionNombre = mision.nombre;
            result.misionDescripcion = mision.descripcion;
            result.misionHoras = mision.horas;
          }
        }
        break;
      }
      case 'todo': {
        const { data: todos } = await supabase
          .from('card_todos')
          .select('text, completed')
          .eq('id_card', card.id)
          .order('position', { ascending: true });
        if (todos) {
          result.todos = todos;
        }
        break;
      }
      case 'actividad': {
        const { data: act } = await supabase
          .from('card_actividades')
          .select('subject, duration')
          .eq('id_card', card.id)
          .single();
        if (act) {
          result.actividadSubject = act.subject;
          result.actividadDuration = act.duration;
        }
        break;
      }
      case 'proyecto':
      case 'proyecto-organizacion': {
        const { data: cardProy } = await supabase
          .from('card_proyectos')
          .select('id_proyecto')
          .eq('id_card', card.id)
          .single();
        if (cardProy) {
          const { data: proy } = await supabase
            .from('proyectos')
            .select('nombre, descripcion, icono')
            .eq('id', cardProy.id_proyecto)
            .single();
          if (proy) {
            result.proyectoNombre = proy.nombre;
            result.proyectoDescripcion = proy.descripcion;
            result.proyectoIcono = proy.icono;
          }
        }
        break;
      }
      case 'image': {
        const { data: img } = await supabase
          .from('card_images')
          .select('image_url')
          .eq('id_card', card.id)
          .single();
        if (img) {
          result.imageUrl = img.image_url;
        }
        break;
      }
      case 'usuario': {
        const { data: usr } = await supabase
          .from('card_usuarios')
          .select('name, avatar')
          .eq('id_card', card.id)
          .single();
        if (usr) {
          result.usuarioNombre = usr.name;
          result.usuarioAvatar = usr.avatar;
        }
        break;
      }
    }
  } catch (e) {
    // Silenciar errores de carga de datos extra
  }

  return result;
}

export const SharedCardPreview: React.FC<SharedCardPreviewProps> = ({ cardId, esMio, onAddToPizarra }) => {
  const [data, setData] = useState<EnrichedCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      console.log('🃏 SharedCardPreview - Cargando card con ID:', cardId);
      const card = await cardRepo.getCardById(cardId);
      console.log('🃏 SharedCardPreview - Card obtenida:', card ? { id: card.id, type: card.type, title: card.title } : null);
      if (!card || cancelled) {
        if (!cancelled) { setData(null); setLoading(false); }
        return;
      }
      const enriched = await loadEnrichedData(card);
      console.log('🃏 SharedCardPreview - Data enriquecida:', { type: card.type, misionNombre: enriched.misionNombre, proyectoNombre: enriched.proyectoNombre, title: card.title });
      if (!cancelled) {
        setData(enriched);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [cardId]);

  if (loading) {
    return (
      <div className={`rounded-lg p-3 ${esMio ? 'bg-blue-700' : 'bg-gray-200'}`}>
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded-full animate-pulse ${esMio ? 'bg-blue-400' : 'bg-gray-400'}`} />
          <span className={`text-xs ${esMio ? 'text-blue-200' : 'text-gray-500'}`}>Cargando card...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`rounded-lg p-3 border ${esMio ? 'bg-blue-700 border-blue-500' : 'bg-gray-100 border-gray-300'}`}>
        <div className="flex items-center gap-2">
          <span className="text-sm">🚫</span>
          <span className={`text-xs italic ${esMio ? 'text-blue-200' : 'text-gray-500'}`}>
            Card ya no disponible
          </span>
        </div>
      </div>
    );
  }

  const { card } = data;
  const typeColor = cardTypeColors[card.type] || 'bg-gray-500';
  const typeLabel = cardTypeLabels[card.type] || card.type;
  const typeIcon = cardTypeIcons[card.type] || '📋';

  // Determinar título y contenido según el tipo
  const getTitle = (): string => {
    if (data.misionNombre) return data.misionNombre;
    if (data.proyectoNombre) return data.proyectoNombre;
    if (data.actividadSubject) return data.actividadSubject;
    if (data.usuarioNombre) return data.usuarioNombre;
    return card.title || '';
  };

  const title = getTitle();

  const handleAddToPizarra = () => {
    window.dispatchEvent(new CustomEvent('add-shared-card', { detail: { cardDbId: cardId } }));
    setAdded(true);
    onAddToPizarra?.();
  };

  return (
    <div className={`rounded-lg overflow-hidden border ${esMio ? 'border-blue-400/50' : 'border-gray-300'}`}>
      {/* Barra de color del tipo */}
      <div className={`${typeColor} px-3 py-1.5 flex items-center gap-2`}>
        <span className="text-sm">{typeIcon}</span>
        <span className="text-white text-xs font-semibold">{typeLabel}</span>
      </div>

      {/* Contenido */}
      <div className={`p-3 ${esMio ? 'bg-blue-800/50' : 'bg-white'}`}>
        {/* Titulo */}
        {title && (
          <p className={`text-sm font-semibold mb-1 ${esMio ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </p>
        )}

        {/* Contenido segun tipo */}
        {card.type === 'text' && card.content && (
          <p className={`text-xs leading-relaxed line-clamp-4 whitespace-pre-wrap ${esMio ? 'text-blue-100' : 'text-gray-600'}`}>
            {card.content}
          </p>
        )}

        {(card.type === 'mision' || card.type === 'mision-organizacion') && data.misionDescripcion && (
          <p className={`text-xs leading-relaxed line-clamp-3 ${esMio ? 'text-blue-100' : 'text-gray-600'}`}>
            {data.misionDescripcion}
          </p>
        )}

        {(card.type === 'mision' || card.type === 'mision-organizacion') && data.misionHoras && (
          <div className={`flex items-center gap-1 mt-1 text-xs ${esMio ? 'text-blue-200' : 'text-gray-500'}`}>
            <span>⏰</span>
            <span>{data.misionHoras}h estimadas</span>
          </div>
        )}

        {card.type === 'todo' && data.todos && data.todos.length > 0 && (
          <div className="space-y-1 mt-1">
            {data.todos.slice(0, 5).map((todo, i) => (
              <div key={i} className={`flex items-center gap-2 text-xs ${esMio ? 'text-blue-100' : 'text-gray-600'}`}>
                <span className="flex-shrink-0">{todo.completed ? '☑' : '☐'}</span>
                <span className={todo.completed ? 'line-through opacity-60' : ''}>{todo.text}</span>
              </div>
            ))}
            {data.todos.length > 5 && (
              <span className={`text-xs italic ${esMio ? 'text-blue-200' : 'text-gray-400'}`}>
                +{data.todos.length - 5} mas...
              </span>
            )}
          </div>
        )}

        {card.type === 'actividad' && data.actividadDuration && (
          <div className={`flex items-center gap-1 mt-1 text-xs ${esMio ? 'text-blue-200' : 'text-gray-500'}`}>
            <span>⏱️</span>
            <span>{data.actividadDuration} min</span>
          </div>
        )}

        {(card.type === 'proyecto' || card.type === 'proyecto-organizacion') && (
          <>
            {data.proyectoIcono && <span className="text-lg mr-1">{data.proyectoIcono}</span>}
            {data.proyectoDescripcion && (
              <p className={`text-xs leading-relaxed line-clamp-3 ${esMio ? 'text-blue-100' : 'text-gray-600'}`}>
                {data.proyectoDescripcion}
              </p>
            )}
          </>
        )}

        {card.type === 'image' && data.imageUrl && (
          <div className="mt-1 rounded overflow-hidden">
            <img src={data.imageUrl} alt={card.title || 'Imagen'} className="w-full max-h-32 object-cover rounded" />
          </div>
        )}

        {card.type === 'usuario' && data.usuarioAvatar && (
          <div className="flex items-center gap-2 mt-1">
            <div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden">
              {(data.usuarioAvatar.startsWith('http://') || data.usuarioAvatar.startsWith('https://')) ? (
                <img src={data.usuarioAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm">{data.usuarioAvatar}</div>
              )}
            </div>
          </div>
        )}

        {card.type === 'resource' && card.content && (
          <p className={`text-xs ${esMio ? 'text-blue-100' : 'text-gray-600'}`}>{card.content}</p>
        )}

        {/* Fallback si no hay contenido */}
        {!title && !card.content && !data.todos?.length && !data.imageUrl && (
          <p className={`text-xs italic ${esMio ? 'text-blue-200' : 'text-gray-400'}`}>
            Sin contenido
          </p>
        )}

        {/* Boton agregar a pizarra */}
        <button
          onClick={handleAddToPizarra}
          disabled={added}
          className={`w-full mt-2 py-1.5 rounded-md text-xs font-semibold transition-all ${
            added
              ? (esMio ? 'bg-green-600 text-white cursor-default' : 'bg-green-100 text-green-700 cursor-default')
              : (esMio
                  ? 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200')
          }`}
        >
          {added ? '✓ Agregada' : '+ Agregar a mi pizarra'}
        </button>
      </div>
    </div>
  );
};
