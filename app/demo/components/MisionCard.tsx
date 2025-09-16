import React from 'react';

interface MisionCardProps {
  title: string;
  hours: number;
  className?: string;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
}

export default function MisionCard({ title, hours, className = '', onClick, onDragStart }: MisionCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    const misionData = {
      type: 'mision',
      title,
      hours,
      description: title
    };
    
    e.dataTransfer.setData('application/json', JSON.stringify(misionData));
    e.dataTransfer.setData('text/plain', `Misión - ${title}`);
    
    if (onDragStart) {
      onDragStart(e);
    }
  };

  return (
    <div 
      className={`relative bg-green-600 w-19 h-19  rounded-lg shadow-lg overflow-hidden cursor-grab active:cursor-grabbing ${className}`}
      onClick={onClick}
      draggable
      onDragStart={handleDragStart}
    >
      {/* Top border line */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-green-800 rounded-t-lg"></div>
      {/* Hours indicator in corner */}
      <div className="absolute bottom-2 right-2 bg-green-800 rounded-full w-8 h-8 flex items-center justify-center">
        <span className="text-white text-xs font-bold">{hours}h</span>
      </div>
      
      {/* Ticker text container */}
      <div className="absolute top-2 left-2 right-2 h-6 overflow-hidden">
        <div className="ticker-wrapper h-full flex items-center">
          <div className="ticker-content-continuous">
            <span className="ticker-text">{title}</span>
            <span className="ticker-text">{title}</span>
          </div>
        </div>
      </div>
      
      {/* Drag area - invisible overlay for better drag experience */}
      <div className="absolute inset-0 cursor-grab active:cursor-grabbing"></div>
      
      <style jsx>{`
        .ticker-wrapper {
          display: flex;
          align-items: center;
          overflow: hidden;
        }
        
        .ticker-content-continuous {
          animation: scroll-left-seamless 20s linear infinite;
          display: flex;
          font-size: 0.75rem;
          font-weight: 500;
          line-height: 1;
          color: #ffffff;
          white-space: nowrap;
        }
        
        .ticker-text {
          padding: 0 20px;
          display: inline-block;
        }
        
        .ticker-text:after {
          content: " • ";
          color: rgba(255, 255, 255, 0.6);
        }
        
        @keyframes scroll-left-seamless {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}