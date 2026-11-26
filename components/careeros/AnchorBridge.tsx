"use client";

import { useState } from "react";
import { getIntakeSnippet, ingestCapturedTab } from "@/app/actions";
import type { JobUI, PomodoroUI, ToastTone } from "@/lib/types";
import { WORK_MODES } from "./constants";
import { copyText, formatClock, cn } from "./utils";

type AnchorBridgeProps = {
  showToast: (message: string, tone?: ToastTone) => void;
  onJobCreated: (job: JobUI) => void;
  onOpenVault: () => void;
  pomo: PomodoroUI;
  onTogglePomo: () => void;
  onResetPomo: () => void;
  onLogPomo: () => void;
  onCompletePomo: () => void;
};

const INITIAL_LOG = `{
  "endpoint": "POST /api/jobs/intake",
  "source": "anchor-tab-clipper",
  "locationPolicy": "open_to_remote_hybrid_onsite_remote_preferred",
  "status": "awaiting_dispatch"
}`;

const PRESETS = {
  "linkedin-tpm": {
    url: "https://www.linkedin.com/jobs/view/40918273/",
    title: "Technical Project Manager - AI Platform | LinkedIn",
    company: "Harborline Systems",
    mode: "Remote (Preferred)",
    salary: "$1,850/mo",
    innerText:
      "Harborline Systems is hiring a Technical Project Manager to coordinate Agile sprints, CI/CD release readiness, and TypeScript / PostgreSQL product milestones. Experience with AI agent tooling, MCP servers, or automated QA workflows is a major plus. Strong documentation and cross-functional leadership required.",
  },
  "hybrid-ops": {
    url: "https://jobs.ashbyhq.com/meridian-labs/product-ops",
    title: "Product Operations & Delivery Lead - Meridian Labs",
    company: "Meridian Labs",
    mode: "Hybrid",
    salary: "$1,700/mo",
    innerText:
      "Meridian Labs seeks a Product Operations & Delivery Lead to own Linear roadmaps, sprint velocity metrics, QA automation sign-offs, and cross-functional launch docs across Next.js and PostgreSQL services.",
  },
  "onsite-systems": {
    url: "https://careers.cinderworks.io/roles/technical-delivery-lead",
    title: "Technical Delivery & Systems Coordinator | CinderWorks",
    company: "CinderWorks",
    mode: "On-Site",
    salary: "$1,500/mo",
    innerText:
      "Coordinate technical engineering milestones, data validation pipelines, Python / TypeScript release checklists, and stakeholder status reporting with strong documentation standards.",
  },
};

const POMO_TOTAL = 25 * 60;

export default function AnchorBridge({
  showToast,
  onJobCreated,
  onOpenVault,
  pomo,
  onTogglePomo,
  onResetPomo,
  onLogPomo,
  onCompletePomo,
}: AnchorBridgeProps) {
  const [tabUrl, setTabUrl] = useState(PRESETS["linkedin-tpm"].url);
  const [pageTitle, setPageTitle] = useState(PRESETS["linkedin-tpm"].title);
  const [company, setCompany] = useState(PRESETS["linkedin-tpm"].company);
  const [mode, setMode] = useState(PRESETS["linkedin-tpm"].mode);
  const [salary, setSalary] = useState(PRESETS["linkedin-tpm"].salary);
  const [innerText, setInnerText] = useState(PRESETS["linkedin-tpm"].innerText);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("READY");
  const [log, setLog] = useState(INITIAL_LOG);

  function loadPreset(key: keyof typeof PRESETS) {
    const preset = PRESETS[key];
    setTabUrl(preset.url);
    setPageTitle(preset.title);
    setCompany(preset.company);
    setMode(preset.mode);
    setSalary(preset.salary);
    setInnerText(preset.innerText);
    showToast("Loaded simulated Anchor Tab capture payload.");
  }

  async function copyAnchorSnippet() {
    const res = await getIntakeSnippet("anchor");
    if (!res.ok) {
      showToast(res.error, "amber");
      return;
    }
    const copied = await copyText(res.data);
    showToast(
      copied
        ? "Copied Anchor Tab → /api/jobs/intake action snippet!"
        : "Could not access the clipboard.",
      copied ? "indigo" : "amber",
    );
  }

  async function send() {
    if (!innerText.trim()) {
      showToast("Captured document.body.innerText cannot be empty.", "amber");
      return;
    }

    setBusy(true);
    const res = await ingestCapturedTab({
      url: tabUrl,
      pageTitle,
      innerText,
      company,
      workMode: mode,
      salary,
    });
    setBusy(false);

    if (!res.ok) {
      setStatus("400 ERROR");
      setLog(
        JSON.stringify(
          {
            endpoint: "POST /api/jobs/intake",
            source: "anchor-tab-1click-clipper",
            error: res.error,
          },
          null,
          2,
        ),
      );
      showToast(res.error, "amber");
      return;
    }

    const job = res.data;
    setStatus("201 CREATED");
    setLog(
      JSON.stringify(
        {
          endpoint: "POST /api/jobs/intake",
          source: "anchor-tab-1click-clipper",
          received: {
            url: tabUrl,
            pageTitle,
            innerTextLength: innerText.length,
            workMode: mode,
          },
          createdJob: {
            id: job.id,
            role: job.role,
            company: job.company,
            workMode: job.workMode,
            fitScore: job.fitScore,
            matchedSkills: job.matchedSkills,
          },
        },
        null,
        2,
      ),
    );
    onJobCreated(job);
    showToast(
      `Anchor Tab → /api/jobs/intake saved Job #${job.id} (${job.company}, Fit ${job.fitScore ?? "—"}/10)!`,
    );
  }

  const progress = Math.max(0, Math.min(100, (pomo.seconds / POMO_TOTAL) * 100));

  return (
    <section className="space-y-6">
      <div className="bg-surface border border-borderSubtle rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <i className="ph-bold ph-anchor" /> THE BEST-OF-BOTH-WORLDS BRIDGE
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-white">
            Anchor Tab 1-Click Job Clipper & 25-Min Pomodoro Focus Sprint
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl">
            Capture any active browser tab (<code className="font-mono text-indigo-300">url</code>,{" "}
            <code className="font-mono text-indigo-300">title</code>, and full{" "}
            <code className="font-mono text-indigo-300">document.body.innerText</code>) via Anchor
            Tab&apos;s custom field/bookmark action into{" "}
            <code className="font-mono text-emerald-300">POST /api/jobs/intake</code>—zero scraper
            blocks, open to Remote (Preferred), Hybrid, and On-Site roles.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1.5 rounded-xl bg-canvas border border-borderSubtle text-xs font-mono text-zinc-300">
            Endpoint: <span className="text-emerald-400">POST /api/jobs/intake</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-surface border border-borderSubtle rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borderSubtle pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
                <i className="ph-bold ph-browser text-indigo-400" />
                1-Click Anchor Tab Clipper →{" "}
                <span className="font-mono text-xs text-emerald-400">/api/jobs/intake</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Select a simulated logged-in tab or paste custom tab fields, then fire the intake
                POST.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => loadPreset("linkedin-tpm")}
                className="px-2.5 py-1 rounded-lg bg-elevated hover:bg-zinc-800 border border-borderSubtle text-[11px] text-zinc-200 transition-colors"
              >
                Tab 1: LinkedIn TPM
              </button>
              <button
                type="button"
                onClick={() => loadPreset("hybrid-ops")}
                className="px-2.5 py-1 rounded-lg bg-elevated hover:bg-zinc-800 border border-borderSubtle text-[11px] text-zinc-200 transition-colors"
              >
                Tab 2: Hybrid Product Ops
              </button>
              <button
                type="button"
                onClick={() => loadPreset("onsite-systems")}
                className="px-2.5 py-1 rounded-lg bg-elevated hover:bg-zinc-800 border border-borderSubtle text-[11px] text-zinc-200 transition-colors"
              >
                Tab 3: On-Site Delivery Lead
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                  Active Tab URL
                </label>
                <input
                  value={tabUrl}
                  onChange={(event) => setTabUrl(event.target.value)}
                  className="w-full bg-canvas border border-borderSubtle focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                  Document Title
                </label>
                <input
                  value={pageTitle}
                  onChange={(event) => setPageTitle(event.target.value)}
                  className="w-full bg-canvas border border-borderSubtle focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                  Company Name
                </label>
                <input
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  className="w-full bg-canvas border border-borderSubtle focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                  Work Mode (No Restriction)
                </label>
                <select
                  value={mode}
                  onChange={(event) => setMode(event.target.value)}
                  className="w-full bg-canvas border border-borderSubtle focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none"
                >
                  {WORK_MODES.map((workMode) => (
                    <option key={workMode} value={workMode} className="bg-zinc-900">
                      {workMode}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                  Target Comp
                </label>
                <input
                  value={salary}
                  onChange={(event) => setSalary(event.target.value)}
                  className="w-full bg-canvas border border-borderSubtle focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                Captured document.body.innerText (Full JD)
              </label>
              <textarea
                value={innerText}
                onChange={(event) => setInnerText(event.target.value)}
                rows={4}
                className="w-full bg-canvas border border-borderSubtle focus:border-indigo-500 rounded-xl p-3 text-xs text-zinc-200 leading-relaxed outline-none resize-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={copyAnchorSnippet}
                className="px-3 py-2 rounded-xl bg-elevated hover:bg-zinc-800 border border-borderSubtle text-xs text-zinc-200 flex items-center gap-1.5 transition-colors"
              >
                <i className="ph ph-code text-indigo-400" />
                Copy Anchor Tab Action Snippet
              </button>

              <button
                type="button"
                onClick={send}
                disabled={busy}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-medium shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
              >
                <i className={busy ? "ph ph-circle-notch animate-spin" : "ph-bold ph-paper-plane-right"} />
                {busy ? "Sending…" : "Send to Job Hunt (POST /api/jobs/intake)"}
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-borderSubtle">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-1.5">
              <span>Last POST /api/jobs/intake Payload & Response</span>
              <span
                className={cn(
                  "font-mono",
                  status === "201 CREATED"
                    ? "text-emerald-400"
                    : status === "400 ERROR"
                      ? "text-rose-400"
                      : "text-emerald-400",
                )}
              >
                {status}
              </span>
            </div>
            <pre className="bg-canvas border border-borderSubtle rounded-xl p-3 text-[11px] font-mono text-emerald-300/90 overflow-x-auto max-h-40 leading-relaxed">
              {log}
            </pre>
          </div>
        </div>

        <div className="lg:col-span-5 bg-surface border border-borderSubtle rounded-2xl p-5 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
                  <i className="ph-bold ph-timer text-amber-400" />
                  25-Min Pomodoro Job-Hunt Sprint
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Knock out 2–3 tailored applications per block, then wrap cleanly when the bell
                  rings.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 whitespace-nowrap">
                Sprint #{pomo.sessions}
              </span>
            </div>

            <div className="bg-canvas border border-borderSubtle rounded-2xl p-6 text-center space-y-3">
              <div className="text-xs font-mono uppercase tracking-wider text-emerald-400">
                Focus Block • Target: 2–3 Tailored Kits
              </div>
              <div className="text-5xl font-bold font-mono tracking-tight text-white">
                {formatClock(pomo.seconds)}
              </div>
              <div className="w-full bg-zinc-800/80 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onTogglePomo}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                >
                  <i className={pomo.running ? "ph-bold ph-pause" : "ph-bold ph-play"} />
                  <span>
                    {pomo.running
                      ? "Pause Sprint"
                      : pomo.seconds < POMO_TOTAL
                        ? "Resume Sprint"
                        : "Start 25m Sprint"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onResetPomo}
                  className="px-3 py-2 rounded-xl bg-elevated hover:bg-zinc-800 border border-borderSubtle text-xs text-zinc-300 transition-colors flex items-center gap-1"
                >
                  <i className="ph ph-arrow-counter-clockwise" />
                  Reset
                </button>
              </div>
            </div>

            <div className="bg-canvas border border-borderSubtle rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-200">
                  Tailored Applications in This Sprint
                </span>
                <span className="text-xs font-mono font-semibold text-emerald-400">
                  {pomo.kits} / 3 Target
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onLogPomo}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  <i className="ph-bold ph-check-circle" />
                  +1 Tailored Application Completed
                </button>
                <button
                  type="button"
                  onClick={onOpenVault}
                  className="py-2 px-3 rounded-xl bg-elevated hover:bg-zinc-800 border border-borderSubtle text-xs text-zinc-300 transition-colors"
                >
                  Pick Job
                </button>
              </div>
            </div>

            {pomo.complete && (
              <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 space-y-1">
                <div className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                  <i className="ph-bold ph-confetti text-base" />
                  25-Minute Sprint Complete!
                </div>
                <p className="text-xs text-emerald-100/90">{pomo.summary}</p>
              </div>
            )}
          </div>

          <div className="text-[11px] text-zinc-400 border-t border-borderSubtle pt-3 flex items-center justify-between gap-2">
            <span>Rule: Close Job Hunt tab when timer ends</span>
            <button
              type="button"
              onClick={onCompletePomo}
              className="text-indigo-400 hover:underline font-mono whitespace-nowrap"
            >
              Simulate Bell
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
