import type { Job, Kit, Profile } from "@prisma/client";
import type {
  ExperienceBlock,
  JobUI,
  KitCv,
  KitCvBlock,
  KitUI,
  PortfolioLink,
  ProfileUI,
} from "./types";

const asString = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const asStringArray = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];

export function normalizeBlocks(v: unknown): ExperienceBlock[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((raw, i) => {
    if (!raw || typeof raw !== "object") return [];
    const b = raw as Record<string, unknown>;
    const bullets = asStringArray(b.bullets);
    if (!bullets.length) return [];
    return [
      {
        id: asString(b.id) || `exp-${i + 1}`,
        role: asString(b.role, "Role"),
        org: asString(b.org),
        period: asString(b.period),
        tags: asStringArray(b.tags),
        bullets,
      },
    ];
  });
}

export function normalizePortfolio(v: unknown): PortfolioLink[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((raw, i) => {
    if (!raw || typeof raw !== "object") return [];
    const p = raw as Record<string, unknown>;
    const title = asString(p.title);
    if (!title) return [];
    return [
      {
        id: asString(p.id) || `port-${i + 1}`,
        title,
        url: asString(p.url),
        stack: asStringArray(p.stack),
        pitch: asString(p.pitch),
      },
    ];
  });
}

export function normalizeCv(v: unknown): KitCv {
  const raw = (v ?? {}) as Record<string, unknown>;
  const blocks: KitCvBlock[] = Array.isArray(raw.blocks)
    ? raw.blocks.flatMap((entry) => {
        if (!entry || typeof entry !== "object") return [];
        const b = entry as Record<string, unknown>;
        const blockId = asString(b.blockId);
        if (!blockId) return [];
        const bullets = Array.isArray(b.bullets)
          ? b.bullets.flatMap((x) => {
              if (!x || typeof x !== "object") return [];
              const bullet = x as Record<string, unknown>;
              const text = asString(bullet.text);
              if (!text) return [];
              return [{ text, src: typeof bullet.src === "number" ? bullet.src : undefined }];
            })
          : [];
        return [{ blockId, bullets }];
      })
    : [];

  return {
    headline: asString(raw.headline) || undefined,
    summary: asString(raw.summary) || undefined,
    skills: asStringArray(raw.skills),
    blocks,
  };
}

export function toProfileUI(p: Profile): ProfileUI {
  return {
    handle: p.handle,
    name: p.name,
    headline: p.headline,
    contact: p.contact,
    site: p.site,
    summary: p.summary,
    education: p.education,
    workModePreference: p.workModePreference,
    targetCompensation: p.targetCompensation,
    portfolioLinks: normalizePortfolio(p.portfolioLinks),
    experienceBlocks: normalizeBlocks(p.blocks),
  };
}

export function toKitUI(kit: Kit): KitUI {
  return {
    id: kit.id,
    version: kit.version,
    cv: normalizeCv(kit.cv),
    coverLetter: kit.coverLetter,
    portfolioAngle: kit.portfolioAngle,
    dm: kit.dm,
    followUp5: kit.followUp5,
    followUp12: kit.followUp12,
    createdAt: kit.createdAt.toISOString(),
  };
}

function blockRelevance(block: ExperienceBlock, terms: string[]): number {
  const haystack = `${block.role} ${block.org} ${block.tags.join(" ")} ${block.bullets.join(" ")}`.toLowerCase();
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

function buildCv(title: string, keywords: string[], profile: ProfileUI): KitCv {
  const terms = [...keywords, ...title.split(/\s+/).filter((word) => word.length > 3)]
    .map((term) => term.toLowerCase())
    .filter(Boolean);

  const ordered = [...profile.experienceBlocks].sort(
    (a, b) => blockRelevance(b, terms) - blockRelevance(a, terms),
  );

  const skills = Array.from(
    new Set([...keywords, ...profile.experienceBlocks.flatMap((block) => block.tags)]),
  ).slice(0, 16);

  return {
    headline: [title, profile.headline].filter(Boolean).join(" • "),
    summary: profile.summary,
    skills,
    blocks: ordered.map((block) => ({
      blockId: block.id,
      bullets: block.bullets.map((text, src) => ({ text, src })),
    })),
  };
}

export function buildDraftCv(job: Job, profile: ProfileUI): KitCv {
  return buildCv(job.title, job.keywords, profile);
}

export function buildDraftCvFromUI(job: JobUI, profile: ProfileUI): KitCv {
  return buildCv(job.role, job.matchedSkills, profile);
}

export function toJobUI(job: Job & { kits: Kit[] }, profile: ProfileUI): JobUI {
  const latestKit = job.kits[0] ? toKitUI(job.kits[0]) : null;
  const jdSummary = job.jdText.replace(/\s+/g, " ").trim();
  const daysSinceApplied = job.appliedAt
    ? Math.max(0, Math.floor((Date.now() - job.appliedAt.getTime()) / 864e5))
    : 0;

  return {
    id: job.id,
    role: job.title,
    company: job.company,
    workMode: job.workMode,
    salary: job.salary,
    status: job.status,
    appliedAt: job.appliedAt ? job.appliedAt.toISOString() : null,
    createdAt: job.createdAt.toISOString(),
    daysSinceApplied,
    fitScore: job.fitScore,
    url: job.url,
    matchedSkills: job.keywords,
    missingSkills: job.missing,
    jdSummary: jdSummary.slice(0, 180) + (jdSummary.length > 180 ? "…" : ""),
    jdText: job.jdText,
    latestKit,
    draftCv: buildDraftCv(job, profile),
  };
}
