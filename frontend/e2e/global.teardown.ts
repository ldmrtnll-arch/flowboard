import { test as teardown } from "@playwright/test";

import { assertE2EResourcesRemoved, stopE2EStack } from "./support/stack";


teardown("remove isolated E2E services and data", () => {
  teardown.setTimeout(60_000);
  stopE2EStack();
  assertE2EResourcesRemoved();
});
