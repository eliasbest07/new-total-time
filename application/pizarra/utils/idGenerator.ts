let idCounter = 0;

export const generateUniqueId = (prefix: string) => {
  return `${prefix}-${++idCounter}`;
};

let positionCounter = 0;

export const generatePosition = () => {
  positionCounter += 50;
  return (positionCounter % 300) + 100;
};
