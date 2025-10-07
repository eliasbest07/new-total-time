"use client"
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, File, Link, FileText, StickyNote, User, Wifi, Check, Circle, Plus, Edit2, Trash2, X } from 'lucide-react';

const sides = ['front', 'right', 'back', 'left', 'top', 'bottom'];

const Cube = () => {
  const [currentClass, setCurrentClass] = useState('front');
  const [newsIndex, setNewsIndex] = useState(0);
  const [iconIndex, setIconIndex] = useState(0);
  const [todos, setTodos] = useState([
    { id: 1, text: "Revisar documentos", completed: true },
    { id: 2, text: "Llamar al cliente", completed: false },
    { id: 3, text: "Actualizar proyecto", completed: false },
    { id: 4, text: "Enviar reporte", completed: true },
    { id: 5, text: "Reunión equipo", completed: false }
  ]);
  const [newTodo, setNewTodo] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);

  // Mouse drag states
  const [isDragging, setIsDragging] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [autoRotate, setAutoRotate] = useState(true);
  const [isInteractingWithTodos, setIsInteractingWithTodos] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const cubeRef = useRef(null);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto rotation (only when not dragging or interacting with todos) - Fixed memory leak
  useEffect(() => {
    if (!autoRotate || isDragging || isInteractingWithTodos) return;

    const interval = setInterval(() => {
      setIsRotating(true);
      // Pequeño delay para asegurar que el estado se aplique antes del cambio
      setTimeout(() => {
        setCurrentClass(prevClass => {
          const randomSide = sides[Math.floor(Math.random() * sides.length)];
          return prevClass !== randomSide ? randomSide : sides[(sides.indexOf(randomSide) + 1) % sides.length];
        });
        // Detener rotación después de la transición
        setTimeout(() => setIsRotating(false), 2000);
      }, 50);
    }, 8000);

    return () => clearInterval(interval);
  }, [autoRotate, isDragging, isInteractingWithTodos]);

  // News ticker animation - Optimized
  useEffect(() => {
    const newsInterval = setInterval(() => {
      setNewsIndex(prev => (prev + 1) % 3);
    }, 3000);

    return () => clearInterval(newsInterval);
  }, []);

  const iconList = [
    { icon: "📊", title: "Analytics" },
    { icon: "🎨", title: "Design" },
    { icon: "⚡", title: "Performance" },
    { icon: "🔒", title: "Security" },
    { icon: "🚀", title: "Deploy" }
  ];

  // Icon carousel animation - Optimized with proper cleanup
  useEffect(() => {
    const iconInterval = setInterval(() => {
      setIconIndex(prev => (prev + 1) % iconList.length);
    }, 2500);

    return () => clearInterval(iconInterval);
  }, []); // Removed dependency since iconList is now static

  // Mouse event handlers for cube rotation (sequential faces only)
  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't start if clicking on interactive elements
    const target = e.target as HTMLElement;
    
    // Check for any interactive elements
    if (target.closest('button') ||
      target.closest('input') ||
      target.closest('.add-btn') ||
      target.closest('.todo-checkbox') ||
      target.closest('.edit-btn') ||
      target.closest('.delete-btn') ||
      target.closest('.save-btn') ||
      target.closest('.cancel-btn') ||
      target.closest('.add-todo-form') ||
      target.closest('.edit-form') ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'INPUT') {
      return;
    }

    // Only allow drag initiation on cube face backgrounds
    const isCubeFaceBackground = target.classList.contains('front') ||
      target.classList.contains('back') ||
      target.classList.contains('left') ||
      target.classList.contains('right') ||
      target.classList.contains('top') ||
      target.classList.contains('bottom') ||
      target.closest('.cube') === target.parentElement;

    if (!isCubeFaceBackground) {
      return;
    }

    setIsMouseDown(true);
    setDragStart({ x: e.clientX, y: e.clientY });

    // Start drag mode after holding for 300ms
    dragTimeoutRef.current = setTimeout(() => {
      if (isMouseDown) {
        setIsDragging(true);
        setAutoRotate(false);
      }
    }, 300);

    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    const threshold = 50;

    if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
      let newSide;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal movement - left or right face
        if (deltaX > 0) {
          // Right drag - show right face
          newSide = 'right';
        } else {
          // Left drag - show left face
          newSide = 'left';
        }
      } else {
        // Vertical movement - top or bottom face
        if (deltaY > 0) {
          // Down drag - show bottom face
          newSide = 'bottom';
        } else {
          // Up drag - show top face
          newSide = 'top';
        }
      }

      if (newSide !== currentClass) {
        setIsRotating(true);
        // Pequeño delay para asegurar que el estado se aplique
        setTimeout(() => {
          setCurrentClass(newSide);
          // Reset states after rotation
          setIsDragging(false);
          setIsMouseDown(false);
          setIsInteractingWithTodos(false);
          if (dragTimeoutRef.current) {
            clearTimeout(dragTimeoutRef.current);
          }
          // Detener rotación después de la transición
          setTimeout(() => setIsRotating(false), 2000);
        }, 50);
      }
    }
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
    setIsDragging(false);
    
    // Clear timeout if mouse is released before drag activation
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }

    // Re-enable auto rotation after a delay
    setTimeout(() => {
      setAutoRotate(true);
    }, 2000);
  };

  // Todo functions - Improved with error handling
  const toggleTodo = (id: number) => {
    setTodos(prevTodos =>
      prevTodos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const addTodo = () => {
    const trimmedText = newTodo.trim();
    if (!trimmedText || trimmedText.length > 100) return; // Add length validation

    try {
      const newId = todos.length > 0 ? Math.max(...todos.map(t => t.id)) + 1 : 1; // Fixed empty array issue
      setTodos(prevTodos => [...prevTodos, {
        id: newId,
        text: trimmedText,
        completed: false
      }]);
      setNewTodo('');
      setShowAddInput(false);
    } catch (error) {
      console.error('Error adding todo:', error);
    }
  };

  const deleteTodo = (id: number) => {
    setTodos(prevTodos => prevTodos.filter(todo => todo.id !== id));
    // Clear edit state if deleting the item being edited
    if (editingId === id) {
      setEditingId(null);
      setEditText('');
    }
  };

  const startEdit = (id: number, text: string) => {
    setEditingId(id);
    setEditText(text);
  };

  const saveEdit = () => {
    const trimmedText = editText.trim();
    if (!trimmedText || trimmedText.length > 100) {
      cancelEdit();
      return;
    }

    setTodos(prevTodos =>
      prevTodos.map(todo =>
        todo.id === editingId ? { ...todo, text: trimmedText } : todo
      )
    );
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const newsItems = [
    "ACTUALIZACIÓN: Nuevas funcionalidades del sistema ya disponibles para todos los usuarios",
    "IMPORTANTE: Mantenimiento programado este fin de semana de 02:00 a 06:00 AM",
    "NOVEDAD: Integración con servicios en la nube completada exitosamente"
  ];

  const avatarUsers = [
    { id: 1, name: "Juan", online: true, hasFrame: true },
    { id: 2, name: "Ana", online: false, hasFrame: false },
    { id: 3, name: "Luis", online: true, hasFrame: true }
  ];

  const goToPrevious = () => {
    setAutoRotate(false);
    setIsRotating(true);

    // Pequeño delay para asegurar que el estado se aplique
    setTimeout(() => {
      // Random vertical direction (up or down)
      const verticalOptions = ['top', 'bottom'];
      const randomVertical = verticalOptions[Math.floor(Math.random() * verticalOptions.length)];

      // Random horizontal direction (left or right)
      const horizontalOptions = ['left', 'right'];
      const randomHorizontal = horizontalOptions[Math.floor(Math.random() * horizontalOptions.length)];

      // Combine random choices
      const randomCombination = `${randomVertical}-${randomHorizontal}`;

      setCurrentClass(randomCombination);
      setTimeout(() => {
        setAutoRotate(true);
        setIsRotating(false);
      }, 2000);
    }, 50);
  };

  return (
    <div className="flex items-center gap-4">
      
      <div
        className="scene"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        ref={cubeRef}
        style={{ cursor: isDragging ? 'grabbing' : isMouseDown ? 'grabbing' : 'grab' }}
        role="application"
        aria-label="Cubo 3D interactivo con contenido"
      >
        <div className={`cube move-${currentClass} ${isRotating ? 'rotating' : ''}`}>
          {/* Face 1: Avatar with thought bubble */}
          <div className="front avatar-face">
            <div className="avatar-stack mt-50">
              {avatarUsers.map((user, index) => (
                <div
                  key={user.id}
                  className={`avatar-container ${user.hasFrame ? 'with-frame' : ''}`}
                  style={{
                    zIndex: avatarUsers.length - index,
                    transform: `translateZ(${index * 15}px) translateY(-${index * 10}px)`,
                    filter: index > 0 ? `brightness(${1 - index * 0.1})` : 'none'
                  }}
                >
                  <div className="avatar">
                    <User size={20} />
                    {user.online && (
                      <div className="online-indicator">
                          <div 
          className={`w-3 h-3 rounded-full transition-colors duration-300 ${
            true ? 'bg-green-400' : 'bg-gray-400'
          }`}
        />
                      </div>
                    )}
                  </div>
                  {index === 0 && (
                    <div className="thought-bubble">
                      <div className="bubble-content">💡 Nueva idea genial!</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Face 2: Continuous text ticker */}
          <div className="back news-ticker">
            <div className="ticker-container">
              <div className="ticker-row">
                <div className="ticker-wrapper">
                  <div className="ticker-content-continuous">
                    <span className="ticker-text">{newsItems[0]}</span>
                    <span className="ticker-text">{newsItems[0]}</span>
                  </div>
                </div>
              </div>
              <div className="ticker-row">
                <div className="ticker-wrapper">
                  <div className="ticker-content-continuous">
                    <span className="ticker-text">{newsItems[1]}</span>
                    <span className="ticker-text">{newsItems[1]}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Face 3: 4 file icons */}
          <div className="left file-icons">
            <div className="icons-grid">
              <div className="icon-item">
                <File size={24} />
                <span>Archivo</span>
              </div>
              <div className="icon-item">
                <Link size={24} />
                <span>Enlace</span>
              </div>
              <div className="icon-item">
                <FileText size={24} />
                <span>Documento</span>
              </div>
              <div className="icon-item">
                <StickyNote size={24} />
                <span>Nota</span>
              </div>
            </div>
          </div>

          {/* Face 4: Todo list with full functionality */}
          <div className="right todo-list">
            <div className="todo-container">
              <div className="todo-header">
                <h3>Tareas</h3>
                <button
                  className="add-btn "
                  onClick={() => {
                    setShowAddInput(true);
                    setIsInteractingWithTodos(true);
                  }}
                  title="Agregar tarea"
                  aria-label="Agregar nueva tarea"
                  disabled={showAddInput}
                >
                  <Plus size={14} color='white'/>
                </button>
              </div>

              {showAddInput && (
                <div className="add-todo-form">
                  <input
                    type="text"
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    placeholder="Nueva tarea..."
                    className="add-input"
                    autoFocus
                    maxLength={100}
                    aria-label="Texto de nueva tarea"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') addTodo();
                      if (e.key === 'Escape') { setShowAddInput(false); setNewTodo(''); }
                    }}
                  />
                  <div className="add-actions">
                    <button
                      onClick={() => {
                        addTodo();
                        setIsInteractingWithTodos(false);
                      }}
                      className="save-btn"
                      aria-label="Guardar tarea"
                      disabled={!newTodo.trim()}
                    >
                      <Check size={10} />
                    </button>
                    <button
                      onClick={() => { 
                        setShowAddInput(false); 
                        setNewTodo(''); 
                        setIsInteractingWithTodos(false);
                      }}
                      className="cancel-btn"
                      aria-label="Cancelar"
                    >
                      <X size={10} />
                    </button>
                  </div>
                </div>
              )}

              <div className="todo-items">
                {todos.slice(0, 4).map(item => (
                  <div key={item.id} className="todo-item">
                    <button
                      className="todo-checkbox"
                      onClick={() => toggleTodo(item.id)}
                      aria-label={item.completed ? 'Marcar como pendiente' : 'Marcar como completada'}
                      title={item.completed ? 'Marcar como pendiente' : 'Marcar como completada'}
                    >
                      {item.completed ? <Check size={12} /> : <Circle size={12} />}
                    </button>

                    {editingId === item.id ? (
                      <div className="edit-form">
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="edit-input"
                          onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                          autoFocus
                        />
                        <div className="edit-actions">
                          <button 
                            onClick={() => {
                              saveEdit();
                              setIsInteractingWithTodos(false);
                            }} 
                            className="save-btn"
                          >
                            <Check size={10} />
                          </button>
                          <button 
                            onClick={() => {
                              cancelEdit();
                              setIsInteractingWithTodos(false);
                            }} 
                            className="cancel-btn"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className={item.completed ? 'completed' : ''}>
                          {item.text}
                        </span>
                        <div className="todo-actions">
                          <button
                            onClick={() => {
                              startEdit(item.id, item.text);
                              setIsInteractingWithTodos(true);
                            }}
                            className="edit-btn"
                            title="Editar"
                          >
                            <Edit2 size={10} />
                          </button>
                          <button
                            onClick={() => {
                              deleteTodo(item.id);
                              setIsInteractingWithTodos(false);
                            }}
                            className="delete-btn"
                            title="Eliminar"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Face 5: Horizontal icon carousel */}
          <div className="top icon-carousel">
            <div className="carousel-container">
              <div
                className="carousel-track"
                style={{ transform: `translateX(-${iconIndex * 100}%)` }}
              >
                {iconList.map((item, index) => (
                  <div key={index} className="carousel-item">
                    <div className="carousel-icon">{item.icon}</div>
                    <span className="carousel-title">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Face 6: Image */}
          <div className="bottom image-face">
            <img
              src="/api/placeholder/107/107"
              alt="Imagen del cubo"
              className="cube-image"
            />
          </div>
        </div>
      </div>


      <style jsx>{`
        .scene {
          color: #000;
          font-size: 1em;
          height: 150px; /* Increased 25% from 120px */
          width: 150px;  /* Increased 25% from 120px */
          perspective: 600px; /* Increased perspective to see more depth */
          user-select: none;
        }
        
        .cube {
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 2s ease-in-out;
          width: 100%;
        }

        /* Durante la rotación, mantener las caras en sus posiciones 3D normales */
        .cube.rotating .front { 
          transform: rotateY(0deg) translateZ(75px);
        }
        .cube.rotating .back { 
          transform: rotateY(180deg) translateZ(75px);
        }
        .cube.rotating .left { 
          transform: rotateY(-90deg) translateZ(75px);
        }
        .cube.rotating .right { 
          transform: rotateY(90deg) translateZ(75px);
        }
        .cube.rotating .top { 
          transform: rotateX(90deg) translateZ(75px);
        }
        .cube.rotating .bottom { 
          transform: rotateX(-90deg) translateZ(75px);
        }
        
        .cube > * {
          display: flex;
          justify-content: center;
          align-items: center;
          border: 2px solid white;
          height: 100%;
          position: absolute;    
          border-radius: 10%;
          overflow: hidden;
          width: 100%;
          backdrop-filter: blur(10px);
          background: rgba(255, 255, 255, 0.1);
          /* Por defecto todas las caras están visibles */
          opacity: 1;
          visibility: visible;
          transition: opacity 0.3s ease, visibility 0.3s ease;
        }

        /* Cuando está rotando: mostrar TODAS las caras */
        .cube.rotating .front,
        .cube.rotating .back,
        .cube.rotating .left,
        .cube.rotating .right,
        .cube.rotating .top,
        .cube.rotating .bottom {
          opacity: 1 !important;
          visibility: visible !important;
        }

        /* Cuando NO está rotando: ocultar todas las caras excepto la activa */
        .cube:not(.rotating) .front,
        .cube:not(.rotating) .back,
        .cube:not(.rotating) .left,
        .cube:not(.rotating) .right,
        .cube:not(.rotating) .top,
        .cube:not(.rotating) .bottom {
          opacity: 0;
          visibility: hidden;
        }

        /* Cuando NO está rotando: mostrar solo la cara activa */
        .cube:not(.rotating).move-front .front,
        .cube:not(.rotating).move-back .back,
        .cube:not(.rotating).move-left .left,
        .cube:not(.rotating).move-right .right,
        .cube:not(.rotating).move-top .top,
        .cube:not(.rotating).move-bottom .bottom {
          opacity: 1 !important;
          visibility: visible !important;
        }
        
        /* Posiciones normales de las caras cuando no está rotando */
        .cube:not(.rotating) .front {
          transform: rotateY(0deg) translateZ(75px);
        }
        
        .cube:not(.rotating) .back {
          transform: rotateY(180deg) translateZ(75px);
        }
        
        .cube:not(.rotating) .left {
          transform: rotateY(-90deg) translateZ(75px);
        }
        
        .cube:not(.rotating) .right {
          transform: rotateY(90deg) translateZ(75px);
        }
        
        .cube:not(.rotating) .top {
          transform: rotateX(90deg) translateZ(75px);
        }
        
        .cube:not(.rotating) .bottom {
          transform: rotateX(-90deg) translateZ(75px);
        }
        
        /* Single axis movements - adjusted for better visibility during rotation */
        .move-front { transform: translateZ(-120px) rotateY(0deg) rotateX(0deg); }
        .move-right { transform: translateZ(-120px) rotateY(-90deg) rotateX(0deg); }
        .move-back { transform: translateZ(-120px) rotateY(-180deg) rotateX(0deg); }
        .move-left { transform: translateZ(-120px) rotateY(90deg) rotateX(0deg); }
        .move-top { transform: translateZ(-120px) rotateY(0deg) rotateX(-90deg); }
        .move-bottom { transform: translateZ(-120px) rotateY(0deg) rotateX(90deg); }
        
        /* Dual-axis movements - showing corners/edges between faces */
        .move-top-right { 
          transform: translateZ(-150px) rotateY(-45deg) rotateX(-45deg); 
        }
        .move-top-left { 
          transform: translateZ(-150px) rotateY(45deg) rotateX(-45deg); 
        }
        .move-bottom-right { 
          transform: translateZ(-150px) rotateY(-45deg) rotateX(45deg); 
        }
        .move-bottom-left { 
          transform: translateZ(-150px) rotateY(45deg) rotateX(45deg); 
        }
        
        /* Avatar Face Styles */
        .avatar-face {
          flex-direction: column;
          padding: 5px 15px 30px 15px; /* Minimal top padding, more bottom */
          perspective: 1000px;
          transform-style: preserve-3d;
          justify-content: flex-end; /* Align content to bottom */
        }
        
        .avatar-stack {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end; /* Align to bottom */
          height: 100%;
          transform-style: preserve-3d;
          margin-bottom: 15px; /* Bottom margin */
        }
        
        .avatar-container {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          transform-style: preserve-3d;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
          border-radius: 50%;
        }
        
        .avatar-container:hover {
          transform: translateZ(25px) translateY(-15px) scale(1.05) !important;
        }
        
        .avatar-container.with-frame {
          background: linear-gradient(45deg, #ffd700, #ffed4e);
          padding: 4px;
          border-radius: 50%;
          box-shadow: 
            0 0 20px rgba(255, 215, 0, 0.6),
            0 8px 25px rgba(0, 0, 0, 0.4);
        }
        
        .avatar-container.with-frame .avatar {
          border: 2px solid #fff;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .avatar {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea, #764ba2);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          border: 2px solid rgba(0, 0, 0, 0.8);
          box-shadow: 
            0 4px 15px rgba(255, 255, 255, 0.2),
            inset 0 1px 0 rgba(0, 0, 0, 0.3);
          transition: all 0.3s ease;
        }
        
        .avatar:hover {
          box-shadow: 
            0 6px 20px rgba(255, 255, 255, 0.3),
            inset 0 1px 0 rgba(0, 0, 0, 0.4);
        }
        
        .online-indicator {
          position: absolute;
          top: -3px;
          right: -3px;
          background: linear-gradient(135deg, #4ade80, #22c55e);
          border: 2px solid black;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(34, 197, 94, 0.4);
          animation: pulse-glow 2s infinite;
        }
        
        @keyframes pulse-glow {
          0%, 100% { 
            transform: scale(1);
            box-shadow: 0 2px 8px rgba(34, 197, 94, 0.4);
          }
          50% { 
            transform: scale(1.1);
            box-shadow: 0 4px 12px rgba(34, 197, 94, 0.6);
          }
        }
        
        .thought-bubble {
          position: absolute;
          top: -75px; /* Back to top positioning */
          right: -35px;
          background: linear-gradient(135deg,rgb(129, 123, 123),rgb(189, 182, 182));
          color: #ffffff;
          padding: 10px 16px;
          border-radius: 18px;
          font-size: 0.65em;
          z-index: 100;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 
            0 4px 15px rgba(255, 255, 255, 0.1),
            0 1px 3px rgba(255, 255, 255, 0.2);
          transform: translateZ(30px);
          animation: float-bubble 3s ease-in-out infinite;
          min-width: 85px;
          max-width: 100px;
          text-align: center;
          line-height: 1.2;
          white-space: normal;
        }
        
        @keyframes float-bubble {
          0%, 100% { transform: translateZ(30px) translateY(0px); }
          50% { transform: translateZ(30px) translateY(-5px); } /* Back to upward float */
        }
        
        .thought-bubble::before {
          content: '';
          position: absolute;
          bottom: -10px; /* Back to bottom pointing down */
          left: 20px;
          width: 0;
          height: 0;
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-top: 10px solidrgb(255, 255, 255); /* Changed to black */
          filter: drop-shadow(0 2px 2px rgba(255, 255, 255, 0.1)); /* Inverted shadow */
        }
        
        .bubble-content {
          font-weight: 600;
          background: linear-gradient(45deg,rgb(3, 3, 3),rgb(4, 4, 4));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        /* News Ticker Styles */
        .news-ticker {
          flex-direction: column;
          padding: 8px;
          overflow: hidden;
          gap: 8px;
        }
        
        .ticker-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 8px;
        }
        
        .ticker-row {
          height: 40px;
          overflow: hidden;
          background: rgba(190, 190, 190, 0.26);
          border-radius: 8px;
          backdrop-filter: blur(5px);
          border: 1px solid rgba(0, 0, 0, 0.2);
        }
        
        .ticker-wrapper {
          height: 100%;
          display: flex;
          align-items: center;
          overflow: hidden;
        }
        
        .ticker-content-continuous {
          animation: scroll-left-seamless 20s linear infinite;
          display: flex;
          font-size: 0.75em;
          font-weight: 500;
          line-height: 1;
          color: #000000;
          white-space: nowrap;
        }
        
        .ticker-text {
          padding: 0 20px;
          display: inline-block;
        }
        
        .ticker-text:after {
          content: " • ";
          color: rgba(0, 0, 0, 0.6);
        }
        
        @keyframes scroll-left-seamless {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        
        /* File Icons Styles */
        .file-icons {
          padding: 8px;
        }
        
        .icons-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          width: 100%;
          height: 100%;
          align-items: center;
          justify-items: center;
        }
        
        .icon-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          transition: transform 0.2s;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 45px;
          height: 45px;
          justify-content: center;
        }
        
        .icon-item:hover {
          transform: scale(1.05);
          background: rgba(0, 0, 0, 0.1);
        }
        
        .icon-item span {
          font-size: 0.5em;
          text-align: center;
          line-height: 1;
          font-weight: 500;
        }
        
        /* Enhanced Todo List Styles */
        .todo-list {
          flex-direction: column;
          padding: 8px;
          overflow: visible;
        }
        
        .todo-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .todo-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .todo-header h3 {
          margin: 0;
          font-size: 0.8em;
          color: black;
        }
        
        .add-btn {
          background: rgba(0, 0, 0, 0.2);
          border: none;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: black;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .add-btn:hover:not(:disabled) {
          background: rgba(0, 0, 0, 0.3);
          transform: scale(1.1);
        }
        
        .add-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        
        .add-todo-form {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 6px;
          background: rgba(0, 0, 0, 0.1);
          padding: 4px;
          border-radius: 4px;
        }
        
        .add-input {
          flex: 1;
          background: transparent;
          border: none;
          color: black;
          font-size: 0.6em;
          padding: 2px 4px;
          outline: none;
        }
        
        .add-input::placeholder {
          color: rgba(0, 0, 0, 0.7);
        }
        
        .add-actions {
          display: flex;
          gap: 2px;
        }
        
        .todo-items {
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: auto;
          max-height: 120px;
        }
        
        .todo-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.6em;
          padding: 3px 4px;
          background: rgba(0, 0, 0, 0.1);
          border-radius: 4px;
          transition: background 0.2s;
        }
        
        .todo-item:hover {
          background: rgba(0, 0, 0, 0.15);
        }
        
        .todo-checkbox {
          background: none;
          border: none;
          color: black;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          transition: transform 0.2s;
        }
        
        .todo-checkbox:hover {
          transform: scale(1.2);
        }
        
        .todo-item .completed {
          text-decoration: line-through;
          opacity: 0.7;
        }
        
        .todo-actions {
          display: flex;
          gap: 2px;
          margin-left: auto;
        }
        
        .edit-btn, .delete-btn, .save-btn, .cancel-btn {
          background: rgba(0, 0, 0, 0.2);
          border: none;
          border-radius: 2px;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: black;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .edit-btn:hover:not(:disabled) {
          background: rgba(74, 222, 128, 0.3);
        }
        
        .delete-btn:hover:not(:disabled) {
          background: rgba(248, 113, 113, 0.3);
        }
        
        .save-btn:hover:not(:disabled) {
          background: rgba(34, 197, 94, 0.4);
        }
        
        .save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .cancel-btn:hover:not(:disabled) {
          background: rgba(248, 113, 113, 0.4);
        }
        
        .edit-form {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1;
        }
        
        .edit-input {
          flex: 1;
          background: rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(0, 0, 0, 0.3);
          color: black;
          font-size: 0.6em;
          padding: 2px 4px;
          border-radius: 2px;
          outline: none;
        }
        
        .edit-actions {
          display: flex;
          gap: 2px;
        }
        
        /* Icon Carousel Styles */
        .icon-carousel {
          padding: 10px;
          overflow: hidden;
        }
        
        .carousel-container {
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        
        .carousel-track {
          display: flex;
          transition: transform 0.5s ease-in-out;
          height: 100%;
        }
        
        .carousel-item {
          min-width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        
        .carousel-icon {
          font-size: 2em;
        }
        
        .carousel-title {
          font-size: 0.8em;
          text-align: center;
        }
        
        /* Image Face Styles */
        .image-face {
          padding: 0;
        }
        
        .cube-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        /* Navigation Button */
        .nav-button {
          background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 50%;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
        
        .nav-button:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        }
        
        .nav-button:active {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
};

export default Cube;