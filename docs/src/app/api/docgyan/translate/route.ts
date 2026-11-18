import { NextRequest, NextResponse } from "next/server";
import { DocGyanAgent } from "@/lib/agent";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = body.text?.trim();

    if (!text) {
      return NextResponse.json({ success: false, error: "Empty text for translation" }, { status: 400 });
    }

    const targetLanguageCode = body.target_language_code || "hi-IN";
    const sourceLanguageCode = body.source_language_code || "auto";

    // Production Mode: Route to Neon Serverless Compute Function (if configured)
    const neonUrl = process.env.NEON_DOCGYAN_URL?.trim();
    if (neonUrl) {
      try {
        const neonRes = await fetch(`${neonUrl.replace(/\/+$/, "")}/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, target_language_code: targetLanguageCode, source_language_code: sourceLanguageCode })
        });
        if (neonRes.ok) {
          const neonData = await neonRes.json();
          return NextResponse.json(neonData);
        }
      } catch (neonErr) {
        console.warn("[DocGyan Translate] Neon compute proxy note (falling back to local):", neonErr);
      }
    }

    const apiKey = process.env.SARVAM_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "Missing SARVAM_API_KEY. Configure SARVAM_API_KEY to activate Mayura v1."
      }, { status: 500 });
    }

    const agent = new DocGyanAgent();
    if (typeof (agent as any).translate === "function") {
      const result = await (agent as any).translate(text, targetLanguageCode, sourceLanguageCode);
      return NextResponse.json({
        success: true,
        translated_text: result.translated_text,
        source_language_code: result.source_language_code,
        target_language_code: targetLanguageCode,
        model: "mayura:v1"
      });
    }

    // Direct Mayura v1 translation fallback
    const res = await fetch("https://api.sarvam.ai/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": apiKey
      },
      body: JSON.stringify({
        input: text.slice(0, 1000),
        source_language_code: sourceLanguageCode || "auto",
        target_language_code: targetLanguageCode || "hi-IN",
        model: "mayura:v1"
      })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Mayura v1 API returned ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      translated_text: data.translated_text || "",
      source_language_code: data.source_language_code,
      target_language_code: targetLanguageCode,
      model: "mayura:v1"
    });
  } catch (err: any) {
    console.error("[DocGyan Translate] Mayura v1 error:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Failed to translate text via Mayura v1"
    }, { status: 500 });
  }
}
