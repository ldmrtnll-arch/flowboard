import "server-only";

import { NextResponse } from "next/server";
import type { z } from "zod";

import {
  applySessionChange,
  type AuthenticatedBackendResult,
} from "@/lib/auth/authenticated-backend";
import type { TaskErrorResponse, TaskField } from "@/lib/types/task";


const taskFields: TaskField[] = [
  "project", "title", "description", "status", "priority", "assignee", "due_date",
];

export function normalizeTaskBackendError(
  payload: unknown,
  fallbackMessage: string,
): TaskErrorResponse {
  const errors: TaskErrorResponse["errors"] = {};
  if (typeof payload === "object" && payload !== null) {
    for (const field of taskFields) {
      const value = Reflect.get(payload, field);
      if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
        errors[field] = value;
      }
    }
  }
  return {
    message: fallbackMessage,
    ...(Object.keys(errors).length ? { errors } : {}),
  };
}

export function normalizeTaskZodError(error: z.ZodError): TaskErrorResponse {
  const errors: TaskErrorResponse["errors"] = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (
      typeof field === "string" &&
      taskFields.includes(field as TaskField) &&
      !errors[field as TaskField]
    ) {
      errors[field as TaskField] = [issue.message];
    }
  }
  return {
    message: "Please correct the highlighted fields.",
    ...(Object.keys(errors).length ? { errors } : {}),
  };
}

export function taskBackendResponse(result: AuthenticatedBackendResult) {
  let payload = result.payload;
  let status = result.status;
  if (status === 400) {
    payload = normalizeTaskBackendError(payload, "Please correct the highlighted fields.");
  } else if (status === 401) {
    payload = { message: "Authentication is required." };
  } else if (status === 404) {
    payload = { message: "Task not found." };
  } else if (status >= 500) {
    status = 502;
    payload = { message: "Unable to connect to the server. Please try again." };
  }
  const response = status === 204
    ? new NextResponse(null, { status })
    : NextResponse.json(payload, { status });
  applySessionChange(response, result);
  return response;
}

export function taskUnavailableResponse() {
  return NextResponse.json(
    { message: "Unable to connect to the server. Please try again." },
    { status: 502 },
  );
}
