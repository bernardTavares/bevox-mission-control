import { describe, it, expect } from "vitest";
import { categorize } from "@/lib/roadmap/categorize";
import type { TrackerEpic } from "@/lib/roadmap/types";

const mkEpic = (id: string, waves: Array<[string, string]>): TrackerEpic => ({
  id,
  name: `${id} epic`,
  status: "partial",
  waves: waves.map(([wid, status]) => ({ id: wid, status })),
});

describe("categorize", () => {
  it("places in_progress waves in agora", () => {
    const epics = [mkEpic("E1", [["w1", "in_progress"]])];
    const r = categorize(epics);
    expect(r.agora.map((x) => x.wave.id)).toEqual(["w1"]);
    expect(r.proximo).toEqual([]);
    expect(r.depois).toEqual([]);
  });

  it("places partial waves in agora", () => {
    const epics = [mkEpic("E1", [["w1", "partial"]])];
    expect(categorize(epics).agora.map((x) => x.wave.id)).toEqual(["w1"]);
  });

  it("places not_started in proximo when epic has any delivered wave", () => {
    const epics = [mkEpic("E5", [["w1", "delivered"], ["F1", "not_started"]])];
    const r = categorize(epics);
    expect(r.proximo.map((x) => x.wave.id)).toEqual(["F1"]);
    expect(r.depois).toEqual([]);
  });

  it("places not_started in proximo when epic has partial wave", () => {
    const epics = [mkEpic("E5", [["w1", "partial"], ["F2", "not_started"]])];
    expect(categorize(epics).proximo.map((x) => x.wave.id)).toEqual(["F2"]);
  });

  it("places not_started in depois when epic has zero delivered/partial", () => {
    const epics = [mkEpic("E7", [["w1", "not_started"]])];
    const r = categorize(epics);
    expect(r.depois.map((x) => x.wave.id)).toEqual(["w1"]);
    expect(r.proximo).toEqual([]);
  });

  it("excludes delivered, parked, blocked from all buckets", () => {
    const epics = [
      mkEpic("E1", [
        ["w1", "delivered"],
        ["w2", "parked"],
        ["w3", "blocked"],
      ]),
    ];
    const r = categorize(epics);
    expect(r.agora).toEqual([]);
    expect(r.proximo).toEqual([]);
    expect(r.depois).toEqual([]);
  });

  it("returns empty buckets for empty epic list", () => {
    expect(categorize([])).toEqual({ agora: [], proximo: [], depois: [] });
  });

  it("unknown wave status falls into depois", () => {
    const epics = [mkEpic("E9", [["w1", "mystery-status"]])];
    expect(categorize(epics).depois).toEqual([]);
  });

  it("attaches parent epic to each wave entry", () => {
    const epics = [mkEpic("E1", [["w1", "in_progress"]])];
    const r = categorize(epics);
    expect(r.agora[0].epic.id).toBe("E1");
    expect(r.agora[0].wave.id).toBe("w1");
  });
});
