"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { HalftoneHorizon } from "@/components/halftone-horizon";
import HalftoneWordmarkFooter from "@/components/ui/halftone-wordmark-footer";
import DotMatrixLogo from "@/components/ui/dot-matrix-logo";
import { AIChat, AIChatPanel, useAIChat } from "@/components/ai/search";

const INSTALL_COMMANDS = [
  {
    prefix: "PS>",
    cmd: 'powershell -c "irm https://openliate.tech/install.ps1 | iex"',
  },
  {
    prefix: "$",
    cmd: "curl -fsSL https://openliate.tech/install.sh | bash",
  },
];

function BookIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function GithubIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function CopyIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ExternalLinkIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17L17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

export default function Home() {
  return (
    <AIChat>
      <HomeContent />
    </AIChat>
  );
}

function HomeContent() {
  const { open, setOpen } = useAIChat();
  const [cmdIndex, setCmdIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setCmdIndex((prev) => (prev + 1) % INSTALL_COMMANDS.length);
        setIsFading(false);
      }, 200);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const current = INSTALL_COMMANDS[cmdIndex];

  const copy = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(current.cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen w-full bg-black text-white relative flex flex-col justify-between overflow-x-hidden selection:bg-orange-500 selection:text-white">
      {/* 21st.dev WebGL Halftone Horizon Background */}
      <HalftoneHorizon
        className="w-full min-h-screen flex flex-col justify-between items-center px-4 sm:px-6 lg:px-12 pt-1 sm:pt-1.5 pb-0 relative overflow-hidden"
        color="#f0602a"
        direction="top"
        curve={1.2}
        reach={1.1}
        interactive={true}
        ripples={true}
        grain={0.03}
      >
        {/* Full Stretched Big Wing in Background Layer — Aligned Higher, Clean with No Shadow */}
        <div className="absolute inset-x-0 top-[4%] sm:top-[2%] flex items-center justify-center pointer-events-auto z-10 overflow-hidden select-none">
          <DotMatrixLogo
            size={500}
            color="rgba(0, 0, 0, 0.44)"
            baseOpacity={0.65}
            interactive={true}
            className="w-full max-w-[1240px] h-auto select-none cursor-pointer"
          />
        </div>

        {/* Foreground Content Stack */}
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-start text-center relative z-20 pointer-events-auto pt-1 sm:pt-2 space-y-4 sm:space-y-5">

          {/* Centered Top Notch: Small Wing Emblem & Sarvam AI Badge */}
          <div className="flex flex-col items-center gap-2.5">
            {/* Small Centered Wing Emblem */}
            <DotMatrixLogo size={32} color="#ffffff" />

            {/* Sovereign Sarvam AI Badge — Borderless */}
            <a
              href="https://www.sarvam.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-zinc-950/70 hover:bg-zinc-900/90 backdrop-blur-md transition-all shadow-md"
            >
              <div
                className="w-[16px] h-[16px] rounded-[4px] flex items-center justify-center shrink-0 p-[2px] shadow-sm group-hover:scale-105 transition-transform"
                style={{
                  background: "linear-gradient(135deg, #A5BBFC 0%, #FFB053 50%, #F9730C 100%)",
                }}
              >
                <img
                  src="https://www.sarvam.ai/favicon.svg"
                  alt="Sarvam AI"
                  className="w-[12px] h-[12px] object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/sarvam-logo.svg";
                  }}
                />
              </div>
              <span className="text-[11px] sm:text-xs font-medium text-zinc-200">
                Selected for India&apos;s <span className="font-semibold text-white">Sarvam AI</span> Startup Program 2026 🇮🇳
              </span>
            </a>
          </div>

          {/* Main Title & Slogan Badge */}
          <div className="w-full max-w-5xl px-2 space-y-2.5 flex flex-col items-center">
            <h1
              style={{ fontFamily: 'var(--font-space-grotesk), sans-serif' }}
              className="text-2xl min-[380px]:text-[26px] sm:text-5xl lg:text-[60px] font-bold tracking-tight text-white leading-[1.1] drop-shadow-lg"
            >
              <span className="block">Open Source</span>
              <span className="block whitespace-nowrap">OOP Framework for AI Agents</span>
            </h1>
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-zinc-950/85 hover:bg-zinc-900/90 backdrop-blur-xl shadow-2xl select-none transition-all">
              <span className="text-xs sm:text-sm font-mono font-medium text-zinc-100 tracking-wider drop-shadow-sm">
                Where Classes Are AI Agents
              </span>
            </div>
          </div>

          {/* The Mathematical Calculus Pill — Borderless */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 rounded-full bg-zinc-950/90 backdrop-blur-xl shadow-2xl text-xs sm:text-sm font-mono select-none">
            <span className="font-bold text-white">L</span>
            <span className="text-zinc-400">[LM]</span>
            <span className="text-zinc-600">·</span>
            <span className="font-bold text-white">I</span>
            <span className="text-zinc-400">[ntegration]</span>
            <span className="text-zinc-600">·</span>
            <span className="font-bold text-white">A</span>
            <span className="text-zinc-400">[gent]</span>
            <span className="text-zinc-600">·</span>
            <span className="font-bold text-white">T</span>
            <span className="text-zinc-400">[ools]</span>
            <span className="text-zinc-600">·</span>
            <span className="font-bold text-white">E</span>
            <span className="text-zinc-400">[nvironment]</span>
          </div>

          {/* 1-Click Install Carousel: Windows & macOS/Linux — Borderless */}
          <div
            onClick={copy}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="group cursor-pointer inline-flex items-center justify-between w-[370px] sm:w-[490px] max-w-[92vw] px-3.5 sm:px-4 py-1.5 rounded-full bg-zinc-950/85 hover:bg-zinc-900 backdrop-blur-xl shadow-2xl transition-all select-none"
          >
            {/* Text Segment */}
            <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden text-left">
              <span className="text-zinc-500 font-mono text-xs select-none shrink-0 w-6 text-right">
                {current.prefix}
              </span>
              <span
                className={`text-[11px] sm:text-xs font-mono text-zinc-300 group-hover:text-white truncate transition-opacity duration-200 ${
                  isFading ? "opacity-0" : "opacity-100"
                }`}
              >
                {current.cmd}
              </span>
            </div>

            {/* Subtle Carousel Progress Dots */}
            <div className="flex items-center gap-1 mx-2 shrink-0">
              {INSTALL_COMMANDS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === cmdIndex ? "w-2.5 bg-zinc-300" : "w-1 bg-zinc-700"
                  }`}
                />
              ))}
            </div>

            <span className="text-zinc-400 group-hover:text-white transition-colors shrink-0">
              {copied ? (
                <CheckIcon className="w-3.5 h-3.5 text-zinc-200" />
              ) : (
                <CopyIcon className="w-3.5 h-3.5" />
              )}
            </span>
          </div>

          {/* High-Contrast Borderless Capsule: Docs & GitHub — Perfect Symmetrical Alignment */}
          <div className="inline-flex items-center rounded-full bg-zinc-950/80 backdrop-blur-xl p-1 shadow-2xl select-none">
            <Link
              href="/docs"
              className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-zinc-200 hover:text-white hover:bg-white/[0.08] transition-all font-medium text-xs sm:text-sm"
            >
              <BookIcon className="w-3.5 h-3.5 text-zinc-300 group-hover:text-white transition-colors" />
              <span className="font-semibold text-white">Docs</span>
              <ExternalLinkIcon className="w-3 h-3 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </Link>

            {/* Subtle hairline divider */}
            <span className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

            <a
              href="https://github.com/openliate/liate"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-zinc-200 hover:text-white hover:bg-white/[0.08] transition-all font-medium text-xs sm:text-sm"
            >
              <GithubIcon className="w-3.5 h-3.5 text-zinc-300 group-hover:text-white transition-colors" />
              <span className="font-semibold text-white">GitHub</span>
            </a>
          </div>

          {/* Ask DocGyan: Ultra-Compact Nested Capsule with Bottom Glass Edge */}
          <div
            onClick={() => setOpen(true)}
            className="group cursor-pointer flex flex-col items-center w-[205px] sm:w-[220px] max-w-[88vw] p-0.5 sm:p-1 rounded-xl sm:rounded-2xl bg-zinc-950/60 hover:bg-zinc-950/80 backdrop-blur-xl border border-white/[0.08] hover:border-orange-500/30 shadow-lg transition-all duration-200 select-none"
            role="button"
            tabIndex={0}
            aria-label="Ask DocGyan: Frontier AI Agent Built on Liate · Powered by Sarvam AI"
          >
            {/* Inner Card — Compact & Slim */}
            <div className="w-full flex flex-col text-left px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-zinc-900/80 group-hover:bg-zinc-800/90 transition-all duration-200 shadow-sm">
              {/* Top Row: Label & Arrow */}
              <div className="flex items-center justify-between w-full leading-none">
                <span className="text-[9px] sm:text-[9.5px] font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">
                  Frontier AI Agent
                </span>
                <ExternalLinkIcon className="w-2 h-2 text-zinc-500 group-hover:text-orange-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>

              {/* Middle Row: Native DotMatrixLogo & Ask DocGyan */}
              <div className="flex items-center gap-1.5 mt-0.5 mb-0">
                <DotMatrixLogo size={11} color="#f0602a" interactive={false} className="shrink-0" />
                <span className="text-xs font-bold text-white group-hover:text-orange-400 transition-colors tracking-tight leading-snug">
                  Ask DocGyan
                </span>
                <span className="flex h-1 w-1 relative shrink-0 ml-0.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1 w-1 bg-orange-500" />
                </span>
              </div>
            </div>

            {/* Bottom Outer Glass Edge: Powered by Sarvam AI */}
            <div className="w-full px-2 pt-1 pb-0.5 flex items-center justify-center text-center">
              <span className="text-[8.5px] sm:text-[9px] font-mono text-zinc-400 group-hover:text-zinc-200 transition-colors tracking-tight leading-none">
                Built on Liate <span className="text-orange-400/90">·</span> Powered by Sarvam AI
              </span>
            </div>
          </div>

        </div>

        {/* Bottom Horizon Halftone Wordmark — Giant, Full Width & Aligned Flush Down */}
        <div className="w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] lg:w-[calc(100%+6rem)] -mx-4 sm:-mx-6 lg:-mx-12 z-10 pointer-events-auto mt-auto -mb-3 sm:-mb-5">
          <HalftoneWordmarkFooter
            wordmark="Let's Try Liate"
            label=""
            meta=""
            columns={[]}
            backToTop={false}
            palette={{ background: "transparent", ink: "#121212", warm: "#f0602a" }}
            dotGap={5}
            radius={120}
            crop={0}
            grain={0}
            height="clamp(260px, 32vh, 340px)"
            className="bg-transparent"
          />
        </div>
      </HalftoneHorizon>

      {/* Background Dimmer when DocGyan Drawer is Open */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity cursor-pointer"
        />
      )}

      {/* Docked DocGyan Sovereign Agent Drawer on Landing Page */}
      {open && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[380px] md:w-[420px] border-l border-zinc-800 bg-zinc-950/95 backdrop-blur-2xl text-zinc-100 flex flex-col overflow-hidden shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300 ease-in-out">
          <AIChatPanel />
        </div>
      )}
    </main>
  );
}
