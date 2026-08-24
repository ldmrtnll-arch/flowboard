import "server-only";

import type { NextRequest, NextResponse } from "next/server";

import { backendRequest, readJson } from "@/lib/api/backend";
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} from "@/lib/auth/constants";
import { clearAuthCookies, setAccessCookie } from "@/lib/auth/cookies";
import { parseAccessToken, refreshWithBackend } from "@/lib/auth/server";


type SessionChange =
  | { type: "none" }
  | { type: "refresh"; access: string }
  | { type: "clear" };

export type AuthenticatedBackendResult = {
  ok: boolean;
  status: number;
  payload: unknown;
  session: SessionChange;
};

async function requestWithAccess(
  path: string,
  access: string,
  init?: RequestInit,
): Promise<Omit<AuthenticatedBackendResult, "session">> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${access}`);

  const response = await backendRequest(path, { ...init, headers });
  return {
    ok: response.ok,
    status: response.status,
    payload: await readJson(response),
  };
}

export async function authenticatedBackendFetch(
  request: NextRequest,
  path: string,
  init?: RequestInit,
): Promise<AuthenticatedBackendResult> {
  const access = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

  if (access) {
    const result = await requestWithAccess(path, access, init);
    if (result.status !== 401) {
      return { ...result, session: { type: "none" } };
    }
  }

  if (!refresh) {
    return {
      ok: false,
      status: 401,
      payload: { message: "Authentication is required." },
      session: { type: "clear" },
    };
  }

  const refreshed = await refreshWithBackend(refresh);
  if (!refreshed.ok) {
    return {
      ok: false,
      status: refreshed.status >= 500 ? 502 : 401,
      payload: { message: "Authentication is required." },
      session: { type: "clear" },
    };
  }

  const token = parseAccessToken(refreshed.payload);
  if (!token.success) {
    return {
      ok: false,
      status: 401,
      payload: { message: "Authentication is required." },
      session: { type: "clear" },
    };
  }

  const retried = await requestWithAccess(path, token.data.access, init);
  return {
    ...retried,
    session:
      retried.status === 401
        ? { type: "clear" }
        : { type: "refresh", access: token.data.access },
  };
}

export function applySessionChange(
  response: NextResponse,
  result: AuthenticatedBackendResult,
): void {
  if (result.session.type === "refresh") {
    setAccessCookie(response, result.session.access);
  } else if (result.session.type === "clear") {
    clearAuthCookies(response);
  }
}
