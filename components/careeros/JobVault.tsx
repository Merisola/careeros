"use client";

import { useMemo, useState } from "react";
import { fetchJobFromUrl, getIntakeSnippet, ingestJob } from "@/app/actions";
import type { JobUI, ProfileUI, ToastTone } from "@/lib/types";
import { PIPELINE_FILTERS, SAMPLE_JD, STATUS_STYLES, WORK_MODES } from "./constants";
import { copyText, cn } from "./utils";

type JobVaultProps = {
  jobs: JobUI[];
  profile: ProfileUI;
  showToast: (message: string, tone?: ToastTone) => void;
  onOpenJob: (id: number) => void;
  onJobCreated: (job: JobUI) => void;
  onViewBridge: () => void;
};

export default function JobVault({
  jobs,
  profile,
  showToast,
  onOpenJob,
  onJobCreated,
  onViewBridge,
}: JobVaultProps) {
  const defaultMode = (WORK_MODES as readonly string[]).includes(profile.workModePreference)
    ? profile.workModePreference
    : WORK_MODES[0];

  const [tier, setTier] = useState<1 | 2>(1);
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [mode, setMode] = useState(defaultMode);
  const [salary, setSalary] = useState("");
  const [jdText, setJdText] = useState("");
  const [url, setUrl] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const stats = useMemo(() => {
    const fits = jobs.map((job) => job.fitScore).filter((n): n is number => n !== null);
    const avgFit = fits.length
      ? (fits.reduce((sum, n) => sum + n, 0) / fits.length).toFixed(1)
      : "—";
    const pending = jobs.filter(
      (job) =>
        job.daysSinceApplied >= 5 && (job.status === "Applied" || job.status === "Follow-up"),
    ).length;
    const interviews = jobs.filter((job) => job.status === "Interview");
    return { avgFit, pending, interviews: interviews.length, interviewJob: interviews[0] };
  }, [jobs]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return jobs.filter((job) => {
      const dueFollowUp =
        job.daysSinceApplied >= 5 &&
        (job.status === "Applied" || job.status === "Follow-up");
      const matchesStage =
        filter === "ALL" ||
        (filter === "Follow-up" ? dueFollowUp : job.status === filter);
      const matchesSearch =
        !query ||
        job.role.toLowerCase().includes(query) ||
        job.company.toLowerCase().includes(query) ||
        job.workMode.toLowerCase().includes(query) ||
        job.matchedSkills.some((skill) => skill.toLowerCase().includes(query));
      return matchesStage && matchesSearch;
    });
  }, [jobs, filter, search]);

  function loadSample() {
    setTier(1);
    setRole(SAMPLE_JD.role);
    setCompany(SAMPLE_JD.company);
    setMode(SAMPLE_JD.workMode);
    setSalary(SAMPLE_JD.salary);
    setJdText(SAMPLE_JD.jdText);
    showToast("Sample high-fit JD loaded. Click 'Ingest & Score Fit'!");
  }

  async function copyBookmarklet() {
    const res = await getIntakeSnippet("bookmarklet");
    if (!res.ok) {
      showToast(res.error, "amber");
      return;
    }
    const copied = await copyText(res.data);
    showToast(
      copied
        ? "Bookmarklet copied! Paste it as a new browser bookmark URL."
        : "Could not access the clipboard.",
      copied ? "indigo" : "amber",
    );
  }

  async function submit() {
    if (!jdText.trim()) {
      showToast("Paste a Job Description (or click Load Sample JD) first.", "amber");
      return;
    }
    setIngesting(true);
    const res = await ingestJob({
      role,
      company,
      workMode: mode,
      salary,
      jdText,
    });
    setIngesting(false);

    if (!res.ok) {
      showToast(res.error, "amber");
      return;
    }

    onJobCreated(res.data);
    setRole("");
    setCompany("");
    setSalary("");
    setJdText("");
    setFallback(false);
    showToast(
      `Ingested "${res.data.role}" @ ${res.data.company} — Fit ${res.data.fitScore ?? "—"}/10!`,
    );
  }

  async function fetchUrl() {
    if (!url.trim()) {
      showToast("Enter a job URL or pick a preset first.", "amber");
      return;
    }
    setFetching(true);
    const res = await fetchJobFromUrl(url);
    setFetching(false);

    if (res.ok) {
      setJdText(res.data.jdText);
      setUrl(res.data.url);
      setTier(1);
      setFallback(false);
      showToast("Fetched via the reader API. Review the JD, add role/company, then ingest.");
      return;
    }

    setFallback(res.authwall);
    setTier(1);
    showToast(res.error, "amber");
  }

  const tier1Class =
    "px-3 py-1.5 rounded-lg text-xs font-medium bg-elevated text-white border border-borderHover shadow-sm transition-all flex items-center gap-1.5";
  const tier2Class =
    "px-3 py-1.5 rounded-lg text-xs font-medium bg-elevated text-white border border-borderHover shadow-sm transition-all flex items-center gap-1.5";
  const tierIdleClass =
    "px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-all flex items-center gap-1.5";

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-surface border border-borderSubtle rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Active Pipeline</span>
            <i className="ph ph-kanban text-indigo-400 text-base" />
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-semibold tracking-tight text-white">{jobs.length}</span>
            <span className="text-xs text-emerald-400 font-mono">Avg Fit: {stats.avgFit}/10</span>
          </div>
        </div>

        <div className="bg-surface border border-borderSubtle rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Pending Follow-Ups</span>
            <i className="ph ph-clock-countdown text-amber-400 text-base" />
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-semibold tracking-tight text-amber-400">
              {stats.pending}
            </span>
            <button
              type="button"
              onClick={() => setFilter("Follow-up")}
              className="text-xs text-amber-300/90 hover:underline font-medium"
            >
              Review due →
            </button>
          </div>
        </div>

        <div className="bg-surface border border-borderSubtle rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Interviews Active</span>
            <i className="ph ph-video-camera text-emerald-400 text-base" />
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-semibold tracking-tight text-white">
              {stats.interviews}
            </span>
            <span className="text-xs text-zinc-400 font-mono truncate max-w-[120px]">
              {stats.interviewJob
                ? `${stats.interviewJob.company}${stats.interviewJob.salary ? ` · ${stats.interviewJob.salary}` : ""}`
                : "No interviews yet"}
            </span>
          </div>
        </div>

        <div className="bg-surface border border-borderSubtle rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Guardrail Mode</span>
            <i className="ph ph-shield-check text-indigo-400 text-base" />
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-zinc-200">Zero-Hallucination</span>
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300">
              STRICT
            </span>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-borderSubtle rounded-2xl p-4 sm:p-5 shadow-xl shadow-black/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-borderSubtle">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <i className="ph-bold ph-funnel-simple" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Pragmatic Ingestion Pipeline</h2>
              <p className="text-xs text-zinc-400">
                Zero bot-blocking capture. Scores Fit (1–10) & flags missing skills before you spend
                20 mins applying.
              </p>
            </div>
          </div>

          <div className="flex items-center bg-canvas p-1 rounded-xl border border-borderSubtle self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setTier(1)}
              aria-pressed={tier === 1}
              className={tier === 1 ? tier1Class : tierIdleClass}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Tier 1: Paste JD (100% Reliable)
            </button>
            <button
              type="button"
              onClick={() => setTier(2)}
              aria-pressed={tier === 2}
              className={tier === 2 ? tier2Class : tierIdleClass}
            >
              <i className="ph ph-globe text-sm" />
              Tier 2: Fetch URL (r.jina.ai)
            </button>
          </div>
        </div>

        {tier === 1 ? (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                value={role}
                onChange={(event) => setRole(event.target.value)}
                placeholder="Role Title (e.g., Technical Project Manager)"
                className="bg-canvas border border-borderSubtle focus:border-indigo-500 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
              />
              <input
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                placeholder="Company (e.g., Aspio / Birrwise)"
                className="bg-canvas border border-borderSubtle focus:border-indigo-500 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
              />
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value)}
                className="bg-canvas border border-borderSubtle focus:border-indigo-500 rounded-xl px-3.5 py-2 text-sm text-zinc-200 outline-none transition-colors"
              >
                {WORK_MODES.map((workMode) => (
                  <option key={workMode} value={workMode} className="bg-zinc-900">
                    {workMode}
                  </option>
                ))}
              </select>
              <input
                value={salary}
                onChange={(event) => setSalary(event.target.value)}
                placeholder="Compensation (e.g., $1,750/mo)"
                className="bg-canvas border border-borderSubtle focus:border-indigo-500 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
              />
            </div>

            <div>
              <textarea
                value={jdText}
                onChange={(event) => setJdText(event.target.value)}
                rows={3}
                placeholder="Paste raw Job Description here (or click 'Load Sample JD' to test Fit Scoring)..."
                className="w-full bg-canvas border border-borderSubtle focus:border-indigo-500 rounded-xl p-3.5 text-sm text-zinc-200 placeholder-zinc-500 outline-none transition-colors resize-none font-sans"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={loadSample}
                    className="px-2.5 py-1.5 rounded-lg bg-elevated hover:bg-zinc-800 border border-borderSubtle text-xs text-zinc-300 transition-colors flex items-center gap-1.5"
                  >
                    <i className="ph ph-sparkle text-indigo-400" />
                    Load Sample TPM JD
                  </button>
                  <button
                    type="button"
                    onClick={copyBookmarklet}
                    className="px-2.5 py-1.5 rounded-lg bg-elevated hover:bg-zinc-800 border border-borderSubtle text-xs text-zinc-300 transition-colors flex items-center gap-1.5"
                  >
                    <i className="ph ph-bookmark-simple text-emerald-400" />
                    Copy Browser Bookmarklet
                  </button>
                  <button
                    type="button"
                    onClick={onViewBridge}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs text-emerald-300 transition-colors flex items-center gap-1.5"
                  >
                    <i className="ph ph-anchor" />
                    Open Anchor Bridge
                  </button>
                </div>
                <button
                  type="button"
                  onClick={submit}
                  disabled={ingesting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-medium shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
                >
                  <i className={ingesting ? "ph ph-circle-notch animate-spin" : "ph-bold ph-lightning"} />
                  {ingesting ? "Scoring fit…" : "Ingest & Score Fit"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="flex-1 flex items-center bg-canvas border border-borderSubtle focus-within:border-indigo-500 rounded-xl px-3.5 py-2">
                <span className="text-xs font-mono text-indigo-400 mr-1.5 select-none">
                  https://r.jina.ai/
                </span>
                <input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://jobs.ashbyhq.com/acme/technical-pm or linkedin.com/jobs/..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={fetchUrl}
                disabled={fetching}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <i className={fetching ? "ph ph-circle-notch animate-spin" : "ph-bold ph-cloud-arrow-down"} />
                {fetching ? "Routing r.jina.ai…" : "Fetch via Reader API"}
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
              <div className="flex flex-wrap items-center gap-3">
                <span>Quick test presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setUrl("https://jobs.ashbyhq.com/linear-ops/technical-product-manager");
                    setFallback(false);
                  }}
                  className="text-indigo-400 hover:underline font-mono"
                >
                  ashbyhq.com/linear-ops
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUrl("https://www.linkedin.com/jobs/view/3981249012/");
                    setFallback(false);
                  }}
                  className="text-amber-400 hover:underline font-mono"
                >
                  linkedin.com/jobs/view/39812 (Test Authwall Fallback)
                </button>
              </div>
            </div>
            {fallback && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs text-amber-200">
                  <i className="ph-bold ph-warning-circle text-amber-400 text-base shrink-0" />
                  <span>
                    <strong>LinkedIn Authwall Detected (HTTP 999):</strong> Switched seamlessly to{" "}
                    <strong>Tier 1 Paste JD</strong>. Use your browser bookmarklet on the open tab
                    for 100% reliability.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {PIPELINE_FILTERS.map((stage) => (
            <button
              key={stage}
              type="button"
              onClick={() => setFilter(stage)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap",
                filter === stage
                  ? "bg-elevated text-white border-borderHover"
                  : "text-zinc-400 hover:text-zinc-200 border-transparent",
              )}
            >
              {stage === "ALL" ? "All Roles" : stage === "Follow-up" ? "Follow-up Due" : stage}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter company, keyword..."
            className="w-full bg-surface border border-borderSubtle focus:border-indigo-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filtered.map((job) => {
          const followupDue =
            job.daysSinceApplied >= 5 && (job.status === "Applied" || job.status === "Follow-up");
          const workModeStyle = job.workMode.toLowerCase().includes("remote")
            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
            : "bg-indigo-500/10 text-indigo-300 border-indigo-500/25";
          const scoreColor =
            job.fitScore === null
              ? "text-zinc-400 bg-zinc-800/60 border-zinc-700"
              : job.fitScore >= 9
                ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                : "text-indigo-300 bg-indigo-500/10 border-indigo-500/30";

          return (
            <button
              key={job.id}
              type="button"
              onClick={() => onOpenJob(job.id)}
              className="group w-full text-left bg-surface hover:bg-elevated/80 border border-borderSubtle hover:border-borderHover rounded-2xl p-4 sm:p-5 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono text-zinc-500">#{job.id}</span>
                  <h3 className="text-sm sm:text-base font-semibold text-white group-hover:text-indigo-300 transition-colors">
                    {job.role}
                  </h3>
                  <span className="text-xs text-zinc-500">@</span>
                  <span className="text-sm font-medium text-zinc-300">{job.company}</span>
                  <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-mono border", workModeStyle)}>
                    {job.workMode || "Remote (Preferred)"}
                  </span>
                  {job.salary && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-canvas text-emerald-400 border border-borderSubtle">
                      {job.salary}
                    </span>
                  )}
                  {followupDue && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <i className="ph-bold ph-bell-ringing" /> Day-{job.daysSinceApplied} Follow-Up Due
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-400 line-clamp-1">{job.jdSummary}</p>

                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {job.matchedSkills.slice(0, 5).map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 rounded-md text-[11px] bg-canvas text-zinc-300 border border-borderSubtle"
                    >
                      {skill}
                    </span>
                  ))}
                  {job.missingSkills.map((gap) => (
                    <span
                      key={gap}
                      className="px-2 py-0.5 rounded-md text-[11px] bg-rose-500/10 text-rose-300 border border-rose-500/20 flex items-center gap-1"
                    >
                      <i className="ph ph-warning text-[10px]" /> Gap: {gap}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-borderSubtle shrink-0">
                <div className={cn("px-2.5 py-1 rounded-xl border font-mono text-xs font-semibold", scoreColor)}>
                  Fit {job.fitScore ?? "—"}/10
                </div>
                <span
                  className={cn(
                    "px-2.5 py-1 rounded-xl border text-xs font-medium",
                    STATUS_STYLES[job.status] ?? STATUS_STYLES.Saved,
                  )}
                >
                  {job.status}
                </span>
                <span className="w-8 h-8 rounded-xl bg-canvas group-hover:bg-indigo-600 text-zinc-400 group-hover:text-white border border-borderSubtle flex items-center justify-center transition-colors">
                  <i className="ph-bold ph-arrow-right text-sm" />
                </span>
              </div>
            </button>
          );
        })}

        {!filtered.length && (
          <div className="bg-surface border border-borderSubtle rounded-2xl p-8 text-center space-y-2">
            <p className="text-sm text-zinc-300 font-medium">
              {jobs.length ? "No roles match this filter yet." : "Your vault is empty — for now."}
            </p>
            <p className="text-xs text-zinc-500">
              {jobs.length
                ? "Use the Pragmatic Ingestion Bar or Anchor Bridge to capture a new JD in seconds."
                : "Paste a JD above, or open Anchor Bridge to capture the tab you're already looking at."}
            </p>
            {!jobs.length && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={loadSample}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
                >
                  Load a sample JD
                </button>
                <button
                  type="button"
                  onClick={onViewBridge}
                  className="px-3 py-1.5 rounded-xl bg-elevated hover:bg-zinc-800 border border-borderSubtle text-xs text-zinc-200"
                >
                  Open Anchor Bridge
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
