"use client";

/**
 * Shared card shell used by every Home widget.
 *
 * Keeps the styling consistent without inventing a whole card system.
 * The `size` prop controls internal padding and title weight so the
 * left-column "large" widgets feel bigger than the right-column
 * "compact" ones without duplicating the shell.
 */

import type { ReactNode } from "react";

export interface WidgetCardProps {
  title: string;
  size?: "large" | "compact";
  accessory?: ReactNode;
  children: ReactNode;
}

export function WidgetCard({
  title,
  size = "compact",
  accessory,
  children,
}: WidgetCardProps) {
  const padding = size === "large" ? "16px" : "12px";
  const titleSize = size === "large" ? "14px" : "11px";
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "8px",
        backgroundColor: "var(--surface)",
        padding,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: titleSize,
            fontWeight: size === "large" ? 700 : 600,
            color: "var(--text-secondary)",
            letterSpacing: "1px",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          {title}
        </h3>
        {accessory}
      </div>
      {children}
    </div>
  );
}
