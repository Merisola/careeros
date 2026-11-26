import { Block } from "./db";
type KitCv = { blocks: { blockId: string; bullets: { text: string; src: number }[] }[] };
const nums = (s: string) => (s.match(/\d[\d,.]*%?/g) ?? []).map(x => x.replace(/[,.]$/, ""));

export function verifyCv(cv: KitCv, blocks: Block[]): string[] {
  const errors: string[] = [];
  for (const cb of cv.blocks ?? []) {
    const src = blocks.find(b => b.id === cb.blockId);
    if (!src) { errors.push(`Unknown blockId "${cb.blockId}". Use ids from get_master_profile.`); continue; }
    for (const b of cb.bullets ?? []) {
      const orig = src.bullets[b.src];
      if (orig === undefined) { errors.push(`${cb.blockId}: src ${b.src} is not a bullet index.`); continue; }
      const allowed = new Set(nums(orig));
      const extra = nums(b.text).filter(n => !allowed.has(n));
      if (extra.length) errors.push(`${cb.blockId}[${b.src}]: new numbers not in the source bullet: ${extra.join(", ")}`);
    }
  }
  return errors;
}
