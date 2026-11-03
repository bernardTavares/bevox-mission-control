"use client";

import {
  CAPABILITY_KEYS,
  CAPABILITY_LABELS,
  type DoctorReport,
} from "@/lib/projects/doctor-types";
import ProjectRow from "./ProjectRow";

interface Props {
  report: DoctorReport;
}

export default function DriftMatrix({ report }: Props) {
  const slugs = Object.keys(report.projects).sort();

  if (slugs.length === 0) {
    return (
      <div className="rounded border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
        No projects found in <code>projects-meta.json</code>.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-20 bg-gray-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600"
            >
              Project
            </th>
            {CAPABILITY_KEYS.map((cap) => (
              <th
                key={cap}
                scope="col"
                className="px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-600"
                title={CAPABILITY_LABELS[cap] ?? cap}
              >
                <div className="flex flex-col items-center">
                  <span className="whitespace-nowrap">
                    {CAPABILITY_LABELS[cap] ?? cap}
                  </span>
                </div>
              </th>
            ))}
            <th
              scope="col"
              className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-600"
              title="Provenance: how the project entered the registry"
            >
              Source
            </th>
          </tr>
        </thead>
        <tbody>
          {slugs.map((slug) => (
            <ProjectRow
              key={slug}
              slug={slug}
              project={report.projects[slug]}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
