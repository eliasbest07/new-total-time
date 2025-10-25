"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, MessageCircle, Calendar, Send, Plus, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, Trash2, Edit2, X, Check } from "lucide-react";
import { Sala } from "@/domain/entities/Sala";
import { usePosts } from "@/hooks/usePosts";
import { Post } from "@/domain/entities/Post";
import { useComentariosByPostId } from "@/hooks/useComentarios";
import { useAuth } from "@/app/contexts/AuthContext";
import { useUsuarioId } from "@/hooks/useUsuarioId";
import { SupabasePostRepository } from "@/infrastructure/datasource/SupabasePostRepository";
import { SupabaseComentarioRepository } from "@/infrastructure/datasource/SupabaseComentarioRepository";
import { supabase } from "@/infrastructure/services/SupabaseClient";
import { useNewPostsNotification } from "@/hooks/useNewPostsNotification";
import { NewPostNotification } from "@/components/notifications/NewPostNotification";
import { markPostsAsViewed } from "@/services/viewedPostsService";

// Componente interno para mostrar comentarios de un post
function ComentariosSection({
  postId,
  commentContent,
  onCommentContentChange,
  onAddComment,
  isCreatingComment,
  onLikeComment,
  onDislikeComment
}: {
  postId: string;
  commentContent: string;
  onCommentContentChange: (content: string) => void;
  onAddComment: (postId: string) => void;
  isCreatingComment: boolean;
  onLikeComment: (comentarioId: string) => void;
  onDislikeComment: (comentarioId: string) => void;
}) {
  const { comentarios, loading, error } = useComentariosByPostId(postId);
  const [showCommentForm, setShowCommentForm] = useState(false);

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="pt-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1">
        <MessageCircle className="w-4 h-4" />
        Comentarios
      </h4>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <p className="text-red-500 text-xs text-center py-2">{error}</p>
      ) : comentarios.length === 0 ? (
        <p className="text-gray-400 text-xs text-center py-2 italic">No se encontraron comentarios</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {comentarios.map((comentario, index) => {
            const nombreUsuario = comentario.usuario?.nombre || `Usuario #${comentario.idUsuario}` || 'Anónimo';
            const iniciales = comentario.usuario?.nombre?.substring(0, 2).toUpperCase() ||
                             (comentario.idUsuario ? `U${comentario.idUsuario}` : '?');

            return (
              <div key={comentario.id} className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                <div className="flex items-start gap-2">
                  {/* Avatar del usuario */}
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 overflow-hidden">
                    {comentario.usuario?.avatar ? (
                      <img
                        src={comentario.usuario.avatar}
                        alt={nombreUsuario}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.className = "w-6 h-6 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0";
                          target.parentElement!.textContent = iniciales;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center">
                        {iniciales}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-800 text-xs font-semibold">
                        {nombreUsuario}
                      </span>
                      <span className="text-gray-500 text-[10px]">
                        {formatearFecha(comentario.created_at)}
                      </span>
                      {comentario.edited_at && (
                        <span className="text-gray-400 text-[10px] italic">(editado)</span>
                      )}
                    </div>
                    <p className="text-gray-700 text-xs leading-relaxed whitespace-pre-wrap">
                      {comentario.contenido}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <button
                        onClick={() => onLikeComment(comentario.id)}
                        className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-blue-600 transition-colors cursor-pointer"
                        title="Me gusta"
                      >
                        <ThumbsUp className="w-2.5 h-2.5" />
                        <span>{comentario.likes_count || 0}</span>
                      </button>
                      <button
                        onClick={() => onDislikeComment(comentario.id)}
                        className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
                        title="No me gusta"
                      >
                        <ThumbsDown className="w-2.5 h-2.5" />
                        <span>{comentario.dislikes_count || 0}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Formulario para agregar comentario */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        {!showCommentForm ? (
          <button
            onClick={() => setShowCommentForm(true)}
            className="w-full text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center gap-1 py-2 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <MessageCircle className="w-3 h-3" />
            Agregar comentario
          </button>
        ) : (
          <div className="space-y-2">
            <textarea
              value={commentContent}
              onChange={(e) => onCommentContentChange(e.target.value)}
              placeholder="Escribe tu comentario..."
              className="w-full p-2 text-xs text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setShowCommentForm(false);
                  onCommentContentChange('');
                }}
                disabled={isCreatingComment}
                className="px-3 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onAddComment(postId);
                  setShowCommentForm(false);
                }}
                disabled={isCreatingComment || !commentContent.trim()}
                className="px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {isCreatingComment ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3" />
                    Comentar
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface SalaDetalleProps {
  sala: Sala;
}

export default function SalaDetalle({ sala }: SalaDetalleProps) {
  const { posts, loading, error, refetch } = usePosts(sala.id);
  const { usuario } = useAuth();
  const { usuarioId } = useUsuarioId();
  const [currentPage, setCurrentPage] = useState(1);
  const postsPorPagina = 1; // Mostrar un post a la vez
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [postRepository] = useState(() => new SupabasePostRepository());
  const [comentarioRepository] = useState(() => new SupabaseComentarioRepository());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Hook para notificaciones de nuevos posts (pasando IDs de todos los posts)
  const allPostIds = posts.map(post => post.id);
  const {
    notifications,
    clearNotifications,
    markAsRead,
    markPostAsViewed
  } = useNewPostsNotification(usuario?.id_usuario || null, sala.id, allPostIds);

  // Estado para mostrar la notificación actual
  const [currentNotification, setCurrentNotification] = useState<typeof notifications[0] | null>(null);

  // Estados para crear nuevo post
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [creatingPost, setCreatingPost] = useState(false);

  // Estados para crear comentario
  const [commentingOnPost, setCommentingOnPost] = useState<string | null>(null);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [creatingComment, setCreatingComment] = useState(false);

  // Estados para modal de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [postToDelete, setPostToDelete] = useState<{ id: string; userId: number | null } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados para editar posts
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const totalPaginas = Math.ceil(posts.length / postsPorPagina);
  const indiceInicio = (currentPage - 1) * postsPorPagina;
  const indiceFin = indiceInicio + postsPorPagina;
  const postsActuales = posts.slice(indiceInicio, indiceFin);

  // Mostrar notificación cuando llega un nuevo post
  useEffect(() => {
    if (notifications.length > 0) {
      const latestNotification = notifications[notifications.length - 1];
      setCurrentNotification(latestNotification);

      // Auto-cerrar después de 5 segundos si el usuario no la cierra
      const timer = setTimeout(() => {
        setCurrentNotification(null);
      }, 5500);

      return () => clearTimeout(timer);
    }
  }, [notifications]);

  // Auto-expandir comentarios del post actual
  useEffect(() => {
    if (postsActuales.length > 0) {
      setExpandedPostId(postsActuales[0].id);
    }
  }, [currentPage, posts]);

  // Marcar posts actuales como vistos cuando se muestran en pantalla
  useEffect(() => {
    if (postsActuales.length > 0 && sala.id) {
      console.log('👁️ [SalaDetalle] Posts actuales en pantalla:', postsActuales.map(p => ({ id: p.id, contenido: p.contenido?.substring(0, 30) })));

      // Usar un timeout para asegurar que el post se ha renderizado
      const timer = setTimeout(() => {
        const postIdsActuales = postsActuales.map(post => post.id);
        console.log('👁️ [SalaDetalle] ⏰ Marcando posts como vistos después de 500ms:', postIdsActuales);
        // Marcar estos posts como vistos en localStorage
        markPostsAsViewed(sala.id, postIdsActuales, false);
      }, 500); // Esperar 500ms antes de marcar como visto

      return () => clearTimeout(timer);
    }
  }, [postsActuales, sala.id]);

  // Reset textarea height cuando se cierra el formulario
  useEffect(() => {
    if (!showNewPost) {
      const textarea = document.querySelector('textarea[placeholder="¿Qué quieres compartir con tu equipo?"]') as HTMLTextAreaElement;
      if (textarea) {
        textarea.style.height = 'auto';
      }
    }
  }, [showNewPost]);

  const irAPaginaAnterior = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const irAPaginaSiguiente = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPaginas));
  };

  // Función para obtener números de página a mostrar (máximo 5 páginas visibles)
  const getPaginasVisibles = () => {
    const maxVisibles = 5;
    const paginas: (number | string)[] = [];

    if (totalPaginas <= maxVisibles) {
      // Si hay 5 o menos páginas, mostrar todas
      return Array.from({ length: totalPaginas }, (_, i) => i + 1);
    }

    // Siempre mostrar primera página
    paginas.push(1);

    if (currentPage > 3) {
      // Si estamos lejos del inicio, agregar puntos suspensivos
      paginas.push('...');
    }

    // Calcular rango alrededor de la página actual
    const rangoInicio = Math.max(2, currentPage - 1);
    const rangoFin = Math.min(totalPaginas - 1, currentPage + 1);

    for (let i = rangoInicio; i <= rangoFin; i++) {
      if (!paginas.includes(i)) {
        paginas.push(i);
      }
    }

    if (currentPage < totalPaginas - 2) {
      // Si estamos lejos del final, agregar puntos suspensivos
      paginas.push('...');
    }

    // Siempre mostrar última página
    if (!paginas.includes(totalPaginas)) {
      paginas.push(totalPaginas);
    }

    return paginas;
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCreatePost = async () => {
    if (!usuario?.id || !newPostContent.trim()) {
      alert('Debes escribir algo para publicar');
      return;
    }

    console.log('📝 [SalaDetalle] Creando nuevo post en sala', sala.id, '- Usuario:', usuarioId);
    setCreatingPost(true);
    try {
      const newPost = await postRepository.createPost({
        id_sala: sala.id,
        contenido: newPostContent,
        id_usuario: usuarioId, // ID numérico del usuario
        edited_at: null,
        likes_count: 0,
        dislikes_count: 0
      });

      if (newPost) {
        console.log('📝 [SalaDetalle] ✅ Post creado exitosamente:', newPost.id);

        // Disparar evento personalizado para notificar a otros componentes
        const event = new CustomEvent('new-post-created', {
          detail: { salaId: sala.id, postId: newPost.id }
        });
        window.dispatchEvent(event);
        console.log('📝 [SalaDetalle] 🔔 Evento "new-post-created" disparado para sala:', sala.id);

        setNewPostContent('');
        setShowNewPost(false);
        refetch();
      }
    } catch (error) {
      console.error('📝 [SalaDetalle] ❌ Error creando post:', error);
      alert('Error al crear el post');
    } finally {
      setCreatingPost(false);
    }
  };

  const handleDeletePost = (postId: string, postUserId: number | null) => {
    console.log('🗑️ [handleDeletePost] Intentando eliminar post:', { postId, postUserId, usuarioId });

    if (!usuarioId || postUserId !== usuarioId) {
      console.log('🗑️ [handleDeletePost] ❌ No se puede eliminar - Usuario no autorizado');
      return;
    }

    console.log('🗑️ [handleDeletePost] ✅ Usuario autorizado, mostrando modal');
    setPostToDelete({ id: postId, userId: postUserId });
    setShowDeleteModal(true);
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) {
      console.log('🗑️ [confirmDeletePost] ❌ No hay post para eliminar');
      return;
    }

    console.log('🗑️ [confirmDeletePost] Eliminando post:', postToDelete.id);
    setIsDeleting(true);
    try {
      const success = await postRepository.deletePost(postToDelete.id);

      console.log('🗑️ [confirmDeletePost] Resultado de eliminación:', success);

      if (success) {
        console.log('🗑️ [confirmDeletePost] ✅ Post eliminado exitosamente');
        setShowDeleteModal(false);
        setPostToDelete(null);
        refetch();
      } else {
        console.log('🗑️ [confirmDeletePost] ❌ La eliminación retornó false');
        alert('Error al eliminar el post');
      }
    } catch (error) {
      console.error('🗑️ [confirmDeletePost] ❌ Error eliminando post:', error);
      alert('Error al eliminar el post');
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeletePost = () => {
    setShowDeleteModal(false);
    setPostToDelete(null);
  };

  const handleEditPost = (postId: string, currentContent: string, postUserId: number | null) => {
    if (!usuarioId || postUserId !== usuarioId) {
      return;
    }

    setEditingPostId(postId);
    setEditedContent(currentContent || '');
  };

  const handleSaveEdit = async (postId: string) => {
    if (!editedContent.trim()) {
      alert('El contenido no puede estar vacío');
      return;
    }

    console.log('✏️ [handleSaveEdit] Guardando edición de post:', postId, 'Nuevo contenido:', editedContent.substring(0, 50));

    setIsSavingEdit(true);
    try {
      const updatedPost = await postRepository.updatePost(postId, {
        contenido: editedContent,
      });

      console.log('✏️ [handleSaveEdit] Resultado de actualización:', updatedPost);

      if (updatedPost) {
        console.log('✏️ [handleSaveEdit] ✅ Post actualizado exitosamente');
        setEditingPostId(null);
        setEditedContent('');
        refetch();
      } else {
        console.log('✏️ [handleSaveEdit] ❌ La actualización retornó null');
        alert('Error al actualizar el post');
      }
    } catch (error) {
      console.error('✏️ [handleSaveEdit] ❌ Error actualizando post:', error);
      alert('Error al actualizar el post');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingPostId(null);
    setEditedContent('');
  };

  const handleCreateComment = async (postId: string) => {
    if (!usuarioId || !newCommentContent.trim()) {
      alert('Debes escribir algo para comentar');
      return;
    }

    setCreatingComment(true);
    try {
      // Crear comentario
      const nuevoComentario = await comentarioRepository.createComentario(
        newCommentContent,
        usuarioId,
        postId // Pasar el ID del post (se ignora por ahora, tabla no tiene id_post)
      );

      if (!nuevoComentario) {
        alert('Error al crear el comentario');
        return;
      }

      console.log('✅ Comentario creado:', nuevoComentario);

      // Ya no necesitamos actualizar el post porque comentario_sala tiene id_post
      // Simplemente limpiamos y refrescamos
      setNewCommentContent('');
      setCommentingOnPost(null);
      refetch();
    } catch (error) {
      console.error('Error creando comentario:', error);
      alert('Error al crear el comentario');
    } finally {
      setCreatingComment(false);
    }
  };

  const handleLikeComment = async (comentarioId: string) => {
    if (!usuarioId) {
      alert('Debes estar autenticado para dar like');
      return;
    }

    try {
      const success = await comentarioRepository.toggleLike(comentarioId, usuarioId);
      if (success) {
        console.log('✅ Like agregado al comentario');
        refetch(); // Refrescar para actualizar los contadores
      } else {
        alert('Error al dar like al comentario');
      }
    } catch (error) {
      console.error('Error dando like:', error);
      alert('Error al dar like al comentario');
    }
  };

  const handleDislikeComment = async (comentarioId: string) => {
    if (!usuarioId) {
      alert('Debes estar autenticado para dar dislike');
      return;
    }

    try {
      const success = await comentarioRepository.toggleDislike(comentarioId, usuarioId);
      if (success) {
        console.log('✅ Dislike agregado al comentario');
        refetch(); // Refrescar para actualizar los contadores
      } else {
        alert('Error al dar dislike al comentario');
      }
    } catch (error) {
      console.error('Error dando dislike:', error);
      alert('Error al dar dislike al comentario');
    }
  };

  const handleOpenNewPost = () => {
    setShowNewPost(true);
    // Hacer scroll al tope del contenedor
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50);
  };

  // Handler para cuando se hace clic en el badge de nuevos posts
  const handleViewNewPosts = () => {
    // Ir a la primera página para ver los posts más recientes
    setCurrentPage(1);
    // Limpiar las notificaciones toast (no marcar posts como vistos aún)
    markAsRead();
    // Refrescar posts
    refetch();
    // Hacer scroll al inicio
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // Los posts se marcarán como vistos automáticamente por el efecto cuando se rendericen
  };

  // Handler para ver un post específico desde la notificación
  const handleViewPost = () => {
    // Ir a la primera página y refrescar
    setCurrentPage(1);
    refetch();
    // Cerrar la notificación
    setCurrentNotification(null);
    // Hacer scroll al inicio
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header de la sala - ACTUALIZADO */}
      <div className="border-b border-gray-200 pb-4 mb-4 flex-shrink-0">
        <div className="flex items-start justify-between mb-2">
          {/* Lado izquierdo - Título e ícono */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">💬</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {sala.nombre || 'Sala sin nombre'}
            </h1>
          </div>

          {/* Lado derecho - Fecha y número de posts */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
              <Calendar className="w-4 h-4 text-gray-600" />
              <span className="font-medium">Creada el {formatearFecha(sala.created_at)}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
              <MessageCircle className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-700">{posts.length} posts</span>
            </div>
          </div>
        </div>

        {/* Descripción - debajo del título */}
        <p className="text-gray-600 text-sm leading-relaxed ml-13">
          {sala.descripcion || 'Sin descripción'}
        </p>
      </div>

      {/* Contenedor scrolleable que incluye formulario y posts */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0">
        {/* Formulario para crear nuevo post */}
        <div className={`mb-6 transition-all duration-300 ease-in-out ${
          showNewPost
            ? 'opacity-100 scale-100 max-h-[600px]'
            : 'opacity-0 scale-95 max-h-0 overflow-hidden'
        }`}>
          <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {/* Header del formulario */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {usuario?.profile?.nombre?.substring(0, 2).toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {usuario?.profile?.nombre || 'Usuario'}
                  </h3>
                  <p className="text-xs text-gray-500">Crear publicación</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowNewPost(false);
                  setNewPostContent('');
                }}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-all duration-200 hover:rotate-90"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Textarea */}
            <div className="p-4">
              <textarea
                value={newPostContent}
                onChange={(e) => {
                  setNewPostContent(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                placeholder="¿Qué quieres compartir con tu equipo?"
                className="w-full p-3 text-gray-900 placeholder-gray-400 resize-none focus:outline-none text-base leading-relaxed"
                rows={3}
                autoFocus
              />

              {/* Contador de caracteres */}
              <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-gray-400">
                  {newPostContent.length} caracteres
                </div>
                {newPostContent.length > 0 && (
                  <div className="text-xs text-green-500 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Listo para publicar
                  </div>
                )}
              </div>
            </div>

            {/* Footer con botones */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <MessageCircle className="w-4 h-4" />
                <span>Los miembros de la sala podrán comentar</span>
              </div>
              <button
                onClick={handleCreatePost}
                disabled={creatingPost || !newPostContent.trim()}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 text-sm"
              >
                {creatingPost ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Publicando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Publicar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Lista de posts - Un post a la vez */}
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-red-500">Error: {error}</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">No hay posts en esta sala</p>
            <p className="text-sm mb-6">Sé el primero en publicar algo</p>
            <button
              onClick={handleOpenNewPost}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
            >
              Agregar post +
            </button>
          </div>
        ) : (
          <>
            {/* <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Posts Recientes</h2>
              <p className="text-sm text-gray-600">Últimas publicaciones de la sala</p>
            </div> */}

            <div >
              {postsActuales.map((post: Post) => {
                const nombreUsuario = post.usuario?.nombre || 'Usuario' || 'Desconocido';
                const iniciales = post.usuario?.nombre?.substring(0, 2).toUpperCase() || 'U';

                return (
                  <div key={post.id} className="bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all duration-200 hover:border-gray-300">
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Avatar del usuario */}
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm overflow-hidden">
                          {post.usuario?.avatar ? (
                            <img
                              src={post.usuario.avatar}
                              alt={nombreUsuario}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.parentElement!.className = "w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm";
                                target.parentElement!.textContent = iniciales;
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                              {iniciales}
                            </div>
                          )}
                        </div>

                        {/* Contenido del post */}
                        <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 text-sm">
                              {nombreUsuario}
                            </span>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                              {formatearFecha(post.created_at)}
                            </span>
                            {post.edited_at && (
                              <span className="text-xs text-gray-400 italic">
                                (editado)
                              </span>
                            )}
                          </div>

                          {/* Botones de editar y eliminar */}
                          {usuarioId && post.id_usuario === usuarioId && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditPost(post.id, post.contenido || '', post.id_usuario)}
                                className="flex items-center gap-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                                title="Editar post"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span className="text-xs font-medium">Editar</span>
                              </button>
                              <button
                                onClick={() => handleDeletePost(post.id, post.id_usuario)}
                                className="flex items-center gap-1 text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                                title="Eliminar post"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="text-xs font-medium">Eliminar</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Contenido del post o modo de edición */}
                        {editingPostId === post.id ? (
                          <div className="mb-3">
                            <textarea
                              value={editedContent}
                              onChange={(e) => setEditedContent(e.target.value)}
                              className="w-full p-3 text-gray-900 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm leading-relaxed resize-none"
                              rows={4}
                              autoFocus
                            />
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-500">{editedContent.length} caracteres</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={handleCancelEdit}
                                  disabled={isSavingEdit}
                                  className="flex items-center gap-1 px-3 py-1.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-xs font-medium disabled:opacity-50"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => handleSaveEdit(post.id)}
                                  disabled={isSavingEdit || !editedContent.trim()}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isSavingEdit ? (
                                    <>
                                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                      Guardando...
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      Guardar
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-700 text-sm leading-relaxed mb-3 whitespace-pre-wrap">
                            {post.contenido || 'Sin contenido'}
                          </p>
                        )}

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-xs text-gray-500 px-2 py-1">
                            <ThumbsUp className="w-3 h-3" />
                            <span>{post.likes_count || 0}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500 px-2 py-1">
                            <ThumbsDown className="w-3 h-3" />
                            <span>{post.dislikes_count || 0}</span>
                          </div>
                          <button
                            onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-full transition-colors"
                          >
                            <MessageCircle className="w-3 h-3" />
                            Comentarios
                            {expandedPostId === post.id ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                      </div>
                    </div>

                    {/* Sección de comentarios expandible - ocupa todo el ancho */}
                    {expandedPostId === post.id && (
                      <div className="border-t border-gray-200 px-4 pb-4">
                        <ComentariosSection
                          postId={post.id}
                          commentContent={newCommentContent}
                          onCommentContentChange={setNewCommentContent}
                          onAddComment={handleCreateComment}
                          isCreatingComment={creatingComment}
                          onLikeComment={handleLikeComment}
                          onDislikeComment={handleDislikeComment}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Paginación */}
      {!loading && !error && posts.length > 0 && (
        <div className="border-t border-gray-200 pt-4 mt-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {!showNewPost && (
              <button
                onClick={handleOpenNewPost}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm shadow-sm hover:shadow-md active:scale-95 w-full sm:w-auto justify-center"
              >
                Agregar post +
              </button>
            )}
            {showNewPost && <div className="hidden sm:block sm:w-32"></div>}

            <div className="flex items-center gap-2 flex-wrap justify-center w-full sm:w-auto">
              <button
                onClick={irAPaginaAnterior}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors shadow-sm text-gray-700 disabled:text-gray-300 select-none focus:outline-none disabled:cursor-not-allowed flex-shrink-0"
              >
                <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Anterior</span>
                <span className="xs:hidden">Ant</span>
              </button>

              <div className="flex items-center gap-1 justify-center">
                {getPaginasVisibles().map((pagina, index) => (
                  pagina === '...' ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="w-10 h-10 flex items-center justify-center text-gray-400 text-sm"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={pagina}
                      onClick={() => setCurrentPage(pagina as number)}
                      className={`w-8 h-8 sm:w-10 sm:h-10 text-xs sm:text-sm rounded-lg transition-colors shadow-sm flex-shrink-0 ${pagina === currentPage
                          ? 'bg-blue-500 text-white border border-blue-500'
                          : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
                        }`}
                    >
                      {pagina}
                    </button>
                  )
                ))}
              </div>

              <button
                onClick={irAPaginaSiguiente}
                disabled={currentPage === totalPaginas}
                className="flex items-center gap-1 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors shadow-sm text-gray-700 disabled:text-gray-300 select-none focus:outline-none disabled:cursor-not-allowed flex-shrink-0"
              >
                <span className="hidden xs:inline">Siguiente</span>
                <span className="xs:hidden">Sig</span>
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-20 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all animate-scaleIn">
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Eliminar Post</h3>
                  <p className="text-red-100 text-sm">Esta acción no se puede deshacer</p>
                </div>
              </div>
            </div>

            {/* Contenido del modal */}
            <div className="p-6">
              <p className="text-gray-700 text-base leading-relaxed mb-2">
                ¿Estás seguro de que deseas eliminar este post?
              </p>
              <p className="text-gray-500 text-sm">
                El post y todos sus comentarios se eliminarán permanentemente.
              </p>
            </div>

            {/* Footer con botones */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={cancelDeletePost}
                disabled={isDeleting}
                className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeletePost}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all font-medium text-sm shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificación de nuevo post */}
      {currentNotification && (
        <NewPostNotification
          autorNombre={currentNotification.autorNombre}
          contenido={currentNotification.contenido}
          onClose={() => setCurrentNotification(null)}
          onView={handleViewPost}
        />
      )}

    </div>
  );
}