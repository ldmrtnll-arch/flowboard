export const TASK_STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "review",
  "done",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To do",
  in_progress: "In progress",
  review: "Review",
  done: "Done",
};

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export type Task = {
  id: number;
  project: number;
  project_name: string;
  client_name: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: number | null;
  assignee_email: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskField =
  | "project"
  | "title"
  | "description"
  | "status"
  | "priority"
  | "assignee"
  | "due_date";

export type TaskErrorResponse = {
  message: string;
  errors?: Partial<Record<TaskField, string[]>>;
};
