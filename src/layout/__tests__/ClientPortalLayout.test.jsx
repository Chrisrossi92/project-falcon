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

  it("renders client portal navigation and signs out to login", async () => {
    renderLayout();

    expect(screen.getByRole("navigation", { name: "Client portal sections" })).toBeInTheDocument();
    expect(screen.getByTestId("portal-dashboard")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => {
      expect(supabaseMock.auth.signOut).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("location")).toHaveTextContent("/login");
    });
  });
});
