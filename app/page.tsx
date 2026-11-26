import { db, getProfile } from "@/lib/db";
import { MCP_TOOLS } from "@/lib/mcp";
import { toJobUI, toProfileUI } from "@/lib/ui";
import CareerOSApp from "@/components/careeros/CareerOSApp";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default async function Home({ searchParams }: { searchParams: { job?: string } }) {
  const [profileRow, jobs] = await Promise.all([
    getProfile(),
    db.job.findMany({
      orderBy: { createdAt: "desc" },
      include: { kits: { orderBy: { version: "desc" }, take: 1 } },
    }),
  ]);

  const profile = toProfileUI(profileRow);
  const jobUIs = jobs.map((job) => toJobUI(job, profile));
  const mcpTools = MCP_TOOLS.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  }));

  const requestedId = Number(searchParams.job);
  const initialJobId =
    Number.isFinite(requestedId) && requestedId > 0 ? requestedId : null;

  return (
    <CareerOSApp
      initialProfile={profile}
      initialJobs={jobUIs}
      mcpTools={mcpTools}
      initialJobId={initialJobId}
    />
  );
}
