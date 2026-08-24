import type {
  ClientErrorResponse,
  ClientField,
} from "@/lib/types/client";


const clientFields: ClientField[] = ["name", "email", "phone", "notes"];

export async function readClientError(
  response: Response,
): Promise<ClientErrorResponse> {
  const fallback = "Something went wrong. Please try again.";

  try {
    const payload: unknown = await response.json();
    if (typeof payload !== "object" || payload === null) {
      return { message: fallback };
    }

    const messageValue = Reflect.get(payload, "message");
    const errorValue = Reflect.get(payload, "errors");
    const errors: ClientErrorResponse["errors"] = {};

    if (typeof errorValue === "object" && errorValue !== null) {
      for (const field of clientFields) {
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
