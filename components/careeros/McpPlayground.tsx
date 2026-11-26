"use client";

import { useState } from "react";
import { getIntakeSnippet, invokeMcp } from "@/app/actions";
import type { JobUI, McpToolMeta, ToastTone } from "@/lib/types";
import { cn, copyText } from "./utils";

type McpPlaygroundProps = {
  tools: McpToolMeta[];
  activeJob: JobUI | undefined;
  showToast: (message: string, tone?: ToastTone) => void;
};

const READY_RESPONSE = JSON.stringify(
  {
    jsonrpc: "2.0",
    id: "ready",
    result: {
      server: "career-os-mcp",
      version: "1.0.0",
      status: "Ready. Pick a tool on the left or send a JSON-RPC request.",
    },
  },
  null,
  2,
);

const BOOKMARKLET_PREVIEW =
  "javascript:(async()=>{const t=document.body.innerText.slice(0,30000);fetch('https://YOUR_APP/api/jobs/intake',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer YOUR_API_TOKEN'},body:JSON.stringify({url:location.href,title:document.title,innerText:t})})})();";

export default function McpPlayground({ tools, activeJob, showToast }: McpPlaygroundProps) {
  const [request, setRequest] = useState(() =>
    JSON.stringify({ jsonrpc: "2.0", id: "req_01", method: "tools/list" }, null, 2),
  );
  const [response, setResponse] = useState(READY_RESPONSE);
  const [latency, setLatency] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [snippetBusy, setSnippetBusy] = useState(false);

  const writeTools = new Set(["save_job_target", "save_application_kit", "update_job_status"]);

  function templateFor(name: string) {
    const jobId = activeJob?.id ?? 1;
    let args: Record<string, unknown> = {};

    switch (name) {
      case "get_master_profile":
        args = {};
        break;
      case "save_job_target":
        args = {
          title: "Technical Project Manager",
          company: "Example Co",
          url: "",
          jdText: "",
        };
        break;
      case "get_job":
        args = { job_id: jobId };
        break;
      case "save_application_kit": {
        const cv = activeJob?.latestKit?.cv ?? activeJob?.draftCv;
        args = {
          job_id: jobId,
          cv: cv ?? { headline: "", summary: "", skills: [], blocks: [] },
          coverLetter: activeJob?.latestKit?.coverLetter ?? "",
          portfolioAngle: activeJob?.latestKit?.portfolioAngle ?? "",
          dm: activeJob?.latestKit?.dm ?? "",
          followUp5: activeJob?.latestKit?.followUp5 ?? "",
          followUp12: activeJob?.latestKit?.followUp12 ?? "",
        };
        break;
      }
      case "list_pending_followups":
        args = { days: 5 };
        break;
      case "update_job_status":
        args = { job_id: jobId, status: "Interview" };
        break;
    }

    return JSON.stringify(
      {
        jsonrpc: "2.0",
        id: "req_01",
        method: "tools/call",
        params: { name, arguments: args },
      },
      null,
      2,
    );
  }

  function loadTool(name: string) {
    setRequest(templateFor(name));
    if (writeTools.has(name)) {
      showToast(`${name} loaded — this is a live write. Review the JSON before sending.`, "amber");
    }
  }

  async function send() {
    setBusy(true);
    const res = await invokeMcp(request);
    setBusy(false);

    if (!res.ok) {
      setResponse(JSON.stringify({ error: res.error }, null, 2));
      setLatency(null);
      showToast(res.error, "amber");
      return;
    }

    setResponse(
      JSON.stringify(
        res.data.response ?? { status: 202, note: "Notification accepted." },
        null,
        2,
      ),
    );
    setLatency(`${res.data.ms}ms`);
    showToast("MCP request executed against Neon.");
  }

  async function copyBookmarklet() {
    setSnippetBusy(true);
    const res = await getIntakeSnippet("bookmarklet");
    setSnippetBusy(false);
    if (!res.ok) {
      showToast(res.error, "amber");
      return;
    }
    const copied = await copyText(res.data);
    showToast(
      copied
        ? "Bookmarklet copied with your real origin + API token!"
        : "Could not access the clipboard.",
      copied ? "indigo" : "amber",
    );
  }

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 bg-surface border border-borderSubtle rounded-2xl p-5 space-y-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono text-[11px] border border-emerald-500/30">
                POST /api/mcp
              </span>
              <h2 className="text-base font-semibold text-white">Exposed MCP Agent Tools</h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Connect Claude Desktop, Cursor, or Windsurf directly to your career database. Click a
              tool to load a live JSON-RPC request.
            </p>
          </div>

          <div className="space-y-2.5">
            {tools.map((tool, index) => {
              const write = writeTools.has(tool.name);
              return (
                <button
                  key={tool.name}
                  type="button"
                  onClick={() => loadTool(tool.name)}
                  className="w-full text-left p-3.5 rounded-xl bg-canvas hover:bg-elevated border border-borderSubtle hover:border-indigo-500/50 transition-all group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "font-mono text-xs font-semibold group-hover:text-indigo-300",
                        write ? "text-amber-400" : "text-indigo-400",
                      )}
                    >
                      {index + 1}. {tool.name}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {write && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          WRITE
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-zinc-500 group-hover:text-zinc-300">
                        Load →
                      </span>
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{tool.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-7 space-y-5">
          <div className="bg-surface border border-borderSubtle rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <i className="ph-bold ph-terminal-window text-indigo-400" />
                <span className="text-xs font-mono text-zinc-200">MCP JSON-RPC 2.0 Inspector</span>
              </div>
              <span
                className={cn(
                  "text-[11px] font-mono px-2 py-0.5 rounded",
                  latency
                    ? "text-emerald-400 bg-emerald-500/10"
                    : "text-zinc-400 bg-elevated",
                )}
              >
                {latency ? `200 OK • ${latency}` : "READY"}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>Request body</span>
                <button
                  type="button"
                  onClick={() =>
                    setRequest(
                      JSON.stringify({ jsonrpc: "2.0", id: "req_01", method: "tools/list" }, null, 2),
                    )
                  }
                  className="text-indigo-400 hover:underline"
                >
                  tools/list
                </button>
              </div>
              <textarea
                value={request}
                onChange={(event) => setRequest(event.target.value)}
                rows={12}
                spellCheck={false}
                className="w-full bg-canvas border border-borderSubtle focus:border-indigo-500 rounded-xl p-4 text-xs font-mono text-zinc-200 overflow-x-auto leading-relaxed outline-none resize-y"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-zinc-500">
                Live server-side proxy — your API token never reaches the browser. Write tools
                change real Neon records.
              </p>
              <button
                type="button"
                onClick={send}
                disabled={busy}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-medium shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
              >
                <i className={busy ? "ph ph-circle-notch animate-spin" : "ph-bold ph-paper-plane-right"} />
                {busy ? "Executing…" : "Send JSON-RPC"}
              </button>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-zinc-400">Response</span>
              <pre className="bg-canvas border border-borderSubtle rounded-xl p-4 text-xs font-mono text-emerald-300/90 overflow-x-auto h-72 leading-relaxed">
                {response}
              </pre>
            </div>
          </div>

          <div className="bg-surface border border-borderSubtle rounded-2xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Tier 1 Browser Bookmarklet (Zero-Cost Tab Grabber)
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Grabs <code className="font-mono text-indigo-300">document.body.innerText</code>{" "}
                  from LinkedIn/Wellfound/Ashby and POSTs straight to your Vault.
                </p>
              </div>
              <button
                type="button"
                onClick={copyBookmarklet}
                disabled={snippetBusy}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-medium flex items-center gap-1.5 shrink-0"
              >
                <i className={snippetBusy ? "ph ph-circle-notch animate-spin" : "ph ph-copy"} />
                Copy Code
              </button>
            </div>
            <pre className="bg-canvas border border-borderSubtle rounded-xl p-3 text-[11px] font-mono text-zinc-400 overflow-x-auto">
              {BOOKMARKLET_PREVIEW}
            </pre>
            <p className="text-[11px] text-zinc-500">
              The copy button fetches the real origin and{" "}
              <span className="font-mono text-zinc-400">API_TOKEN</span> from the server on demand;
              the token is not embedded in this page.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
