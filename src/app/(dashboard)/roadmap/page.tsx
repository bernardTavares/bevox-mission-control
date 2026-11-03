"use client";

import { useEffect, useState } from "react";

import type {
  DepsMap,
  DepsResponse,
  TrackerResponse,
} from "@/lib/roadmap/types";
import { categorize } from "@/lib/roadmap/categorize";
import RoadmapHeader from "./RoadmapHeader";
import StrategicView from "./StrategicView";
import TechnicalView from "./TechnicalView";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; tracker: TrackerResponse; deps: DepsMap };

export default function RoadmapPage() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [trackerRes, depsRes] = await Promise.all([
          fetch("/api/delivery/tracker", { cache: "no-store" }),
          fetch("/api/roadmap/deps", { cache: "no-store" }),
        ]);

        if (!trackerRes.ok) {
          const err = await trackerRes.json().catch(() => ({}));
          if (!cancelled)
            setState({
              kind: "error",
              message: `tracker: ${trackerRes.status} ${err.error ?? "unknown"}`,
            });
          return;
        }
        const tracker: TrackerResponse = await trackerRes.json();

        // Deps is optional: degrade gracefully on 404/500/503.
        let deps: DepsMap = {};
        if (depsRes.ok) {
          const depsBody: DepsResponse = await depsRes.json();
          deps = depsBody.deps;
        }

        if (!cancelled) setState({ kind: "ready", tracker, deps });
      } catch (err) {
        if (!cancelled) setState({ kind: "error", message: String(err) });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "loading") {
    return <div className="p-6 text-sm text-gray-500">Carregando roadmap…</div>;
  }

  if (state.kind === "error") {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-red-700">Erro ao carregar roadmap</h1>
        <pre className="mt-2 text-xs bg-red-50 p-2 rounded">{state.message}</pre>
      </div>
    );
  }

  const categorized = categorize(state.tracker.epics);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <RoadmapHeader
        summary={state.tracker.summary}
        generatedAt={state.tracker.generated_at}
      />

      <section className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Visão estratégica
        </h2>
        <StrategicView categorized={categorized} allBlockers={state.tracker.blockers} />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Visão técnica
        </h2>
        <TechnicalView
          epics={state.tracker.epics}
          deps={state.deps}
          allBlockers={state.tracker.blockers}
        />
      </section>
    </div>
  );
}
