"use client";

import { useState } from "react";
import { saveKitEdits, updateJobStatus } from "@/app/actions";
import type { JobUI, ProfileUI, ToastTone } from "@/lib/types";
import { JOB_STATUSES, STATUS_STYLES } from "./constants";
import { addDays, cn, copyText, formatDate } from "./utils";

type KitStudioProps = {
  job: JobUI | undefined;
  profile: ProfileUI;
  showToast: (message: string, tone?: ToastTone) => void;
  onJobUpdated: (job: JobUI) => void;
  onBack: () => void;
  onOpenBrain: () => void;
};

type KitTab = "cv" | "portfolio" | "outreach" | "followup";

function fitCopy(job: JobUI) {
  if (job.fitScore === null) {
    return {
      label: "Not scored yet",
      detail: "Add experience blocks in Master Brain, then re-ingest the JD to score fit.",
    };
  }
  const gaps = job.missingSkills.length;
  if (job.fitScore >= 9) {
    return {
      label: "High-Probability Match",
      detail: `Strong overlap across ${job.matchedSkills.length} matched skills${gaps ? `, ${gaps} gap(s) flagged` : ""}.`,
    };
  }
  if (job.fitScore >= 8) {
    return {
      label: "Strong Match",
      detail: `${job.matchedSkills.length} matched skills${gaps ? `, ${gaps} gap(s) to address` : ""}.`,
    };
  }
  return {
    label: "Stretch Match",
    detail: `${job.matchedSkills.length} matched skills${gaps ? `, ${gaps} gap(s) flagged` : ""}.`,
  };
}

export default function KitStudio({
  job,
  profile,
  showToast,
  onJobUpdated,
  onBack,
  onOpenBrain,
}: KitStudioProps) {
  const [tab, setTab] = useState<KitTab>("cv");
  const [coverLetter, setCoverLetter] = useState(job?.latestKit?.coverLetter ?? "");
  const [portfolioAngle, setPortfolioAngle] = useState(job?.latestKit?.portfolioAngle ?? "");
  const [dm, setDm] = useState(job?.latestKit?.dm ?? "");
  const [followUp5, setFollowUp5] = useState(job?.latestKit?.followUp5 ?? "");
  const [followUp12, setFollowUp12] = useState(job?.latestKit?.followUp12 ?? "");
  const [saving, setSaving] = useState(false);
  const [day5Sent, setDay5Sent] = useState(false);
  const [day12Sent, setDay12Sent] = useState(false);

  if (!job) {
    return (
      <section className="bg-surface border border-borderSubtle rounded-2xl p-10 text-center space-y-3">
        <i className="ph ph-magic-wand text-3xl text-indigo-400" />
        <h2 className="text-lg font-semibold text-white">No job selected</h2>
        <p className="text-sm text-zinc-400">
          Ingest a role first, then open it from the Job Vault to build an application kit.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
        >
          Go to Job Vault
        </button>
      </section>
    );
  }

  const cv = job.latestKit?.cv ?? job.draftCv;
  const blocks = cv.blocks.flatMap((cvBlock) => {
    const block = profile.experienceBlocks.find((item) => item.id === cvBlock.blockId);
    return block ? [{ cvBlock, block }] : [];
  });
  const skills = cv.skills?.length ? cv.skills : job.matchedSkills;
  const fit = fitCopy(job);
  const baseDate = job.appliedAt ?? job.createdAt;
  const due5 = addDays(baseDate, 5);
  const due12 = addDays(baseDate, 12);

  const portfolioTerms = Array.from(
    new Set([...job.matchedSkills, ...job.role.split(/\s+/)]),
  )
    .map((term) => term.toLowerCase())
    .filter((term) => term.length > 2);

  const rankedPortfolio = profile.portfolioLinks
    .map((link, index) => {
      const haystack = `${link.title} ${link.stack.join(" ")} ${link.pitch}`.toLowerCase();
      const score = portfolioTerms.reduce(
        (total, term) => total + (haystack.includes(term) ? 1 : 0),
        0,
      );
      return { ...link, score, originalIndex: index };
    })
    .sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex);

  async function saveKit() {
    setSaving(true);
    const res = await saveKitEdits(job!.id, {
      coverLetter,
      portfolioAngle,
      dm,
      followUp5,
      followUp12,
    });
    setSaving(false);

    if (!res.ok) {
      showToast(res.error, "amber");
      return;
    }

    onJobUpdated(res.data);
    showToast(`Saved kit v${res.data.latestKit?.version ?? 1} for ${job!.company}.`);
  }

  async function changeStatus(status: string) {
    const res = await updateJobStatus(job!.id, status);
    if (!res.ok) {
      showToast(res.error, "amber");
      return;
    }
    onJobUpdated(res.data);
    showToast(`Updated Job #${job!.id} (${job!.company}) → ${status}`);
  }

  async function copyPrompt() {
    const prompt = `Tailor an application kit for job #${job!.id} (${job!.role} @ ${job!.company}).

1. Call get_master_profile to load my verified blocks.
2. Call get_job with job_id ${job!.id} to read the JD, keywords, gaps, and fit score.
3. Draft cv = { headline, summary, skills: string[], blocks: [{ blockId, bullets: [{ text, src }] }] } using ONLY facts from the master profile. Rephrase master bullet #src and never add new numbers.
4. Write coverLetter, portfolioAngle, dm (3 sentences), followUp5, and followUp12.
5. Call save_application_kit with job_id ${job!.id} and the kit.

Guardrails: zero hallucinations, action + context + metric, ATS single-column layout. The fact-lock will reject new numbers that are not in the source bullet.`;

    const copied = await copyText(prompt);
    showToast(
      copied
        ? "MCP tailoring prompt copied. Paste it into your MCP-connected AI client."
        : "Could not access the clipboard.",
      copied ? "indigo" : "amber",
    );
  }

  async function copyValue(label: string, value: string) {
    const copied = await copyText(value);
    showToast(
      copied ? `${label} copied to clipboard.` : "Could not access the clipboard.",
      copied ? "indigo" : "amber",
    );
  }

  function printCv() {
    if (tab !== "cv") {
      setTab("cv");
      window.setTimeout(() => window.print(), 200);
      return;
    }
    window.print();
  }

  const tabs: Array<{ id: KitTab; label: string; icon: string; iconColor: string }> = [
    { id: "cv", label: "Tailored CV (ATS PDF)", icon: "ph ph-file-pdf", iconColor: "text-indigo-400" },
    { id: "portfolio", label: "Portfolio Highlights", icon: "ph ph-folders", iconColor: "text-emerald-400" },
    { id: "outreach", label: "Cover Letter & LinkedIn DM", icon: "ph ph-paper-plane-tilt", iconColor: "text-sky-400" },
    { id: "followup", label: "Follow-Up Sequence (Day 5 / 12)", icon: "ph ph-envelope-open", iconColor: "text-amber-400" },
  ];

  return (
    <section className="space-y-5">
      <div className="bg-surface border border-borderSubtle rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onBack}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 bg-elevated px-2 py-1 rounded-lg border border-borderSubtle"
              >
                <i className="ph ph-arrow-left" /> Vault
              </button>
              <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                JOB #{job.id}
              </span>
              <h1 className="text-lg sm:text-xl font-semibold text-white">{job.role}</h1>
              <span className="text-zinc-500">@</span>
              <span className="text-base sm:text-lg font-medium text-zinc-200">{job.company}</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-md text-[11px] font-medium border",
                  STATUS_STYLES[job.status] ?? STATUS_STYLES.Saved,
                )}
              >
                {job.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 pt-1">
              <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono">
                {job.workMode}
              </span>
              {job.salary && <span className="font-mono text-emerald-400">{job.salary}</span>}
              <span>•</span>
              <span>
                {job.appliedAt
                  ? `Applied: ${formatDate(job.appliedAt)} (${job.daysSinceApplied}d ago)`
                  : `Saved: ${formatDate(job.createdAt)}`}
              </span>
              {job.url && (
                <>
                  <span>•</span>
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    Source JD <i className="ph ph-arrow-up-right" />
                  </a>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-canvas border border-borderSubtle rounded-xl px-2.5 py-1.5">
              <span className="text-[11px] text-zinc-400">Status:</span>
              <select
                value={job.status}
                onChange={(event) => changeStatus(event.target.value)}
                className="bg-transparent text-xs font-medium text-white outline-none cursor-pointer"
              >
                {JOB_STATUSES.map((status) => (
                  <option key={status} value={status} className="bg-zinc-900">
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={copyPrompt}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-medium shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
            >
              <i className="ph-bold ph-sparkle" />
              Copy MCP Tailoring Prompt
            </button>

            <button
              type="button"
              onClick={saveKit}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-medium shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
            >
              <i className={saving ? "ph ph-circle-notch animate-spin" : "ph-bold ph-floppy-disk"} />
              {saving
                ? "Saving…"
                : job.latestKit
                  ? `Save Kit v${job.latestKit.version + 1}`
                  : "Save Kit v1"}
            </button>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-borderSubtle">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-canvas border border-borderSubtle text-zinc-400">
              <i className="ph-bold ph-shield-check text-indigo-400" />
              <span>1. Fact lock: every bullet traces to a Master Brain block</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-canvas border border-borderSubtle text-zinc-400">
              <i className="ph-bold ph-check-circle text-emerald-400" />
              <span>2. Impact-first: action + context + metric</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-canvas border border-borderSubtle text-zinc-400">
              <i className="ph-bold ph-stack text-amber-400" />
              <span>3. Immutable snapshots: each save is a new kit version</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-borderSubtle flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-sm font-semibold whitespace-nowrap">
              Fit Score: {job.fitScore ?? "—"} / 10
            </div>
            <div className="text-xs text-zinc-400">
              <span className="text-zinc-200 font-medium">{fit.label}:</span> {fit.detail}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {job.matchedSkills.map((skill) => (
              <span
                key={skill}
                className="px-2 py-0.5 rounded-md text-[11px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
              >
                ✓ {skill}
              </span>
            ))}
            {job.missingSkills.map((gap) => (
              <span
                key={gap}
                className="px-2 py-0.5 rounded-md text-[11px] bg-amber-500/10 text-amber-300 border border-amber-500/20"
              >
                ! Flag: {gap}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borderSubtle pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 whitespace-nowrap border",
                tab === item.id
                  ? "bg-elevated text-white border-borderHover"
                  : "text-zinc-400 hover:text-zinc-200 border-transparent",
              )}
            >
              <i className={cn(item.icon, item.iconColor)} />
              {item.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={printCv}
          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
        >
          <i className="ph-bold ph-printer" />
          Print / Save ATS PDF
        </button>
      </div>

      {tab === "cv" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 text-xs text-zinc-400 px-1">
            <span>
              Modular blocks automatically reordered by JD keyword weight. Single-column
              ATS-compliant layout.
            </span>
            <span className="font-mono text-indigo-400 whitespace-nowrap">
              {job.latestKit
                ? `Snapshot v${job.latestKit.version} // Locked to Master Profile`
                : "Draft preview // from Master Profile"}
            </span>
          </div>

          <div
            id="printable-cv-sheet"
            className="bg-white text-zinc-900 rounded-xl shadow-2xl max-w-4xl mx-auto p-6 sm:p-10 border border-zinc-200"
          >
            <div className="border-b-2 border-zinc-900 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-zinc-950 uppercase">
                  {profile.name} — {job.role}
                </h2>
                <p className="text-sm font-medium text-indigo-700 mt-0.5">
                  {cv.headline || `${job.role} • ${profile.headline}`}
                </p>
              </div>
              <div className="text-xs text-zinc-600 sm:text-right font-mono space-y-0.5">
                {profile.contact && <div>{profile.contact}</div>}
                {profile.site && <div>{profile.site}</div>}
              </div>
            </div>

            {(cv.summary || profile.summary) && (
              <div className="mt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                  Executive Summary
                </h3>
                <p className="text-xs sm:text-sm leading-relaxed text-zinc-800">
                  {cv.summary || profile.summary}
                </p>
              </div>
            )}

            {!!skills.length && (
              <div className="mt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Core Competencies & Technical Stack
                </h3>
                <div className="text-xs text-zinc-800 leading-relaxed font-medium">
                  <span className="font-bold text-zinc-900">Matched Core Stack:</span>{" "}
                  {skills.join(" • ")}
                </div>
              </div>
            )}

            <div className="mt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-200 pb-1 mb-3">
                Relevant Experience & Technical Projects (Ranked by Role Fit)
              </h3>
              {blocks.length ? (
                <div className="space-y-4">
                  {blocks.map(({ cvBlock, block }) => (
                    <div key={cvBlock.blockId}>
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between">
                        <div className="text-xs sm:text-sm font-bold text-zinc-900">
                          {block.role} —{" "}
                          <span className="text-indigo-700">{block.org}</span>
                        </div>
                        <div className="text-[11px] font-mono text-zinc-500">{block.period}</div>
                      </div>
                      <ul className="mt-1.5 space-y-1 list-disc list-outside ml-4 text-xs text-zinc-800 leading-relaxed">
                        {cvBlock.bullets.map((bullet, index) => (
                          <li key={index}>{bullet.text}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-zinc-500 space-y-2">
                  <p>No experience blocks yet.</p>
                  <button
                    type="button"
                    onClick={onOpenBrain}
                    className="text-indigo-700 font-medium hover:underline"
                  >
                    Add verified blocks in Master Brain →
                  </button>
                </div>
              )}
            </div>

            {profile.education && (
              <div className="mt-5 pt-3 border-t border-zinc-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Education & Research
                </h3>
                <div className="text-xs text-zinc-700">{profile.education}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "portfolio" && (
        <div className="space-y-4">
          <div className="bg-surface border border-borderSubtle rounded-2xl p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Portfolio Angle</h3>
                <p className="text-xs text-zinc-400">
                  Which projects to lead with and why — saved with the kit.
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyValue("Portfolio angle", portfolioAngle)}
                className="px-3 py-1.5 rounded-lg bg-elevated hover:bg-zinc-800 border border-borderSubtle text-xs text-zinc-200 flex items-center gap-1.5 transition-colors shrink-0"
              >
                <i className="ph ph-copy" /> Copy
              </button>
            </div>
            <textarea
              value={portfolioAngle}
              onChange={(event) => setPortfolioAngle(event.target.value)}
              rows={2}
              placeholder="Lead with Birrwise + Aspio QA MCP because the JD prioritizes AI tooling and PostgreSQL ownership."
              className="w-full bg-canvas border border-borderSubtle focus:border-indigo-500 rounded-xl p-3 text-xs sm:text-sm text-zinc-200 leading-relaxed outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rankedPortfolio.map((item, index) => (
              <div
                key={item.id}
                className="bg-surface border border-borderSubtle rounded-2xl p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 whitespace-nowrap">
                      RANK #{index + 1} RELEVANCE
                    </span>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
                      >
                        Open <i className="ph ph-arrow-up-right" />
                      </a>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{item.pitch}</p>
                </div>
                <div className="space-y-3 pt-2 border-t border-borderSubtle">
                  <div className="flex flex-wrap gap-1.5">
                    {item.stack.map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-0.5 rounded bg-canvas text-[11px] font-mono text-zinc-300 border border-borderSubtle"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copyValue("Talking point", `${item.title}: ${item.pitch} (${item.url})`)
                    }
                    className="w-full py-1.5 rounded-xl bg-elevated hover:bg-zinc-800 border border-borderSubtle text-xs text-zinc-200 transition-colors"
                  >
                    Copy Talking Point
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!rankedPortfolio.length && (
            <div className="bg-surface border border-borderSubtle rounded-2xl p-8 text-center space-y-2">
              <p className="text-sm text-zinc-300 font-medium">No portfolio links yet.</p>
              <p className="text-xs text-zinc-500">
                Add them in Master Brain → Portfolio Links (or Raw JSON), then rank them here per
                job.
              </p>
              <button
                type="button"
                onClick={onOpenBrain}
                className="px-3 py-1.5 rounded-xl bg-elevated hover:bg-zinc-800 border border-borderSubtle text-xs text-zinc-200"
              >
                Open Master Brain
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "outreach" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 bg-surface border border-borderSubtle rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Tailored Pitch / Cover Letter</h3>
                <p className="text-xs text-zinc-400">
                  Crisp, non-robotic, grounded strictly in your Master Profile.
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyValue("Cover letter", coverLetter)}
                className="px-3 py-1.5 rounded-lg bg-elevated hover:bg-zinc-800 border border-borderSubtle text-xs text-zinc-200 flex items-center gap-1.5 transition-colors shrink-0"
              >
                <i className="ph ph-copy" /> Copy Pitch
              </button>
            </div>
            <textarea
              value={coverLetter}
              onChange={(event) => setCoverLetter(event.target.value)}
              rows={11}
              placeholder="Paste or write the tailored pitch here. The MCP tailoring prompt can draft it from your verified profile."
              className="w-full bg-canvas border border-borderSubtle focus:border-indigo-500 rounded-xl p-4 text-xs sm:text-sm text-zinc-200 leading-relaxed outline-none resize-none"
            />
          </div>

          <div className="lg:col-span-2 bg-surface border border-borderSubtle rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">3-Sentence Hiring Manager DM</h3>
                  <p className="text-xs text-zinc-400">High-signal LinkedIn / X outreach note.</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyValue("LinkedIn DM", dm)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs text-indigo-300 flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <i className="ph ph-copy" /> Copy DM
                </button>
              </div>
              <textarea
                value={dm}
                onChange={(event) => setDm(event.target.value)}
                rows={6}
                placeholder="Hi [Name] — I just applied for..."
                className="w-full bg-canvas border border-borderSubtle focus:border-indigo-500 rounded-xl p-3.5 text-xs sm:text-sm text-zinc-200 leading-relaxed outline-none resize-none"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-canvas border border-borderSubtle space-y-1.5">
              <div className="text-[11px] font-mono uppercase text-emerald-400">
                Outreach Checklist
              </div>
              <p className="text-xs text-zinc-400">1. Send application via ATS link.</p>
              <p className="text-xs text-zinc-400">
                2. DM Engineering Manager or Head of Product within 2 hours.
              </p>
              <p className="text-xs text-zinc-400">
                3. Link <span className="text-zinc-200 font-mono">{profile.site || "your portfolio"}</span>{" "}
                as proof of work.
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === "followup" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface border border-borderSubtle rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-xs font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  DAY 5 TRIGGER
                </span>
                <span className="text-xs text-zinc-400">Due: {formatDate(due5)}</span>
              </div>
              <button
                type="button"
                onClick={() => copyValue("Day-5 follow-up", followUp5)}
                className="px-2.5 py-1 rounded-lg bg-elevated hover:bg-zinc-800 border border-borderSubtle text-xs text-zinc-200 flex items-center gap-1"
              >
                <i className="ph ph-copy" /> Copy Email
              </button>
            </div>
            <textarea
              value={followUp5}
              onChange={(event) => setFollowUp5(event.target.value)}
              rows={7}
              placeholder={`Subject: Quick follow-up: ${job.role} // ${profile.name}\n\nHi [Name], ...`}
              className="w-full bg-canvas border border-borderSubtle rounded-xl p-3.5 text-xs sm:text-sm text-zinc-200 leading-relaxed outline-none resize-none"
            />
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={day5Sent}
                  onChange={(event) => {
                    setDay5Sent(event.target.checked);
                    if (event.target.checked) showToast("Day-5 Follow-Up marked as sent!");
                  }}
                  className="rounded border-zinc-700 bg-canvas text-indigo-500 focus:ring-0"
                />
                Mark Day-5 Follow-Up Sent
              </label>
            </div>
          </div>

          <div className="bg-surface border border-borderSubtle rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-xs font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  DAY 12 FINAL BUMP
                </span>
                <span className="text-xs text-zinc-400">Due: {formatDate(due12)}</span>
              </div>
              <button
                type="button"
                onClick={() => copyValue("Day-12 follow-up", followUp12)}
                className="px-2.5 py-1 rounded-lg bg-elevated hover:bg-zinc-800 border border-borderSubtle text-xs text-zinc-200 flex items-center gap-1"
              >
                <i className="ph ph-copy" /> Copy Email
              </button>
            </div>
            <textarea
              value={followUp12}
              onChange={(event) => setFollowUp12(event.target.value)}
              rows={7}
              placeholder={`Subject: Closing the loop — ${job.role} @ ${job.company}\n\nHi [Name], ...`}
              className="w-full bg-canvas border border-borderSubtle rounded-xl p-3.5 text-xs sm:text-sm text-zinc-200 leading-relaxed outline-none resize-none"
            />
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={day12Sent}
                  onChange={(event) => {
                    setDay12Sent(event.target.checked);
                    if (event.target.checked) showToast("Day-12 Final Bump marked as sent!");
                  }}
                  className="rounded border-zinc-700 bg-canvas text-indigo-500 focus:ring-0"
                />
                Mark Day-12 Bump Sent
              </label>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
