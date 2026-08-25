import { z } from "zod";

import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/types/task";


const optionalDateSchema = z
  .union([z.literal(""), z.iso.date({ error: "Enter a valid date." }), z.null()])
  .transform((value) => (value === "" ? null : value));

const assigneeSchema = z
  .union([
    z.literal("").transform(() => null),
    z.coerce.number().int().positive("Select a valid assignee."),
    z.null(),
  ])
  .optional();

const taskFieldsSchema = z.object({
  project: z.coerce.number().int().positive("Select a project."),
  title: z
    .string()
    .trim()
    .min(1, "Task title is required.")
    .max(200, "Task title must be 200 characters or fewer."),
  description: z.string().optional(),
  status: z.enum(TASK_STATUSES).default("backlog"),
  priority: z.enum(TASK_PRIORITIES).default("medium"),
  assignee: assigneeSchema,
  due_date: optionalDateSchema.optional(),
});

export const taskInputSchema = taskFieldsSchema;
export const taskPatchSchema = taskFieldsSchema.partial();

export const taskSchema = z.object({
  id: z.number().int().positive(),
  project: z.number().int().positive(),
  project_name: z.string(),
  client_name: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  assignee: z.number().int().positive().nullable(),
  assignee_email: z.string().nullable(),
  due_date: z.string().nullable(),
  position: z.number().int().nonnegative(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const tasksSchema = z.array(taskSchema);
export const taskIdSchema = z.string().regex(/^\d+$/);

export type TaskFormInput = z.input<typeof taskInputSchema>;
export type TaskInput = z.output<typeof taskInputSchema>;
export type TaskFormValues = {
  project: number;
  title: string;
  description: string;
  status: TaskInput["status"];
  priority: TaskInput["priority"];
  assignee: number | "";
  due_date: string;
};
