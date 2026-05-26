// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import GoogleMapEmbed from "../GoogleMapEmbed";

describe("GoogleMapEmbed", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    cleanup();
  });

  it("renders an embedded map when the embed API key and address are present", () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_EMBED_API_KEY", "test-key");
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "");
    vi.stubEnv("VITE_GOOGLE_MAPS_KEY", "");

    render(<GoogleMapEmbed addressLine1="123 Main St" city="Atlanta" state="GA" zip="30301" />);

    const frame = screen.getByTitle("Property Location Map");
    expect(frame).toBeInTheDocument();
    expect(frame).toHaveAttribute(
      "src",
      expect.stringContaining("https://www.google.com/maps/embed/v1/place?"),
    );
    expect(frame).toHaveAttribute("src", expect.stringContaining("key=test-key"));
    expect(screen.getByRole("link", { name: "Open in Google Maps" })).toBeInTheDocument();
  });

  it("keeps the API key fallback when no embed API key is configured", () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_EMBED_API_KEY", "");
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "");
    vi.stubEnv("VITE_GOOGLE_MAPS_KEY", "");

    render(<GoogleMapEmbed addressLine1="123 Main St" city="Atlanta" state="GA" zip="30301" />);

    expect(screen.getByText("Google Maps embed requires an API key.")).toBeInTheDocument();
    expect(screen.queryByTitle("Property Location Map")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open in Google Maps" })).toBeInTheDocument();
  });

  it("shows an empty address state when no address is present", () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_EMBED_API_KEY", "test-key");
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "");
    vi.stubEnv("VITE_GOOGLE_MAPS_KEY", "");

    render(<GoogleMapEmbed />);

    expect(screen.getByText("No address available.")).toBeInTheDocument();
    expect(screen.queryByTitle("Property Location Map")).not.toBeInTheDocument();
  });
});
