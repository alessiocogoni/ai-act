import { defineConfig } from "@playwright/test";

const port = process.env.E2E_PORT || "18764";
const baseURL = "http://127.0.0.1:" + port;

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL,
    launchOptions: process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : {},
  },
  webServer: {
    command: "node server.js",
    url: baseURL + "/api/status",
    env: {
      PORT: port,
      APP_ORIGIN: baseURL,
      DB_PATH: "private/e2e-" + Date.now() + ".sqlite",
      REGISTRATION_KEY: "test-only-key-at-least-24-characters",
      OPENAI_API_KEY: "",
      OPENAI_MODEL: "",
    },
  },
});
