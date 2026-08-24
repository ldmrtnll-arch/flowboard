import "server-only";

import { z } from "zod";

import { backendRequest, readJson } from "@/lib/api/backend";
import { authUserSchema, type LoginInput, type RegisterInput } from "@/lib/auth/schemas";
import type { AuthErrorResponse, AuthField, AuthUser } from "@/lib/types/auth";


const tokenPairSchema = z.object({
  access: z.string().min(1),
  refresh: z.string().min(1),
});

const accessTokenSchema = z.object({
  access: z.string().min(1),
});

export type BackendResult = {
  ok: boolean;
  status: number;
  payload: unknown;
};

async function jsonRequest(path: string, init: RequestInit): Promise<BackendResult> {
  const response = await backendRequest(path, init);
  return {
    ok: response.ok,
    status: response.status,
    payload: await readJson(response),
  };
}

export function registerWithBackend(input: RegisterInput): Promise<BackendResult> {
  return jsonRequest("/api/auth/register/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function loginWithBackend(input: LoginInput): Promise<BackendResult> {
  return jsonRequest("/api/auth/login/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function getUserWithBackend(access: string): Promise<BackendResult> {
  return jsonRequest("/api/auth/me/", {
    headers: { Authorization: `Bearer ${access}` },
  });
}

export function refreshWithBackend(refresh: string): Promise<BackendResult> {
  return jsonRequest("/api/auth/refresh/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
}

export function parseTokenPair(payload: unknown) {
  return tokenPairSchema.safeParse(payload);
}

export function parseAccessToken(payload: unknown) {
  return accessTokenSchema.safeParse(payload);
}

export function parseAuthUser(payload: unknown): AuthUser | null {
  const result = authUserSchema.safeParse(payload);
  return result.success ? result.data : null;
}

export function normalizeBackendError(
  payload: unknown,
  fallbackMessage: string,
): AuthErrorResponse {
  const errors: Partial<Record<AuthField, string[]>> = {};

  if (typeof payload === "object" && payload !== null) {
    for (const field of ["email", "password", "first_name", "last_name"] as const) {
      const value = Reflect.get(payload, field);
      if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
        errors[field] = value;
      }
    }
  }

  return {
    message: fallbackMessage,
    ...(Object.keys(errors).length > 0 ? { errors } : {}),
  };
}

export function normalizeZodError(error: z.ZodError): AuthErrorResponse {
  const errors: Partial<Record<AuthField, string[]>> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (
      (field === "email" ||
        field === "password" ||
        field === "first_name" ||
        field === "last_name") &&
      !errors[field]
    ) {
      errors[field] = [issue.message];
    }
  }

  return {
    message: "Please correct the highlighted fields.",
    ...(Object.keys(errors).length > 0 ? { errors } : {}),
  };
}
