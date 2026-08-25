import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { authenticatedBackendFetch } from "@/lib/auth/authenticated-backend";
import { taskIdSchema, taskPatchSchema } from "@/lib/tasks/schemas";
import {
  normalizeTaskZodError,
  taskBackendResponse,
  taskUnavailableResponse,
} from "@/lib/tasks/server";


type TaskRouteContext = { params: Promise<{ id: string }> };

async function taskPath(context: TaskRouteContext) {
  const { id } = await context.params;
  return taskIdSchema.safeParse(id).success ? `/api/tasks/${id}/` : null;
}

function notFoundResponse() {
  return NextResponse.json({ message: "Task not found." }, { status: 404 });
}

export async function GET(request: NextRequest, context: TaskRouteContext) {
  const path = await taskPath(context);
  if (!path) return notFoundResponse();
  try {
    return taskBackendResponse(await authenticatedBackendFetch(request, path));
  } catch {
    return taskUnavailableResponse();
  }
}

export async function PATCH(request: NextRequest, context: TaskRouteContext) {
  const path = await taskPath(context);
  if (!path) return notFoundResponse();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }
  const input = taskPatchSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json(normalizeTaskZodError(input.error), { status: 400 });
  }
  try {
    const result = await authenticatedBackendFetch(request, path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input.data),
    });
    return taskBackendResponse(result);
  } catch {
    return taskUnavailableResponse();
  }
}

export async function DELETE(request: NextRequest, context: TaskRouteContext) {
  const path = await taskPath(context);
  if (!path) return notFoundResponse();
  try {
    const result = await authenticatedBackendFetch(request, path, { method: "DELETE" });
    return taskBackendResponse(result);
  } catch {
    return taskUnavailableResponse();
  }
}
