import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} from "@/lib/auth/constants";
import { clearAuthCookies, setAccessCookie } from "@/lib/auth/cookies";
import {
  getUserWithBackend,
  parseAccessToken,
  parseAuthUser,
  refreshWithBackend,
} from "@/lib/auth/server";


function unauthorizedResponse() {
  const response = NextResponse.json(
    { message: "Authentication is required." },
    { status: 401 },
  );
  clearAuthCookies(response);
  return response;
}

function unavailableResponse() {
  return NextResponse.json(
    { message: "Unable to connect to the server. Please try again." },
    { status: 502 },
  );
}

async function refreshAndLoadUser(refresh: string) {
  const refreshed = await refreshWithBackend(refresh);

  if (!refreshed.ok) {
    return refreshed.status >= 500 ? unavailableResponse() : unauthorizedResponse();
  }

  const token = parseAccessToken(refreshed.payload);
  if (!token.success) {
    return unauthorizedResponse();
  }

  const userResult = await getUserWithBackend(token.data.access);
  if (!userResult.ok) {
    return userResult.status === 401
      ? unauthorizedResponse()
      : unavailableResponse();
  }

  const user = parseAuthUser(userResult.payload);
  if (!user) {
    return unavailableResponse();
  }

  const response = NextResponse.json(user);
  setAccessCookie(response, token.data.access);
  return response;
}

export async function GET(request: NextRequest) {
  const access = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

  try {
    if (access) {
      const userResult = await getUserWithBackend(access);

      if (userResult.ok) {
        const user = parseAuthUser(userResult.payload);
        return user ? NextResponse.json(user) : unavailableResponse();
      }

      if (userResult.status !== 401) {
        return unavailableResponse();
      }
    }

    if (!refresh) {
      return unauthorizedResponse();
    }

    return await refreshAndLoadUser(refresh);
  } catch {
    return unavailableResponse();
  }
}
