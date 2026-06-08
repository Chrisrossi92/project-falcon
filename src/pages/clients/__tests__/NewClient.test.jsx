// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";

const createClientManagementClientMock = vi.hoisted(() => vi.fn());
const navigateMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));
const operationsModeState = vi.hoisted(() => ({
  operationsMode: "amc_operations",
}));

vi.mock("@/features/clients/clientManagementApi", () => ({
  createClientManagementClient: createClientManagementClientMock,
}));

vi.mock("@/lib/operations/OperationsModeProvider", () => ({
  useOperationsMode: () => operationsModeState,
}));

vi.mock("react-hot-toast", () => ({
  default: toastMock,
}));

vi.mock("@/components/clients/ClientForm", () => ({
  default: ({ onSubmit, submitLabel }) => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          name: "First American Bank",
          category: "lender",
          contact_name_1: "Dana Miller",
          contact_email_1: "dana@example.test",
          contact_phone_1: "614-555-0199",
        });
      }}
    >
      <button type="submit">{submitLabel}</button>
    </form>
  ),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const { default: NewClient } = await import("../NewClient.jsx");

describe("NewClient", () => {
  beforeEach(() => {
    createClientManagementClientMock.mockReset();
    navigateMock.mockReset();
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    operationsModeState.operationsMode = "amc_operations";
  });

  it("passes the active AMC operation scope when creating a client with a primary contact", async () => {
    createClientManagementClientMock.mockResolvedValue({ id: 42, name: "First American Bank" });

    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <NewClient />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create Client" }));

    await waitFor(() => {
      expect(createClientManagementClientMock).toHaveBeenCalledWith(
        {
          name: "First American Bank",
          category: "lender",
          contact_name_1: "Dana Miller",
          contact_email_1: "dana@example.test",
          contact_phone_1: "614-555-0199",
        },
        { operationsScope: "amc_operations" },
      );
    });
    expect(toastMock.success).toHaveBeenCalledWith("Client created");
    expect(navigateMock).toHaveBeenCalledWith("/clients/42", { replace: true });
  });
});
