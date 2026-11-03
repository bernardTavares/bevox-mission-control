"use client";

import { Dock, StatusBar } from "@/components/TenacitOS";
import { TopNavGrouped } from "@/components/bevox/TopNavGrouped";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="tenacios-shell" style={{ minHeight: "100vh" }}>
      <Dock />
      <TopNavGrouped />

      <main
        style={{
          marginLeft: "68px", // Width of dock
          marginTop: "48px", // Height of top bar
          marginBottom: "32px", // Height of status bar
          minHeight: "calc(100vh - 48px - 32px)",
          padding: "24px",
        }}
      >
        {children}
      </main>

      <StatusBar />
    </div>
  );
}
