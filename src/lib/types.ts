export type Role = "ADMIN" | "MEMBER";
export type TaskStatus = "BACKLOG" | "ACTIVE" | "IN_REVIEW" | "SHIPPED";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: "ACTIVE" | "ARCHIVED";
  ownerId: string;
  createdAt: string;
}

export interface Member {
  userId: string;
  projectId: string;
  role: Role;
  joinedAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  projectId: string;
  assigneeId?: string;
  createdById: string;
  dueDate?: string;
  position: number;
  blockedById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  action: string;
  entityType: "TASK" | "PROJECT" | "MEMBER";
  entityId: string;
  projectId: string;
  performedById: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  taskId?: string;
  createdAt: string;
}

export const STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  BACKLOG: { label: "Backlog", color: "var(--muted-foreground)" },
  ACTIVE: { label: "Active", color: "var(--primary)" },
  IN_REVIEW: { label: "In Review", color: "var(--warning)" },
  SHIPPED: { label: "Shipped", color: "var(--success)" },
};

export const PRIORITY_META: Record<Priority, { label: string; color: string; dot: string }> = {
  LOW: { label: "Low", color: "text-muted-foreground", dot: "bg-muted-foreground" },
  MEDIUM: { label: "Medium", color: "text-sky-400", dot: "bg-sky-400" },
  HIGH: { label: "High", color: "text-amber-400", dot: "bg-amber-400" },
  URGENT: { label: "Urgent", color: "text-rose-400", dot: "bg-rose-400" },
};
