import { defineConfig } from "@playwright/test";
import path from "path";

export default defineConfig({
  testDir: "./tests",
  timeout: 120_000,
  expect: { timeout: 30_000 },
  retries: 1,
  workers: 1, // Serial — extension context cannot be shared across workers
  reporter: [
    ["html", { open: "never", outputFolder: "./reports/html" }],
    ["json", { outputFile: "./reports/results.json" }],
    ["list"],
  ],
  use: {
    // Extensions require non-headless Chromium
    headless: false,
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: "chrome-extension",
      use: { browserName: "chromium" },
    },
  ],
});
