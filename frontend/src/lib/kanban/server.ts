import "server-only";

import { NextResponse } from "next/server";
import type { z } from "zod";

import {
  applySessionChange,
  type AuthenticatedBackendResult,
} from "@/lib/auth/authenticated-backend";


function backendMessage(payload: unknown, fallback: string) {
  if (typeof payload !== "object" || payload === null) return fallback;
  const message = Reflect.get(payload, "message");
  const detail = Reflect.get(payload, "detail");
  if (typeof message === "string") return message;
  if (typeof detail === "string") return detail;
  return fallback;
}

export function kanbanBackendResponse<T extends z.ZodType>(
  result: AuthenticatedBackendResult,
  schema: T,
  notFoundMessage: string,
) {
  let status = result.status;
  let payload: unknown = result.payload;

  if (status >= 200 && status < 300) {
    const parsed = schema.safeParse(payload);
    if (parsed.success) {
      payload = parsed.data;
    } else {
      status = 502;
      payload = { message: "The server returned an invalid response." };
    }
  } else if (status === 400) {
    payload = { message: backendMessage(payload, "Invalid move.") };
  } else if (status === 401) {
    payload = { message: "Authentication is required." };
  } else if (status === 404) {
    payload = { message: notFoundMessage };
  } else if (status >= 500) {
    status = 502;
    payload = { message: "Unable to connect to the server. Please try again." };
  }

  const response = NextResponse.json(payload, { status });
  applySessionChange(response, result);
  return response;
}

export function kanbanUnavailableResponse() {
  return NextResponse.json(
    { message: "Unable to connect to the server. Please try again." },
    { status: 502 },
  );
}
