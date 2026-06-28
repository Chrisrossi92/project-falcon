// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CompanyIdentity from "../CompanyIdentity";

describe("CompanyIdentity", () => {
  it("renders a stable placeholder mark with company and workspace identity", () => {
    render(
      <CompanyIdentity
        companyName="Continental Valuation"
        workspaceName="Internal"
      />,
    );

    expect(screen.getByTestId("company-identity")).toBeInTheDocument();
    expect(screen.getByTestId("company-identity-name")).toHaveTextContent("Continental Valuation");
    expect(screen.getByTestId("workspace-identity-title")).toHaveTextContent("Internal");
    expect(screen.getByTestId("company-identity-mark")).toHaveTextContent("C");
  });

  it("contains uploaded logo artwork without cropping or stretching", () => {
    render(
      <CompanyIdentity
        companyName="Tall Logo Co"
        workspaceName="AMC"
        logoUrl="/logos/tall-logo.png"
      />,
    );

    const logo = screen.getByRole("img", { name: "Tall Logo Co logo" });

    expect(logo).toHaveAttribute("src", "/logos/tall-logo.png");
    expect(logo).toHaveClass("max-h-10", "max-w-10", "object-contain");
  });
});
