import { notFound } from "next/navigation";
import { db, getProfile, Block } from "@/lib/db";
import PrintButton from "@/components/PrintButton";
export const dynamic = "force-dynamic";

export default async function Cv({ params, searchParams }: { params: { id: string }; searchParams: { v?: string } }) {
  const kit = await db.kit.findFirst({ where: { jobId: +params.id, ...(searchParams.v ? { version: +searchParams.v } : {}) }, orderBy: { version: "desc" } });
  if (!kit) notFound();
  const p = await getProfile(), blocks = p.blocks as Block[];
  const cv = kit.cv as { headline?: string; summary?: string; skills?: string[]; blocks: { blockId: string; bullets: { text: string }[] }[] };
  return (<><PrintButton />
    <div className="sheet"><h2 style={{ margin: 0 }}>{p.name}</h2><div>{cv.headline ?? p.headline} · {p.site}</div><div>{p.contact}</div>
      <h4>SUMMARY</h4><p>{cv.summary ?? p.summary}</p>
      {!!cv.skills?.length && <><h4>SKILLS</h4><p>{cv.skills.join(" · ")}</p></>}
      <h4>EXPERIENCE</h4>
      {cv.blocks.map(cb => { const b = blocks.find(x => x.id === cb.blockId); return b && <div key={cb.blockId} style={{ marginTop: 8 }}><b>{b.role}</b>, {b.org} <span style={{ float: "right" }}>{b.period}</span><ul>{cb.bullets.map((x, i) => <li key={i}>{x.text}</li>)}</ul></div>; })}
      <h4>EDUCATION</h4><p>{p.education}</p></div></>);
}
