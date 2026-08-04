import { describe, expect, it } from "vitest";
import {
  LGPD_EXCLUSAO_EMAIL,
  LGPD_FALLBACK_TEXT,
  resolveLgpdText,
} from "./hub-api";

describe("resolveLgpdText", () => {
  it("uses admin text when present", () => {
    expect(resolveLgpdText("  Texto admin  ")).toBe("Texto admin");
  });

  it("falls back when null or blank", () => {
    expect(resolveLgpdText(null)).toBe(LGPD_FALLBACK_TEXT);
    expect(resolveLgpdText("   ")).toBe(LGPD_FALLBACK_TEXT);
    expect(LGPD_FALLBACK_TEXT).toContain(LGPD_EXCLUSAO_EMAIL);
    expect(LGPD_FALLBACK_TEXT).toContain("13.709");
  });
});
