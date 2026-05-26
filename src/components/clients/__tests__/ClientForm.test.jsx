// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listAmcOptionsMock = vi.hoisted(() => vi.fn());
const isClientNameAvailableMock = vi.hoisted(() => vi.fn());

vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
  },
}));

vi.mock("@/features/clients/clientManagementApi", () => ({
  listClientManagementAmcOptions: listAmcOptionsMock,
}));

vi.mock("@/lib/services/clientsService", () => ({
  isClientNameAvailable: isClientNameAvailableMock,
}));

const { default: ClientForm } = await import("../ClientForm");

describe("ClientForm contact optionality", () => {
  beforeEach(() => {
    listAmcOptionsMock.mockResolvedValue([]);
    isClientNameAvailableMock.mockResolvedValue(true);
  });

  afterEach(() => {
    cleanup();
    listAmcOptionsMock.mockReset();
    isClientNameAvailableMock.mockReset();
  });

  it("submits no_specific_contact when the no specific contact checkbox is enabled", async () => {
    const onSubmit = vi.fn();
    render(<ClientForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText("Acme Capital, LLC"), {
      target: { value: "Portal Managed AMC" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /No specific contact/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Portal Managed AMC",
          contact_mode: "no_specific_contact",
        }),
      );
    });
  });

  it("hydrates existing no_specific_contact mode", async () => {
    const onSubmit = vi.fn();
    render(
      <ClientForm
        initial={{
          id: 42,
          name: "Portal Client",
          contact_mode: "no_specific_contact",
        }}
        onSubmit={onSubmit}
      />,
    );

    expect(
      screen.getByRole("checkbox", { name: /No specific contact/ }),
    ).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Portal Client",
          contact_mode: "no_specific_contact",
        }),
      );
    });
  });
});
