import { revalidatePath } from "next/cache";
import { db, getProfile } from "@/lib/db";
export const dynamic = "force-dynamic";

async function save(fd: FormData) {
  "use server";
  const f = (k: string) => String(fd.get(k) ?? "");
  let blocks; try { blocks = JSON.parse(f("blocks")); if (!Array.isArray(blocks)) throw 0; } catch { return; }
  await db.profile.update({ where: { handle: "meron" }, data: { name: f("name"), headline: f("headline"), contact: f("contact"), site: f("site"), summary: f("summary"), education: f("education"), blocks } });
  revalidatePath("/profile");
}

export default async function ProfilePage() {
  const p = await getProfile();
  return (<><h1>Master profile</h1>
    <p className="muted">The only source of facts. Tailored kits may rephrase these bullets, never add to them. Blocks: id, role, org, period, tags[], bullets[].</p>
    <form action={save} className="card">
      <div className="row"><input name="name" defaultValue={p.name} placeholder="Name" /><input name="headline" defaultValue={p.headline} placeholder="Headline" /><input name="site" defaultValue={p.site} placeholder="Website" /></div>
      <input name="contact" defaultValue={p.contact} placeholder="Contact line" style={{ marginTop: 8 }} />
      <textarea name="summary" defaultValue={p.summary} rows={3} placeholder="Summary" style={{ marginTop: 8 }} />
      <input name="education" defaultValue={p.education} placeholder="Education line" style={{ marginTop: 8 }} />
      <textarea name="blocks" defaultValue={JSON.stringify(p.blocks, null, 2)} rows={22} style={{ marginTop: 8, fontFamily: "monospace" }} />
      <button style={{ marginTop: 8 }}>Save profile</button></form></>);
}
