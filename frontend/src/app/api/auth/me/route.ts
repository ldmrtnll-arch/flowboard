import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  applySessionChange,
  authenticatedBackendFetch,
} from "@/lib/auth/authenticated-backend";
import {
  parseAuthUser,
} from "@/lib/auth/server";


function unavailableResponse() {
  return NextResponse.json(
    { message: "Unable to connect to the server. Please try again." },
    { status: 502 },
  );
}

export async function GET(request: NextRequest) {
  try {
    const result = await authenticatedBackendFetch(request, "/api/auth/me/");
    if (!result.ok) {
      const response = NextResponse.json(
        result.status === 401
          ? { message: "Authentication is required." }
          : { message: "Unable to connect to the server. Please try again." },
        { status: result.status },
      );
      applySessionChange(response, result);
      return response;
    }

    const user = parseAuthUser(result.payload);
    if (!user) {
      return unavailableResponse();
    }

    const response = NextResponse.json(user);
    applySessionChange(response, result);
    return response;
  } catch {
    return unavailableResponse();
  }
}
