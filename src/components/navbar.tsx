import { Link, useRouterState } from "@tanstack/react-router";
import { Moon, Sun, Menu, X, UserRound, Leaf, Command } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "./theme-provider";

const NAV = [
  { to: "/home", label: "Overview", shortcut: "1" },
  { to: "/simulator", label: "Scenario Simulator", shortcut: "2" },
  { to: "/tracker", label: "Policy Tracker", shortcut: "3" },
  { to: "/comparison", label: "Comparison", shortcut: "4" },
  { to: "/about", label: "About", shortcut: "5" },
] as const;

function Seal() {
  return (
    <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden>
      <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 2" />
      <path d="M20 6 L24 20 L20 34 L16 20 Z" fill="currentColor" opacity="0.85" />
      <circle cx="20" cy="20" r="2.4" fill="var(--background)" />
    </svg>
  );
}

export function Navbar() {
  const { theme, toggle, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Animated indicator refs
  const navRef = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [indicatorVisible, setIndicatorVisible] = useState(false);

  // Measure active link position for sliding indicator
  useEffect(() => {
    if (!navRef.current) return;
    const activeLink = navRef.current.querySelector("[data-active='true']") as HTMLElement | null;
    if (activeLink) {
      const navRect = navRef.current.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      setIndicator({
        left: linkRect.left - navRect.left,
        width: linkRect.width,
      });
      // Small delay so the first render doesn't animate from 0,0
      setTimeout(() => setIndicatorVisible(true), 100);
    } else {
      setIndicatorVisible(false);
    }
  }, [pathname]);

  // Keyboard shortcuts: Alt+1 through Alt+5
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const idx = parseInt(e.key) - 1;
        if (idx >= 0 && idx < NAV.length) {
          e.preventDefault();
          window.location.href = NAV[idx].to;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-transparent backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link to="/home" className="flex items-center gap-3 text-primary">
          <Seal />
          <div className="flex flex-col leading-none">
            <span className="font-display text-xl font-semibold tracking-tight">VeriPolicy</span>
            <span className="font-mono-data text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
              Policy Intelligence
            </span>
          </div>
        </Link>

        {/* Desktop nav with sliding indicator */}
        <nav ref={navRef} className="hidden items-center gap-0.5 md:flex relative">
          {/* Animated sliding indicator */}
          <div
            className="absolute bottom-0 h-[2px] rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              left: `${indicator.left}px`,
              width: `${indicator.width}px`,
              background: "var(--primary)",
              opacity: indicatorVisible ? 1 : 0,
            }}
          />

          {NAV.map((n) => {
            const active = pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                data-active={active}
                className={`group relative px-3.5 py-2 text-sm transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="font-mono-data text-[11px] uppercase tracking-[0.18em]">{n.label}</span>
                {/* Keyboard shortcut badge - visible on hover */}
                <span className="absolute -top-1 right-0.5 hidden items-center rounded border border-border bg-background px-1 py-px font-mono-data text-[8px] text-muted-foreground opacity-0 transition-opacity group-hover:flex group-hover:opacity-100">
                  Alt+{n.shortcut}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          <Link
            to="/profile"
            aria-label="Go to profile"
            className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground transition-all hover:border-primary hover:text-primary hover:shadow-sm"
          >
            <UserRound className="h-4 w-4" />
          </Link>
          
          <div className="relative">
            <button
              onClick={() => setShowThemeDropdown(!showThemeDropdown)}
              aria-label="Select theme"
              className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground transition-all hover:border-primary hover:text-primary hover:shadow-sm cursor-pointer"
            >
              {theme === "light" && <Sun className="h-4 w-4 text-[var(--primary)]" />}
              {theme === "dark" && <Moon className="h-4 w-4 text-[var(--primary)]" />}
              {theme === "forest" && <Leaf className="h-4 w-4 text-[var(--primary)]" />}
            </button>
            {showThemeDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowThemeDropdown(false)} />
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-card p-2 shadow-xl z-20 animate-pop-in">
                  <div className="px-2.5 py-1 text-[9px] font-mono-data uppercase tracking-wider text-muted-foreground">
                    Select Dossier Theme
                  </div>
                  <div className="h-px bg-border my-1" />
                  {[
                    { id: "light", label: "Sunset Light", color: "bg-[#E29578]", icon: Sun },
                    { id: "dark", label: "Sunset Dark", color: "bg-[#1a0f0c]", icon: Moon },
                    { id: "forest", label: "Forest Desk", color: "bg-[#1b4d3e]", icon: Leaf },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setTheme(t.id as any);
                        setShowThemeDropdown(false);
                      }}
                      className={`flex w-full items-center gap-3.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-muted cursor-pointer ${
                        theme === t.id ? "text-foreground font-semibold bg-muted/65" : "text-muted-foreground"
                      }`}
                    >
                      <div className="flex h-5 w-5 items-center justify-center rounded-md border border-border bg-background">
                        <t.icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="flex-1">{t.label}</span>
                      <span className={`h-2.5 w-2.5 rounded-full ${t.color} border border-white/20`} />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button onClick={() => setOpen((o) => !o)} className="grid h-9 w-9 place-items-center rounded-lg border border-border md:hidden">
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-transparent md:hidden backdrop-blur-md">
          <div className="flex flex-col p-2">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-3 font-mono-data text-[11px] uppercase tracking-[0.18em] text-foreground hover:bg-muted"
              >
                {n.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
