// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const bidApiState = vi.hoisted(() => ({
  listOrderVendorBidRequests: vi.fn(),
  recordOrderVendorBidResponse: vi.fn(),
  selectOrderVendorBidResponse: vi.fn(),
}));

const assignmentApiState = vi.hoisted(() => ({
  offerOrderToVendor: vi.fn(),
}));

vi.mock("../api", () => ({
  listOrderVendorBidRequests: bidApiState.listOrderVendorBidRequests,
  recordOrderVendorBidResponse: bidApiState.recordOrderVendorBidResponse,
  selectOrderVendorBidResponse: bidApiState.selectOrderVendorBidResponse,
}));

vi.mock("@/features/assignments/api", () => ({
  offerOrderToVendor: assignmentApiState.offerOrderToVendor,
}));

const { default: BidRequestsPanel } = await import("../components/BidRequestsPanel.jsx");

const bidRequests = [
  {
    bid_request_id: "bid-request-1",
    order_id: "order-1",
    status: "partially_responded",
    response_due_at: "2026-06-03T20:00:00.000Z",
    desired_vendor_due_at: "2026-06-08T20:00:00.000Z",
    client_due_at: "2026-06-10T20:00:00.000Z",
    created_at: "2026-06-02T15:00:00.000Z",
    recipients: [
      {
        recipient_id: "recipient-1",
        vendor_company_name: "Franklin Commercial Valuation",
        status: "responded",
        response: {
          response_id: "response-1",
          fee_amount: 1450,
          currency: "USD",
          proposed_due_at: "2026-06-08T20:00:00.000Z",
          turn_time_days: 5,
          comments: "Available next week.",
          submitted_at: "2026-06-02T16:00:00.000Z",
          selected_at: null,
        },
      },
      {
        recipient_id: "recipient-2",
        vendor_company_name: "Metro Valuation Group",
        status: "sent",
        response: null,
      },
    ],
  },
];

describe("BidRequestsPanel", () => {
  beforeEach(() => {
    bidApiState.listOrderVendorBidRequests.mockReset();
    bidApiState.recordOrderVendorBidResponse.mockReset();
    bidApiState.selectOrderVendorBidResponse.mockReset();
    assignmentApiState.offerOrderToVendor.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("does not render or fetch when disabled", () => {
    render(<BidRequestsPanel orderId="order-1" enabled={false} />);

    expect(screen.queryByLabelText("Bid requests")).toBeNull();
    expect(bidApiState.listOrderVendorBidRequests).not.toHaveBeenCalled();
  });

  it("does not fetch without an order id", () => {
    render(<BidRequestsPanel enabled />);

    expect(screen.getByLabelText("Bid requests")).toBeInTheDocument();
    expect(screen.getByText("Order context is required before bid requests can load.")).toBeInTheDocument();
    expect(bidApiState.listOrderVendorBidRequests).not.toHaveBeenCalled();
  });

  it("loads and renders bid requests with recipient and response summaries", async () => {
    bidApiState.listOrderVendorBidRequests.mockResolvedValue(bidRequests);

    render(<BidRequestsPanel orderId="order-1" enabled />);

    expect(screen.getByText("Bid requests")).toBeInTheDocument();
    expect(screen.getByText("Vendor fee and turn-time outreach for this order.")).toBeInTheDocument();
    expect(screen.getByText("Bid requests do not assign work automatically.")).toBeInTheDocument();

    await waitFor(() => {
      expect(bidApiState.listOrderVendorBidRequests).toHaveBeenCalledWith("order-1");
    });

    expect(await screen.findByRole("heading", { name: "Bid request" })).toBeInTheDocument();
    expect(screen.getByText("Partially Responded")).toBeInTheDocument();
    expect(screen.getByText("Franklin Commercial Valuation")).toBeInTheDocument();
    expect(screen.getByText("Metro Valuation Group")).toBeInTheDocument();
    expect(screen.getByText("$1,450 · 5 days · Due Jun 8, 2026")).toBeInTheDocument();
    expect(screen.getByText("Available next week.")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders selected response details when present", async () => {
    bidApiState.listOrderVendorBidRequests.mockResolvedValue([
      {
        ...bidRequests[0],
        status: "closed",
        recipients: [
          {
            ...bidRequests[0].recipients[0],
            status: "selected",
            response: {
              ...bidRequests[0].recipients[0].response,
              selected_at: "2026-06-02T18:00:00.000Z",
            },
          },
          {
            ...bidRequests[0].recipients[1],
            status: "not_selected",
          },
        ],
      },
    ]);

    render(<BidRequestsPanel orderId="order-1" enabled />);

    const selectedSummary = await screen.findByText("Selected response: Franklin Commercial Valuation");
    const selectedCard = selectedSummary.parentElement;
    expect(selectedSummary).toBeInTheDocument();
    expect(within(selectedCard).getByText("$1,450 · 5 days · Due Jun 8, 2026")).toBeInTheDocument();
    expect(screen.getByText("Not Selected")).toBeInTheDocument();
  });

  it("shows empty state when no bid requests exist", async () => {
    bidApiState.listOrderVendorBidRequests.mockResolvedValue([]);

    render(<BidRequestsPanel orderId="order-1" enabled />);

    expect(await screen.findByText("No bid requests")).toBeInTheDocument();
    expect(screen.getByText("No vendor bid outreach has been recorded for this order.")).toBeInTheDocument();
  });

  it("reloads bid requests when refresh token changes", async () => {
    bidApiState.listOrderVendorBidRequests
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(bidRequests);

    const { rerender } = render(<BidRequestsPanel orderId="order-1" enabled refreshToken={0} />);

    expect(await screen.findByText("No bid requests")).toBeInTheDocument();

    rerender(<BidRequestsPanel orderId="order-1" enabled refreshToken={1} />);

    await waitFor(() => {
      expect(bidApiState.listOrderVendorBidRequests).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByRole("heading", { name: "Bid request" })).toBeInTheDocument();
  });

  it("shows error state when bid requests fail to load", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    bidApiState.listOrderVendorBidRequests.mockRejectedValue(
      Object.assign(new Error("denied"), { code: "42501" }),
    );

    render(<BidRequestsPanel orderId="order-1" enabled />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Bid requests could not load.");
    expect(screen.getByText("Review permissions and order details, then try again.")).toBeInTheDocument();
    warnSpy.mockRestore();
  });

  it("renders no write or assignment actions", async () => {
    bidApiState.listOrderVendorBidRequests.mockResolvedValue(bidRequests);

    render(<BidRequestsPanel orderId="order-1" enabled />);

    expect(await screen.findByRole("heading", { name: "Bid request" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /request bids/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /record response/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /select/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /offer assignment/i })).toBeNull();
  });

  it("shows select bid for responded unselected responses with select access", async () => {
    bidApiState.listOrderVendorBidRequests.mockResolvedValue(bidRequests);

    render(<BidRequestsPanel orderId="order-1" enabled canSelectResponses />);

    expect(await screen.findByRole("heading", { name: "Bid request" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select bid for Franklin Commercial Valuation" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Select bid for Metro Valuation Group" })).toBeNull();
  });

  it("hides select bid without select access", async () => {
    bidApiState.listOrderVendorBidRequests.mockResolvedValue(bidRequests);

    render(<BidRequestsPanel orderId="order-1" enabled />);

    expect(await screen.findByRole("heading", { name: "Bid request" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /select bid/i })).toBeNull();
  });

  it("hides select bid for already selected, not selected, and closed responses", async () => {
    bidApiState.listOrderVendorBidRequests.mockResolvedValue([
      {
        ...bidRequests[0],
        status: "closed",
        recipients: [
          {
            ...bidRequests[0].recipients[0],
            status: "selected",
            response: {
              ...bidRequests[0].recipients[0].response,
              selected_at: "2026-06-02T18:00:00.000Z",
            },
          },
          {
            ...bidRequests[0].recipients[1],
            status: "not_selected",
            response: {
              response_id: "response-2",
              fee_amount: 1525,
              currency: "USD",
              proposed_due_at: "2026-06-09T10:30",
              turn_time_days: 6,
              comments: "Can deliver by Tuesday.",
              selected_at: null,
            },
          },
        ],
      },
    ]);

    render(<BidRequestsPanel orderId="order-1" enabled canSelectResponses />);

    expect(await screen.findByText("Selected response: Franklin Commercial Valuation")).toBeInTheDocument();
    expect(screen.getByText("Not Selected")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /select bid/i })).toBeNull();
  });

  it("shows record response only for eligible recipients when update access is enabled", async () => {
    bidApiState.listOrderVendorBidRequests.mockResolvedValue(bidRequests);

    render(<BidRequestsPanel orderId="order-1" enabled canRecordResponses />);

    expect(await screen.findByRole("heading", { name: "Bid request" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record response for Metro Valuation Group" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Record response for Franklin Commercial Valuation" })).toBeNull();
  });

  it("hides record response for selected and closed recipient states", async () => {
    bidApiState.listOrderVendorBidRequests.mockResolvedValue([
      {
        ...bidRequests[0],
        status: "closed",
        recipients: [
          {
            ...bidRequests[0].recipients[0],
            status: "selected",
            response: {
              ...bidRequests[0].recipients[0].response,
              selected_at: "2026-06-02T18:00:00.000Z",
            },
          },
          {
            ...bidRequests[0].recipients[1],
            status: "not_selected",
          },
        ],
      },
    ]);

    render(<BidRequestsPanel orderId="order-1" enabled canRecordResponses />);

    expect(await screen.findByRole("heading", { name: "Bid request" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /record response/i })).toBeNull();
  });

  it("records a response, closes the modal, and refreshes bid requests", async () => {
    bidApiState.listOrderVendorBidRequests
      .mockResolvedValueOnce(bidRequests)
      .mockResolvedValueOnce([
        {
          ...bidRequests[0],
          status: "closed",
          recipients: [
            bidRequests[0].recipients[0],
            {
              ...bidRequests[0].recipients[1],
              status: "responded",
              response: {
                response_id: "response-2",
                fee_amount: 1525,
                currency: "USD",
                proposed_due_at: "2026-06-09T10:30",
                turn_time_days: 6,
                comments: "Can deliver by Tuesday.",
              },
            },
          ],
        },
      ]);
    bidApiState.recordOrderVendorBidResponse.mockResolvedValue({ response_id: "response-2" });

    render(<BidRequestsPanel orderId="order-1" enabled canRecordResponses />);

    fireEvent.click(await screen.findByRole("button", { name: "Record response for Metro Valuation Group" }));
    expect(screen.getByRole("dialog", { name: "Record response" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Fee amount"), { target: { value: "1525" } });
    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "usd" } });
    fireEvent.change(screen.getByLabelText("Proposed due date"), { target: { value: "2026-06-09T10:30" } });
    fireEvent.change(screen.getByLabelText("Turn time days"), { target: { value: "6" } });
    fireEvent.change(screen.getByLabelText("Comments"), { target: { value: "Can deliver by Tuesday." } });
    fireEvent.click(screen.getByRole("button", { name: "Save response" }));

    await waitFor(() => {
      expect(bidApiState.recordOrderVendorBidResponse).toHaveBeenCalledWith("recipient-2", {
        fee_amount: 1525,
        currency: "USD",
        proposed_due_at: "2026-06-09T10:30",
        turn_time_days: 6,
        comments: "Can deliver by Tuesday.",
      });
    });

    await waitFor(() => {
      expect(bidApiState.listOrderVendorBidRequests).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole("dialog", { name: "Record response" })).toBeNull();
    });
    expect(bidApiState.selectOrderVendorBidResponse).not.toHaveBeenCalled();
    expect(assignmentApiState.offerOrderToVendor).not.toHaveBeenCalled();
  });

  it("preserves response input when recording fails", async () => {
    bidApiState.listOrderVendorBidRequests.mockResolvedValue(bidRequests);
    bidApiState.recordOrderVendorBidResponse.mockRejectedValue(
      Object.assign(new Error("denied"), { code: "42501" }),
    );

    render(<BidRequestsPanel orderId="order-1" enabled canRecordResponses />);

    fireEvent.click(await screen.findByRole("button", { name: "Record response for Metro Valuation Group" }));
    fireEvent.change(screen.getByLabelText("Fee amount"), { target: { value: "1525" } });
    fireEvent.change(screen.getByLabelText("Comments"), { target: { value: "Still checking capacity." } });
    fireEvent.click(screen.getByRole("button", { name: "Save response" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("You do not have permission to record bid responses.");
    expect(screen.getByLabelText("Fee amount")).toHaveValue(1525);
    expect(screen.getByLabelText("Comments")).toHaveValue("Still checking capacity.");
    expect(screen.getByRole("dialog", { name: "Record response" })).toBeInTheDocument();
    expect(assignmentApiState.offerOrderToVendor).not.toHaveBeenCalled();
  });

  it("selects a bid, closes the modal, and refreshes bid requests", async () => {
    bidApiState.listOrderVendorBidRequests
      .mockResolvedValueOnce(bidRequests)
      .mockResolvedValueOnce([
        {
          ...bidRequests[0],
          status: "closed",
          recipients: [
            {
              ...bidRequests[0].recipients[0],
              status: "selected",
              response: {
                ...bidRequests[0].recipients[0].response,
                selected_at: "2026-06-02T18:00:00.000Z",
              },
            },
            {
              ...bidRequests[0].recipients[1],
              status: "not_selected",
            },
          ],
        },
      ]);
    bidApiState.selectOrderVendorBidResponse.mockResolvedValue({
      response_id: "response-1",
      selected_at: "2026-06-02T18:00:00.000Z",
    });

    render(<BidRequestsPanel orderId="order-1" enabled canSelectResponses />);

    fireEvent.click(await screen.findByRole("button", { name: "Select bid for Franklin Commercial Valuation" }));
    const dialog = screen.getByRole("dialog", { name: "Select bid" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Selecting this bid does not create an assignment yet.")).toBeInTheDocument();
    expect(within(dialog).getByText("$1,450")).toBeInTheDocument();
    expect(within(dialog).getByText("Available next week.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm selection" }));

    await waitFor(() => {
      expect(bidApiState.selectOrderVendorBidResponse).toHaveBeenCalledWith("response-1");
    });

    await waitFor(() => {
      expect(bidApiState.listOrderVendorBidRequests).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole("dialog", { name: "Select bid" })).toBeNull();
    });
    expect(await screen.findByText("Selected response: Franklin Commercial Valuation")).toBeInTheDocument();
    expect(screen.getByText("Not Selected")).toBeInTheDocument();
    expect(bidApiState.recordOrderVendorBidResponse).not.toHaveBeenCalled();
    expect(assignmentApiState.offerOrderToVendor).not.toHaveBeenCalled();
  });

  it("preserves select confirmation state when selection fails", async () => {
    bidApiState.listOrderVendorBidRequests.mockResolvedValue(bidRequests);
    bidApiState.selectOrderVendorBidResponse.mockRejectedValue(
      Object.assign(new Error("denied"), { code: "42501" }),
    );

    render(<BidRequestsPanel orderId="order-1" enabled canSelectResponses />);

    fireEvent.click(await screen.findByRole("button", { name: "Select bid for Franklin Commercial Valuation" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm selection" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("You do not have permission to select bid responses.");
    const dialog = screen.getByRole("dialog", { name: "Select bid" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Franklin Commercial Valuation")).toBeInTheDocument();
    expect(within(dialog).getByText("Selecting this bid does not create an assignment yet.")).toBeInTheDocument();
    expect(assignmentApiState.offerOrderToVendor).not.toHaveBeenCalled();
  });
});
