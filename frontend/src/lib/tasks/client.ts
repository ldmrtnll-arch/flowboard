import type { TaskErrorResponse, TaskField } from "@/lib/types/task";


const taskFields: TaskField[] = [
  "project",
  "title",
  "description",
  "status",
  "priority",
  "assignee",
  "due_date",
];

export async function readTaskError(response: Response): Promise<TaskErrorResponse> {
  const fallback = "Something went wrong. Please try again.";
  try {
    const payload: unknown = await response.json();
    if (typeof payload !== "object" || payload === null) return { message: fallback };

    const messageValue = Reflect.get(payload, "message");
    const errorValue = Reflect.get(payload, "errors");
    const errors: TaskErrorResponse["errors"] = {};
    if (typeof errorValue === "object" && errorValue !== null) {
      for (const field of taskFields) {
        const value = Reflect.get(errorValue, field);
        if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
          errors[field] = value;
        }
      }
    }
    return {
      message: typeof messageValue === "string" ? messageValue : fallback,
      ...(Object.keys(errors).length ? { errors } : {}),
    };
  } catch {
    return { message: fallback };
  }
}
