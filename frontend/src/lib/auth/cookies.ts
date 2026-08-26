import "server-only";

import type { NextResponse } from "next/server";

import {
  ACCESS_COOKIE_MAX_AGE,
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_MAX_AGE,
  REFRESH_COOKIE_NAME,
} from "@/lib/auth/constants";


function secureCookiesEnabled(): boolean {
  const configured = process.env.AUTH_COOKIE_SECURE;

  if (configured === undefined) {
    return process.env.NODE_ENV === "production";
  }
  if (configured === "true") {
    return true;
  }
  if (configured === "false") {
    return false;
  }

  throw new Error("AUTH_COOKIE_SECURE must be either true or false");
}

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: secureCookiesEnabled(),
  path: "/",
};

export function setAuthCookies(
  response: NextResponse,
  access: string,
  refresh: string,
): void {
  response.cookies.set(ACCESS_COOKIE_NAME, access, {
    ...cookieOptions,
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });
  response.cookies.set(REFRESH_COOKIE_NAME, refresh, {
    ...cookieOptions,
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}

export function setAccessCookie(response: NextResponse, access: string): void {
  response.cookies.set(ACCESS_COOKIE_NAME, access, {
    ...cookieOptions,
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_COOKIE_NAME, "", {
    ...cookieOptions,
    maxAge: 0,
  });
  response.cookies.set(REFRESH_COOKIE_NAME, "", {
    ...cookieOptions,
    maxAge: 0,
  });
}
