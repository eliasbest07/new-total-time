import { LucideIcon } from 'lucide-react';

export interface Resource {
  id: number;
  name: string;
  icon: LucideIcon;
  color: string;
  type: string;
  url?: string;
  description?: string;
}

export interface NewResourceData {
  name: string;
  icon: LucideIcon;
  color: string;
  type: string;
  url: string;
  description: string;
}

export const saveResource = (
  newResourceData: NewResourceData,
  currentResources: Resource[]
): Resource[] => {
  const newId = Math.max(0, ...currentResources.map(r => r.id)) + 1;
  
  const newResource: Resource = {
    id: newId,
    ...newResourceData
  };
  
  return [...currentResources, newResource];
};

export const removeResource = (
  resourceId: number,
  currentResources: Resource[]
): Resource[] => {
  return currentResources.filter(resource => resource.id !== resourceId);
};

export const updateResource = (
  resourceId: number,
  updatedData: Partial<NewResourceData>,
  currentResources: Resource[]
): Resource[] => {
  return currentResources.map(resource =>
    resource.id === resourceId
      ? { ...resource, ...updatedData }
      : resource
  );
};