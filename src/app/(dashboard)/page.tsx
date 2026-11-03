/**
 * Bevox Mission Control — Home dashboard.
 *
 * 2-column asymmetric layout (spec §4.2): wide left column for the two
 * "nucleo" widgets (Knowledge sync status + Approvals pendentes) and a
 * narrower right column for the four "suporte" widgets (Health, Last
 * commit, Cost today, Critical events).
 *
 * On narrow screens the right column drops below the left — single
 * vertical stack, order preserved.
 *
 * Every widget is self-fetching from the /api/bevox/* routes (Task 9);
 * no data fetching happens here, only layout. The page is a server
 * component that mounts client widgets.
 */

import { KnowledgeStatusWidget } from "@/components/bevox/widgets/KnowledgeStatusWidget";
import { ApprovalsPendingWidget } from "@/components/bevox/widgets/ApprovalsPendingWidget";
import { HealthOverallWidget } from "@/components/bevox/widgets/HealthOverallWidget";
import { LastCommitWidget } from "@/components/bevox/widgets/LastCommitWidget";
import { CostTodayWidget } from "@/components/bevox/widgets/CostTodayWidget";
import { CriticalEventsWidget } from "@/components/bevox/widgets/CriticalEventsWidget";
import { BRANDING } from "@/config/branding";

export default function HomePage() {
  return (
    <div
      data-mc-home
      style={{
        maxWidth: "1400px",
        marginInline: "auto",
      }}
    >
      <header style={{ marginBottom: "20px" }}>
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "22px",
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.5px",
            margin: 0,
          }}
        >
          {BRANDING.agentEmoji} {BRANDING.agentName}
        </h1>
        <p
          style={{
            marginTop: "4px",
            marginBottom: 0,
            fontSize: "13px",
            color: "var(--text-muted)",
          }}
        >
          {BRANDING.agentDescription ||
            "Bevox Company OS — operational overview"}
        </p>
      </header>

      <div className="mc-home-grid">
        <div className="mc-home-col mc-home-col-nucleo">
          <KnowledgeStatusWidget />
          <ApprovalsPendingWidget />
        </div>
        <div className="mc-home-col mc-home-col-suporte">
          <HealthOverallWidget />
          <LastCommitWidget />
          <CostTodayWidget />
          <CriticalEventsWidget />
        </div>
      </div>

      <style>
        {`
          .mc-home-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
          }
          @media (min-width: 1024px) {
            .mc-home-grid {
              grid-template-columns: 2fr 1fr;
              align-items: start;
            }
          }
          .mc-home-col {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .mc-home-col-suporte {
            gap: 12px;
          }
        `}
      </style>
    </div>
  );
}
