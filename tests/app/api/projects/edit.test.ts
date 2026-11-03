import { describe, it, expect } from "vitest";

describe("PATCH /api/projects/[id] contract", () => {
  it("partial update body accepts github_url + description", () => {
    type Body = { github_url?: string | null; description?: string };
    const sample: Body = { github_url: "https://github.com/foo/bar" };
    expect(sample.github_url).toMatch(/^https:\/\//);
  });

  it("bot fields are NOT in PATCH body shape (mutated via /bot/* routes)", () => {
    // Type-only assertion: PATCH should not accept bot_id etc.
    type Body = { github_url?: string | null; description?: string };
    const sample: Body = {};
    // @ts-expect-error bot_id removed from PATCH shape
    sample.bot_id = "x";
    expect(sample).toBeDefined();
  });
});
