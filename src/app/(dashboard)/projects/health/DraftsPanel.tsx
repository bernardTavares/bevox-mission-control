"use client";

import type { DoctorDraft } from "@/lib/projects/doctor-types";

interface Props {
  drafts: DoctorDraft[];
}

export default function DraftsPanel({ drafts }: Props) {
  if (drafts.length === 0) {
    return (
      <section className="rounded border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">
          Pending knowledge drafts
        </h2>
        <p className="mt-1 text-xs text-green-700">
          No pending drafts in <code>bevox-knowledge</code>.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded border border-gray-200 bg-white p-4">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-gray-900">
          Pending knowledge drafts
        </h2>
        <span className="text-xs text-gray-500">
          {drafts.length} draft{drafts.length > 1 ? "s" : ""}
        </span>
      </header>
      <ul className="space-y-1.5">
        {drafts.map((d) => {
          const ageLabel =
            d.age_days != null
              ? `${d.age_days}d old`
              : null;
          return (
            <li
              key={d.branch}
              className="flex flex-wrap items-baseline gap-2 rounded border border-gray-100 px-3 py-1.5 text-xs"
            >
              <span className="font-mono font-medium text-gray-900">
                {d.branch}
              </span>
              {d.slug ? (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                  {d.slug}
                </span>
              ) : null}
              {ageLabel ? (
                <span className="text-gray-500">{ageLabel}</span>
              ) : null}
              {d.pr_url ? (
                <a
                  href={d.pr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  open PR ↗
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
