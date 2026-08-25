import "server-only";

import { NextResponse } from "next/server";
import type { z } from "zod";

import {
  applySessionChange,
  type AuthenticatedBackendResult,
} from "@/lib/auth/authenticated-backend";
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

export function normalizeProjectBackendError(
  payload: unknown,
  fallbackMessage: string,
): ProjectErrorResponse {
  const errors: ProjectErrorResponse["errors"] = {};

  if (typeof payload === "object" && payload !== null) {
    for (const field of projectFields) {
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

export function normalizeProjectZodError(error: z.ZodError): ProjectErrorResponse {
  const errors: ProjectErrorResponse["errors"] = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (
      typeof field === "string" &&
      projectFields.includes(field as ProjectField) &&
      !errors[field as ProjectField]
    ) {
      errors[field as ProjectField] = [issue.message];
    }
  }

  return {
    message: "Please correct the highlighted fields.",
    ...(Object.keys(errors).length > 0 ? { errors } : {}),
  };
}

export function projectBackendResponse(result: AuthenticatedBackendResult) {
  let payload = result.payload;
  let status = result.status;

  if (status === 400) {
    payload = normalizeProjectBackendError(
      payload,
      "Please correct the highlighted fields.",
    );
  } else if (status === 401) {
    payload = { message: "Authentication is required." };
  } else if (status === 404) {
    payload = { message: "Project not found." };
  } else if (status >= 500) {
    status = 502;
    payload = { message: "Unable to connect to the server. Please try again." };
  }

  const response =
    status === 204
      ? new NextResponse(null, { status })
      : NextResponse.json(payload, { status });
  applySessionChange(response, result);
  return response;
}

export function projectUnavailableResponse() {
  return NextResponse.json(
    { message: "Unable to connect to the server. Please try again." },
    { status: 502 },
  );
}
