
export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'progress' | 'done';
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  link?: string;
  tags?: string[];
  attachedImage?: string;
  pageId?: string;
  order: number;
  createdAt: string;
  // Advanced task management features
  parentTaskId?: string; // For subtasks
  subtasks?: SubTask[]; // Child tasks
  dependencies?: TaskDependency[]; // Task dependencies
  progress?: number; // 0-100 percentage
  startDate?: string; // When task should start
  completedAt?: string; // When task was completed
  attachments?: TaskAttachment[]; // File attachments
  watchers?: string[]; // Users watching this task
  assignedTo?: string; // Assigned user ID
  assignedToName?: string; // Assigned user name
  estimatedHours?: number; // Time estimation
  actualHours?: number; // Time spent
  customFields?: Record<string, any>; // Custom field values
  comments?: TaskComment[]; // Task comments
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  assigneeId?: string;
  dueDate?: string;
  createdAt: string;
  order: number;
}

export interface TaskDependency {
  id: string;
  dependentTaskId: string;
  dependsOnTaskId: string;
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'document' | 'link' | 'video';
  size?: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface TaskComment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  mentions: string[];
  attachments: string[];
  createdAt: string;
  updatedAt?: string;
  isEdited: boolean;
  reactions?: Reaction[];
}

export interface Reaction {
  emoji: string;
  userIds: string[];
  count: number;
}

export interface Page {
  id: string;
  title: string;
  description: string;
  category: string;
  url?: string;
  color: string;
  createdAt: string;
  tasks: Task[];
}

export interface AppState {
  pages: Page[];
  unassignedTasks: Task[];
}

export const TASK_STATUSES = {
  todo: { label: 'To Do', color: 'bg-task-todo', textColor: 'text-blue-700' },
  progress: { label: 'In Progress', color: 'bg-task-progress', textColor: 'text-yellow-700' },
  done: { label: 'Done', color: 'bg-task-done', textColor: 'text-green-700' }
} as const;

export const PAGE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', 
  '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
];

export const CATEGORIES = [
  'Work', 'Personal', 'Shopping', 'Health', 'Education',
  'Entertainment', 'Finance', 'Travel', 'Home', 'Other'
];

// Task Templates
export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  estimatedHours?: number;
  tags: string[];
  subtasks: Array<{
    title: string;
    description?: string;
  }>;
  customFields?: Record<string, any>;
  createdBy: string;
  createdAt: string;
  isPublic: boolean;
  usageCount: number;
}
