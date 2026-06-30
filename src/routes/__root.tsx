import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  useNavigate,
  HeadContent,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { reportError } from "../lib/error-reporting";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { FloatingAiAssistant } from "@/components/ui/glowing-ai-chat-assistant";
import { Search, Keyboard, Palette, Terminal, Shield, Eye, X } from "lucide-react";

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong. Try refreshing.</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >Try again</button>
      </div>
    </div>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="font-display text-7xl font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">Page not found</p>
        <a href="/home" className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go home</a>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // In SPA mode there is no SSR shell. head() still drives <title>/<meta>
  // via <HeadContent /> rendered inside the app, and the static
  // index.html carries the initial <head> for the first paint.
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "VeriPolicy — AI-Powered Policy Intelligence" },
      { name: "description", content: "From raw data to decision-ready briefs. AI foresight memos on defence, climate, and strategic technology policy in under 2 seconds." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Monsieur+La+Doulaise&display=swap" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function CommandPaletteAndShortcuts() {
  const navigate = useNavigate();
  const { toggle } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setIsShortcutsOpen(false);
      }
      if (e.altKey && e.key === "1") {
        e.preventDefault();
        navigate({ to: "/home" });
      }
      if (e.altKey && e.key === "2") {
        e.preventDefault();
        navigate({ to: "/simulator" });
      }
      if (e.altKey && e.key === "3") {
        e.preventDefault();
        navigate({ to: "/tracker" });
      }
      if (e.altKey && e.key === "4") {
        e.preventDefault();
        navigate({ to: "/profile" });
      }
      if (e.key === "?" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  const items = [
    { label: "Go to Overview Dashboard", category: "Navigation", shortcut: "Alt+1", action: () => navigate({ to: "/home" }), icon: Eye },
    { label: "Go to Scenario Simulator", category: "Navigation", shortcut: "Alt+2", action: () => navigate({ to: "/simulator" }), icon: Terminal },
    { label: "Go to Policy Tracker", category: "Navigation", shortcut: "Alt+3", action: () => navigate({ to: "/tracker" }), icon: Shield },
    { label: "Go to Analyst Dossier", category: "Navigation", shortcut: "Alt+4", action: () => navigate({ to: "/profile" }), icon: Keyboard },
    { label: "Cycle Dossier Theme", category: "Preferences", shortcut: "Tab", action: () => toggle(), icon: Palette },
    { label: "Open Keyboard Shortcuts Panel", category: "Help", shortcut: "?", action: () => setIsShortcutsOpen(true), icon: Keyboard },
  ];

  const filtered = items.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleItemKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) {
        filtered[activeIndex].action();
        setIsOpen(false);
        setSearch("");
      }
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
          <div className="fixed inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 shadow-2xl animate-pop-in">
            <div className="flex items-center border-b border-zinc-800 px-4 py-3">
              <Search className="h-4 w-4 text-zinc-400 mr-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setActiveIndex(0); }}
                onKeyDown={handleItemKeyDown}
                placeholder="Type a command or navigate..."
                className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder-zinc-500"
                autoFocus
              />
              <div className="text-[10px] font-mono-data bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">ESC</div>
            </div>
            <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
              {filtered.length === 0 ? (
                <div className="px-4 py-3 text-xs text-zinc-500">No commands match your query.</div>
              ) : (
                filtered.map((item, idx) => {
                  const Icon = item.icon;
                  const active = idx === activeIndex;
                  return (
                    <button
                      key={item.label}
                      onClick={() => { item.action(); setIsOpen(false); setSearch(""); }}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs transition-colors cursor-pointer ${
                        active ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-800/40"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="flex-1 font-semibold">{item.label}</span>
                      <span className="text-[9px] font-mono-data text-zinc-500 uppercase bg-zinc-800/60 px-1.5 py-0.5 rounded border border-zinc-705">{item.shortcut}</span>
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex justify-between items-center bg-zinc-950 px-4 py-2 text-[10px] font-mono-data text-zinc-500 border-t border-zinc-850">
              <span>Use ↑↓ keys to choose, Enter to execute</span>
              <span>Command Desk</span>
            </div>
          </div>
        </div>
      )}

      {isShortcutsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setIsShortcutsOpen(false)} />
          <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 shadow-2xl p-5 animate-pop-in">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Keyboard className="h-4 w-4 text-[var(--accent)]" />
                <span className="font-display font-semibold text-sm tracking-wider uppercase">Keyboard Shortcuts</span>
              </div>
              <button onClick={() => setIsShortcutsOpen(false)} className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3.5 text-xs">
              {[
                { keys: ["Ctrl", "K"], desc: "Toggle Command Palette" },
                { keys: ["?"], desc: "Toggle Shortcuts Guide" },
                { keys: ["Alt", "1"], desc: "Go to Overview Dashboard" },
                { keys: ["Alt", "2"], desc: "Go to Scenario Simulator" },
                { keys: ["Alt", "3"], desc: "Go to Policy Tracker Feed" },
                { keys: ["Alt", "4"], desc: "Go to Analyst Dossier" },
                { keys: ["ESC"], desc: "Close Modals / Command Palette" },
              ].map((s) => (
                <div key={s.desc} className="flex justify-between items-center">
                  <span className="text-zinc-400">{s.desc}</span>
                  <div className="flex gap-1">
                    {s.keys.map((k) => (
                      <kbd key={k} className="font-mono-data text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700 px-1.5 py-0.5 rounded shadow-sm">{k}</kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-zinc-500 mt-5 text-center font-mono-data">Press ESC to dismiss this window.</p>
          </div>
        </div>
      )}
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <HeadContent />
          <Outlet />
          <Toaster />
          <FloatingAiAssistant />
          <CommandPaletteAndShortcuts />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

