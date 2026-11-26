import { db, getProfile, Block } from "./db";

// Trying a reader API first; callers fall back to "paste the JD" when it fails.
export async function fetchReader(url: string): Promise<string | null> {
  try {
    const r = await fetch("https://r.jina.ai/" + url, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return null;
    const t = await r.text();
    return /authwall|sign in to linkedin/i.test(t.slice(0, 1500)) || t.length < 200 ? null : t.slice(0, 20000);
  } catch { return null; }
}

const GAPS = ["Kubernetes", "GraphQL", "SOC2", "Terraform", "AWS", "FHIR", "Salesforce", "HubSpot"];

// Fit = how much of the JD your own profile can back up. Location never lowers it.
export async function createJob(i: { url?: string; title: string; company: string; jdText: string; workMode?: string; salary?: string }) {
  const p = await getProfile();
  const tags = [...new Set((p.blocks as Block[]).flatMap(b => b.tags))];
  const t = i.jdText.toLowerCase();
  const keywords = tags.filter(k => t.includes(k.toLowerCase()));
  const missing = GAPS.filter(g => t.includes(g.toLowerCase()) && !tags.some(k => k.toLowerCase() === g.toLowerCase()));
  const fitScore = tags.length ? +Math.min(10, 4 + (keywords.length / Math.max(6, Math.min(tags.length, 12))) * 6 - missing.length * 0.4).toFixed(1) : null;
  return db.job.create({ data: { url: i.url ?? "", title: i.title, company: i.company, jdText: i.jdText.slice(0, 30000), workMode: i.workMode ?? "Remote", salary: i.salary ?? "", keywords, missing, fitScore } });
}
