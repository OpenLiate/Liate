"use client";

import { DocsLayout, NavigationPanel } from "fumadocs-ui/layouts/flux";
import { AIChat, AIChatPanel, useAIChat } from "@/components/ai/search";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import * as PageTree from "fumadocs-core/page-tree";
import { Book, Terminal, Newspaper, Sparkles, Bot } from "lucide-react";
import type { ReactNode } from "react";

interface DocsLayoutClientProps {
  tree: PageTree.Root;
  baseOptions: BaseLayoutProps;
  children: ReactNode;
}

export function DocsLayoutClient({ tree, baseOptions, children }: DocsLayoutClientProps) {
  return (
    <AIChat>
      <DocsLayoutInner tree={tree} baseOptions={baseOptions}>
        {children}
      </DocsLayoutInner>
    </AIChat>
  );
}

function AskAITrigger() {
  const { open, setOpen } = useAIChat();
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={buttonVariants({
        variant: "ghost",
        size: "icon-sm",
      })}
      aria-label="Ask DocGyan"
      title="Ask DocGyan (✦)"
    >
      <Sparkles className="size-4" />
    </button>
  );
}

function DocsLayoutInner({ tree, baseOptions, children }: DocsLayoutClientProps) {
  const { open, setOpen } = useAIChat();

  return (
    <>
      <DocsLayout
        tree={tree}
        {...baseOptions}
        tabs={[
          {
            title: "Framework",
            icon: <Book className="size-4" />,
            url: "/docs",
            urls: {
              has: (path: string) =>
                !path.startsWith("/docs/runtime") &&
                !path.startsWith("/docs/agent-api") &&
                !path.startsWith("/blog"),
            } as unknown as Set<string>,
          },
          {
            title: "Runtime",
            icon: <Terminal className="size-4" />,
            url: "/docs/runtime/module",
            urls: {
              has: (path: string) => path.startsWith("/docs/runtime"),
            } as unknown as Set<string>,
          },
          {
            title: "Agent API",
            icon: <Bot className="size-4" />,
            url: "/docs/agent-api/execution/runAgent",
            urls: {
              has: (path: string) => path.startsWith("/docs/agent-api"),
            } as unknown as Set<string>,
          },
          {
            title: "Blog",
            icon: <Newspaper className="size-4" />,
            url: "/blog",
            urls: {
              has: (path: string) => path.startsWith("/blog"),
            } as unknown as Set<string>,
          },
        ]}
        renderNavigationPanel={(panelProps) => (
          <NavigationPanel
            {...panelProps}
            tool={
              <>
                <AskAITrigger />
                {panelProps.tool}
              </>
            }
          />
        )}
        containerProps={{
          className: open ? "lg:pr-[360px] xl:pr-[370px]" : "",
        }}
      >
        <div className="w-full">
          {children}
        </div>
      </DocsLayout>

      {/* Full-Height Docked AI Sidebar — No gaps top or bottom, seamless border-l, no drop-shadow */}
      {open && (
        <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[360px] border-l border-fd-border bg-fd-background/95 backdrop-blur-xl text-fd-foreground flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300 ease-in-out">
          <AIChatPanel />
        </div>
      )}
    </>
  );
}

