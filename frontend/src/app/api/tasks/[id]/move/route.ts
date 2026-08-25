import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { authenticatedBackendFetch } from "@/lib/auth/authenticated-backend";
import { taskMoveSchema } from "@/lib/kanban/schemas";
import {
  kanbanBackendResponse,
  kanbanUnavailableResponse,
} from "@/lib/kanban/server";
import { taskIdSchema, taskSchema } from "@/lib/tasks/schemas";


type MoveRouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: MoveRouteContext) {
  const { id } = await context.params;
  if (!taskIdSchema.safeParse(id).success) {
    return NextResponse.json({ message: "Task not found." }, { status: 404 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }
  const input = taskMoveSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json({ message: "Invalid move." }, { status: 400 });
  }
  try {
    const result = await authenticatedBackendFetch(
      request,
      `/api/tasks/${id}/move/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.data),
      },
    );
    return kanbanBackendResponse(result, taskSchema, "Task not found.");
  } catch {
    return kanbanUnavailableResponse();
  }
}
