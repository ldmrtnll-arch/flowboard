import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { authenticatedBackendFetch } from "@/lib/auth/authenticated-backend";
import { projectIdSchema, projectPatchSchema } from "@/lib/projects/schemas";
import {
  normalizeProjectZodError,
  projectBackendResponse,
  projectUnavailableResponse,
} from "@/lib/projects/server";


type ProjectRouteContext = {
  params: Promise<{ id: string }>;
};

async function projectPath(context: ProjectRouteContext) {
  const { id } = await context.params;
  return projectIdSchema.safeParse(id).success ? `/api/projects/${id}/` : null;
}

function notFoundResponse() {
  return NextResponse.json({ message: "Project not found." }, { status: 404 });
}

export async function GET(request: NextRequest, context: ProjectRouteContext) {
  const path = await projectPath(context);
  if (!path) return notFoundResponse();

  try {
    return projectBackendResponse(await authenticatedBackendFetch(request, path));
  } catch {
    return projectUnavailableResponse();
  }
}

export async function PATCH(request: NextRequest, context: ProjectRouteContext) {
  const path = await projectPath(context);
  if (!path) return notFoundResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const input = projectPatchSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json(normalizeProjectZodError(input.error), { status: 400 });
  }

  try {
    const result = await authenticatedBackendFetch(request, path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input.data),
    });
    return projectBackendResponse(result);
  } catch {
    return projectUnavailableResponse();
  }
}

export async function DELETE(request: NextRequest, context: ProjectRouteContext) {
  const path = await projectPath(context);
  if (!path) return notFoundResponse();

  try {
    const result = await authenticatedBackendFetch(request, path, {
      method: "DELETE",
    });
    return projectBackendResponse(result);
  } catch {
    return projectUnavailableResponse();
  }
}
