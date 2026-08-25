import type { Task, TaskStatus } from "@/lib/types/task";


export type KanbanStatus = TaskStatus;

export const KANBAN_COLUMNS = [
  { id: "backlog", label: "Backlog" },
  { id: "todo", label: "To do" },
  { id: "in_progress", label: "In progress" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
] as const satisfies readonly { id: KanbanStatus; label: string }[];

export type KanbanColumn = (typeof KANBAN_COLUMNS)[number];

export type ProjectBoard = {
  project: {
    id: number;
    name: string;
    client: number;
    client_name: string;
  };
  columns: Record<KanbanStatus, Task[]>;
};
