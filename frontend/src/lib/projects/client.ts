import type {
  ProjectErrorResponse,
  ProjectField,
} from "@/lib/types/project";


const projectFields: ProjectField[] = [
  "client",
  "name",
  "description",
  "status",
  "start_date",
  "due_date",
];

export async function readProjectError(
  response: Response,
): Promise<ProjectErrorResponse> {
  const fallback = "Something went wrong. Please try again.";

  try {
    const payload: unknown = await response.json();
    if (typeof payload !== "object" || payload === null) {
      return { message: fallback };
    }

    const messageValue = Reflect.get(payload, "message");
    const errorValue = Reflect.get(payload, "errors");
    const errors: ProjectErrorResponse["errors"] = {};

    if (typeof errorValue === "object" && errorValue !== null) {
      for (const field of projectFields) {
        const value = Reflect.get(errorValue, field);
        if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
          errors[field] = value;
        }
      }
    }

    return {
      message: typeof messageValue === "string" ? messageValue : fallback,
      ...(Object.keys(errors).length > 0 ? { errors } : {}),
    };
  } catch {
    return { message: fallback };
  }
}
