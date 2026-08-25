export const PROJECT_STATUSES = [
  "planning",
  "active",
  "on_hold",
  "completed",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: "Planning",
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
};

export type Project = {
  id: number;
  client: number;
  client_name: string;
  name: string;
  description: string;
  status: ProjectStatus;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectField =
  | "client"
  | "name"
  | "description"
  | "status"
  | "start_date"
  | "due_date";

export type ProjectErrorResponse = {
  message: string;
  errors?: Partial<Record<ProjectField, string[]>>;
};
