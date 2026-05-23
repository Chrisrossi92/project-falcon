import { describe, expect, it } from "vitest";
import { FALCON_TOAST_OPTIONS } from "../FalconToaster";

describe("FALCON_TOAST_OPTIONS", () => {
  it("defines restrained toast presentation without overriding timing", () => {
    expect(FALCON_TOAST_OPTIONS.className).toContain("motion-reduce:animate-none");
    expect(FALCON_TOAST_OPTIONS.style.borderRadius).toBe("0.75rem");
    expect(FALCON_TOAST_OPTIONS.style.boxShadow).toContain("rgba(15, 23, 42");
    expect(FALCON_TOAST_OPTIONS.duration).toBeUndefined();
    expect(FALCON_TOAST_OPTIONS.success.iconTheme.primary).toBe("rgb(5 150 105)");
    expect(FALCON_TOAST_OPTIONS.error.iconTheme.primary).toBe("rgb(225 29 72)");
  });
});
