
import { Task, Page } from '../types';

export interface DragData {
  type: 'task';
  taskId: string;
  sourcePageId?: string;
  sourceIndex: number;
}

export const handleDragStart = (
  event: React.DragEvent,
  task: Task,
  sourcePageId?: string,
  sourceIndex: number = 0
) => {
  const dragData: DragData = {
    type: 'task',
    taskId: task.id,
    sourcePageId,
    sourceIndex
  };
  
  event.dataTransfer.setData('application/json', JSON.stringify(dragData));
  event.dataTransfer.effectAllowed = 'move';
  
  // Add visual feedback
  const target = event.target as HTMLElement;
  target.classList.add('dragging');
};

export const handleDragEnd = (event: React.DragEvent) => {
  const target = event.target as HTMLElement;
  target.classList.remove('dragging');
};

export const handleDragOver = (event: React.DragEvent) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
};

export const handleDragEnter = (event: React.DragEvent) => {
  event.preventDefault();
  const target = event.currentTarget as HTMLElement;
  target.classList.add('drag-over');
};

export const handleDragLeave = (event: React.DragEvent) => {
  const target = event.currentTarget as HTMLElement;
  target.classList.remove('drag-over');
};

export const handleDrop = (event: React.DragEvent): DragData | null => {
  event.preventDefault();
  const target = event.currentTarget as HTMLElement;
  target.classList.remove('drag-over');
  
  try {
    const dragData = JSON.parse(event.dataTransfer.getData('application/json')) as DragData;
    return dragData;
  } catch (error) {
    console.error('Error parsing drag data:', error);
    return null;
  }
};
