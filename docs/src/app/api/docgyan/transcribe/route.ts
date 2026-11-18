import { NextRequest, NextResponse } from "next/server";
import { DocGyanAgent } from "@/lib/agent";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as Blob | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No audio file received" }, { status: 400 });
    }

    // Production Mode: Route to Neon Serverless Compute Function (if configured)
    const neonUrl = process.env.NEON_DOCGYAN_URL?.trim();
    if (neonUrl) {
      try {
        const proxyForm = new FormData();
        proxyForm.append("file", file, "audio.webm");
        proxyForm.append("language_code", (formData.get("language_code") as string) || "unknown");

        const neonRes = await fetch(`${neonUrl.replace(/\/+$/, "")}/transcribe`, {
          method: "POST",
          body: proxyForm
        });
        if (neonRes.ok) {
          const neonData = await neonRes.json();
          return NextResponse.json(neonData);
        }
      } catch (neonErr) {
        console.warn("[DocGyan Transcribe] Neon compute proxy note (falling back to local):", neonErr);
      }
    }

    const apiKey = process.env.SARVAM_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "Missing SARVAM_API_KEY. Configure SARVAM_API_KEY to activate Saaras v4."
      }, { status: 500 });
    }

    const agent = new DocGyanAgent();

    // Check if agent instance has transcribe method
    if (typeof (agent as any).transcribe === "function") {
      const result = await (agent as any).transcribe(file);
      return NextResponse.json({
        success: true,
        transcript: result.transcript,
        language_code: result.language_code,
        model: "saaras:v4"
      });
    }

    // Direct Saaras v4 STT execution
    const sttFormData = new FormData();
    sttFormData.append("file", file, "audio.webm");
    sttFormData.append("model", "saaras:v4");
    sttFormData.append("language_code", "unknown");

    const res = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey
      },
      body: sttFormData
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Saaras v4 API returned ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      transcript: data.transcript || "",
      language_code: data.language_code,
      model: "saaras:v4"
    });
  } catch (err: any) {
    console.error("[DocGyan Transcribe] Saaras v4 STT error:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Failed to transcribe audio via Saaras v4"
    }, { status: 500 });
  }
}
