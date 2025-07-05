// Enhanced types for collaborative workspace features

export interface Workspace {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: WorkspaceMember[];
  inviteCode: string;
  settings: WorkspaceSettings;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  joinedAt: string;
  lastActive: string;
  permissions: Permission[];
  isOnline: boolean;
}

export type UserRole = 'owner' | 'admin' | 'member' | 'guest';

export interface Permission {
  resource: 'workspace' | 'page' | 'task' | 'member';
  action: 'create' | 'read' | 'update' | 'delete' | 'invite' | 'manage';
  granted: boolean;
}

export interface WorkspaceSettings {
  isPublic: boolean;
  allowGuestAccess: boolean;
  requireApprovalForJoining: boolean;
  defaultMemberRole: UserRole;
  notificationSettings: NotificationSettings;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  taskAssignments: boolean;
  taskComments: boolean;
  taskStatusChanges: boolean;
  workspaceUpdates: boolean;
}

// Enhanced Task with collaboration features
export interface CollaborativeTask {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'progress' | 'done';
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  assigneeId?: string;
  assignedBy?: string;
  createdBy: string;
  watchers: string[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
  subtasks: SubTask[];
  dependencies: TaskDependency[];
  timeTracking: TimeEntry[];
  customFields: CustomField[];
  tags: string[];
  pageId?: string;
  workspaceId: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  lastModifiedBy: string;
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
  reactions: Reaction[];
}

export interface Reaction {
  emoji: string;
  userIds: string[];
  count: number;
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

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  assigneeId?: string;
  dueDate?: string;
  createdAt: string;
}

export interface TaskDependency {
  id: string;
  dependentTaskId: string;
  dependsOnTaskId: string;
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
}

export interface TimeEntry {
  id: string;
  userId: string;
  startTime: string;
  endTime?: string;
  duration?: number; // in minutes
  description?: string;
  billable: boolean;
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox';
  value: any;
  options?: string[]; // for select/multiselect
}

// Activity and presence tracking
export interface UserActivity {
  userId: string;
  action: ActivityAction;
  resourceType: 'task' | 'page' | 'workspace' | 'comment';
  resourceId: string;
  details: any;
  timestamp: string;
}

export type ActivityAction = 
  | 'created' | 'updated' | 'deleted' | 'assigned' | 'unassigned'
  | 'commented' | 'mentioned' | 'completed' | 'reopened'
  | 'attached' | 'moved' | 'duplicated';

export interface UserPresence {
  userId: string;
  workspaceId: string;
  isOnline: boolean;
  lastSeen: string;
  currentPage?: string;
  cursor?: { x: number; y: number };
}

// Invitation system
export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  workspaceName: string;
  invitedBy: string;
  invitedByName: string;
  inviteeEmail: string;
  role: UserRole;
  inviteCode: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
}

// Real-time collaboration
export interface CollaborationEvent {
  type: 'task_update' | 'user_joined' | 'user_left' | 'cursor_move' | 'typing';
  workspaceId: string;
  userId: string;
  data: any;
  timestamp: string;
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  taskId: string;
  timestamp: string;
}
