"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db, getProfile } from "@/lib/db";
import { createJob, fetchReader } from "@/lib/jobs";
import { verifyCv } from "@/lib/guardrails";
import { handleRpc, JOB_STATUSES } from "@/lib/mcp";
import {
  buildDraftCv,
  normalizeBlocks,
  normalizeCv,
  normalizePortfolio,
  toJobUI,
  toProfileUI,
} from "@/lib/ui";
import type { JobUI, PortfolioLink, ProfileUI } from "@/lib/types";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function loadProfileUI(): Promise<ProfileUI> {
  return toProfileUI(await getProfile());
}

async function loadJobUI(id: number): Promise<JobUI | null> {
  const job = await db.job.findUnique({
    where: { id },
    include: { kits: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (!job) return null;
  return toJobUI(job, await loadProfileUI());
}

export async function ingestJob(input: {
  role: string;
  company: string;
  workMode: string;
  salary: string;
  url?: string;
  jdText: string;
}): Promise<ActionResult<JobUI>> {
  const jdText = (input.jdText ?? "").trim();
  if (jdText.length < 20) {
    return { ok: false, error: "Paste a job description first (at least a couple of sentences)." };
  }

  const job = await createJob({
    url: input.url?.trim() || undefined,
    title: input.role.trim() || "Technical Project Manager",
    company: input.company.trim() || "Stealth SaaS",
    jdText,
    workMode: input.workMode || "Remote (Preferred)",
    salary: input.salary.trim(),
  });

  revalidatePath("/");
  const profile = await loadProfileUI();
  return { ok: true, data: toJobUI({ ...job, kits: [] }, profile) };
}

export async function fetchJobFromUrl(
  rawUrl: string,
): Promise<
  { ok: true; data: { url: string; jdText: string } } | { ok: false; error: string; authwall: boolean }
> {
  const trimmed = rawUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("bad protocol");
  } catch {
    return { ok: false, error: "Enter a valid http(s) job URL.", authwall: false };
  }

  const jdText = await fetchReader(parsed.toString());
  if (!jdText) {
    const authwall = /(^|\.)linkedin\.com$/i.test(parsed.hostname);
    return {
      ok: false,
      error: authwall
        ? "LinkedIn authwall detected (HTTP 999) — paste the JD with Tier 1 or use the bookmarklet."
        : "The reader API could not extract this page. Paste the JD instead.",
      authwall,
    };
  }

  return { ok: true, data: { url: parsed.toString(), jdText } };
}

export async function ingestCapturedTab(input: {
  url: string;
  pageTitle: string;
  innerText: string;
  company: string;
  workMode: string;
  salary: string;
}): Promise<ActionResult<JobUI>> {
  const innerText = (input.innerText ?? "").trim();
  if (!innerText) {
    return { ok: false, error: "Captured document.body.innerText cannot be empty." };
  }

  const role =
    input.pageTitle.split("|")[0].split(/\s[-–]\s/)[0].trim() || "Technical Project Manager";

  const job = await createJob({
    url: input.url.trim() || undefined,
    title: role,
    company: input.company.trim() || "Captured Company",
    jdText: innerText,
    workMode: input.workMode || "Remote (Preferred)",
    salary: input.salary.trim(),
  });

  revalidatePath("/");
  return { ok: true, data: toJobUI({ ...job, kits: [] }, await loadProfileUI()) };
}

export async function updateJobStatus(
  jobId: number,
  status: string,
): Promise<ActionResult<JobUI>> {
  if (!(JOB_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: "Invalid status." };
  }

  const existing = await db.job.findUnique({
    where: { id: jobId },
    select: { appliedAt: true },
  });
  if (!existing) return { ok: false, error: "Job not found." };

  await db.job.update({
    where: { id: jobId },
    data: {
      status,
      ...(status === "Applied" && !existing.appliedAt ? { appliedAt: new Date() } : {}),
    },
  });

  revalidatePath("/");
  const job = await loadJobUI(jobId);
  return job ? { ok: true, data: job } : { ok: false, error: "Job not found." };
}

export async function saveProfile(input: {
  name: string;
  headline: string;
  contact: string;
  site: string;
  summary: string;
  education: string;
  workModePreference: string;
  targetCompensation: string;
}): Promise<ActionResult<ProfileUI>> {
  const current = await getProfile();
  const updated = await db.profile.update({
    where: { handle: current.handle },
    data: {
      name: input.name.trim() || "Your Name",
      headline: input.headline.trim(),
      contact: input.contact.trim(),
      site: input.site.trim(),
      summary: input.summary.trim(),
      education: input.education.trim(),
      workModePreference: input.workModePreference.trim() || "Remote (Preferred)",
      targetCompensation: input.targetCompensation.trim(),
    },
  });

  revalidatePath("/");
  return { ok: true, data: toProfileUI(updated) };
}

export async function savePortfolioLinks(links: PortfolioLink[]): Promise<ActionResult<ProfileUI>> {
  const current = await getProfile();
  const updated = await db.profile.update({
    where: { handle: current.handle },
    data: { portfolioLinks: normalizePortfolio(links) },
  });

  revalidatePath("/");
  return { ok: true, data: toProfileUI(updated) };
}

export async function addProfileBlock(input: {
  role: string;
  org: string;
  period: string;
  tags: string;
  bullet: string;
}): Promise<ActionResult<ProfileUI>> {
  const role = input.role.trim();
  const bullet = input.bullet.trim();
  if (!role || !bullet) {
    return { ok: false, error: "Enter both a project/role title and an Action + Context + Metric bullet." };
  }

  const current = await getProfile();
  const blocks = normalizeBlocks(current.blocks);
  const slug =
    role
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 18) || "block";
  const id = `exp-${slug}-${Date.now().toString(36).slice(-4)}`;

  const block = {
    id,
    role,
    org: input.org.trim() || "Verified Master Block",
    period: input.period.trim() || String(new Date().getFullYear()),
    tags: input.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    bullets: [bullet],
  };

  const updated = await db.profile.update({
    where: { handle: current.handle },
    data: { blocks: [block, ...blocks] },
  });

  revalidatePath("/");
  return { ok: true, data: toProfileUI(updated) };
}

export async function deleteProfileBlock(id: string): Promise<ActionResult<ProfileUI>> {
  const current = await getProfile();
  const blocks = normalizeBlocks(current.blocks).filter((block) => block.id !== id);
  const updated = await db.profile.update({
    where: { handle: current.handle },
    data: { blocks },
  });

  revalidatePath("/");
  return { ok: true, data: toProfileUI(updated) };
}

export async function saveProfileJson(json: string): Promise<ActionResult<ProfileUI>> {
  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "That is not valid JSON." };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "JSON root must be an object." };
  }

  const blockSource = parsed.experienceBlocks ?? parsed.blocks;
  if (blockSource !== undefined && !Array.isArray(blockSource)) {
    return { ok: false, error: "experienceBlocks must be an array." };
  }
  if (parsed.portfolioLinks !== undefined && !Array.isArray(parsed.portfolioLinks)) {
    return { ok: false, error: "portfolioLinks must be an array." };
  }

  const current = await getProfile();
  const updated = await db.profile.update({
    where: { handle: current.handle },
    data: {
      name:
        typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : current.name,
      headline:
        typeof parsed.headline === "string" ? parsed.headline.trim() : current.headline,
      contact: typeof parsed.contact === "string" ? parsed.contact.trim() : current.contact,
      site: typeof parsed.site === "string" ? parsed.site.trim() : current.site,
      summary: typeof parsed.summary === "string" ? parsed.summary.trim() : current.summary,
      education:
        typeof parsed.education === "string" ? parsed.education.trim() : current.education,
      workModePreference:
        typeof parsed.workModePreference === "string"
          ? parsed.workModePreference.trim()
          : current.workModePreference,
      targetCompensation:
        typeof parsed.targetCompensation === "string"
          ? parsed.targetCompensation.trim()
          : current.targetCompensation,
      ...(blockSource !== undefined ? { blocks: normalizeBlocks(blockSource) } : {}),
      ...(parsed.portfolioLinks !== undefined
        ? { portfolioLinks: normalizePortfolio(parsed.portfolioLinks) }
        : {}),
    },
  });

  revalidatePath("/");
  return { ok: true, data: toProfileUI(updated) };
}

export async function saveKitEdits(
  jobId: number,
  edits: {
    coverLetter: string;
    portfolioAngle: string;
    dm: string;
    followUp5: string;
    followUp12: string;
  },
): Promise<ActionResult<JobUI>> {
  const job = await db.job.findUnique({
    where: { id: jobId },
    include: { kits: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (!job) return { ok: false, error: "Job not found." };

  const profile = await loadProfileUI();
  const baseCv = job.kits[0] ? normalizeCv(job.kits[0].cv) : buildDraftCv(job, profile);
  const errors = verifyCv(baseCv, profile.experienceBlocks);
  if (errors.length) {
    return { ok: false, error: "Fact-lock rejected the CV: " + errors.join("; ") };
  }

  const version = (job.kits[0]?.version ?? 0) + 1;
  await db.kit.create({
    data: {
      jobId,
      version,
      cv: baseCv as any,
      coverLetter: edits.coverLetter.trim(),
      portfolioAngle: edits.portfolioAngle.trim(),
      dm: edits.dm.trim(),
      followUp5: edits.followUp5.trim(),
      followUp12: edits.followUp12.trim(),
    },
  });

  await db.job.updateMany({
    where: { id: jobId, status: "Saved" },
    data: { status: "Tailored" },
  });

  revalidatePath("/");
  const updated = await loadJobUI(jobId);
  return updated ? { ok: true, data: updated } : { ok: false, error: "Job not found." };
}

export async function invokeMcp(
  request: string,
): Promise<
  { ok: true; data: { response: unknown; ms: number } } | { ok: false; error: string }
> {
  let message: any;
  try {
    message = JSON.parse(request);
  } catch {
    return { ok: false, error: "Request is not valid JSON." };
  }

  const started = Date.now();
  try {
    const result = await handleRpc(message);
    return {
      ok: true,
      data: { response: result ? result.body : null, ms: Date.now() - started },
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "MCP call failed." };
  }
}

export async function getIntakeSnippet(
  kind: "bookmarklet" | "anchor",
): Promise<{ ok: true; data: string } | { ok: false; error: string }> {
  const token = process.env.API_TOKEN;
  if (!token) return { ok: false, error: "API_TOKEN is not configured on the server." };

  const h = headers();
  const host = h.get("host") ?? "careeros-rose-iota.vercel.app";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const origin = `${proto}://${host}`;

  if (kind === "anchor") {
    return {
      ok: true,
      data: `// Anchor Tab action -> POST ${origin}/api/jobs/intake
async function sendActiveTabToJobHunt(tab) {
  const res = await fetch("${origin}/api/jobs/intake", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer ${token}",
    },
    body: JSON.stringify({
      url: tab.url,
      title: tab.title,
      innerText: (tab.innerText ?? document.body.innerText).slice(0, 30000),
    }),
  });
  return res.json();
}`,
    };
  }

  return {
    ok: true,
    data: `javascript:(async()=>{try{const t=document.body.innerText.slice(0,30000);const r=await fetch('${origin}/api/jobs/intake',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer ${token}'},body:JSON.stringify({url:location.href,title:document.title,innerText:t})});const j=await r.json();alert(r.ok?'Saved to CareerOS Vault! Fit: '+(j.fitScore??'-'):'CareerOS error: '+(j.error||r.status))}catch(e){alert('CareerOS save failed: '+e.message)}})();`,
  };
}
