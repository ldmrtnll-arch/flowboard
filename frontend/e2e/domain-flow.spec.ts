import { expect, test } from "@playwright/test";

import { registerAndLogin, uniqueData } from "./support/fixtures";


test("creates a client, project, and task through the product UI", async ({ page }) => {
  const user = await registerAndLogin(page.request, uniqueData("domain"));
  const clientName = `Client ${user.token}`;
  const clientEmail = `client.${user.token}@example.test`;
  const projectName = `Project ${user.token}`;
  const taskTitle = `Task ${user.token}`;

  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Clients" }).first().click();
  await page.getByRole("link", { name: "New client" }).click();
  await page.getByLabel("Name").fill(clientName);
  await page.getByLabel("Email").fill(clientEmail);
  await page.getByLabel("Phone").fill("+55 11 99999-0000");
  await page.getByLabel("Notes").fill("Created by the isolated E2E journey.");
  await page.getByRole("button", { name: "Create client" }).click();
  await expect(page).toHaveURL(/\/clients$/);
  await expect(page.getByRole("heading", { name: clientName })).toBeVisible();
  await expect(page.getByText(clientEmail)).toBeVisible();

  await page.getByRole("link", { name: "Projects" }).click();
  await page.getByRole("link", { name: "New project" }).click();
  await page.getByLabel("Client").selectOption({ label: clientName });
  await page.getByLabel("Name").fill(projectName);
  await page.getByLabel("Description").fill("Project created through the UI.");
  await page.getByLabel("Status").selectOption({ label: "Active" });
  await page.getByLabel("Start date").fill("2026-08-25");
  await page.getByLabel("Due date").fill("2026-09-25");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
  await expect(page.getByText(clientName)).toBeVisible();

  await page.getByRole("link", { name: "Tasks" }).click();
  await page.getByRole("link", { name: "New task" }).click();
  await page.getByLabel("Project").selectOption({ label: `${projectName} — ${clientName}` });
  await page.getByLabel("Title").fill(taskTitle);
  await page.getByLabel("Description").fill("Task created through the UI.");
  await page.getByLabel("Status").selectOption({ label: "In progress" });
  await page.getByLabel("Priority").selectOption({ label: "High" });
  await page.getByLabel("Assignee").selectOption({ label: "Assigned to me" });
  await page.getByLabel("Due date").fill("2026-09-10");
  await page.getByRole("button", { name: "Create task" }).click();

  await expect(page).toHaveURL(/\/tasks$/);
  const task = page.getByRole("listitem").filter({ hasText: taskTitle });
  await expect(task.getByRole("heading", { name: taskTitle })).toBeVisible();
  await expect(task).toContainText("In progress");
  await expect(task).toContainText("High");
  await expect(task).toContainText("Assigned to me");
  await expect(task).toContainText(projectName);
});
