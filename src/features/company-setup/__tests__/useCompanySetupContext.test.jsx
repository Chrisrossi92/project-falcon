// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sessionState = vi.hoisted(() => ({
  userId: "auth-user-1",
  isLoading: false,
}));

const apiMock = vi.hoisted(() => ({
  getCompanySetupContext: vi.fn(),
  isCompanySetupPermissionDeniedError: vi.fn((error) => error?.code === "42501"),
}));

vi.mock("@/lib/hooks/useSession", () => ({
  default: () => sessionState,
  useSession: () => sessionState,
}));

vi.mock("@/features/company-setup/companySetupContextApi", () => apiMock);

const { default: useCompanySetupContext } = await import("../useCompanySetupContext.js");

function HookProbe() {
  const setupContext = useCompanySetupContext();

  return (
    <div>
      <div data-testid="loading">{String(setupContext.loading)}</div>
      <div data-testid="company">{setupContext.data?.company_id || "none"}</div>
      <div data-testid="error">{setupContext.error?.message || "none"}</div>
      <div data-testid="permission-denied">{String(setupContext.permissionDenied)}</div>
      <button type="button" onClick={() => setupContext.refetch()}>
        refetch
      </button>
    </div>
  );
}

describe("useCompanySetupContext", () => {
  beforeEach(() => {
    sessionState.userId = "auth-user-1";
    sessionState.isLoading = false;
    apiMock.getCompanySetupContext.mockReset();
    apiMock.isCompanySetupPermissionDeniedError.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("exposes loading then setup context data", async () => {
    apiMock.getCompanySetupContext.mockResolvedValue({ company_id: "company-1" });

    render(<HookProbe />);

    expect(screen.getByTestId("loading")).toHaveTextContent("true");

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
      expect(screen.getByTestId("company")).toHaveTextContent("company-1");
    });

    expect(apiMock.getCompanySetupContext).toHaveBeenCalledTimes(1);
  });

  it("does not call the API without an authenticated user", async () => {
    sessionState.userId = null;
    apiMock.getCompanySetupContext.mockResolvedValue({ company_id: "company-1" });

    render(<HookProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
      expect(screen.getByTestId("company")).toHaveTextContent("none");
    });

    expect(apiMock.getCompanySetupContext).not.toHaveBeenCalled();
  });

  it("exposes a safe error and permission denied state", async () => {
    const error = Object.assign(new Error("setup_read_permission_missing"), { code: "42501" });
    apiMock.getCompanySetupContext.mockRejectedValue(error);

    render(<HookProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
      expect(screen.getByTestId("company")).toHaveTextContent("none");
      expect(screen.getByTestId("error")).toHaveTextContent("setup_read_permission_missing");
      expect(screen.getByTestId("permission-denied")).toHaveTextContent("true");
    });

    expect(apiMock.isCompanySetupPermissionDeniedError).toHaveBeenCalledWith(error);
  });

  it("refetches without redirect or mutation side effects", async () => {
    apiMock.getCompanySetupContext
      .mockResolvedValueOnce({ company_id: "company-1" })
      .mockResolvedValueOnce({ company_id: "company-2" });

    render(<HookProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("company")).toHaveTextContent("company-1");
    });

    screen.getByRole("button", { name: "refetch" }).click();

    await waitFor(() => {
      expect(screen.getByTestId("company")).toHaveTextContent("company-2");
    });

    expect(apiMock.getCompanySetupContext).toHaveBeenCalledTimes(2);
  });
});
