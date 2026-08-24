import "server-only";

import { NextResponse } from "next/server";
import type { z } from "zod";

import {
  applySessionChange,
  type AuthenticatedBackendResult,
} from "@/lib/auth/authenticated-backend";
import type {
  ClientErrorResponse,
  ClientField,
} from "@/lib/types/client";


const clientFields: ClientField[] = ["name", "email", "phone", "notes"];

export function normalizeClientBackendError(
  payload: unknown,
  fallbackMessage: string,
): ClientErrorResponse {
  const errors: ClientErrorResponse["errors"] = {};

  if (typeof payload === "object" && payload !== null) {
    for (const field of clientFields) {
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

export function normalizeClientZodError(error: z.ZodError): ClientErrorResponse {
  const errors: ClientErrorResponse["errors"] = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (
      typeof field === "string" &&
      clientFields.includes(field as ClientField) &&
      !errors[field as ClientField]
    ) {
      errors[field as ClientField] = [issue.message];
    }
  }

  return {
    message: "Please correct the highlighted fields.",
    ...(Object.keys(errors).length > 0 ? { errors } : {}),
  };
}

export function clientBackendResponse(result: AuthenticatedBackendResult) {
  let payload = result.payload;
  let status = result.status;

  if (status === 400) {
    payload = normalizeClientBackendError(
      payload,
      "Please correct the highlighted fields.",
    );
  } else if (status === 401) {
    payload = { message: "Authentication is required." };
  } else if (status === 404) {
    payload = { message: "Client not found." };
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

export function clientUnavailableResponse() {
  return NextResponse.json(
    { message: "Unable to connect to the server. Please try again." },
    { status: 502 },
  );
}
