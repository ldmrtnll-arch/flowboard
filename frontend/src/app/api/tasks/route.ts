import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { authenticatedBackendFetch } from "@/lib/auth/authenticated-backend";
import { taskInputSchema } from "@/lib/tasks/schemas";
import {
  normalizeTaskZodError,
  taskBackendResponse,
  taskUnavailableResponse,
} from "@/lib/tasks/server";


export async function GET(request: NextRequest) {
  try {
    return taskBackendResponse(
      await authenticatedBackendFetch(request, "/api/tasks/"),
    );
  } catch {
    return taskUnavailableResponse();
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }
  const input = taskInputSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json(normalizeTaskZodError(input.error), { status: 400 });
  }
  try {
    const result = await authenticatedBackendFetch(request, "/api/tasks/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input.data),
    });
    return taskBackendResponse(result);
  } catch {
    return taskUnavailableResponse();
  }
}
