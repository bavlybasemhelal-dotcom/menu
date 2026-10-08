import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  fullyParallel: false,
  timeout: 120000,
  expect: { timeout: 12000 },
  globalSetup: "./tests/e2e/setup.mjs",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev:emulator",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
