import { expect, test } from "@playwright/test";

import { E2E_PASSWORD, uniqueData } from "./support/fixtures";


test("registers, signs in with secure cookies, and signs out through the UI", async ({
  context,
  page,
}) => {
  const user = uniqueData("auth");

  await page.goto("/register");
  await page.getByLabel("First name").fill(user.firstName);
  await page.getByLabel("Last name").fill(user.lastName);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/login\?registered=1$/);
  await expect(page.getByRole("status")).toContainText("Account created successfully");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: `Welcome, ${user.firstName}.` })).toBeVisible();
  await expect(page.getByText(`Signed in as ${user.email}`)).toBeVisible();

  const authCookies = (await context.cookies()).filter(({ name }) =>
    ["flowboard_access", "flowboard_refresh"].includes(name),
  );
  expect(authCookies.map(({ name }) => name).sort()).toEqual([
    "flowboard_access",
    "flowboard_refresh",
  ]);
  for (const cookie of authCookies) {
    expect(cookie.httpOnly).toBeTruthy();
    expect(cookie.sameSite).toBe("Lax");
  }
  expect(await page.evaluate(() => ({
    local: localStorage.length,
    session: sessionStorage.length,
  }))).toEqual({ local: 0, session: 0 });

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await context.cookies()).filter(({ name }) =>
    ["flowboard_access", "flowboard_refresh"].includes(name),
  )).toHaveLength(0);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});

test("redirects anonymous users from representative protected routes", async ({ page }) => {
  for (const route of ["/dashboard", "/clients", "/projects", "/tasks"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
  }
});
