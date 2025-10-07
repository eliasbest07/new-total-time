import { ReactNode } from 'react';

export interface VentanaPosition {
  x: number;
  y: number;
}

export interface VentanaSize {
  width: number;
  height: number;
}

export interface VentanaDragState {
  x: number;
  y: number;
}

export interface VentanaResizeState {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VentanaProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  initialWidth?: number;
  initialHeight?: number;
  initialX?: number;
  initialY?: number;
  minWidth?: number;
  minHeight?: number;
  resizable?: boolean;
  draggable?: boolean;
  className?: string;
}

export interface VentanaConfig {
  id: string;
  title: string;
  content: ReactNode;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  minWidth?: number;
  minHeight?: number;
  resizable?: boolean;
  draggable?: boolean;
  className?: string;
}