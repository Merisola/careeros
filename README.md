# CareerOS

Personal career command center: a job vault, tab clipper, application kit studio, master career profile, and an MCP server — all backed by Neon Postgres via Prisma. Built with Next.js 14 + Tailwind CSS.

## Features

- **Job Vault** — ingest a job description (paste, reader-API fetch, or bookmarklet), auto-score fit 1–10 against your master profile, flag missing skills, and track the pipeline (Saved → Tailored → Applied → Follow-up → Interview → Offer/Rejected).
- **Anchor Bridge** — simulate a 1-click tab capture into `POST /api/jobs/intake`, plus a built-in 25-minute Pomodoro focus sprint.
- **Kit Studio** — per-job application kit: tailored ATS CV (print/save as PDF), portfolio highlights ranked by JD relevance, cover letter + LinkedIn DM, and a Day-5 / Day-12 follow-up sequence. Every save creates a new immutable kit version.
- **Master Brain** — the single source of truth for your career facts: profile basics, portfolio links, experience blocks, and a raw JSON editor.
- **MCP playground** — live JSON-RPC console for the real `/api/mcp` endpoint. The server-side proxy means `API_TOKEN` never reaches the browser.
- **Fact lock** — kit bullets must trace to a master block by `blockId` + bullet `src` index, and may not introduce new numbers. Violations are rejected server-side.

## Views

The app is a single page with five views (no client-side router):

| View | Purpose |
| --- | --- |
| Job Vault | Stats, ingestion pipeline, filters, job cards |
| Anchor Bridge | Tab-capture simulator + Pomodoro timer |
| Kit Studio | CV / portfolio / outreach / follow-up per job |
| Master Brain | Profile, portfolio, experience blocks, JSON |
| `/api/mcp` | MCP tool list + JSON-RPC inspector + bookmarklet |

Legacy routes redirect into the new UI: `/jobs/:id` and `/jobs/:id/cv` → `/?job=:id`, `/profile` → `/`.

## Local development

```bash
# 1. Copy env and fill in values
cp .env.example .env

# 2. Install deps
npm install

# 3. Push schema to Neon
npm run db:push

# 4. Dev server
npm run dev
```

Open http://localhost:3000 (Basic auth: `meron` / `APP_PASSWORD`).

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string (host contains `-pooler`) used at runtime |
| `DIRECT_URL` | Neon direct connection string used by `prisma db push` / migrations |
| `APP_PASSWORD` | Web UI password for user `meron` (Basic Auth) |
| `API_TOKEN` | Bearer token for `/api/mcp` and `/api/jobs/intake` |

## Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel (Framework: **Next.js**, forced via `vercel.json`).
2. Add `DATABASE_URL`, `DIRECT_URL`, `APP_PASSWORD`, and `API_TOKEN` for Production and Preview.
3. Deploy, then run `npx prisma db push` once against the Neon database.
4. Redeploy after changing `APP_PASSWORD` — the Edge middleware inlines it at build time.

## Project structure

```
app/
  page.tsx                  # Server shell: loads profile + jobs, renders CareerOSApp
  actions.ts                # Server actions (ingest, profile, kits, MCP, snippets)
  globals.css               # Tailwind directives + print/scrollbar polish
  layout.tsx                # Fonts, metadata, Phosphor icons
  profile/page.tsx          # Redirect → /
  jobs/[id]/page.tsx        # Redirect → /?job=:id
  jobs/[id]/cv/page.tsx     # Redirect → /?job=:id
  api/mcp/route.ts          # MCP JSON-RPC endpoint (bearer auth)
  api/jobs/intake/route.ts  # Bookmarklet / Anchor Tab target
components/careeros/
  CareerOSApp.tsx           # Client shell: view state, toasts, Pomodoro
  Header.tsx                # Navigation + live status
  JobVault.tsx              # Stats, ingestion, filters, job cards
  AnchorBridge.tsx          # Tab capture simulator + timer
  KitStudio.tsx             # CV, portfolio, outreach, follow-ups
  MasterBrain.tsx           # Profile + blocks + JSON editor
  McpPlayground.tsx         # JSON-RPC console + bookmarklet
lib/
  db.ts                     # Prisma client + profile helper
  jobs.ts                   # Job creation, reader fetch, fit scoring
  mcp.ts                    # MCP tools, callTool, handleRpc
  guardrails.ts             # Fact-lock verification for kits
  ui.ts                     # Prisma → UI mappers, CV draft builders
  types.ts                  # Shared UI types
prisma/
  schema.prisma             # Profile, Job, Kit models
middleware.ts               # Basic auth (except /api/*)
```

## Security notes

- All non-API routes are protected by HTTP Basic Auth (`middleware.ts`).
- API routes require `Authorization: Bearer API_TOKEN`.
- Kits are fact-locked: bullets may only rephrase master profile bullets, never invent numbers.
- `API_TOKEN` is only embedded in the on-demand bookmarklet/anchor snippet, never in the page HTML.
- Next.js >= 14.2.25 (CVE-2025-29927 patched).

## License

MIT
