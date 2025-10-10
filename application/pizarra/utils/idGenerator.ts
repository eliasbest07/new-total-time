let idCounter = 0;

export const generateUniqueId = (prefix: string, existingIds: string[] = []) => {
  // Encontrar el mayor número usado para este prefijo
  const existingNumbers = existingIds
    .filter(id => id.startsWith(`${prefix}-`))
    .map(id => parseInt(id.split('-')[1]) || 0)
    .filter(num => !isNaN(num));
  
  const maxExisting = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
  
  // Usar el mayor entre el contador actual y el máximo existente + 1
  idCounter = Math.max(idCounter, maxExisting);
  
  return `${prefix}-${++idCounter}`;
};

let positionCounter = 0;

export const generatePosition = () => {
  positionCounter += 50;
  return (positionCounter % 300) + 100;
};
