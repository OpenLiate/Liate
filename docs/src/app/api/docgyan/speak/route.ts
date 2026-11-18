import { NextRequest, NextResponse } from "next/server";
import { DocGyanAgent } from "@/lib/agent";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = body.text?.trim();

    if (!text) {
      return NextResponse.json({ success: false, error: "Empty text for speech synthesis" }, { status: 400 });
    }

    const speaker = body.speaker || "simran_en_customer";

    // Production Mode: Route to Neon Serverless Compute Function (if configured)
    const neonUrl = process.env.NEON_DOCGYAN_URL?.trim();
    if (neonUrl) {
      try {
        const neonRes = await fetch(`${neonUrl.replace(/\/+$/, "")}/speak`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, speaker })
        });
        if (neonRes.ok) {
          const neonData = await neonRes.json();
          return NextResponse.json(neonData);
        }
      } catch (neonErr) {
        console.warn("[DocGyan Speak] Neon compute proxy note (falling back to local):", neonErr);
      }
    }

    const agent = new DocGyanAgent();
    const audioBase64 = await agent.speak(text, speaker);

    return NextResponse.json({
      success: true,
      audio: audioBase64,
      model: "bulbul:v4-flash",
      speaker,
      format: "audio/wav"
    });
  } catch (err: any) {
    console.error("[DocGyan Speak] Bulbul v4-Flash synthesis error:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Failed to synthesize speech via Bulbul v4-Flash"
    }, { status: 500 });
  }
}
