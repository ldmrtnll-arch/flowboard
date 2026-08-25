import { z } from "zod";

import { PROJECT_STATUSES } from "@/lib/types/project";


const optionalDateSchema = z
  .union([
    z.literal(""),
    z.iso.date({ error: "Enter a valid date." }),
    z.null(),
  ])
  .transform((value) => (value === "" ? null : value));

const projectFieldsSchema = z.object({
  client: z.coerce.number().int().positive("Select a client."),
  name: z
    .string()
    .trim()
    .min(1, "Project name is required.")
    .max(200, "Project name must be 200 characters or fewer."),
  description: z.string().optional(),
  status: z.enum(PROJECT_STATUSES).default("planning"),
  start_date: optionalDateSchema.optional(),
  due_date: optionalDateSchema.optional(),
});

function datesAreValid(project: {
  start_date?: string | null;
  due_date?: string | null;
}) {
  return (
    !project.start_date ||
    !project.due_date ||
    project.due_date >= project.start_date
  );
}

export const projectInputSchema = projectFieldsSchema
  .refine(
    datesAreValid,
    {
      path: ["due_date"],
      message: "Due date must be on or after the start date.",
    },
  );

export const projectPatchSchema = projectFieldsSchema.partial().refine(
  datesAreValid,
  {
    path: ["due_date"],
    message: "Due date must be on or after the start date.",
  },
);

export const projectSchema = z.object({
  id: z.number().int().positive(),
  client: z.number().int().positive(),
  client_name: z.string(),
  name: z.string(),
  description: z.string(),
  status: z.enum(PROJECT_STATUSES),
  start_date: z.string().nullable(),
  due_date: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const projectsSchema = z.array(projectSchema);
export const projectIdSchema = z.string().regex(/^\d+$/);

export type ProjectFormInput = z.input<typeof projectInputSchema>;
export type ProjectInput = z.output<typeof projectInputSchema>;
export type ProjectFormValues = {
  client: number;
  name: string;
  description: string;
  status: ProjectInput["status"];
  start_date: string;
  due_date: string;
};
