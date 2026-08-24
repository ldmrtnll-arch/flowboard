import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { authenticatedBackendFetch } from "@/lib/auth/authenticated-backend";
import { clientInputSchema } from "@/lib/clients/schemas";
import {
  clientBackendResponse,
  clientUnavailableResponse,
  normalizeClientZodError,
} from "@/lib/clients/server";


export async function GET(request: NextRequest) {
  try {
    const result = await authenticatedBackendFetch(request, "/api/clients/");
    return clientBackendResponse(result);
  } catch {
    return clientUnavailableResponse();
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 },
    );
  }

  const input = clientInputSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json(normalizeClientZodError(input.error), {
      status: 400,
    });
  }

  try {
    const result = await authenticatedBackendFetch(request, "/api/clients/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input.data),
    });
    return clientBackendResponse(result);
  } catch {
    return clientUnavailableResponse();
  }
}
