import { z } from "zod";

import { taskSchema } from "@/lib/tasks/schemas";
import { TASK_STATUSES } from "@/lib/types/task";


export const taskMoveSchema = z.object({
  status: z.enum(TASK_STATUSES),
  position: z.number().int().nonnegative(),
}).strict();

export const projectBoardSchema = z.object({
  project: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    client: z.number().int().positive(),
    client_name: z.string(),
  }),
  columns: z.object({
    backlog: z.array(taskSchema),
    todo: z.array(taskSchema),
    in_progress: z.array(taskSchema),
    review: z.array(taskSchema),
    done: z.array(taskSchema),
  }),
});

export type TaskMoveInput = z.infer<typeof taskMoveSchema>;
