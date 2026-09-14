import { defineConfig, devices } from "@playwright/test";

const useCloudflare = process.env.SDQ_USE_CLOUDFLARE === "1";
const previewUrl = process.env.SDQ_PREVIEW_URL || (useCloudflare ? "http://127.0.0.1:3106" : "http://127.0.0.1:3000");
const preview = new URL(previewUrl);
const isLocalPreview = ["127.0.0.1", "localhost", "::1"].includes(preview.hostname);

const webServer = useCloudflare
  ? {
      command: `npx wrangler pages dev out --ip ${preview.hostname} --port ${preview.port || "3106"}`,
      url: previewUrl,
      reuseExistingServer: false,
      timeout: 30_000,
    }
  : isLocalPreview
    ? {
        command: `npm run start -- --listen tcp://${preview.hostname}:${preview.port || "3000"} --no-port-switching`,
        url: previewUrl,
        reuseExistingServer: process.env.CI !== "true",
        timeout: 30_000,
      }
    : undefined;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 20_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: previewUrl,
    trace: "retain-on-failure",
  },
  webServer,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"], viewport: { width: 1280, height: 720 } },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"], viewport: { width: 1280, height: 720 } },
    },
  ],
});
