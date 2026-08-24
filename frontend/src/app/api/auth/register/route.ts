import { NextResponse } from "next/server";

import { registerSchema } from "@/lib/auth/schemas";
import {
  normalizeBackendError,
  normalizeZodError,
  parseAuthUser,
  registerWithBackend,
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

  const input = registerSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json(normalizeZodError(input.error), { status: 400 });
  }

  try {
    const result = await registerWithBackend(input.data);

    if (!result.ok) {
      const status = result.status >= 500 ? 502 : result.status;
      return NextResponse.json(
        normalizeBackendError(
          result.payload,
          status === 502
            ? "Unable to connect to the server. Please try again."
            : "Unable to create the account.",
        ),
        { status },
      );
    }

    const user = parseAuthUser(result.payload);
    if (!user) {
      return NextResponse.json(
        { message: "Unable to connect to the server. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json(user, { status: result.status });
  } catch {
    return NextResponse.json(
      { message: "Unable to connect to the server. Please try again." },
      { status: 502 },
    );
  }
}
