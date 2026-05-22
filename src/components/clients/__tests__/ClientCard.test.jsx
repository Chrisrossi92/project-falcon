// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ClientCard from "../ClientCard";

const useCanMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/hooks/usePermissions", () => ({
  useCan: useCanMock,
}));

vi.mock("@/lib/permissions/constants", () => ({
  PERMISSIONS: {
    CLIENTS_UPDATE_ALL: "clients.update.all",
  },
}));

function renderCard({ canUpdate = false, client = {}, metrics = {} } = {}) {
  useCanMock.mockReturnValue({ allowed: canUpdate });

  return render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <ClientCard
        client={{
          id: "client-1",
          name: "Acme Lending",
          category: "Lender",
          status: "active",
          primary_contact: "Avery Client",
          phone: "555-0100",
          ...client,
        }}
        metrics={{
          total_orders: 12,
          avg_fee: 425,
          last_activity: "2026-05-20T12:00:00Z",
          ...metrics,
        }}
      />
    </MemoryRouter>,
  );
}

describe("ClientCard presentation", () => {
  beforeEach(() => {
    useCanMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    useCanMock.mockReset();
  });

  it("renders client identity, contact, visible metrics, and detail navigation", () => {
    renderCard();

    expect(screen.getByRole("article", { name: "Acme Lending client summary" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Acme Lending" })).toBeInTheDocument();
    expect(screen.getByText("Lender")).toBeInTheDocument();
    expect(screen.getByText("Avery Client")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "555-0100" })).toHaveAttribute(
      "href",
      "tel:555-0100",
    );
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("$425")).toBeInTheDocument();
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View Acme Lending client detail" }),
    ).toHaveAttribute("href", "/clients/client-1");
  });

  it("keeps helper copy permission-derived without adding actions", () => {
    renderCard({ canUpdate: true });

    expect(screen.getByText("Orders and edit access")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Acme Lending client detail" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders read-only fallback copy and missing data placeholders", () => {
    renderCard({
      client: {
        name: "",
        category: "",
        status: "",
        primary_contact: "",
        phone: "",
      },
      metrics: {
        total_orders: undefined,
        avg_fee: undefined,
        last_activity: undefined,
      },
    });

    expect(screen.getByRole("heading", { name: "Untitled client" })).toBeInTheDocument();
    expect(screen.getByText("No primary contact")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(screen.getByText("Orders only")).toBeInTheDocument();
  });
});
