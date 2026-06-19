import { defineConfig, devices } from "@playwright/test";

const LOCAL_BASE_URL = "http://127.0.0.1:5173";
const APPROVED_AMC_STAGING_REF = "voompccpkjfcsmehdoqu";
const DEFAULT_PRODUCTION_REFS = "okwqhkrsjgxrhyisaovc";

const target = process.env.E2E_TARGET || "local";
const baseURL = (process.env.E2E_BASE_URL || LOCAL_BASE_URL).replace(/\/+$/, "");
const productionRefs = (process.env.AMC_PRODUCTION_PROJECT_REFS || DEFAULT_PRODUCTION_REFS)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

function isLocalUrl(url: URL) {
  return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
}

function assertSafeE2ETarget() {
  let parsed: URL;
  try {
    parsed = new URL(baseURL);
  } catch {
    throw new Error(`Invalid E2E_BASE_URL: ${baseURL || "(empty)"}`);
  }

  const normalizedUrl = baseURL.toLowerCase();
  const hostname = parsed.hostname.toLowerCase();
  const productionRef = productionRefs.find((ref) => ref && normalizedUrl.includes(ref.toLowerCase()));
  const productionLikeHost =
    hostname === "continentalres.com" ||
    hostname.endsWith(".continentalres.com") ||
    /\bprod(uction)?\b/.test(hostname);

  if (productionRef || productionLikeHost) {
    throw new Error(
      `Refusing Playwright E2E against production-like URL ${baseURL}. Use local or approved staging targets only.`,
    );
  }

  if (target === "local") {
    if (!isLocalUrl(parsed)) {
      throw new Error(`E2E_TARGET=local requires a localhost URL, got ${baseURL}.`);
    }
    return;
  }

  if (target === "staging") {
    if (process.env.E2E_ALLOW_STAGING !== "1") {
      throw new Error("E2E_TARGET=staging requires E2E_ALLOW_STAGING=1.");
    }
    if (!process.env.E2E_BASE_URL) {
      throw new Error("E2E_TARGET=staging requires explicit E2E_BASE_URL.");
    }
    return;
  }

  throw new Error(`Unsupported E2E_TARGET=${target}. Use local or staging.`);
}

assertSafeE2ETarget();

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer:
    target === "local"
      ? {
          command: "npm run dev -- --host 127.0.0.1 --port 5173",
          url: LOCAL_BASE_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        }
      : undefined,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  metadata: {
    target,
    approvedAmcStagingRef: APPROVED_AMC_STAGING_REF,
  },
});
