import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { authenticatedBackendFetch } from "@/lib/auth/authenticated-backend";
import { clientIdSchema, clientPatchSchema } from "@/lib/clients/schemas";
import {
  clientBackendResponse,
  clientUnavailableResponse,
  normalizeClientZodError,
} from "@/lib/clients/server";


type ClientRouteContext = {
  params: Promise<{ id: string }>;
};

async function clientPath(context: ClientRouteContext) {
  const { id } = await context.params;
  return clientIdSchema.safeParse(id).success ? `/api/clients/${id}/` : null;
}

function notFoundResponse() {
  return NextResponse.json({ message: "Client not found." }, { status: 404 });
}

export async function GET(request: NextRequest, context: ClientRouteContext) {
  const path = await clientPath(context);
  if (!path) {
    return notFoundResponse();
  }

  try {
    const result = await authenticatedBackendFetch(request, path);
    return clientBackendResponse(result);
  } catch {
    return clientUnavailableResponse();
  }
}

export async function PATCH(request: NextRequest, context: ClientRouteContext) {
  const path = await clientPath(context);
  if (!path) {
    return notFoundResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 },
    );
  }

  const input = clientPatchSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json(normalizeClientZodError(input.error), {
      status: 400,
    });
  }

  try {
    const result = await authenticatedBackendFetch(request, path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input.data),
    });
    return clientBackendResponse(result);
  } catch {
    return clientUnavailableResponse();
  }
}

export async function DELETE(request: NextRequest, context: ClientRouteContext) {
  const path = await clientPath(context);
  if (!path) {
    return notFoundResponse();
  }

  try {
    const result = await authenticatedBackendFetch(request, path, {
      method: "DELETE",
    });
    return clientBackendResponse(result);
  } catch {
    return clientUnavailableResponse();
  }
}
