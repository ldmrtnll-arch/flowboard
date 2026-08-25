import { randomUUID } from "node:crypto";

import { expect, type APIRequestContext } from "@playwright/test";


export const E2E_PASSWORD = "FlowBoard-E2E-Only-84!";

export function uniqueData(label: string) {
  const token = randomUUID().replaceAll("-", "").slice(0, 12);
  return {
    token,
    firstName: `E2E${token.slice(0, 5)}`,
    lastName: "Playwright",
    email: `${label}.${token}@example.test`,
  };
}

async function expectJsonId(response: Awaited<ReturnType<APIRequestContext["post"]>>) {
  expect(response.ok(), await response.text()).toBeTruthy();
  const body: unknown = await response.json();
  if (
    typeof body !== "object" ||
    body === null ||
    !("id" in body) ||
    typeof body.id !== "number"
  ) {
    throw new Error("Expected an API response containing a numeric id.");
  }
  return body.id;
}

export async function registerAndLogin(
  request: APIRequestContext,
  user = uniqueData("user"),
) {
  const registration = await request.post("/api/auth/register", {
    data: {
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email,
      password: E2E_PASSWORD,
    },
  });
  expect(registration.status(), await registration.text()).toBe(201);

  const login = await request.post("/api/auth/login", {
    data: { email: user.email, password: E2E_PASSWORD },
  });
  expect(login.ok(), await login.text()).toBeTruthy();
  return user;
}

export async function createClient(
  request: APIRequestContext,
  name: string,
) {
  return expectJsonId(await request.post("/api/clients", {
    data: { name, email: "", phone: "", notes: "E2E fixture" },
  }));
}

export async function createProject(
  request: APIRequestContext,
  client: number,
  name: string,
) {
  return expectJsonId(await request.post("/api/projects", {
    data: {
      client,
      name,
      description: "E2E fixture",
      status: "active",
      start_date: null,
      due_date: null,
    },
  }));
}

export async function createTask(
  request: APIRequestContext,
  project: number,
  title: string,
  status: "backlog" | "todo" | "in_progress" | "review" | "done",
) {
  return expectJsonId(await request.post("/api/tasks", {
    data: {
      project,
      title,
      description: "E2E fixture",
      status,
      priority: "medium",
      assignee: null,
      due_date: null,
    },
  }));
}
