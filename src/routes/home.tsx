import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowRight, FileText, ScrollText, Database, Globe2, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "VeriPolicy — Office of Policy Intelligence" },
      { name: "description", content: "Decision-ready foresight briefs on defence, climate, and strategic technology — grounded in primary-source historical record." },
    ],
  }),
  component: HomePage,
});

const SCENARIOS = [
  "India increases defence spending by 15%, cuts fossil fuel subsidies by 20%…",
  "Germany raises renewables target while maintaining NATO commitments at 2.5% GDP…",
  "United States reallocates climate budget toward semiconductor and AI infrastructure…",
];

function Typewriter() {
  const [text, setText] = useState("");
  const [i, setI] = useState(0);
  useEffect(() => {
    const full = SCENARIOS[i];
    let idx = 0;
    let typing = true;
    const tick = () => {
      if (typing) {
        idx++; setText(full.slice(0, idx));
        if (idx >= full.length) { typing = false; setTimeout(tick, 2200); return; }
      } else {
        idx--; setText(full.slice(0, idx));
        if (idx <= 0) { setI((p) => (p + 1) % SCENARIOS.length); return; }
      }
      setTimeout(tick, typing ? 36 : 18);
    };
    const t = setTimeout(tick, 80);
    return () => clearTimeout(t);
  }, [i]);
  return <span className="cursor-blink">{text}</span>;
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Ornament({ label }: { label: string }) {
  return (
    <div className="ornament my-3 font-mono-data text-[10px] uppercase tracking-[0.32em]">
      <span>◆ {label} ◆</span>
    </div>
  );
}

function GeometryBackdrop() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <pattern id="vp-grid" width="56" height="56" patternUnits="userSpaceOnUse">
          <path d="M56 0H0V56" fill="none" stroke="currentColor" strokeOpacity="0.08" />
        </pattern>
        <radialGradient id="vp-glow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#efa3a0" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#f8dec7" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#fbecd5" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#vp-glow)" />
      <rect width="100%" height="100%" fill="url(#vp-grid)" className="text-[var(--primary)]" />
    </svg>
  );
}

function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ░░ HERO ░░ */}
      <section className="relative overflow-hidden">
        <GeometryBackdrop />

        {/* Floating geometric ornaments */}
        <div className="pointer-events-none absolute inset-0">
          <div className="float-slow absolute left-[6%] top-[18%] h-24 w-24 rounded-full border border-[var(--primary)]/30" style={{ ['--r' as any]: '0deg' }} />
          <div className="float-slow absolute right-[8%] top-[12%] h-16 w-16 rotate-45 border border-[var(--accent)]/60" style={{ ['--r' as any]: '45deg', animationDelay: '-3s' }} />
          <div className="float-slow absolute left-[14%] bottom-[14%] h-2 w-2 rounded-full bg-[var(--primary)]" />
          <svg className="absolute right-[14%] bottom-[20%] h-32 w-32 text-[var(--accent-cyan)] opacity-25" viewBox="0 0 100 100" aria-hidden>
            <polygon points="50,4 96,28 96,72 50,96 4,72 4,28" fill="none" stroke="currentColor" strokeWidth="0.6" />
            <polygon points="50,18 82,34 82,66 50,82 18,66 18,34" fill="none" stroke="currentColor" strokeWidth="0.6" />
            <polygon points="50,32 68,42 68,58 50,68 32,58 32,42" fill="none" stroke="currentColor" strokeWidth="0.6" />
          </svg>
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-28 sm:pt-28 sm:pb-36">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-border bg-card/60 px-4 py-1.5 font-mono-data text-[10px] uppercase tracking-[0.28em] text-muted-foreground backdrop-blur">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                Vol. VII · Bulletin 2026 / 06
              </div>

              <h1 className="mt-6 font-display text-5xl font-medium leading-[1.02] tracking-tight text-foreground sm:text-6xl md:text-7xl">
                From raw record to
                <br />
                <span className="font-serif-italic" style={{ color: "var(--primary)" }}>decision-ready</span>{" "}
                intelligence.
              </h1>

              <p className="mt-7 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                VeriPolicy is the in-house foresight desk for analysts working at the intersection of defence, climate, and strategic technology. Submit a scenario; receive a referenced, structured brief in under two seconds.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link to="/simulator">
                  <Button size="lg" className="h-11 gap-2 rounded-sm bg-[var(--primary)] px-6 font-mono-data text-[11px] uppercase tracking-[0.2em] text-[var(--primary-foreground)] shadow-[var(--shadow-elegant)] hover:bg-[color-mix(in_oklab,var(--primary)_88%,black)]">
                    Open Simulator <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/tracker">
                  <Button size="lg" variant="outline" className="h-11 rounded-sm border-[var(--primary)] px-6 font-mono-data text-[11px] uppercase tracking-[0.2em] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]">
                    View Policy Tracker
                  </Button>
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 font-mono-data text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <div className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-[var(--primary)]" /> SIPRI-grounded</div>
                <div className="flex items-center gap-2"><Globe2 className="h-3.5 w-3.5 text-[var(--primary)]" /> 47 jurisdictions</div>
                <div className="flex items-center gap-2"><Database className="h-3.5 w-3.5 text-[var(--primary)]" /> 2.1M records indexed</div>
              </div>
            </div>

            {/* Brief specimen card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <div className="absolute -inset-4 -z-10 rounded-sm bg-[var(--accent)]/20 blur-2xl" />
              <div className="relative overflow-hidden rounded-sm border border-border bg-card shadow-[var(--shadow-elegant)]">
                <div className="flex items-center justify-between border-b border-border bg-[var(--surface)] px-5 py-3">
                  <div className="flex items-center gap-2 font-mono-data text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    Foresight Memo · Specimen
                  </div>
                  <span className="font-mono-data text-[10px] text-muted-foreground">VP-2026-0617-A</span>
                </div>
                <div className="px-6 pt-6">
                  <div className="font-mono-data text-[10px] uppercase tracking-[0.28em] text-[var(--primary)]">Subject</div>
                  <h3 className="mt-1 font-display text-2xl font-medium leading-tight text-foreground">
                    Indo-Pacific defence procurement and the renewables-subsidy reallocation question.
                  </h3>
                </div>
                <div className="px-6 pb-2 pt-4">
                  <Ornament label="Scenario Input" />
                  <div className="rounded-sm border border-border bg-[var(--surface)] px-4 py-3 font-mono-data text-xs leading-relaxed text-foreground/80">
                    <span style={{ color: "var(--primary)" }}>→ </span><Typewriter />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-px bg-border">
                  {[
                    { k: "Confidence", v: "0.82", note: "n = 14 analogues" },
                    { k: "Time horizon", v: "0–24 mo", note: "Q3'26 → Q3'28" },
                    { k: "Primary domain", v: "Defence ×", note: "Energy policy" },
                    { k: "Generated in", v: "1.4 s", note: "Llama 3.3 / Groq" },
                  ].map((m) => (
                    <div key={m.k} className="bg-card px-5 py-4">
                      <div className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{m.k}</div>
                      <div className="mt-1 font-display text-xl text-foreground">{m.v}</div>
                      <div className="font-mono-data text-[10px] text-muted-foreground">{m.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ░░ MANDATE ░░ */}
      <section className="border-t border-border bg-[var(--surface)] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <div className="grid gap-10 md:grid-cols-[1fr_2fr]">
              <div>
                <div className="font-mono-data text-[10px] uppercase tracking-[0.28em] text-muted-foreground">§ 01 · Mandate</div>
                <h2 className="mt-3 font-display text-4xl font-medium leading-tight text-foreground">
                  Built for the desks that<br />
                  <span className="font-serif-italic" style={{ color: "var(--primary)" }}>cannot afford to guess</span>.
                </h2>
              </div>
              <div className="space-y-5 border-l border-border pl-8 text-base leading-relaxed text-muted-foreground">
                <p>
                  VeriPolicy was assembled for analysts inside ministries, multilateral secretariats, and policy research desks — staff who write the brief that the principal will sign.
                </p>
                <p>
                  Every claim is anchored to a primary source: SIPRI armament transfers, OWID emissions and energy data, and the public regulatory record across 47 jurisdictions. No synthetic citations. No speculative chains of inference. The model retrieves, the analyst decides.
                </p>
                <p className="font-serif-italic text-foreground/80">
                  &ldquo;The discipline of the brief is the discipline of the evidence.&rdquo;
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ░░ METHOD ░░ */}
      <section className="border-t border-border py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <div className="font-mono-data text-[10px] uppercase tracking-[0.28em] text-muted-foreground">§ 02 · Method</div>
            <h2 className="mt-2 font-display text-4xl font-medium text-foreground">A four-stage protocol</h2>
            <Ornament label="In Strict Sequence" />
          </div>

          <div className="grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-4">
            {[
              { n: "I", t: "Scenario intake", d: "The analyst describes a policy change in natural language. No schema, no taxonomy." },
              { n: "II", t: "Evidence retrieval", d: "Vector search across SIPRI, OWID, and the regulatory corpus surfaces the closest historical analogues." },
              { n: "III", t: "Synthesis", d: "Llama 3.3 70B drafts a structured memo: summary, trajectory, second-order effects, open questions." },
              { n: "IV", t: "Brief delivery", d: "Export as a referenced .txt or .pdf, ready for the principal's binder." },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <div className="h-full bg-card p-7">
                  <div className="font-display text-5xl font-medium leading-none" style={{ color: "var(--primary)" }}>{s.n}</div>
                  <div className="mt-4 font-mono-data text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Stage {s.n}</div>
                  <h3 className="mt-1 font-display text-xl font-medium text-foreground">{s.t}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ░░ DESKS / DOMAINS ░░ */}
      <section className="relative border-t border-border bg-[var(--surface)] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14">
            <div className="font-mono-data text-[10px] uppercase tracking-[0.28em] text-muted-foreground">§ 03 · Capabilities</div>
            <h2 className="mt-2 font-display text-4xl font-medium text-foreground">Two tools. One intelligence desk.</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                badge: "Scenario Simulator",
                icon: FileText,
                accent: "var(--primary)",
                title: "Generate analyst-grade foresight memos from policy scenarios.",
                lines: [
                  "Vector search across historical analogues",
                  "Confidence scoring from SIPRI and OWID data",
                  "Structured memo in under 2 seconds",
                  "Export as .txt or .pdf for circulation",
                ],
              },
              {
                badge: "Policy Tracker",
                icon: Globe2,
                accent: "var(--accent-cyan)",
                title: "Real-time monitoring of defence and climate policy developments.",
                lines: [
                  "Live policy feed across 47 jurisdictions",
                  "Impact brief generation on demand",
                  "Scenario simulation on tracked policies",
                  "Saved items for offline review",
                ],
              },
            ].map((d, i) => (
              <Reveal key={d.badge} delay={i * 0.08}>
                <div className="group relative h-full overflow-hidden rounded-sm border border-border bg-card p-7 transition-shadow hover:shadow-[var(--shadow-elegant)]">
                  <div className="absolute right-0 top-0 h-20 w-20 -translate-y-8 translate-x-8 rotate-45 border border-border opacity-40" />
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-sm"
                      style={{ background: `color-mix(in oklab, ${d.accent} 18%, transparent)`, color: d.accent }}>
                      <d.icon className="h-4 w-4" />
                    </span>
                    <span className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{d.badge}</span>
                  </div>
                  <h3 className="mt-5 font-display text-2xl font-medium leading-snug text-foreground">{d.title}</h3>
                  <ul className="mt-5 space-y-2 border-t border-border pt-4">
                    {d.lines.map((l) => (
                      <li key={l} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <span className="mt-2 inline-block h-1 w-3" style={{ background: d.accent }} />
                        {l}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ░░ DISPATCH / CTA ░░ */}
      <section className="relative overflow-hidden border-t border-border py-28">
        <div className="paper absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <ScrollText className="mx-auto h-7 w-7" style={{ color: "var(--primary)" }} />
          <Ornament label="Standing Order" />
          <h2 className="font-display text-4xl font-medium leading-tight text-foreground sm:text-5xl">
            Write the brief that the principal will <span className="font-serif-italic" style={{ color: "var(--primary)" }}>actually read</span>.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            VeriPolicy is in active service across policy desks. Open the Scenario Simulator to draft your first foresight memo.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link to="/simulator">
              <Button size="lg" className="h-11 gap-2 rounded-sm bg-[var(--primary)] px-7 font-mono-data text-[11px] uppercase tracking-[0.2em] text-[var(--primary-foreground)] shadow-[var(--shadow-elegant)]">
                Begin Drafting <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/tracker">
              <Button size="lg" variant="ghost" className="h-11 rounded-sm font-mono-data text-[11px] uppercase tracking-[0.2em] text-[var(--primary)] hover:bg-transparent hover:underline">
                Read Today's Tracker
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-[var(--surface)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-center md:flex-row md:text-left">
          <div className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            VeriPolicy · Office of Policy Intelligence
          </div>
          <div className="font-serif-italic text-sm text-foreground/70">
            Issued under the authority of the Foresight Desk · 2026
          </div>
          <div className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Llama 3.3 70B · Groq Inference
          </div>
        </div>
      </footer>
    </div>
  );
}
