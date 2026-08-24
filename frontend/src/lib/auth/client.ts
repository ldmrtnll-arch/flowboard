import type { AuthErrorResponse, AuthField } from "@/lib/types/auth";


const authFields: AuthField[] = [
  "email",
  "password",
  "first_name",
  "last_name",
];

export async function readAuthError(response: Response): Promise<AuthErrorResponse> {
  const fallback = "Something went wrong. Please try again.";

  try {
    const payload: unknown = await response.json();
    if (typeof payload !== "object" || payload === null) {
      return { message: fallback };
    }

    const messageValue = Reflect.get(payload, "message");
    const errorValue = Reflect.get(payload, "errors");
    const errors: AuthErrorResponse["errors"] = {};

    if (typeof errorValue === "object" && errorValue !== null) {
      for (const field of authFields) {
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
