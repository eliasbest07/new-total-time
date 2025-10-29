export const generateUniqueId = (prefix: string, existingIds: string[] = []) => {
  // Generar un ID único usando timestamp y random
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  let newId = `${prefix}-${timestamp}-${random}`;

  // Asegurar que el ID es único
  let counter = 0;
  while (existingIds.includes(newId)) {
    counter++;
    newId = `${prefix}-${timestamp}-${random}-${counter}`;
  }

  return newId;
};

let positionCounter = 0;

export const generatePosition = () => {
  positionCounter += 50;
  return (positionCounter % 300) + 100;
};
