import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { authenticatedBackendFetch } from "@/lib/auth/authenticated-backend";
import { projectBoardSchema } from "@/lib/kanban/schemas";
import {
  kanbanBackendResponse,
  kanbanUnavailableResponse,
} from "@/lib/kanban/server";
import { projectIdSchema } from "@/lib/projects/schemas";


type BoardRouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: BoardRouteContext) {
  const { id } = await context.params;
  if (!projectIdSchema.safeParse(id).success) {
    return NextResponse.json({ message: "Project not found." }, { status: 404 });
  }
  try {
    const result = await authenticatedBackendFetch(
      request,
      `/api/projects/${id}/board/`,
    );
    return kanbanBackendResponse(
      result,
      projectBoardSchema,
      "Project not found or unavailable.",
    );
  } catch {
    return kanbanUnavailableResponse();
  }
}
