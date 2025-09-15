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
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);
  
  // Mouse drag states
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [autoRotate, setAutoRotate] = useState(true);
  const cubeRef = useRef(null);

  // Auto rotation (only when not dragging)
  useEffect(() => {
    if (!autoRotate) return;
    
    const interval = setInterval(() => {
      const randomSide = sides[Math.floor(Math.random() * sides.length)];
      setCurrentClass(randomSide);
    }, 8000);

    return () => clearInterval(interval);
  }, [autoRotate]);

  // News ticker animation
  useEffect(() => {
    const newsInterval = setInterval(() => {
      setNewsIndex(prev => (prev + 1) % 3);
    }, 3000);

    return () => clearInterval(newsInterval);
  }, []);

  // Icon carousel animation
  useEffect(() => {
    const iconInterval = setInterval(() => {
      setIconIndex(prev => (prev + 1) % iconList.length);
    }, 2500);

    return () => clearInterval(iconInterval);
  }, []);

  // Mouse event handlers for cube rotation
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setAutoRotate(false);
    setDragStart({ x: e.clientX, y: e.clientY });
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    const threshold = 50;

    if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
      let newSide = currentClass;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal movement
        if (deltaX > 0) {
          // Moving right
          const currentIndex = sides.indexOf(currentClass);
          newSide = sides[(currentIndex + 1) % sides.length];
        } else {
          // Moving left
          const currentIndex = sides.indexOf(currentClass);
          newSide = sides[currentIndex === 0 ? sides.length - 1 : currentIndex - 1];
        }
      } else {
        // Vertical movement
        if (deltaY > 0) {
          // Moving down
          newSide = 'bottom';
        } else {
          // Moving up
          newSide = 'top';
        }
      }

      if (newSide !== currentClass) {
        setCurrentClass(newSide);
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setTimeout(() => setAutoRotate(true), 2000); // Resume auto-rotation after 2 seconds
  };

  // Todo functions
  const toggleTodo = (id) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const addTodo = () => {
    if (newTodo.trim()) {
      const newId = Math.max(...todos.map(t => t.id), 0) + 1;
      setTodos([...todos, { id: newId, text: newTodo.trim(), completed: false }]);
      setNewTodo('');
      setShowAddInput(false);
    }
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const startEdit = (id, text) => {
    setEditingId(id);
    setEditText(text);
  };

  const saveEdit = () => {
    if (editText.trim()) {
      setTodos(todos.map(todo => 
        todo.id === editingId ? { ...todo, text: editText.trim() } : todo
      ));
    }
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

  const iconList = [
    { icon: "📊", title: "Analytics" },
    { icon: "🎨", title: "Design" },
    { icon: "⚡", title: "Performance" },
    { icon: "🔒", title: "Security" },
    { icon: "🚀", title: "Deploy" }
  ];

  const avatarUsers = [
    { id: 1, name: "Juan", online: true, hasFrame: true },
    { id: 2, name: "Ana", online: false, hasFrame: false },
    { id: 3, name: "Luis", online: true, hasFrame: true }
  ];

  const goToPrevious = () => {
    setAutoRotate(false);
    const currentIndex = sides.indexOf(currentClass);
    const previousIndex = currentIndex === 0 ? sides.length - 1 : currentIndex - 1;
    setCurrentClass(sides[previousIndex]);
    setTimeout(() => setAutoRotate(true), 2000);
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
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className={`cube move-${currentClass}`}>
          {/* Face 1: Avatar with thought bubble */}
          <div className="front avatar-face">
            <div className="avatar-stack">
              {avatarUsers.map((user, index) => (
                <div 
                  key={user.id} 
                  className={`avatar-container ${user.hasFrame ? 'with-frame' : ''}`}
                  style={{ zIndex: avatarUsers.length - index }}
                >
                  <div className="avatar">
                    <User size={20} />
                    {user.online && (
                      <div className="online-indicator">
                        <Wifi size={8} />
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

          {/* Face 2: Moving text ticker */}
          <div className="back news-ticker">
            <div className="ticker-container">
              <div className="ticker-row">
                <div className="ticker-wrapper">
                  <div className="ticker-content">
                    {newsItems[0]} • {newsItems[0]} • {newsItems[0]} • {newsItems[0]} • {newsItems[0]}
                  </div>
                </div>
              </div>
              <div className="ticker-row">
                <div className="ticker-wrapper">
                  <div className="ticker-content">
                    {newsItems[1]} • {newsItems[1]} • {newsItems[1]} • {newsItems[1]} • {newsItems[1]}
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
                  className="add-btn"
                  onClick={() => setShowAddInput(true)}
                  title="Agregar tarea"
                >
                  <Plus size={14} />
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
                    onKeyPress={(e) => e.key === 'Enter' && addTodo()}
                  />
                  <div className="add-actions">
                    <button onClick={addTodo} className="save-btn">
                      <Check size={10} />
                    </button>
                    <button onClick={() => {setShowAddInput(false); setNewTodo('');}} className="cancel-btn">
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
                          <button onClick={saveEdit} className="save-btn">
                            <Check size={10} />
                          </button>
                          <button onClick={cancelEdit} className="cancel-btn">
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
                            onClick={() => startEdit(item.id, item.text)}
                            className="edit-btn"
                            title="Editar"
                          >
                            <Edit2 size={10} />
                          </button>
                          <button 
                            onClick={() => deleteTodo(item.id)}
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

      {/* Navigation button */}
      <button 
        onClick={goToPrevious}
        className="nav-button"
        aria-label="Cara anterior"
      >
        <ChevronLeft size={24} />
      </button>

      <style jsx>{`
        .scene {
          color: #fff;
          font-size: 1em;
          height: 180px;
          width: 180px;
          perspective: 540px;
          user-select: none;
        }
        
        .cube {
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 2s ease-in-out;
          width: 100%;
        }
        
        .cube > * {
          display: flex;
          justify-content: center;
          align-items: center;
          border: 2px solid #fff;
          height: 100%;
          position: absolute;    
          border-radius: 10%;
          overflow: hidden;
          width: 100%;
        }
        
        .front {
          background: #667eea;
          transform: rotateY(0deg) translateZ(90px);
        }
        
        .back {
          background: #f093fb;
          transform: rotateY(180deg) translateZ(90px);
        }
        
        .left {
          background: #4facfe;
          transform: rotateY(-90deg) translateZ(90px);
        }
        
        .right {
          background: #43e97b;
          transform: rotateY(90deg) translateZ(90px);
        }
        
        .top {
          background: #fa709a;
          transform: rotateX(90deg) translateZ(90px);
        }
        
        .bottom {
          background: #a8edea;
          transform: rotateX(-90deg) translateZ(90px);
        }
        
        .move-front { transform: translateZ(-180px) rotateY(0deg); }
        .move-right { transform: translateZ(-180px) rotateY(-90deg); }
        .move-back { transform: translateZ(-180px) rotateY(-180deg); }
        .move-left { transform: translateZ(-180px) rotateY(90deg); }
        .move-top { transform: translateZ(-180px) rotateX(-90deg); }
        .move-bottom { transform: translateZ(-180px) rotateX(90deg); }
        
        /* Avatar Face Styles */
        .avatar-face {
          flex-direction: column;
          padding: 20px;
          perspective: 1000px;
          transform-style: preserve-3d;
        }
        
        .avatar-stack {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          transform-style: preserve-3d;
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
          border: 2px solid rgba(255, 255, 255, 0.8);
          box-shadow: 
            0 4px 15px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
          transition: all 0.3s ease;
        }
        
        .avatar:hover {
          box-shadow: 
            0 6px 20px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.4);
        }
        
        .online-indicator {
          position: absolute;
          top: -3px;
          right: -3px;
          background: linear-gradient(135deg, #4ade80, #22c55e);
          border: 2px solid white;
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
          top: -45px; /* Moved higher up from -35px */
          right: -25px;
          background: linear-gradient(135deg, #ffffff, #f8fafc);
          color: #1f2937;
          padding: 8px 14px; /* Slightly larger padding */
          border-radius: 15px;
          font-size: 0.8em; /* Slightly larger font */
          white-space: nowrap;
          z-index: 100;
          border: 1px solid rgba(0, 0, 0, 0.1);
          box-shadow: 
            0 4px 15px rgba(0, 0, 0, 0.1),
            0 1px 3px rgba(0, 0, 0, 0.2);
          transform: translateZ(30px);
          animation: float-bubble 3s ease-in-out infinite;
          min-width: 80px; /* Ensure minimum width for better visibility */
          text-align: center;
        }
        
        @keyframes float-bubble {
          0%, 100% { transform: translateZ(30px) translateY(0px); }
          50% { transform: translateZ(30px) translateY(-5px); } /* Back to upward float */
        }
        
        .thought-bubble::before {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 15px;
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 8px solid #ffffff;
          filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.1));
        }
        
        .bubble-content {
          font-weight: 600;
          background: linear-gradient(45deg, #667eea, #764ba2);
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
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          backdrop-filter: blur(5px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .ticker-wrapper {
          height: 100%;
          display: flex;
          align-items: center;
          overflow: hidden;
        }
        
        .ticker-content {
          animation: scroll-left-continuous 25s linear infinite;
          white-space: nowrap;
          font-size: 0.75em;
          font-weight: 500;
          line-height: 1;
          padding: 0 20px;
          color: #ffffff;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        
        @keyframes scroll-left-continuous {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
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
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          width: 100%;
          max-width: 45px;
          height: 45px;
          justify-content: center;
        }
        
        .icon-item:hover {
          transform: scale(1.05);
          background: rgba(255, 255, 255, 0.1);
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
          color: white;
        }
        
        .add-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .add-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }
        
        .add-todo-form {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 6px;
          background: rgba(255, 255, 255, 0.1);
          padding: 4px;
          border-radius: 4px;
        }
        
        .add-input {
          flex: 1;
          background: transparent;
          border: none;
          color: white;
          font-size: 0.6em;
          padding: 2px 4px;
          outline: none;
        }
        
        .add-input::placeholder {
          color: rgba(255, 255, 255, 0.7);
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
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          transition: background 0.2s;
        }
        
        .todo-item:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        
        .todo-checkbox {
          background: none;
          border: none;
          color: white;
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
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 2px;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .edit-btn:hover {
          background: rgba(74, 222, 128, 0.3);
        }
        
        .delete-btn:hover {
          background: rgba(248, 113, 113, 0.3);
        }
        
        .save-btn:hover {
          background: rgba(34, 197, 94, 0.4);
        }
        
        .cancel-btn:hover {
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
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
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