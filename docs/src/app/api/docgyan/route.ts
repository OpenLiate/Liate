import { NextRequest, NextResponse } from "next/server";
import { DocGyanAgent } from "@/lib/agent";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ success: false, error: "Empty message" }, { status: 400 });
    }

    // 1. Production Mode: Route to Neon Serverless Compute Function (if configured)
    const neonUrl = process.env.NEON_DOCGYAN_URL?.trim();
    if (neonUrl) {
      try {
        const neonRes = await fetch(`${neonUrl.replace(/\/+$/, "")}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, sessionId: body.sessionId || "default" })
        });
        if (neonRes.ok) {
          const neonData = await neonRes.json();
          return NextResponse.json(neonData);
        }
      } catch (neonErr) {
        console.warn("[DocGyan] Neon compute proxy note (falling back to local agent):", neonErr);
      }
    }

    const apiKey = process.env.SARVAM_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "Missing SARVAM_API_KEY. Configure SARVAM_API_KEY in .env to run DocGyan live."
      }, { status: 500 });
    }

    // Execute the genuine DocGyanAgent class via the Liate Orchestration Module (OM) engine
    const agent = new DocGyanAgent();
    const result = await agent.run(message);

    return NextResponse.json({
      success: true,
      reply: result.text.trim(),
      thought: result.thought?.trim() || undefined,
      model: "sarvam-105b",
      steps: result.totalSteps,
      durationMs: result.durationMs
    });
  } catch (err: any) {
    console.error("[DocGyan] Class execution error:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Failed to execute DocGyanAgent"
    }, { status: 500 });
  }
}
