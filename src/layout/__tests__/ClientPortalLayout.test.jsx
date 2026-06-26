// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = vi.hoisted(() => ({
  auth: {
    signOut: vi.fn(),
  },
}));

vi.mock("@/lib/supabaseClient", () => ({
  default: supabaseMock,
}));

vi.mock("@/lib/hooks/useSession", () => ({
  default: () => ({
    user: { email: "client@example.test" },
  }),
}));

const { default: ClientPortalLayout } = await import("../ClientPortalLayout.jsx");

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderLayout() {
  render(
    <MemoryRouter
      initialEntries={["/client-portal"]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <Routes>
        <Route element={<ClientPortalLayout />}>
          <Route path="/client-portal" element={<div data-testid="portal-dashboard">Portal dashboard</div>} />
        </Route>
        <Route path="/login" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ClientPortalLayout", () => {
  beforeEach(() => {
    supabaseMock.auth.signOut.mockReset();
    supabaseMock.auth.signOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a Falcon shell with client-only sidebar navigation and signs out to login", async () => {
    renderLayout();

    expect(screen.getByRole("navigation", { name: "Client portal sections" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Client portal mobile sections" })).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "Falcon" })).toHaveLength(2);
    expect(screen.getByText("Secure appraisal workspace")).toBeInTheDocument();
    expect(screen.getByTestId("portal-dashboard")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Dashboard" })[0]).toHaveAttribute("href", "/client-portal");
    expect(screen.getAllByRole("link", { name: "Current Orders" })[0]).toHaveAttribute("href", "/client-portal/orders");
    expect(screen.getAllByRole("link", { name: "Historical Orders" })[0]).toHaveAttribute("href", "/client-portal/historical-orders");
    expect(screen.getAllByRole("link", { name: "Documents" })[0]).toHaveAttribute("href", "/client-portal/documents");
    expect(screen.getAllByRole("link", { name: "Request Appraisal" })[0]).toHaveAttribute("href", "/client-portal/new-order");
    expect(screen.getAllByRole("link", { name: "Profile" })[0]).toHaveAttribute("href", "/client-portal/profile");
    expect(screen.queryByRole("link", { name: "Vendor Workspace" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Falcon AMC" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Internal Operations" })).toBeNull();
    expect(screen.queryByText("Open Workspace")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => {
      expect(supabaseMock.auth.signOut).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("location")).toHaveTextContent("/login");
    });
  });
});
