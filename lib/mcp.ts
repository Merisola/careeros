import { db, getProfile, Block } from "@/lib/db";
import { createJob, fetchReader } from "@/lib/jobs";
import { verifyCv } from "@/lib/guardrails";

export const JOB_STATUSES = [
  "Saved",
  "Tailored",
  "Applied",
  "Follow-up",
  "Interview",
  "Rejected",
  "Offer",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

const str = (d: string) => ({ type: "string", description: d });

export const MCP_TOOLS = [
  {
    name: "get_master_profile",
    description:
      "Full structured experience. Tailor ONLY from these facts; reference blocks by id and bullets by index.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "save_job_target",
    description:
      "Save a job. Give jdText, or just url to try reading the page (falls back to an error asking for pasted text).",
    inputSchema: {
      type: "object",
      properties: {
        title: str("Role title"),
        company: str("Company"),
        url: str("Job link"),
        jdText: str("Full job description"),
        workMode: str("Remote | Hybrid | On-Site"),
        salary: str("Compensation"),
      },
      required: ["title", "company"],
    },
  },
  {
    name: "get_job",
    description: "Read a saved job (JD text, keywords, gaps, fit score, latest kit).",
    inputSchema: {
      type: "object",
      properties: { job_id: { type: "number" } },
      required: ["job_id"],
    },
  },
  {
    name: "save_application_kit",
    description:
      "Save a new versioned kit. cv = { headline, summary, skills: string[], blocks: [{ blockId, bullets: [{ text, src }] }] }. Each bullet must rephrase master bullet #src and may not add new numbers; violations are rejected.",
    inputSchema: {
      type: "object",
      properties: {
        job_id: { type: "number" },
        cv: { type: "object" },
        coverLetter: str("Cover letter"),
        portfolioAngle: str("Which projects to lead with and why"),
        dm: str("3-sentence LinkedIn DM"),
        followUp5: str("Day-5 follow-up"),
        followUp12: str("Day-12 follow-up"),
      },
      required: ["job_id", "cv"],
    },
  },
  {
    name: "list_pending_followups",
    description: "Jobs Applied/Follow-up for more than N days (default 5).",
    inputSchema: {
      type: "object",
      properties: { days: { type: "number" } },
    },
  },
  {
    name: "update_job_status",
    description: "Move a job through the pipeline. Setting Applied stamps the applied date.",
    inputSchema: {
      type: "object",
      properties: {
        job_id: { type: "number" },
        status: { type: "string", enum: [...JOB_STATUSES] },
      },
      required: ["job_id", "status"],
    },
  },
];

export async function callTool(name: string, a: any): Promise<unknown> {
  switch (name) {
    case "get_master_profile":
      return getProfile();

    case "save_job_target": {
      let jd = a.jdText as string | undefined;
      if (!jd && a.url) jd = (await fetchReader(a.url)) ?? undefined;
      if (!jd) {
        throw new Error(
          "Could not read that page (blocked or login wall). Ask the user to paste the job description.",
        );
      }
      const j = await createJob({ ...a, jdText: jd });
      return { job_id: j.id, fitScore: j.fitScore, matched: j.keywords, gaps: j.missing };
    }

    case "get_job":
      return db.job.findUnique({
        where: { id: a.job_id },
        include: { kits: { orderBy: { version: "desc" }, take: 1 } },
      });

    case "save_application_kit": {
      const p = await getProfile();
      const errors = verifyCv(a.cv, p.blocks as Block[]);
      if (errors.length) {
        throw new Error("Fact-lock rejected the kit:\n- " + errors.join("\n- "));
      }
      const last = await db.kit.findFirst({
        where: { jobId: a.job_id },
        orderBy: { version: "desc" },
      });
      const kit = await db.kit.create({
        data: {
          jobId: a.job_id,
          version: (last?.version ?? 0) + 1,
          cv: a.cv,
          coverLetter: a.coverLetter ?? "",
          portfolioAngle: a.portfolioAngle ?? "",
          dm: a.dm ?? "",
          followUp5: a.followUp5 ?? "",
          followUp12: a.followUp12 ?? "",
        },
      });
      await db.job.updateMany({
        where: { id: a.job_id, status: "Saved" },
        data: { status: "Tailored" },
      });
      return { kit_id: kit.id, version: kit.version };
    }

    case "list_pending_followups": {
      const cutoff = new Date(Date.now() - (a.days ?? 5) * 864e5);
      return db.job.findMany({
        where: { status: { in: ["Applied", "Follow-up"] }, appliedAt: { lt: cutoff } },
        select: {
          id: true,
          title: true,
          company: true,
          appliedAt: true,
          status: true,
          url: true,
        },
      });
    }

    case "update_job_status": {
      if (!JOB_STATUSES.includes(a.status)) throw new Error("Invalid status");
      return db.job.update({
        where: { id: a.job_id },
        data: {
          status: a.status,
          ...(a.status === "Applied" ? { appliedAt: new Date() } : {}),
        },
        select: { id: true, status: true, appliedAt: true },
      });
    }
  }
  throw new Error("Unknown tool " + name);
}

export type RpcResult = { body: unknown; status: number };

export async function handleRpc(m: any): Promise<RpcResult | null> {
  const ok = (result: unknown): RpcResult => ({
    body: { jsonrpc: "2.0", id: m.id, result },
    status: 200,
  });

  if (typeof m?.method === "string" && m.method.startsWith("notifications/")) return null;

  if (m.method === "initialize") {
    return ok({
      protocolVersion: "2025-03-26",
      capabilities: { tools: {} },
      serverInfo: { name: "careeros", version: "1.0.0" },
    });
  }
  if (m.method === "ping") return ok({});
  if (m.method === "tools/list") return ok({ tools: MCP_TOOLS });
  if (m.method === "tools/call") {
    try {
      return ok({
        content: [
          {
            type: "text",
            text: JSON.stringify(await callTool(m.params.name, m.params.arguments ?? {}), null, 2),
          },
        ],
      });
    } catch (e: any) {
      return ok({ isError: true, content: [{ type: "text", text: e.message }] });
    }
  }

  return {
    body: {
      jsonrpc: "2.0",
      id: m?.id,
      error: { code: -32601, message: "Method not found" },
    },
    status: 200,
  };
}
