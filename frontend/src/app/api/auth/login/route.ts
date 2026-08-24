import { NextResponse } from "next/server";

import { setAuthCookies } from "@/lib/auth/cookies";
import { loginSchema } from "@/lib/auth/schemas";
import {
  loginWithBackend,
  normalizeZodError,
  parseTokenPair,
} from "@/lib/auth/server";


export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 },
    );
  }

  const input = loginSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json(normalizeZodError(input.error), { status: 400 });
  }

  try {
    const result = await loginWithBackend(input.data);

    if (!result.ok) {
      if (result.status === 401) {
        return NextResponse.json(
          { message: "Invalid email or password." },
          { status: 401 },
        );
      }

      return NextResponse.json(
        { message: "Unable to connect to the server. Please try again." },
        { status: result.status >= 500 ? 502 : result.status },
      );
    }

    const tokens = parseTokenPair(result.payload);
    if (!tokens.success) {
      return NextResponse.json(
        { message: "Unable to connect to the server. Please try again." },
        { status: 502 },
      );
    }

    const response = NextResponse.json({ ok: true });
    setAuthCookies(response, tokens.data.access, tokens.data.refresh);
    return response;
  } catch {
    return NextResponse.json(
      { message: "Unable to connect to the server. Please try again." },
      { status: 502 },
    );
  }
}
