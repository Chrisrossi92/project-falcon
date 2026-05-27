import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import handler, {
  buildEmailWorkerUrl,
  invokeEmailWorker,
  isAuthorized,
} from "../api/cron/email-worker.js";

function createResponseMock() {
  const res = {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader: vi.fn((key, value) => {
      res.headers[key] = value;
    }),
    status: vi.fn((statusCode) => {
      res.statusCode = statusCode;
      return res;
    }),
    json: vi.fn((body) => {
      res.body = body;
      return res;
    }),
  };
  return res;
}

describe("email worker cron endpoint", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("builds the Supabase Edge Function URL from SUPABASE_URL", () => {
    expect(buildEmailWorkerUrl("https://project.supabase.co/")).toBe(
      "https://project.supabase.co/functions/v1/email-worker"
    );
  });

  it("requires the cron bearer secret", () => {
    expect(isAuthorized("Bearer secret", "secret")).toBe(true);
    expect(isAuthorized("Bearer wrong", "secret")).toBe(false);
    expect(isAuthorized("Bearer secret", "")).toBe(false);
  });

  it("keeps /api routes out of the Vite SPA fallback rewrite", () => {
    const vercelConfig = JSON.parse(
      readFileSync(new URL("../vercel.json", import.meta.url), "utf8")
    );
    const fallbackRewrite = vercelConfig.rewrites.find(
      (rewrite) => rewrite.destination === "/index.html"
    );

    expect(fallbackRewrite.source).toContain("api(?:/|$)");
    expect(fallbackRewrite.source).toBe("/:path((?!api(?:/|$)|assets/|.*\\..*).*)");
    expect(vercelConfig.functions["api/cron/email-worker.js"]).toMatchObject({
      runtime: "nodejs20.x",
    });
  });

  it("invokes email-worker with the service role JWT", async () => {
    const fetchImpl = vi.fn(async () => new globalThis.Response(JSON.stringify({ ok: true, claimed: 0 })));

    await expect(
      invokeEmailWorker({
        fetchImpl,
        supabaseUrl: "https://project.supabase.co",
        serviceRoleKey: "service-role-key",
      })
    ).resolves.toEqual({ ok: true, claimed: 0 });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://project.supabase.co/functions/v1/email-worker",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          apikey: "service-role-key",
          authorization: "Bearer service-role-key",
        }),
      })
    );
  });

  it("rejects unauthenticated cron requests before invoking the worker", async () => {
    process.env.CRON_SECRET = "secret";
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const res = createResponseMock();

    await handler({ method: "GET", headers: { authorization: "Bearer wrong" } }, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body).toEqual({ ok: false, error: "unauthorized" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("runs the worker for authorized cron requests", async () => {
    process.env.CRON_SECRET = "secret";
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new globalThis.Response(JSON.stringify({ ok: true, claimed: 1, sent: 1, failed: 0 }))
    );
    const res = createResponseMock();

    await handler({ method: "GET", headers: { authorization: "Bearer secret" } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toEqual({
      ok: true,
      worker: { ok: true, claimed: 1, sent: 1, failed: 0 },
    });
  });
});
