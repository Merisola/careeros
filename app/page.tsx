import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createJob, fetchReader } from "@/lib/jobs";
export const dynamic = "force-dynamic";

async function add(fd: FormData) {
  "use server";
  const url = String(fd.get("url") || ""); let jd = String(fd.get("jd") || "");
  if (!jd && url) jd = (await fetchReader(url)) ?? "";
  if (!jd) redirect("/?err=1");
  const j = await createJob({ url, title: String(fd.get("title") || "Untitled role"), company: String(fd.get("company") || "Unknown"), jdText: jd, workMode: String(fd.get("mode")), salary: String(fd.get("salary") || "") });
  redirect(`/jobs/${j.id}`);
}

export default async function Home({ searchParams }: { searchParams: { err?: string } }) {
  const jobs = await db.job.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { kits: true } } } });
  return (<>
    <h1>Job vault</h1>
    <form action={add} className="card">
      {searchParams.err && <p className="muted">Could not read that link. Paste the job description instead.</p>}
      <div className="row"><input name="title" placeholder="Role" /><input name="company" placeholder="Company" />
        <select name="mode"><option>Remote</option><option>Hybrid</option><option>On-Site</option></select><input name="salary" placeholder="Compensation" /></div>
      <input name="url" placeholder="Job link (optional)" style={{ marginTop: 8 }} />
      <textarea name="jd" rows={5} placeholder="Paste the job description (or leave empty to fetch the link)" style={{ marginTop: 8 }} />
      <button style={{ marginTop: 8 }}>Save and score</button>
    </form>
    {jobs.map(j => <a key={j.id} href={`/jobs/${j.id}`} style={{ textDecoration: "none", color: "inherit" }}><div className="card">
      <b>{j.title}</b> <span className="muted">at {j.company}</span><div style={{ marginTop: 4 }}>
      <span className="chip">fit {j.fitScore ?? "–"}</span><span className="chip">{j.status}</span><span className="chip">{j._count.kits} kit version(s)</span></div></div></a>)}
  </>);
}
