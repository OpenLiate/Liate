"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import DotMatrixLogo from "@/components/ui/dot-matrix-logo";
import { Mic, Terminal, Copy, Check, CornerDownLeft, RotateCcw, X, Sparkles, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AIChatContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AIChatContext = createContext<AIChatContextType | null>(null);

export function useAIChat() {
  const ctx = useContext(AIChatContext);
  if (!ctx) {
    throw new Error("useAIChat must be used within AIChat provider");
  }
  return ctx;
}

export function AIChat({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const shouldOpen =
        searchParams.get("ask") === "docgyan" ||
        searchParams.get("ask") === "open" ||
        window.location.hash === "#ask-docgyan";
      if (shouldOpen) {
        setOpen(true);
      }
    }
  }, []);

  return (
    <AIChatContext.Provider value={{ open, setOpen }}>
      {children}
    </AIChatContext.Provider>
  );
}

interface Message {
  role: "user" | "assistant";
  text: string;
  thought?: string;
  code?: string;
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 rounded-xl bg-fd-muted/30 border border-fd-border/40 p-2.5 overflow-hidden">
      <div className="flex items-center justify-between text-[10px] font-mono text-fd-muted-foreground mb-1.5 px-0.5">
        <span className="flex items-center gap-1 font-semibold">
          <Terminal className="w-3 h-3 text-fd-primary" /> {language || "bash"}
        </span>
        <button
          onClick={handleCopy}
          className="hover:text-fd-foreground flex items-center gap-1 transition-colors text-fd-muted-foreground cursor-pointer"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="p-2.5 rounded-lg bg-fd-background/90 text-[11px] font-mono text-fd-foreground overflow-x-auto border border-fd-border/30">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="text-sm font-bold text-fd-foreground mt-3 mb-1.5">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xs font-bold text-fd-foreground mt-2.5 mb-1">{children}</h2>,
        h3: ({ children }) => <h3 className="text-xs font-semibold text-fd-foreground mt-2 mb-1">{children}</h3>,
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-fd-foreground">{children}</strong>,
        em: ({ children }) => <em className="italic text-fd-foreground/90">{children}</em>,
        ul: ({ children }) => <ul className="my-2 pl-4 space-y-1 list-disc text-fd-foreground">{children}</ul>,
        ol: ({ children }) => <ol className="my-2 pl-4 space-y-1 list-decimal text-fd-foreground">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="my-2.5 border-l-2 border-fd-primary/80 pl-3 py-1.5 italic text-fd-muted-foreground bg-fd-muted/20 rounded-r-md text-xs">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-fd-primary underline underline-offset-2 hover:opacity-80 transition-opacity font-medium"
          >
            {children}
          </a>
        ),
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto rounded-lg border border-fd-border bg-fd-card/40">
            <table className="w-full text-left text-xs border-collapse">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-fd-muted/60 border-b border-fd-border text-fd-foreground font-semibold">
            {children}
          </thead>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-[11px] font-semibold text-fd-foreground border-r border-fd-border/30 last:border-r-0">
            {children}
          </th>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-fd-border/30">
            {children}
          </tbody>
        ),
        tr: ({ children }) => (
          <tr className="hover:bg-fd-muted/30 transition-colors">
            {children}
          </tr>
        ),
        td: ({ children }) => (
          <td className="px-3 py-1.5 text-[11px] text-fd-foreground/90 border-r border-fd-border/20 last:border-r-0">
            {children}
          </td>
        ),
        hr: () => <hr className="my-3 border-fd-border/40" />,
        code({ node, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || "");
          const codeString = String(children).replace(/\n$/, "");
          const isInline = !match && !codeString.includes("\n");

          if (isInline) {
            return (
              <code className="rounded bg-fd-muted px-1.5 py-0.5 font-mono text-[11px] text-fd-foreground border border-fd-border/40">
                {children}
              </code>
            );
          }

          return (
            <CodeBlock
              language={match ? match[1] : "bash"}
              code={codeString}
            />
          );
        },
        pre({ children }) {
          return <>{children}</>;
        }
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export function AIChatPanel() {
  const { setOpen } = useAIChat();
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Namaste! I am DocGyan, your sovereign documentation & code intelligence agent under the AgentYaan mission, built on Liate and powered by Sarvam AI.\n\nAsk any question about OpenLiate architecture, the LIATE mathematical decomposition, MCP tool integration, or Sarvam 105B sovereign execution.",
    },
  ]);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const quickPrompts = [
    "What is DocGyan?",
    "Run agent in 5 lines",
    "What is the LIATE rule?",
    "Sarvam AI 105B",
  ];

  const handleSend = async (textToSend?: string) => {
    const q = (textToSend || input).trim();
    if (!q || isThinking) return;

    const userMessage: Message = { role: "user", text: q };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsThinking(true);

    try {
      const res = await fetch("/api/docgyan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: q,
          history: messages.slice(-4).map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: data.reply,
            thought: data.thought,
          },
        ]);
      } else {
        throw new Error(data.error || "No response received");
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `⚠️ **Inference Error**: ${err?.message || "Failed to communicate with Sarvam 105B"}.\n\nPlease check your \`SARVAM_API_KEY\` and network connectivity.`,
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const recognitionRef = useRef<any>(null);

  const toggleMic = () => {
    if (typeof window === "undefined") return;

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please type your query.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setInput(transcript);
          handleSend(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event?.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
    }
  };

  const resetChat = () => {
    setMessages([
      {
        role: "assistant",
        text: "Namaste! Chat reset. I am DocGyan — how can I help you build with OpenLiate and Sarvam AI today?",
      },
    ]);
  };

  return (
    <div className="flex flex-col h-full bg-fd-background text-fd-foreground">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-fd-border/40 shrink-0">
        <div className="flex items-center gap-2.5">
          <DotMatrixLogo size={20} interactive={false} />
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-sm font-semibold tracking-tight text-fd-foreground">Ask DocGyan</h3>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-fd-muted text-fd-muted-foreground border border-fd-border/50">
                DOCGYAN · SOVEREIGN AI
              </span>
            </div>
            <p className="text-[10px] text-fd-muted-foreground">Built on Liate · AgentYaan Mission · Powered by Sarvam AI</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={resetChat}
            title="Reset Chat"
            className="p-1.5 rounded-full text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-muted/50 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setOpen(false)}
            title="Close Panel (Esc)"
            className="p-1.5 rounded-full text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-muted/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Suggestion Chips */}
      <div className="px-4 pt-3 pb-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            disabled={isThinking}
            className="shrink-0 text-[11px] font-medium px-3 py-1 rounded-full bg-fd-muted/40 hover:bg-fd-muted/80 text-fd-muted-foreground hover:text-fd-foreground border border-fd-border/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${
              m.role === "user" ? "items-end" : "items-start"
            }`}
          >
            {m.role === "user" ? (
              <div className="max-w-[85%] text-xs sm:text-sm rounded-2xl rounded-tr-sm px-3.5 py-2 bg-fd-primary text-fd-primary-foreground font-medium shadow-xs">
                <p className="whitespace-pre-line">{m.text}</p>
              </div>
            ) : (
              <div className="w-full text-xs sm:text-sm text-fd-foreground leading-relaxed">
                {/* Collapsible Reasoning Process if present */}
                {m.thought && (
                  <details className="mb-2.5 text-[11px] text-fd-muted-foreground bg-fd-muted/20 border border-fd-border/30 rounded-xl p-2.5 group">
                    <summary className="cursor-pointer font-medium select-none flex items-center gap-1.5 text-fd-muted-foreground hover:text-fd-foreground transition-colors">
                      <Sparkles className="w-3 h-3 text-fd-primary" />
                      <span>Reasoning Process (Sarvam 105B)</span>
                      <ChevronDown className="w-3 h-3 ml-auto transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="mt-2 pt-2 border-t border-fd-border/20 font-mono text-[10px] whitespace-pre-line leading-relaxed text-fd-muted-foreground/90 max-h-40 overflow-y-auto">
                      {m.thought}
                    </div>
                  </details>
                )}

                {/* Markdown Content (Bold, Tables, Lists, Quotes, Highlights, Links, Code) */}
                <MarkdownContent content={m.text} />

                {/* Backward compatibility for standalone code field */}
                {m.code && (
                  <CodeBlock language="bash" code={m.code} />
                )}
              </div>
            )}
          </div>
        ))}

        {/* Live Reasoning Pulse Indicator */}
        {isThinking && (
          <div className="flex items-center gap-2 text-xs text-fd-muted-foreground py-1 animate-pulse">
            <DotMatrixLogo size={14} interactive={false} />
            <span>DocGyan is reasoning with Sarvam 105B...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Capsule-Like AI Bar Input */}
      <div className="p-3.5 pt-2 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 rounded-full border border-fd-border/80 bg-fd-muted/40 hover:bg-fd-muted/60 focus-within:bg-fd-muted/70 focus-within:border-fd-primary/70 focus-within:ring-2 focus-within:ring-fd-primary/20 px-3.5 py-1.5 transition-all"
        >
          <input
            type="text"
            value={input}
            disabled={isThinking}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask DocGyan about OpenLiate, MCP, Sarvam 105B..."
            className="flex-1 bg-transparent text-xs sm:text-sm text-fd-foreground placeholder:text-fd-muted-foreground outline-none py-1 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={toggleMic}
            disabled={isThinking}
            title="Voice Input (Sarvam AI Saaras)"
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              isListening
                ? "bg-red-500 text-white animate-pulse"
                : "text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-muted/60"
            }`}
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            type="submit"
            disabled={!input.trim() || isThinking}
            className="p-1.5 rounded-full bg-fd-primary hover:opacity-90 disabled:opacity-20 text-fd-primary-foreground font-semibold transition-all cursor-pointer"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </form>
        <div className="flex items-center justify-between text-[10px] text-fd-muted-foreground/80 px-2 pt-2">
          <span>Built on Liate • Powered by Sarvam 105B 🇮🇳</span>
          <span className="font-mono text-[9px]">DocGyan v0.1.0</span>
        </div>
      </div>
    </div>
  );
}
