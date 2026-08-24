import "server-only";


function getBackendApiUrl(): string {
  const value = process.env.BACKEND_API_URL;

  if (!value) {
    throw new Error("BACKEND_API_URL is required");
  }

  return value.replace(/\/$/, "");
}

export async function backendRequest(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${getBackendApiUrl()}${path}`, {
    ...init,
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
