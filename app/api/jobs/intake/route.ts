import { NextRequest, NextResponse } from "next/server";
import { createJob } from "@/lib/jobs";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};
export const OPTIONS = () => new NextResponse(null, { status: 204, headers: cors });

// Bookmarklet / Anchor Tab target: POST { url, title, innerText } with Authorization: Bearer API_TOKEN.
// Optional: role, company, workMode, salary (Anchor Tab custom fields).
export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.API_TOKEN}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: cors });
  }

  const body = await req.json().catch(() => null);
  if (!body?.innerText) {
    return NextResponse.json({ error: "innerText required" }, { status: 400, headers: cors });
  }

  const parts = String(body.title ?? "").split(/\s[|\-–@]\s/);
  const title = String(body.role ?? parts[0] ?? "").trim() || "Untitled role";
  const company = String(body.company ?? parts[1] ?? "").trim() || "Unknown";

  const job = await createJob({
    url: body.url ? String(body.url) : undefined,
    title,
    company,
    jdText: String(body.innerText).slice(0, 30000),
    workMode: body.workMode ? String(body.workMode) : undefined,
    salary: body.salary ? String(body.salary) : undefined,
  });

  return NextResponse.json(
    { id: job.id, fitScore: job.fitScore, keywords: job.keywords, missing: job.missing },
    { status: 201, headers: cors },
  );
}
