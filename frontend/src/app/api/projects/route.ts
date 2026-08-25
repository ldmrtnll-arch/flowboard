import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { authenticatedBackendFetch } from "@/lib/auth/authenticated-backend";
import { projectInputSchema } from "@/lib/projects/schemas";
import {
  normalizeProjectZodError,
  projectBackendResponse,
  projectUnavailableResponse,
} from "@/lib/projects/server";


export async function GET(request: NextRequest) {
  try {
    const result = await authenticatedBackendFetch(request, "/api/projects/");
    return projectBackendResponse(result);
  } catch {
    return projectUnavailableResponse();
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const input = projectInputSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json(normalizeProjectZodError(input.error), { status: 400 });
  }

  try {
    const result = await authenticatedBackendFetch(request, "/api/projects/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input.data),
    });
    return projectBackendResponse(result);
  } catch {
    return projectUnavailableResponse();
  }
}
