"use client";

/**
 * Bevox Mission Control — top navigation bar.
 *
 * Replaces the upstream `TopBar.tsx` in the (dashboard) layout. Keeps the
 * same fixed positioning / height / dock-offset as upstream so the rest of
 * the shell (Dock, StatusBar, main padding) stays intact.
 *
 * Layout (left → right):
 *   [emoji] [App Title]   Home · Knowledge · Approvals ‖ Health · Cost · Activity   [NotificationDropdown]
 *
 * Nucleo (left of ‖) is bold + full opacity. Suporte (right of ‖) is regular
 * weight at 75% opacity. The ‖ divider is a dimmed typographic mark, not a
 * border (kept simple on purpose — Bernard explicitly asked to avoid a
 * broad layout redesign).
 *
 * The active route gets a subtle accent-colored background pill. Matching
 * uses strict equality for `/` and prefix-match for everything else, so
 * sub-routes under a module (e.g. /knowledge/foo) keep the parent
 * highlighted.
 *
 * Dropped from upstream TopBar: the 240px Cmd+K search button, the
 * hardcoded "Carlos" user avatar. Both were upstream convenience/dev
 * leftovers and are not shell. NotificationDropdown is reused verbatim.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRANDING } from "@/config/branding";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { NAV_ITEMS, type NavItem } from "./nav-config";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLink({
  item,
  pathname,
  strong,
}: {
  item: NavItem;
  pathname: string;
  strong: boolean;
}) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      key={item.href}
      href={item.href}
      aria-current={active ? "page" : undefined}
      style={{
        fontFamily: "var(--font-body)",
        fontSize: "13px",
        fontWeight: strong ? 600 : 400,
        opacity: strong ? 1 : 0.75,
        color: active ? "var(--accent)" : "var(--text-primary)",
        backgroundColor: active ? "var(--accent-soft)" : "transparent",
        padding: "4px 10px",
        borderRadius: "6px",
        textDecoration: "none",
        transition: "background-color 120ms ease",
      }}
    >
      {item.label}
    </Link>
  );
}

export function TopNavGrouped() {
  const pathname = usePathname();
  const nucleo = NAV_ITEMS.filter((i) => i.group === "nucleo");
  const suporte = NAV_ITEMS.filter((i) => i.group === "suporte");

  return (
    <div
      className="top-bar top-nav-grouped"
      style={{
        position: "fixed",
        top: 0,
        left: "68px", // width of Dock
        right: 0,
        height: "48px",
        backgroundColor: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        zIndex: 45,
      }}
    >
      {/* Left: Logo & Title */}
      <div className="flex items-center gap-3">
        <span style={{ fontSize: "20px" }} aria-hidden>
          {BRANDING.agentEmoji}
        </span>
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "16px",
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.5px",
            whiteSpace: "nowrap",
          }}
        >
          {BRANDING.appTitle}
        </h1>
      </div>

      {/* Center: 6-item grouped nav */}
      <nav
        aria-label="Mission Control modules"
        className="flex items-center gap-1"
        style={{ flex: 1, justifyContent: "center" }}
      >
        {nucleo.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} strong />
        ))}
        <span
          aria-hidden
          style={{
            margin: "0 10px",
            fontSize: "16px",
            color: "var(--text-muted)",
            opacity: 0.5,
            userSelect: "none",
          }}
        >
          ‖
        </span>
        {suporte.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            strong={false}
          />
        ))}
      </nav>

      {/* Right: Notifications (reused verbatim from upstream) */}
      <div className="flex items-center gap-3">
        <NotificationDropdown />
      </div>
    </div>
  );
}
