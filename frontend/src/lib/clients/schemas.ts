import { z } from "zod";


const optionalEmail = z.union([
  z.literal(""),
  z.string().email("Enter a valid email address."),
]);

export const clientInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Client name is required.")
    .max(200, "Client name must be 200 characters or fewer."),
  email: optionalEmail.optional(),
  phone: z
    .string()
    .trim()
    .max(30, "Phone must be 30 characters or fewer.")
    .optional(),
  notes: z.string().optional(),
});

export const clientPatchSchema = clientInputSchema.partial();

export const clientSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  notes: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const clientsSchema = z.array(clientSchema);

export const clientIdSchema = z.string().regex(/^\d+$/);

export type ClientInput = z.infer<typeof clientInputSchema>;
export type ClientFormValues = Required<ClientInput>;
