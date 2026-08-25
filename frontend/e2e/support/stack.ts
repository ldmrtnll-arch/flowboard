import { execFileSync } from "node:child_process";
import path from "node:path";


const composeProject = "flowboard-e2e";
const repositoryRoot = path.resolve(process.cwd(), "..");
const composeFile = path.join(repositoryRoot, "compose.e2e.yaml");
const compose = ["compose", "-p", composeProject, "-f", composeFile];

function backendPort() {
  return process.env.E2E_BACKEND_PORT ?? "18000";
}

function docker(args: string[], options: { ignoreFailure?: boolean } = {}) {
  try {
    return execFileSync("docker", args, {
      cwd: repositoryRoot,
      env: process.env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    if (options.ignoreFailure) return "";
    throw error;
  }
}

export function assertDockerAvailable() {
  docker(["info"]);
}

export function startE2EStack() {
  docker([...compose, "up", "--build", "--detach", "--wait"]);
}

export function stopE2EStack(options: { ignoreFailure?: boolean } = {}) {
  docker(
    [...compose, "down", "-v", "--remove-orphans"],
    options,
  );
}

export async function waitForBackend() {
  const deadline = Date.now() + 60_000;
  const url = `http://127.0.0.1:${backendPort()}/api/health/`;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`Health endpoint returned ${response.status}.`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error("The E2E backend did not become healthy in time.", {
    cause: lastError,
  });
}

export function assertE2EResourcesRemoved() {
  const containers = docker([
    "ps", "--all", "--quiet", "--filter", `label=com.docker.compose.project=${composeProject}`,
  ]);
  const volumes = docker([
    "volume", "ls", "--quiet", "--filter", `label=com.docker.compose.project=${composeProject}`,
  ]);
  if (containers || volumes) {
    throw new Error("The E2E Compose project left Docker resources behind.");
  }
}
