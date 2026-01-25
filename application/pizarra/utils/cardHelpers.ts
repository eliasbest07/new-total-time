export const getCardIcon = (type: string): string => {
  switch (type) {
    case 'file':
      return '📄';
    case 'text':
      return '📝';
    case 'test':
      return '🧪';
    case 'resource':
      return '📦';
    case 'image':
      return '🖼️';
    case 'link':
      return '🔗';
    case 'task':
      return '✅';
    case 'todo':
      return '📝';
    case 'actividad':
      return '📅';
    case 'usuario':
      return '👤';
    case 'proyecto':
      return '📁';
    default:
      return '📋';
  }
};

export const getCardStyle = (type: string): string => {
  const baseStyle = "absolute rounded-lg shadow-lg border-2 p-2 cursor-move transition-colors duration-200 select-none";
  const baseStyleNoPadding = "absolute rounded-lg shadow-lg cursor-move transition-colors duration-200 select-none overflow-hidden";

  switch (type) {
    case 'file':
      return `${baseStyle} bg-blue-50 border-blue-200`;
    case 'text':
      return `${baseStyle} bg-yellow-50 border-yellow-200`;
    case 'test':
      return `${baseStyle} bg-green-50 border-green-200`;
    case 'resource':
      return `${baseStyle} bg-purple-50 border-purple-200`;
    case 'image':
      return `${baseStyle} bg-pink-50 border-pink-200`;
    case 'link':
      return `${baseStyle} bg-cyan-50 border-cyan-200`;
    case 'task':
      return `${baseStyle} bg-emerald-50 border-emerald-200`;
    case 'todo':
      return `${baseStyle} bg-orange-50 border-orange-200`;
    case 'actividad':
      return `${baseStyle} bg-blue-50 border-blue-300`;
    case 'mision':
      return `${baseStyle} bg-green-50 border-green-300`;
    case 'mision-organizacion':
      return `${baseStyleNoPadding} bg-white`;
    case 'actividad-organizacion':
      return `${baseStyleNoPadding} bg-white`;
    case 'usuario':
      return `${baseStyle} bg-purple-50 border-purple-300`;
    case 'proyecto':
      return `${baseStyle} bg-indigo-50 border-indigo-300`;
    default:
      return `${baseStyle} bg-white border-gray-200`;
  }
};

export const getCardBorderColor = (type: string): string => {
  switch (type) {
    case 'actividad':
      return 'bg-blue-600';
    case 'mision':
      return 'bg-green-600';
    case 'todo':
      return 'bg-orange-600';
    case 'text':
      return 'bg-yellow-500';
    case 'usuario':
      return 'bg-purple-600';
    case 'proyecto':
      return 'bg-indigo-600';
    default:
      return 'bg-gray-600';
  }
};
