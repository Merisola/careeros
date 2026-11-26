"use client";

import { useState } from "react";
import {
  addProfileBlock,
  deleteProfileBlock,
  savePortfolioLinks,
  saveProfile,
  saveProfileJson,
} from "@/app/actions";
import type { ProfileUI, ToastTone } from "@/lib/types";
import { copyText, cn } from "./utils";

type MasterBrainProps = {
  profile: ProfileUI;
  showToast: (message: string, tone?: ToastTone) => void;
  onProfileUpdated: (profile: ProfileUI) => void;
};

type LinkDraft = {
  id: string;
  title: string;
  url: string;
  stackText: string;
  pitch: string;
};

function profileToJson(profile: ProfileUI) {
  return {
    handle: profile.handle,
    name: profile.name,
    headline: profile.headline,
    contact: profile.contact,
    site: profile.site,
    summary: profile.summary,
    education: profile.education,
    workModePreference: profile.workModePreference,
    targetCompensation: profile.targetCompensation,
    portfolioLinks: profile.portfolioLinks,
    experienceBlocks: profile.experienceBlocks,
  };
}

export default function MasterBrain({ profile, showToast, onProfileUpdated }: MasterBrainProps) {
  const [mode, setMode] = useState<"cards" | "json">("cards");
  const [basics, setBasics] = useState(() => ({
    name: profile.name,
    headline: profile.headline,
    contact: profile.contact,
    site: profile.site,
    summary: profile.summary,
    education: profile.education,
    workModePreference: profile.workModePreference,
    targetCompensation: profile.targetCompensation,
  }));
  const [savingBasics, setSavingBasics] = useState(false);
  const [links, setLinks] = useState<LinkDraft[]>(() =>
    profile.portfolioLinks.map((link) => ({
      id: link.id,
      title: link.title,
      url: link.url,
      stackText: link.stack.join(", "),
      pitch: link.pitch,
    })),
  );
  const [savingLinks, setSavingLinks] = useState(false);
  const [newBlock, setNewBlock] = useState({
    role: "",
    org: "",
    period: "",
    tags: "",
    bullet: "",
  });
  const [savingBlock, setSavingBlock] = useState(false);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(profileToJson(profile), null, 2));
  const [savingJson, setSavingJson] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function updateBasic(field: keyof typeof basics, value: string) {
    setBasics((prev) => ({ ...prev, [field]: value }));
  }

  async function saveBasics() {
    setSavingBasics(true);
    const res = await saveProfile(basics);
    setSavingBasics(false);
    if (!res.ok) {
      showToast(res.error, "amber");
      return;
    }
    onProfileUpdated(res.data);
    showToast("Master profile basics saved.");
  }

  function updateLink(index: number, patch: Partial<LinkDraft>) {
    setLinks((prev) => prev.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  }

  function addLink() {
    setLinks((prev) => [
      ...prev,
      {
        id: `port-${Date.now().toString(36)}`,
        title: "",
        url: "",
        stackText: "",
        pitch: "",
      },
    ]);
  }

  function removeLink(index: number) {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveLinks() {
    setSavingLinks(true);
    const payload = links.map(({ stackText, ...link }) => ({
      ...link,
      stack: stackText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    }));
    const res = await savePortfolioLinks(payload);
    setSavingLinks(false);

    if (!res.ok) {
      showToast(res.error, "amber");
      return;
    }
    onProfileUpdated(res.data);
    setLinks(
      res.data.portfolioLinks.map((link) => ({
        id: link.id,
        title: link.title,
        url: link.url,
        stackText: link.stack.join(", "),
        pitch: link.pitch,
      })),
    );
    showToast("Portfolio links saved.");
  }

  async function addBlock() {
    if (!newBlock.role.trim() || !newBlock.bullet.trim()) {
      showToast("Enter both a Project/Role title and an Action + Context + Metric bullet.", "amber");
      return;
    }
    setSavingBlock(true);
    const res = await addProfileBlock(newBlock);
    setSavingBlock(false);

    if (!res.ok) {
      showToast(res.error, "amber");
      return;
    }
    onProfileUpdated(res.data);
    setNewBlock({ role: "", org: "", period: "", tags: "", bullet: "" });
    showToast("Added verified block to Master Career Profile!");
  }

  async function removeBlock(id: string) {
    if (!window.confirm("Delete this block from the Master Profile? Existing kit snapshots keep their own copy.")) {
      return;
    }
    setDeletingId(id);
    const res = await deleteProfileBlock(id);
    setDeletingId(null);
    if (!res.ok) {
      showToast(res.error, "amber");
      return;
    }
    onProfileUpdated(res.data);
    showToast("Block removed from Master Brain.");
  }

  function showJson() {
    setJsonText(JSON.stringify(profileToJson(profile), null, 2));
    setMode("json");
  }

  async function copyJson() {
    const copied = await copyText(jsonText);
    showToast(copied ? "Master Profile JSON copied!" : "Could not access the clipboard.", copied ? "indigo" : "amber");
  }

  async function saveJson() {
    setSavingJson(true);
    const res = await saveProfileJson(jsonText);
    setSavingJson(false);

    if (!res.ok) {
      showToast(res.error, "amber");
      return;
    }
    onProfileUpdated(res.data);
    setJsonText(JSON.stringify(profileToJson(res.data), null, 2));
    showToast("Master Profile JSON saved.");
  }

  return (
    <section className="space-y-5">
      <div className="bg-surface border border-borderSubtle rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-white">
            Master Career Profile (&quot;Master Brain&quot; Source of Truth)
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            Structured modular blocks stored in Neon Postgres + Prisma. Every tailored CV pulls
            strictly from these verified blocks.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMode("cards")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-medium border",
              mode === "cards"
                ? "bg-elevated text-white border-borderHover"
                : "text-zinc-400 hover:text-white border-borderSubtle",
            )}
          >
            Modular Blocks
          </button>
          <button
            type="button"
            onClick={showJson}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-medium border",
              mode === "json"
                ? "bg-elevated text-white border-borderHover"
                : "text-zinc-400 hover:text-white border-borderSubtle",
            )}
          >
            Raw Postgres JSON
          </button>
        </div>
      </div>

      {mode === "cards" ? (
        <>
          <div className="bg-surface border border-borderSubtle rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <i className="ph-bold ph-user" /> Identity & Positioning
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                value={basics.name}
                onChange={(event) => updateBasic("name", event.target.value)}
                placeholder="Full name"
                className="bg-canvas border border-borderSubtle focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none"
              />
              <input
                value={basics.headline}
                onChange={(event) => updateBasic("headline", event.target.value)}
                placeholder="Headline (e.g., Technical Project Manager)"
                className="bg-canvas border border-borderSubtle focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none"
              />
              <input
                value={basics.site}
                onChange={(event) => updateBasic("site", event.target.value)}
                placeholder="Website / portfolio URL"
                className="bg-canvas border border-borderSubtle focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                value={basics.contact}
                onChange={(event) => updateBasic("contact", event.target.value)}
                placeholder="Contact line (location • email • phone)"
                className="bg-canvas border border-borderSubtle focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none"
              />
              <input
                value={basics.workModePreference}
                onChange={(event) => updateBasic("workModePreference", event.target.value)}
                placeholder="Work mode preference"
                className="bg-canvas border border-borderSubtle focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none"
              />
              <input
                value={basics.targetCompensation}
                onChange={(event) => updateBasic("targetCompensation", event.target.value)}
                placeholder="Target compensation (e.g., $1k–$2k/mo)"
                className="bg-canvas border border-borderSubtle focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 placeholder-zinc-500 outline-none"
              />
            </div>
            <textarea
              value={basics.summary}
              onChange={(event) => updateBasic("summary", event.target.value)}
              rows={3}
              placeholder="Executive summary used at the top of tailored CVs."
              className="w-full bg-canvas border border-borderSubtle focus:border-indigo-500 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-500 outline-none resize-none"
            />
            <input
              value={basics.education}
              onChange={(event) => updateBasic("education", event.target.value)}
              placeholder="Education line (degree, school, thesis)"
              className="w-full bg-canvas border border-borderSubtle focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={saveBasics}
                disabled={savingBasics}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-medium transition-all flex items-center gap-2"
              >
                <i className={savingBasics ? "ph ph-circle-notch animate-spin" : "ph-bold ph-floppy-disk"} />
                {savingBasics ? "Saving…" : "Save Profile Basics"}
              </button>
            </div>
          </div>

          <div className="bg-surface border border-borderSubtle rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <i className="ph-bold ph-folders" /> Portfolio Links
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Ranked against each JD in Kit Studio. Stack is comma-separated.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addLink}
                  className="px-3 py-1.5 rounded-xl bg-elevated hover:bg-zinc-800 border border-borderSubtle text-xs text-zinc-200 flex items-center gap-1.5"
                >
                  <i className="ph ph-plus" /> Add Link
                </button>
                <button
                  type="button"
                  onClick={saveLinks}
                  disabled={savingLinks}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-medium flex items-center gap-1.5"
                >
                  <i className={savingLinks ? "ph ph-circle-notch animate-spin" : "ph-bold ph-floppy-disk"} />
                  {savingLinks ? "Saving…" : "Save Links"}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {links.map((link, index) => (
                <div
                  key={link.id}
                  className="bg-canvas border border-borderSubtle rounded-xl p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-indigo-400 truncate">{link.id}</span>
                    <button
                      type="button"
                      onClick={() => removeLink(index)}
                      className="text-zinc-500 hover:text-rose-400 transition-colors"
                      aria-label="Remove portfolio link"
                    >
                      <i className="ph ph-trash" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      value={link.title}
                      onChange={(event) => updateLink(index, { title: event.target.value })}
                      placeholder="Project title"
                      className="bg-surface border border-borderSubtle focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none"
                    />
                    <input
                      value={link.url}
                      onChange={(event) => updateLink(index, { url: event.target.value })}
                      placeholder="https://..."
                      className="bg-surface border border-borderSubtle focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-200 placeholder-zinc-500 outline-none"
                    />
                  </div>
                  <input
                    value={link.stackText}
                    onChange={(event) => updateLink(index, { stackText: event.target.value })}
                    placeholder="Stack (comma-separated: Next.js, PostgreSQL, Prisma)"
                    className="w-full bg-surface border border-borderSubtle focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 outline-none"
                  />
                  <textarea
                    value={link.pitch}
                    onChange={(event) => updateLink(index, { pitch: event.target.value })}
                    rows={2}
                    placeholder="One-line pitch / proof of work."
                    className="w-full bg-surface border border-borderSubtle focus:border-indigo-500 rounded-lg p-2.5 text-xs text-zinc-200 placeholder-zinc-500 outline-none resize-none"
                  />
                </div>
              ))}
              {!links.length && (
                <p className="text-xs text-zinc-500">
                  No portfolio links yet. Add 2–4 proof-of-work links so Kit Studio can rank them.
                </p>
              )}
            </div>
          </div>

          <div className="bg-surface border border-borderSubtle rounded-2xl p-4 sm:p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-1.5">
              <i className="ph-bold ph-plus-circle" /> Add New Experience / Metric Block to Master
              Profile
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                value={newBlock.role}
                onChange={(event) => setNewBlock((prev) => ({ ...prev, role: event.target.value }))}
                placeholder="Project / Role (e.g., Aspio Release Ops)"
                className="bg-canvas border border-borderSubtle rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-indigo-500"
              />
              <input
                value={newBlock.org}
                onChange={(event) => setNewBlock((prev) => ({ ...prev, org: event.target.value }))}
                placeholder="Organization (optional)"
                className="bg-canvas border border-borderSubtle rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-indigo-500"
              />
              <input
                value={newBlock.period}
                onChange={(event) => setNewBlock((prev) => ({ ...prev, period: event.target.value }))}
                placeholder="Period (e.g., 2024 — Present)"
                className="bg-canvas border border-borderSubtle rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-indigo-500"
              />
              <input
                value={newBlock.tags}
                onChange={(event) => setNewBlock((prev) => ({ ...prev, tags: event.target.value }))}
                placeholder="Tags (Agile, CI/CD, QA)"
                className="bg-canvas border border-borderSubtle rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-indigo-500"
              />
              <input
                value={newBlock.bullet}
                onChange={(event) => setNewBlock((prev) => ({ ...prev, bullet: event.target.value }))}
                placeholder="Action + Context + Metric bullet..."
                className="sm:col-span-4 bg-canvas border border-borderSubtle rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-indigo-500"
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={addBlock}
                disabled={savingBlock}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-medium transition-all flex items-center gap-2"
              >
                <i className={savingBlock ? "ph ph-circle-notch animate-spin" : "ph-bold ph-plus"} />
                {savingBlock ? "Saving…" : "Save Block to Master Brain"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.experienceBlocks.map((block) => (
              <div
                key={block.id}
                className="bg-surface border border-borderSubtle rounded-2xl p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-mono text-indigo-400">{block.id}</span>
                    <h3 className="text-sm sm:text-base font-semibold text-white">
                      {block.role}{" "}
                      <span className="text-zinc-400 font-normal">@ {block.org}</span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono text-zinc-500 bg-canvas px-2 py-0.5 rounded border border-borderSubtle">
                      {block.period}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeBlock(block.id)}
                      disabled={deletingId === block.id}
                      className="text-zinc-500 hover:text-rose-400 transition-colors disabled:opacity-50"
                      aria-label={`Delete ${block.role}`}
                    >
                      <i className={deletingId === block.id ? "ph ph-circle-notch animate-spin" : "ph ph-trash"} />
                    </button>
                  </div>
                </div>
                <ul className="space-y-1.5 list-disc list-outside ml-4 text-xs text-zinc-300 leading-relaxed">
                  {block.bullets.map((bullet, index) => (
                    <li key={index}>{bullet}</li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-borderSubtle">
                  {block.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-canvas text-zinc-400 border border-borderSubtle"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {!profile.experienceBlocks.length && (
            <div className="bg-surface border border-borderSubtle rounded-2xl p-8 text-center space-y-2">
              <p className="text-sm text-zinc-300 font-medium">No verified blocks yet.</p>
              <p className="text-xs text-zinc-500">
                Add your first role or project above. Fit scoring and CV drafts stay empty until the
                Master Brain has facts to work from.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="bg-surface border border-borderSubtle rounded-2xl p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-mono text-emerald-400">
              prisma.profile.findUnique({`{ where: { handle: "${profile.handle}" } }`})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyJson}
                className="px-3 py-1 rounded-lg bg-elevated border border-borderSubtle text-xs text-zinc-200 hover:bg-zinc-800"
              >
                Copy JSON
              </button>
              <button
                type="button"
                onClick={saveJson}
                disabled={savingJson}
                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-xs text-white font-medium flex items-center gap-1.5"
              >
                <i className={savingJson ? "ph ph-circle-notch animate-spin" : "ph-bold ph-floppy-disk"} />
                {savingJson ? "Saving…" : "Save JSON"}
              </button>
            </div>
          </div>
          <textarea
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
            rows={26}
            spellCheck={false}
            className="w-full bg-canvas border border-borderSubtle rounded-xl p-4 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed outline-none focus:border-indigo-500 resize-y"
          />
          <p className="text-[11px] text-zinc-500">
            Edit <span className="font-mono text-zinc-400">experienceBlocks</span> and{" "}
            <span className="font-mono text-zinc-400">portfolioLinks</span> directly. Invalid JSON
            or non-array blocks are rejected without touching the database.
          </p>
        </div>
      )}
    </section>
  );
}
