import { test as setup } from "@playwright/test";

import {
  assertDockerAvailable,
  startE2EStack,
  stopE2EStack,
  waitForBackend,
} from "./support/stack";


setup("start isolated E2E services", async () => {
  setup.setTimeout(180_000);
  assertDockerAvailable();
  stopE2EStack({ ignoreFailure: true });
  try {
    startE2EStack();
    await waitForBackend();
  } catch (error) {
    stopE2EStack({ ignoreFailure: true });
    throw error;
  }
});
