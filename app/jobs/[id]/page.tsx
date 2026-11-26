import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
const STATUSES = ["Saved", "Tailored", "Applied", "Follow-up", "Interview", "Rejected", "Offer"];

export default async function JobPage({ params }: { params: { id: string } }) {
  const id = +params.id;
  const job = await db.job.findUnique({ where: { id }, include: { kits: { orderBy: { version: "desc" } } } });
  if (!job) notFound();
  async function setStatus(fd: FormData) {
    "use server";
    const status = String(fd.get("status"));
    if (!STATUSES.includes(status)) return;
    await db.job.update({ where: { id }, data: { status, ...(status === "Applied" ? { appliedAt: new Date() } : {}) } });
    revalidatePath(`/jobs/${id}`);
  }
  const k = job.kits[0];
  return (<>
    <h1>{job.title} <span className="muted">at {job.company}</span></h1>
    <div className="card"><span className="chip">fit {job.fitScore ?? "–"}</span>{job.keywords.map(x => <span className="chip" key={x}>{x}</span>)}{job.missing.map(x => <span className="chip" key={x}>gap: {x}</span>)}
      <form action={setStatus} className="row" style={{ marginTop: 10 }}><select name="status" defaultValue={job.status}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select><button>Update status</button></form>
      {job.url && <p><a href={job.url} target="_blank" rel="noopener">Source</a></p>}</div>
    {!k ? <div className="card muted">No kit yet. In your AI client (connected to /api/mcp): "Tailor an application for job #{job.id} from my master profile."</div> : (<>
      <div className="card"><b>Latest kit: v{k.version}</b> ({job.kits.length} total) · <a href={`/jobs/${id}/cv?v=${k.version}`}>Open CV</a>
        {[["Cover letter", k.coverLetter], ["Portfolio angle", k.portfolioAngle], ["LinkedIn message", k.dm], ["Day-5 follow-up", k.followUp5], ["Day-12 follow-up", k.followUp12]].map(([t, v]) => v && <div key={t}><h3>{t}</h3><pre style={{ whiteSpace: "pre-wrap", font: "inherit" }}>{v}</pre></div>)}</div></>)}
  </>);
}
