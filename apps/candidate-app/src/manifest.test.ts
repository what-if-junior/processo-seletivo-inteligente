import { describe, expect, it } from "vitest";
import manifest from "../app/manifest";

describe("web app manifest", () => {
  it("exposes installable PWA fields", () => {
    const m = manifest();
    expect(m.name).toContain("PSI");
    expect(m.display).toBe("standalone");
    expect(m.theme_color).toBe("#2A7B3E");
    expect(m.start_url).toBe("/");
    expect(m.icons?.length).toBeGreaterThanOrEqual(2);
  });
});
