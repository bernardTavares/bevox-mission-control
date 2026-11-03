"use client";

import { useState } from "react";
import {
  CAPABILITY_KEYS,
  type ProjectDoctor,
} from "@/lib/projects/doctor-types";
import CapabilityCell from "./CapabilityCell";

interface Props {
  slug: string;
  project: ProjectDoctor;
}

export default function ProjectRow({ slug, project }: Props) {
  const [open, setOpen] = useState(false);
  const driftCount = project.drifts.length;

  return (
    <>
      <tr className="border-t border-gray-200 hover:bg-gray-50">
        <th
          scope="row"
          className="sticky left-0 z-10 bg-white px-3 py-2 text-left text-sm font-medium text-gray-900 group-hover:bg-gray-50"
        >
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 text-left hover:underline"
            aria-expanded={open}
          >
            <span className="text-xs text-gray-400">{open ? "▾" : "▸"}</span>
            <span>{slug}</span>
            {driftCount > 0 ? (
              <span
                className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700"
                title={`${driftCount} drift(s): ${project.drifts.join(", ")}`}
              >
                {driftCount} drift{driftCount > 1 ? "s" : ""}
              </span>
            ) : null}
          </button>
        </th>
        {CAPABILITY_KEYS.map((cap) => (
          <CapabilityCell
            key={cap}
            capability={cap}
            cell={project.capabilities[cap]}
          />
        ))}
        <td className="px-2 py-2 text-center text-xs text-gray-500">
          {project.source ?? "—"}
        </td>
      </tr>
      {open ? (
        <tr className="border-t border-gray-100 bg-gray-50">
          <td colSpan={CAPABILITY_KEYS.length + 2} className="px-4 py-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {CAPABILITY_KEYS.map((cap) => {
                const cell = project.capabilities[cap];
                if (!cell) return null;
                return (
                  <div
                    key={cap}
                    className={`rounded border px-2 py-1.5 text-xs ${
                      cell.drift
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="font-medium text-gray-900">{cap}</div>
                    <div className="text-gray-600">
                      declared=<code>{cell.declared}</code> · detected=
                      <code>{cell.detected}</code>
                      {cell.drift ? (
                        <span className="ml-2 font-semibold text-red-700">
                          DRIFT
                        </span>
                      ) : null}
                    </div>
                    {cell.drift_reason ? (
                      <div className="mt-1 italic text-gray-500">
                        {cell.drift_reason}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
