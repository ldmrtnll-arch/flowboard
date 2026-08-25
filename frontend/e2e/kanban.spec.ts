import { expect, type Locator, type Page, test } from "@playwright/test";

import {
  createClient,
  createProject,
  createTask,
  registerAndLogin,
  uniqueData,
} from "./support/fixtures";


function column(page: Page, status: string) {
  return page.getByTestId(`kanban-column-${status}`);
}

async function expectTaskOrder(target: Locator, titles: string[]) {
  await expect(target.getByTestId("kanban-task-card").getByRole("heading", { level: 3 }))
    .toHaveText(titles);
}

async function dragAndExpectSingleMove(
  page: Page,
  taskId: number,
  source: Locator,
  target: Locator,
  moveRequests: string[],
) {
  const responsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" &&
    new URL(response.url()).pathname === `/api/tasks/${taskId}/move`,
  );
  const requestsBefore = moveRequests.length;
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error("Drag endpoints must be visible.");
  const sourcePoint = {
    x: sourceBox.x + sourceBox.width / 2,
    y: sourceBox.y + sourceBox.height / 2,
  };
  const targetPoint = {
    x: targetBox.x + targetBox.width / 2,
    y: targetBox.y + targetBox.height / 2,
  };
  await page.mouse.move(sourcePoint.x, sourcePoint.y);
  await page.mouse.down();
  await page.mouse.move(sourcePoint.x + 12, sourcePoint.y, { steps: 3 });
  await page.mouse.move(targetPoint.x, targetPoint.y, { steps: 20 });
  await page.mouse.up();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  await expect.poll(() => moveRequests.length).toBe(requestsBefore + 1);
}

test("persists real drag-and-drop ordering across Kanban columns and reloads", async ({ page }) => {
  test.setTimeout(60_000);
  const data = uniqueData("kanban");
  await registerAndLogin(page.request, data);
  const clientName = `Kanban client ${data.token}`;
  const projectName = `Kanban project ${data.token}`;
  const clientId = await createClient(page.request, clientName);
  const projectId = await createProject(page.request, clientId, projectName);
  const title = (letter: string) => `${letter} ${data.token}`;
  const taskA = await createTask(page.request, projectId, title("A"), "backlog");
  const taskB = await createTask(page.request, projectId, title("B"), "backlog");
  await createTask(page.request, projectId, title("C"), "todo");
  await createTask(page.request, projectId, title("D"), "todo");
  const taskE = await createTask(page.request, projectId, title("E"), "in_progress");
  await createTask(page.request, projectId, title("F"), "review");

  const moveRequests: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && /\/api\/tasks\/\d+\/move$/.test(new URL(request.url()).pathname)) {
      moveRequests.push(request.url());
    }
  });

  await page.goto(`/projects/${projectId}/board`);
  await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
  await expect(page.getByText(clientName)).toBeVisible();
  for (const [status, label] of [
    ["backlog", "Backlog column"],
    ["todo", "To do column"],
    ["in_progress", "In progress column"],
    ["review", "Review column"],
    ["done", "Done column"],
  ]) {
    await expect(column(page, status)).toHaveAttribute("aria-label", label);
  }
  await expectTaskOrder(column(page, "backlog"), [title("A"), title("B")]);
  await expectTaskOrder(column(page, "todo"), [title("C"), title("D")]);
  await expectTaskOrder(column(page, "in_progress"), [title("E")]);
  await expectTaskOrder(column(page, "review"), [title("F")]);
  await expect(column(page, "done")).toContainText("No tasks");

  await dragAndExpectSingleMove(
    page,
    taskB,
    page.getByRole("button", { name: `Move ${title("B")}` }),
    page.getByTestId("kanban-task-card").filter({ hasText: title("A") }),
    moveRequests,
  );
  await expectTaskOrder(column(page, "backlog"), [title("B"), title("A")]);
  await page.reload();
  await expectTaskOrder(column(page, "backlog"), [title("B"), title("A")]);

  await dragAndExpectSingleMove(
    page,
    taskA,
    page.getByRole("button", { name: `Move ${title("A")}` }),
    page.getByTestId("kanban-task-card").filter({ hasText: title("D") }),
    moveRequests,
  );
  await expectTaskOrder(column(page, "todo"), [title("C"), title("A"), title("D")]);
  await page.reload();
  await expectTaskOrder(column(page, "backlog"), [title("B")]);
  await expectTaskOrder(column(page, "todo"), [title("C"), title("A"), title("D")]);

  await dragAndExpectSingleMove(
    page,
    taskE,
    page.getByRole("button", { name: `Move ${title("E")}` }),
    column(page, "done").getByText("No tasks"),
    moveRequests,
  );
  await expectTaskOrder(column(page, "done"), [title("E")]);
  await page.reload();
  await expectTaskOrder(column(page, "in_progress"), []);
  await expectTaskOrder(column(page, "done"), [title("E")]);
  expect(moveRequests).toHaveLength(3);
});
