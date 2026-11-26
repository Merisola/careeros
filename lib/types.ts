export type PortfolioLink = {
  id: string;
  title: string;
  url: string;
  stack: string[];
  pitch: string;
};

export type ExperienceBlock = {
  id: string;
  role: string;
  org: string;
  period: string;
  tags: string[];
  bullets: string[];
};

export type ProfileUI = {
  handle: string;
  name: string;
  headline: string;
  contact: string;
  site: string;
  summary: string;
  education: string;
  workModePreference: string;
  targetCompensation: string;
  portfolioLinks: PortfolioLink[];
  experienceBlocks: ExperienceBlock[];
};

export type KitBullet = { text: string; src?: number };
export type KitCvBlock = { blockId: string; bullets: KitBullet[] };
export type KitCv = {
  headline?: string;
  summary?: string;
  skills?: string[];
  blocks: KitCvBlock[];
};

export type KitUI = {
  id: number;
  version: number;
  cv: KitCv;
  coverLetter: string;
  portfolioAngle: string;
  dm: string;
  followUp5: string;
  followUp12: string;
  createdAt: string;
};

export type JobUI = {
  id: number;
  role: string;
  company: string;
  workMode: string;
  salary: string;
  status: string;
  appliedAt: string | null;
  createdAt: string;
  daysSinceApplied: number;
  fitScore: number | null;
  url: string;
  matchedSkills: string[];
  missingSkills: string[];
  jdSummary: string;
  jdText: string;
  latestKit: KitUI | null;
  draftCv: KitCv;
};

export type McpToolMeta = {
  name: string;
  description: string;
  inputSchema: unknown;
};

export type ToastTone = "indigo" | "amber";

export type ViewName = "vault" | "bridge" | "studio" | "brain" | "mcp";

export type PomodoroUI = {
  seconds: number;
  running: boolean;
  sessions: number;
  kits: number;
  complete: boolean;
  summary: string;
};
