"use client";

import type { ReactNode } from "react";
import type { ProfileUI, ViewName } from "@/lib/types";
import { cn, formatClock } from "./utils";

type HeaderProps = {
  view: ViewName;
  onView: (view: ViewName) => void;
  jobsCount: number;
  profile: ProfileUI;
  pomoSeconds: number;
  pomoRunning: boolean;
};

export default function Header({
  view,
  onView,
  jobsCount,
  profile,
  pomoSeconds,
  pomoRunning,
}: HeaderProps) {
  const tabs: Array<{ id: ViewName; label: string; icon: string; extra?: ReactNode }> = [
    {
      id: "vault",
      label: "Job Vault",
      icon: "ph ph-briefcase text-base",
      extra: (
        <span className="ml-1 px-1.5 py-0.2 rounded-md text-[11px] font-mono bg-zinc-800 text-zinc-300">
          {jobsCount}
        </span>
      ),
    },
    {
      id: "bridge",
      label: "Anchor Bridge",
      icon: "ph ph-anchor text-base text-emerald-400",
      extra: (
        <span
          className={cn(
            "ml-1 px-1.5 py-0.2 rounded-md text-[11px] font-mono border",
            pomoRunning
              ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/40"
              : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
          )}
        >
          {formatClock(pomoSeconds)}
        </span>
      ),
    },
    { id: "studio", label: "Kit Studio", icon: "ph ph-magic-wand text-base" },
    { id: "brain", label: "Master Brain", icon: "ph ph-brain text-base" },
    { id: "mcp", label: "/api/mcp", icon: "ph ph-plugs-connected text-base" },
  ];

  const name = profile.name?.trim() || "Set up profile";
  const headline = profile.headline?.trim();

  return (
    <header className="glass-header sticky top-0 z-30 border-b border-borderSubtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-indigo-400/30">
            <i className="ph-bold ph-command text-white text-base" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold tracking-tight text-sm sm:text-base text-white">
              CareerOS
            </span>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono bg-elevated text-zinc-400 border border-borderSubtle max-w-[240px] truncate">
              {name}
              {headline ? ` // ${headline}` : ""}
            </span>
          </div>
        </div>

        <nav
          className="flex items-center bg-surface p-1 rounded-xl border border-borderSubtle overflow-x-auto max-w-full"
          aria-label="Main Navigation"
        >
          {tabs.map((tab) => {
            const active = view === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onView(tab.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap",
                  active
                    ? "bg-elevated text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200",
                )}
              >
                <i className={tab.icon} />
                <span>{tab.label}</span>
                {tab.extra}
              </button>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface border border-borderSubtle text-xs text-zinc-400">
            <span className="relative flex h-2 w-2 mcp-dot">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-mono text-[11px]">Neon + MCP Ready</span>
          </div>
          <div className="text-xs font-mono text-zinc-400 bg-elevated px-2.5 py-1 rounded-lg border border-borderSubtle whitespace-nowrap">
            Target:{" "}
            <span className="text-emerald-400 font-semibold">
              {profile.targetCompensation?.trim() || "Set target"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
