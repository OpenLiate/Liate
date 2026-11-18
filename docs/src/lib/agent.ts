import { liate } from "openliate";

/**
 * DocGyanAgent — Official OpenLiate Documentation & Code Intelligence Agent
 * Under the AgentYaan Sovereign Mission 🇮🇳 🌍
 * 
 * "Where Class is an Agent, and Agent is an API."
 * 
 * Mathematical 5-Layer Formulation: Agent = L ∘ I ∘ A ∘ T ∘ E
 * - L: Sarvam AI 105B Indic LLM
 * - I: Integration & Session Memory
 * - A: Agent Harness & Sovereign Mission Intent
 * - T: Tools via Official Sarvam AI MCP Server (Bulbul v4-Flash TTS, Saaras v4 STT, Translation & Vision)
 * - E: Environment & Sandbox (Powered by Sarvam AI Startup Program Credits)
 */

export interface AgentRunResult {
  text: string;
  thought?: string;
  totalSteps: number;
  durationMs: number;
  finishReason: string;
}

export class DocGyanAgent extends liate {
  // L — Large Models Layer: Sarvam AI 105B Indic Frontier LLM
  public L = "sarvam/sarvam-105b";

  // I — Integration & Memory Layer
  public I = {
    memory: "sessions/docgyan-agent",
    context: "https://openliate.tech/docs",
    contexts: [
      "https://openliate.tech/docs",
      "https://docs.openliate.tech"
    ]
  };

  // A — Agent Harness Layer
  public A = {
    name: "docgyan",
    version: "0.1.5",
    intent: `Frontier Documentation & Code Intelligence Agent for OpenLiate under the sovereign AgentYaan mission. Built on Liate and powered by Sarvam AI.
The official working documentation is unified directly under /docs at https://openliate.tech/docs (supported alongside https://docs.openliate.tech).
LIATE is strictly the 5 mathematical architectural layers derived from calculus integration by parts: L [Large Models Layer], I [Integration & Memory], A [Agent Loop], T [Tools/MCP v2], E [Environment & Sandbox]. Formula: Agent = L ∘ I ∘ A ∘ T ∘ E. NEVER invent fake backronyms.
Uphold the Four Truths: Class is an Agent, Agent is a Function, Function is an API, Liate API is Your Backend.
Pronunciation doctrine: The brand name "Liate" is pronounced as in "affiliate" (the "-liate" cadence: /li.eɪt/, sounding like "Lee-ate"). Always write and display the official word strictly as "Liate" or "OpenLiate" in all user-facing written responses — never output or expose phonetic respellings or numbers to the public.
If asked who you are, introduce yourself as DocGyan (डॉकज्ञान), the sovereign documentation & codebase intelligence agent for OpenLiate.
When referencing documentation links or guides, always prioritize linking to https://openliate.tech/docs/... and /docs/... (alongside https://docs.openliate.tech).`,
    maxSteps: 8
  };

  // T — Tools of MCP Server Layer: Official Sarvam AI MCP Server
  // Exposes:
  // - Bulbul v4-Flash / Bulbul v3: Expressive Indic Text-to-Speech (tts_speak / tts_stream)
  // - Saaras v4 / Saaras v3: Indic Speech-to-Text with auto language detection (stt_transcribe)
  // - Mayura: Realtime translation across 10+ Indic languages (translate)
  // - Vision Document Extraction (vision_extract)
  public T = {
    sarvam: {
      command: "uvx",
      args: ["sarvam-mcp"],
      tools: ["*"]
    }
  };

  // E — Environment & Sandbox Layer (Powered by Sarvam AI Startup Program Credits)
  public E = {
    SARVAM_API_KEY: process.env.SARVAM_API_KEY
  };

  /**
   * Synthesizes natural spoken voice for DocGyan using Sarvam AI Bulbul v4-Flash
   * @param text Raw or Markdown text to speak
   * @param speaker Persona voice ID (default: simran_en_customer, or shubh_enhi_ads)
   * @returns Base64 encoded audio string
   */
  public async speak(text: string, speaker = "simran_en_customer"): Promise<string> {
    const apiKey = this.E.SARVAM_API_KEY || process.env.SARVAM_API_KEY;
    if (!apiKey) {
      throw new Error("Missing SARVAM_API_KEY for Bulbul text-to-speech synthesis");
    }

    // Strip code blocks and markdown symbols for natural voice synthesis
    let cleanText = text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/[*#_~>\[\]()]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // Phonetic pronunciation mapping for Sarvam AI Bulbul TTS audio engine only:
    // Ensures Bulbul models pronounce "Liate" smoothly as in "affiliate" (-liate / "Lee-ate")
    // while NEVER displaying phonetic words or numbers in public text or UI.
    cleanText = cleanText
      .replace(/\bOpenLiate\b/g, "Open Liaate")
      .replace(/\bopenliate\b/g, "open liaate")
      .replace(/\bLiate\b/g, "Liaate")
      .replace(/\bliate\b/g, "liaate")
      .slice(0, 2400);

    if (!cleanText) {
      throw new Error("No pronounceable text provided for synthesis");
    }

    const res = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": apiKey
      },
      body: JSON.stringify({
        text: cleanText,
        language_code: "en-IN",
        model: "bulbul:v4-flash",
        speaker: speaker || "simran_en_customer",
        speech_sample_rate: 22050
      })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Bulbul v4-Flash TTS error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    if (data.audios && data.audios.length > 0) {
      return data.audios[0];
    }
    throw new Error("No audio returned from Bulbul v4-Flash");
  }

  /**
   * Transcribes spoken audio into text using Sarvam AI Saaras v4 STT
   * @param audioBlob Binary audio Blob (WAV, MP3, WebM, etc.)
   * @param languageCode Target language or 'unknown' for automatic Indic language detection
   * @returns Transcript string and detected language
   */
  public async transcribe(audioBlob: Blob, languageCode = "unknown"): Promise<{ transcript: string; language_code?: string }> {
    const apiKey = this.E.SARVAM_API_KEY || process.env.SARVAM_API_KEY;
    if (!apiKey) {
      throw new Error("Missing SARVAM_API_KEY for Saaras speech-to-text transcription");
    }

    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model", "saaras:v4");
    formData.append("language_code", languageCode || "unknown");

    const res = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey
      },
      body: formData
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Saaras v4 STT error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return {
      transcript: data.transcript || "",
      language_code: data.language_code
    };
  }

  /**
   * Translates text across Indian languages and English using Sarvam AI Mayura v1
   * @param text Text to translate (max 1000 characters per chunk)
   * @param targetLanguageCode Target language (e.g., 'hi-IN', 'ta-IN', 'te-IN', 'kn-IN', 'bn-IN', 'mr-IN', 'en-IN')
   * @param sourceLanguageCode Source language or 'auto' for automatic language detection
   * @returns Translated text string and detected source language
   */
  public async translate(text: string, targetLanguageCode = "hi-IN", sourceLanguageCode = "auto"): Promise<{ translated_text: string; source_language_code?: string }> {
    const apiKey = this.E.SARVAM_API_KEY || process.env.SARVAM_API_KEY;
    if (!apiKey) {
      throw new Error("Missing SARVAM_API_KEY for Mayura translation");
    }

    const cleanText = text.trim().slice(0, 1000);
    if (!cleanText) {
      throw new Error("Empty text provided for translation");
    }

    const res = await fetch("https://api.sarvam.ai/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": apiKey
      },
      body: JSON.stringify({
        input: cleanText,
        source_language_code: sourceLanguageCode || "auto",
        target_language_code: targetLanguageCode || "hi-IN",
        model: "mayura:v1"
      })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Mayura v1 Translation error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return {
      translated_text: data.translated_text || "",
      source_language_code: data.source_language_code
    };
  }

  /**
   * Executes DocGyanAgent on user input prompt using the Liate Orchestration Engine
   * Falls back gracefully to resilient Sarvam 105B completions in serverless runtimes.
   */
  public override async run(input: string): Promise<AgentRunResult> {
    const startTime = Date.now();
    const apiKey = this.E.SARVAM_API_KEY || process.env.SARVAM_API_KEY;

    if (!apiKey) {
      throw new Error("Missing SARVAM_API_KEY in environment. Set SARVAM_API_KEY to activate DocGyan.");
    }

    // Attempt execution through full Liate AUM / ReAct harness
    try {
      const runner = await this.getRunner();
      const res = await runner.run(input);
      if (res && res.text) {
        return {
          text: res.text,
          thought: res.thought,
          totalSteps: res.totalSteps || 1,
          durationMs: Date.now() - startTime,
          finishReason: res.finishReason || "stop"
        };
      }
    } catch (omErr: any) {
      console.warn("[DocGyan] Full OM harness step note (falling back to direct Sarvam 105B):", omErr?.message || omErr);
    }

    // Direct high-performance Sarvam 105B completion with live /docs knowledge
    let docContext = "";
    try {
      const { source } = await import("@/lib/source");
      const pages = source.getPages();
      const q = input.toLowerCase();
      const tokens = q.split(/\s+/).filter((t: string) => t.length > 2);
      
      const scored = pages.map((p: any) => {
        let score = 0;
        const title = (p.data?.title || "").toLowerCase();
        const desc = (p.data?.description || "").toLowerCase();
        for (const token of tokens) {
          if (title.includes(token)) score += 3;
          if (desc.includes(token)) score += 1;
        }
        return { page: p, score };
      }).filter((s: any) => s.score > 0).sort((a: any, b: any) => b.score - a.score);

      if (scored.length > 0) {
        const top = scored.slice(0, 3);
        docContext = "\n\nVerified Local Documentation Pages (under /docs at https://openliate.tech/docs):\n" + 
          top.map((t: any) => `- [${t.page.data.title}](https://openliate.tech${t.page.url}): ${t.page.data.description || ""}`).join("\n");
      }
    } catch {
      // Gracefully continue without local page index
    }

    const res = await fetch("https://api.sarvam.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "api-subscription-key": apiKey
      },
      body: JSON.stringify({
        model: "sarvam-105b-conversations",
        messages: [
          { role: "system", content: (typeof this.A === "object" ? this.A.intent : "DocGyan AI Assistant") + docContext },
          { role: "user", content: input }
        ],
        temperature: 0.2
      })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Sarvam 105B API returned ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const text = choice?.message?.content || "";
    const thought = choice?.message?.reasoning_content || choice?.message?.reasoning;

    return {
      text: typeof text === "string" ? text : JSON.stringify(text),
      thought: thought ? String(thought) : undefined,
      totalSteps: 1,
      durationMs: Date.now() - startTime,
      finishReason: choice?.finish_reason || "stop"
    };
  }
}

export default DocGyanAgent;
