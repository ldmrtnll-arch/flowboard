import "server-only";


function getBackendApiUrl(): string {
  const value = process.env.BACKEND_API_URL;

  if (!value) {
    throw new Error("BACKEND_API_URL is required");
  }

  return value.replace(/\/$/, "");
}

function getBackendForwardedProto(): "http" | "https" | undefined {
  const value = process.env.BACKEND_FORWARDED_PROTO;

  if (value === undefined || value === "http" || value === "https") {
    return value;
  }

  throw new Error("BACKEND_FORWARDED_PROTO must be either http or https");
}

export async function backendRequest(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  const forwardedProto = getBackendForwardedProto();
  if (forwardedProto) {
    headers.set("X-Forwarded-Proto", forwardedProto);
  }

  return fetch(`${getBackendApiUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

export async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
