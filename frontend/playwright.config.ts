import { randomBytes } from "node:crypto";

import { defineConfig, devices } from "@playwright/test";


function readPort(name: "E2E_FRONTEND_PORT" | "E2E_BACKEND_PORT", fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${name} must be a valid TCP port.`);
  }
  return port;
}

process.env.E2E_POSTGRES_PASSWORD ??= randomBytes(32).toString("hex");
process.env.E2E_DJANGO_SECRET_KEY ??= randomBytes(48).toString("base64url");
process.env.E2E_JWT_SIGNING_KEY ??= randomBytes(48).toString("base64url");
const noProxy = new Set(
  `${process.env.NO_PROXY ?? ""},${process.env.no_proxy ?? ""}`
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean),
);
noProxy.add("127.0.0.1");
noProxy.add("localhost");
process.env.NO_PROXY = [...noProxy].join(",");
process.env.no_proxy = process.env.NO_PROXY;

const frontendPort = readPort("E2E_FRONTEND_PORT", 3100);
const backendPort = readPort("E2E_BACKEND_PORT", 18_000);
const baseURL = `http://127.0.0.1:${frontendPort}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }]],
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /global\.setup\.ts/,
      teardown: "teardown",
    },
    {
      name: "chromium",
      testIgnore: /global\.(setup|teardown)\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1_800, height: 900 },
      },
      dependencies: ["setup"],
    },
    {
      name: "teardown",
      testMatch: /global\.teardown\.ts/,
    },
  ],
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${frontendPort}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    env: {
      BACKEND_API_URL: `http://127.0.0.1:${backendPort}`,
    },
  },
});
