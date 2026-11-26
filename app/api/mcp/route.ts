import { NextRequest, NextResponse } from "next/server";
import { handleRpc } from "@/lib/mcp";

// Stateless MCP over HTTP (JSON-RPC 2.0). Connect with: url = https://YOUR_APP/api/mcp, header Authorization: Bearer API_TOKEN
export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.API_TOKEN}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const message = await req.json().catch(() => null);
  if (!message) return NextResponse.json({ error: "invalid json" }, { status: 400 });

  const result = await handleRpc(message);
  if (!result) return new NextResponse(null, { status: 202 });
  return NextResponse.json(result.body, { status: result.status });
}
