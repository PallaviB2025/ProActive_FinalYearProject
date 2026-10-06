import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90000,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    trace: "off",
    screenshot: "off",
    video: "off",
    permissions: ["clipboard-read", "clipboard-write"],
  },
});
