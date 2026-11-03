import { describe, expect, it } from "vitest";
import {
  isValidTransition,
  canDragMove,
  WHITELIST,
} from "@/lib/kanban/transitions";

describe("transitions whitelist", () => {
  it("backlog can go to ready/in_progress/rejected", () => {
    expect(isValidTransition("backlog", "ready")).toBe(true);
    expect(isValidTransition("backlog", "in_progress")).toBe(true);
    expect(isValidTransition("backlog", "rejected")).toBe(true);
    expect(isValidTransition("backlog", "testing")).toBe(false);
    expect(isValidTransition("backlog", "done")).toBe(false);
  });

  it("testing can fork to done/in_progress/rejected", () => {
    expect(isValidTransition("testing", "done")).toBe(true);
    expect(isValidTransition("testing", "in_progress")).toBe(true);
    expect(isValidTransition("testing", "rejected")).toBe(true);
    expect(isValidTransition("testing", "ready")).toBe(false);
  });

  it("done and rejected are terminal — no destinations", () => {
    expect(WHITELIST.done).toEqual([]);
    expect(WHITELIST.rejected).toEqual([]);
    expect(canDragMove("done", "in_progress")).toBe(false);
    expect(canDragMove("rejected", "ready")).toBe(false);
  });

  it("canDragMove rejects same-status no-op", () => {
    expect(canDragMove("ready", "ready")).toBe(false);
  });

  it("canDragMove rejects archived involvement", () => {
    expect(canDragMove("archived", "ready")).toBe(false);
    expect(canDragMove("ready", "archived")).toBe(false);
  });
});
