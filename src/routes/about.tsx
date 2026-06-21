import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/navbar";
import { motion } from "framer-motion";
import { BookOpen, Globe2, ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — VeriPolicy" },
      { name: "description", content: "Learn about VeriPolicy's mission, approach, and the research-backed policy insights we deliver." },
    ],
  }),
  component: AboutPage,
});

function FeatureCard({ title, description, icon: Icon }: { title: string; description: string; icon: typeof BookOpen }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <p className="font-mono-data text-[11px] uppercase tracking-[0.26em] text-muted-foreground">About Us</p>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              VeriPolicy blends primary-source policy analysis with AI-powered foresight.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              We work at the intersection of defence, climate, and strategic technology to turn structured data into decision-ready advisory insight. Our models are calibrated against public policy records, historical outcomes, and expert frameworks so users can act with confidence.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <FeatureCard
                title="Research-Led Intelligence"
                description="We combine verified historical sources with policy signal extraction to keep briefs grounded and evidence-based."
                icon={BookOpen}
              />
              <FeatureCard
                title="Actionable Policy Signals"
                description="Every insight is shaped for operational use: strategy, scenario planning, and policy risk monitoring."
                icon={Globe2}
              />
            </div>
          </div>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[2rem] border border-border bg-card p-8 shadow-[var(--shadow-elegant)]"
          >
            <div className="flex items-center gap-3 text-sm font-mono-data uppercase tracking-[0.24em] text-muted-foreground">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent-green)]" />
              Our mission
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-foreground">Strategic clarity for policy teams.</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              VeriPolicy is designed to surface the policy drivers that matter most to senior analysts, decision-makers, and advisory desks. We make complex policy trends accessible without losing analytical discipline.
            </p>
            <div className="mt-8 grid gap-4 text-sm leading-7 text-muted-foreground sm:grid-cols-2">
              <div>
                <p className="font-semibold text-foreground">Evidence-first</p>
                <p>Data is sourced from public budgets, legislative activity, and trusted international databases.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Human-centered</p>
                <p>Insights are presented for practical use in briefings, policy ops, and risk assessment workflows.</p>
              </div>
            </div>
            <div className="mt-8 rounded-3xl border border-border bg-[var(--surface)] p-5">
              <p className="font-mono-data text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Core values</p>
              <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
                <div className="rounded-2xl bg-background p-4">Accuracy over noise. We prioritise verifiable signal, not just volume.</div>
                <div className="rounded-2xl bg-background p-4">Speed with rigour. Near-real-time inputs are balanced with structured synthesis.</div>
                <div className="rounded-2xl bg-background p-4">Policy-first context. Every recommendation is anchored to geopolitics, budgets, and regulation.</div>
              </div>
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
}
