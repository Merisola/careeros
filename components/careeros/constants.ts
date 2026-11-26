export const JOB_STATUSES = [
  "Saved",
  "Tailored",
  "Applied",
  "Follow-up",
  "Interview",
  "Rejected",
  "Offer",
] as const;

export const WORK_MODES = ["Remote (Preferred)", "Hybrid", "On-Site"] as const;

export const STATUS_STYLES: Record<string, string> = {
  Saved: "bg-zinc-800 text-zinc-300 border-zinc-700",
  Tailored: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  Applied: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  "Follow-up": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Interview: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Rejected: "bg-rose-500/10 text-rose-300 border-rose-500/25",
  Offer: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
};

export const PIPELINE_FILTERS = [
  "ALL",
  "Saved",
  "Tailored",
  "Applied",
  "Follow-up",
  "Interview",
  "Offer",
  "Rejected",
] as const;

export const SAMPLE_JD = {
  role: "Technical Project Manager (AI & Platform)",
  company: "Linearity Labs",
  workMode: "Remote (Preferred)",
  salary: "$1,900/mo",
  jdText:
    "We are looking for a Technical Project Manager to own sprint velocity, CI/CD release reliability, and cross-functional Agile delivery across TypeScript and PostgreSQL services. Bonus points for hands-on experience with LLM workflows, MCP servers, or automated QA pipelines. Requires strong documentation and clear communication.",
};
