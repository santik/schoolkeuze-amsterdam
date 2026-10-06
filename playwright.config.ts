import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001";
const isProdTarget = process.env.PLAYWRIGHT_TARGET === "prod";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: isProdTarget
    ? undefined
    : {
        command: "HOSTNAME=127.0.0.1 npm run dev -- -H 127.0.0.1 -p 3001",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        // Hermetic runs: blank the database so the app serves the bundled sample
        // data and the impression API answers 503 (exercising the local-storage
        // fallback), and tests never write to a real database.
        env: { DATABASE_URL: "", DATABASE_URL_UNPOOLED: "" },
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
