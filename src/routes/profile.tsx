import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { FileText, LogOut, Mail, MapPin, ShieldCheck, Clock, ArrowRight, Download, Pencil, Loader2 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth-provider";
import { useActivity, useBriefs, useProfile } from "@/hooks/use-dashboard-data";
import { upsertProfile } from "@/lib/supabase/dashboard";
import { useQueryClient } from "@tanstack/react-query";
import { ROLE_LABELS } from "@/lib/supabase/types";
import { formatActivityTime, formatRelativeTime } from "@/lib/format-time";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Analyst Profile · VeriPolicy" },
      { name: "description", content: "Analyst dossier, past foresight drafts, and session controls." },
    ],
  }),
  beforeLoad: async () => {
    // Check if user is authenticated before loading route
    if (!isSupabaseConfigured()) {
      throw redirect({ to: "/login" });
    }
    
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      throw redirect({ to: "/login" });
    }
  },
  component: ProfilePage,
});

function statusStyle(s: string) {
  switch (s) {
    case "Published": return { bg: "color-mix(in oklab, var(--accent-cyan) 14%, transparent)", fg: "var(--accent-cyan)" };
    case "In Review": return { bg: "color-mix(in oklab, var(--accent-violet) 16%, transparent)", fg: "var(--accent-violet)" };
    case "Draft": return { bg: "color-mix(in oklab, var(--primary) 14%, transparent)", fg: "var(--primary)" };
    default: return { bg: "color-mix(in oklab, var(--muted-foreground) 14%, transparent)", fg: "var(--muted-foreground)" };
  }
}

function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: briefs = [], isLoading: briefsLoading } = useBriefs();
  const { data: activity = [], isLoading: activityLoading } = useActivity();

  async function logout() {
    await signOut();
    navigate({ to: "/login" });
  }

  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [fullNameInput, setFullNameInput] = useState("");
  const [organizationInput, setOrganizationInput] = useState<string | null>(null);
  const [roleInput, setRoleInput] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedBriefForView, setSelectedBriefForView] = useState<any | null>(null);

  function beginEdit() {
    setFullNameInput(profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "");
    setOrganizationInput(profile?.organization ?? profile?.station ?? null);
    setRoleInput(profile?.role ?? null);
    setEditing(true);
  }

  const downloadBriefPdf = async (brief: any) => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      doc.setDrawColor(241, 215, 205);
      doc.rect(5, 5, 200, 287);

      doc.setFont("Garamond", "normal");
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text("VERIPOLICY OFFICE OF POLICY INTELLIGENCE", 15, 20);
      doc.text("ARCHIVED FORESIGHT MEMO", 145, 20);

      doc.setDrawColor(226, 149, 120);
      doc.setLineWidth(0.5);
      doc.line(15, 23, 195, 23);

      doc.setTextColor(43, 29, 24);
      doc.setFontSize(12);
      doc.text(`SUBJECT: ${brief.title.toUpperCase()}`, 15, 34);

      doc.setFontSize(10);
      doc.setFont("Courier", "italic");
      doc.text(`REFERENCE ID: ${brief.ref_id}`, 15, 42);

      let currentY = 47;
      doc.line(15, currentY, 195, currentY);
      currentY += 8;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(43, 29, 24);
      
      const splitBody = doc.splitTextToSize(brief.body || "No content.", 175);
      doc.text(splitBody, 15, currentY);
      currentY += (splitBody.length * 4.8) + 12;

      if (currentY > 240) {
        doc.addPage();
        doc.rect(5, 5, 200, 287);
        currentY = 20;
      }
      
      doc.setFont("Courier", "italic");
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text("PREPARED AND CERTIFIED BY THE FORESIGHT DESK", 15, currentY);
      
      doc.line(15, currentY + 12, 80, currentY + 12);
      doc.text("AUTHORIZED ANALYST SIGNATURE", 15, currentY + 17);

      doc.setFont("Courier", "bold");
      doc.setTextColor(20, 20, 20);
      doc.text(displayName, 20, currentY + 9);

      doc.save(`veripolicy-archive-${brief.ref_id}.pdf`);
    } catch (e) {
      console.error("PDF generation failed", e);
    }
  };

  async function saveEdits() {
    if (!user) return;
    setSaving(true);
    try {
      await upsertProfile(user.id, { full_name: fullNameInput, organization: organizationInput, role: roleInput }, user.email ?? undefined);
      // update cache immediately so UI reflects changes without waiting for network
      queryClient.setQueryData(["profile", user.id], (old: any) => ({ ...(old ?? {}), full_name: fullNameInput, organization: organizationInput, role: roleInput }));
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      setEditing(false);
    } catch (e) {
      console.error("Failed to save profile", e);
      // optional: show toast
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-md px-6 py-32 text-center">
          <ShieldCheck className="mx-auto h-7 w-7" style={{ color: "var(--primary)" }} />
          <h1 className="mt-5 font-display text-3xl text-foreground">Session not established</h1>
          <p className="mt-3 text-sm text-muted-foreground">Authenticate to view your dossier and past drafts.</p>
          <Link to="/login">
            <Button className="mt-7 h-11 rounded-sm bg-[var(--primary)] px-7 font-mono-data text-[11px] uppercase tracking-[0.2em] text-[var(--primary-foreground)]">
              Proceed to Sign-In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Analyst";
  const roleLabel = profile?.role
    ? (ROLE_LABELS[profile.role] ?? profile.role)
    : "Policy Analyst · Foresight Desk";
  const email = profile?.email || user.email || "";
  const clearance = profile?.clearance || "Level I · Internal";
  const station = profile?.station || profile?.organization || "Unassigned";
  const joined = profile?.joined_at
    ? new Date(profile.joined_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : "Recently";
  // Use profile metrics directly (updated by database triggers on brief changes)
  const briefsCount = profile?.briefs_count ?? 0;
  const citations = profile?.citations_count ?? 0;
  const accuracy = profile?.forecast_accuracy ?? 0;
  const activeDrafts = briefs.filter((d) => d.status === "Draft" || d.status === "In Review").length;
  const loadingData = profileLoading || briefsLoading || activityLoading;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative overflow-hidden border-b border-border">
        <div className="paper absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-6xl px-6 pt-14 pb-12">
          <div className="font-mono-data text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            Dossier · Analyst Profile · {clearance}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 grid gap-8 md:grid-cols-[auto_1fr_auto] md:items-end"
          >
            <div className="flex items-center gap-5">
              <div
                className="grid h-20 w-20 place-items-center rounded-sm border border-border font-display text-3xl text-[var(--primary)]"
                style={{ background: "color-mix(in oklab, var(--primary) 10%, transparent)" }}
              >
                {displayName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div>
                <h1 className="font-display text-4xl font-medium leading-tight text-foreground sm:text-5xl">
                  {displayName}
                </h1>
                <div className="mt-2 font-serif-italic text-base text-foreground/70">{roleLabel}</div>
              </div>
            </div>

            <div className="md:justify-self-center md:px-6 flex flex-col gap-4">
              <ul className="grid grid-cols-2 gap-x-8 gap-y-2 font-mono-data text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <li className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{email}</li>
                <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{station}</li>
                <li className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" />{clearance}</li>
                <li className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" />Joined {joined}</li>
              </ul>
              
              <div className="rounded-xl border border-border bg-card/60 p-3.5 max-w-sm">
                <span className="font-mono-data text-[8px] uppercase tracking-wider text-muted-foreground block mb-2">Digital Signature Dossier Certificate</span>
                <div className="h-10 border border-dashed border-border/80 rounded-md flex items-center justify-center bg-background p-2">
                  <span className="text-xl text-foreground font-semibold italic select-none" style={{ fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive" }}>{displayName}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 md:justify-self-end">
                        <Button onClick={beginEdit} variant="outline" className="h-10 rounded-sm border-border font-mono-data text-[11px] uppercase tracking-[0.2em]">
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>

                        <Dialog open={editing} onOpenChange={(o) => setEditing(o)}>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit profile</DialogTitle>
                              <DialogDescription>Update your name, organisation and role. Changes persist across logins.</DialogDescription>
                            </DialogHeader>

                            <div className="mt-4 grid gap-3">
                              <label className="text-sm text-muted-foreground">Full name</label>
                              <input className="h-10 rounded-sm border border-border px-3 text-sm" value={fullNameInput} onChange={(e) => setFullNameInput(e.target.value)} />

                              <label className="text-sm text-muted-foreground">Organization</label>
                              <input className="h-10 rounded-sm border border-border px-3 text-sm" value={organizationInput ?? ""} onChange={(e) => setOrganizationInput(e.target.value || null)} />

                              <label className="text-sm text-muted-foreground">Role</label>
                              <select className="h-10 rounded-sm border border-border px-3 text-sm" value={roleInput ?? ""} onChange={(e) => setRoleInput(e.target.value || null)}>
                                <option value="">Select role</option>
                                {Object.keys(ROLE_LABELS).map((k) => (
                                  <option key={k} value={k}>{ROLE_LABELS[k]}</option>
                                ))}
                              </select>
                            </div>

                            <DialogFooter className="mt-4">
                              <div className="flex w-full justify-between">
                                <Link to="/home">
                                  <Button variant="ghost">Back to Home</Button>
                                </Link>
                                <div className="flex gap-2">
                                  <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                                  <Button onClick={saveEdits} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                                </div>
                              </div>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
              <Button
                onClick={logout}
                className="h-10 rounded-sm bg-[var(--primary)] font-mono-data text-[11px] uppercase tracking-[0.2em] text-[var(--primary-foreground)]"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </Button>
            </div>
          </motion.div>

          <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-4">
            {[
              { k: "Briefs Authored", v: briefsCount },
              { k: "Primary Citations", v: citations },
              { k: "Forecast Accuracy", v: accuracy > 0 ? `${Math.round(accuracy * 100)}%` : "—" },
              { k: "Active Drafts", v: activeDrafts },
            ].map((s) => (
              <div key={s.k} className="bg-background p-5">
                <div className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{s.k}</div>
                <div className="mt-2 font-display text-3xl font-medium text-foreground">
                  {loadingData ? "…" : s.v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr]">
          <div>
            <div className="flex items-end justify-between border-b border-border pb-3">
              <div>
                <div className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Archive</div>
                <h2 className="mt-1 font-display text-2xl font-medium text-foreground">Past Drafts & Memoranda</h2>
              </div>
              <Link to="/simulator" className="font-mono-data text-[11px] uppercase tracking-[0.2em] text-[var(--primary)] hover:underline">
                New Draft <ArrowRight className="inline h-3 w-3" />
              </Link>
            </div>

            {loadingData ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : briefs.length === 0 ? (
              <p className="py-12 text-sm text-muted-foreground">
                No briefs yet. Open the Scenario Simulator to create your first foresight memo.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-border">
                {briefs.map((d, idx) => {
                  const s = statusStyle(d.status);
                  const accent = d.accent_color || "var(--primary)";
                  return (
                    <motion.li
                      key={d.id}
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: idx * 0.04 }}
                      className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4"
                    >
                      <span className="mt-1 inline-block h-2 w-2" style={{ background: accent }} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{d.ref_id}</span>
                          <span
                            className="rounded-sm px-2 py-0.5 font-mono-data text-[10px] uppercase tracking-[0.18em]"
                            style={{ background: s.bg, color: s.fg }}
                          >
                            {d.status}
                          </span>
                          <span className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            {d.tag ?? "General"} · {d.pages} pp · {formatRelativeTime(d.updated_at)}
                          </span>
                        </div>
                        <div className="mt-1.5 font-display text-lg leading-snug text-foreground">
                          {d.title}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => downloadBriefPdf(d)}
                          className="grid h-9 w-9 place-items-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] cursor-pointer"
                          title="Download PDF"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => setSelectedBriefForView(d)}
                          className="grid h-9 w-9 place-items-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] cursor-pointer"
                          title="View Memo Briefing"
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </div>

          <aside>
            <div className="border-b border-border pb-3">
              <div className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Log</div>
              <h2 className="mt-1 font-display text-2xl font-medium text-foreground">Recent Activity</h2>
            </div>

            {loadingData ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : activity.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <ul className="mt-4 space-y-4 border-l border-border pl-5">
                {activity.map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -left-[23px] top-1.5 h-2 w-2 rounded-full bg-[var(--primary)]" />
                    <div className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      {formatActivityTime(a.created_at)}
                    </div>
                    <div className="mt-0.5 text-sm text-foreground/80">{a.note}</div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8 rounded-sm border border-border bg-card p-5">
              <div className="font-mono-data text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-3.5">System Integrity Monitor</div>
              <div className="space-y-3.5 text-xs">
                <div>
                  <div className="flex items-center justify-between text-foreground font-mono-data text-[9px] uppercase tracking-wider mb-1.5">
                    <span>API Quota Usage</span>
                    <span>87% Remaining</span>
                  </div>
                  <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--primary)] rounded-full" style={{ width: "87%" }} />
                  </div>
                </div>
                <div className="h-px bg-border/60 my-2" />
                {[
                  { name: "Gemini Flash API", status: "Active", latency: "142ms", color: "bg-emerald-500" },
                  { name: "Groq Llama 3.3", status: "Active", latency: "185ms", color: "bg-emerald-500" },
                  { name: "Supabase DB Cluster", status: "Active", latency: "18ms", color: "bg-emerald-500" },
                ].map((sys) => (
                  <div key={sys.name} className="flex items-center justify-between font-mono-data text-[9px]">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${sys.color} animate-pulse`} />
                      <span className="text-muted-foreground">{sys.name}</span>
                    </div>
                    <span className="text-foreground">{sys.latency}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 rounded-sm border border-border bg-[var(--surface)] p-5">
              <div className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Session</div>
              <p className="mt-2 font-serif-italic text-sm text-foreground/70">
                "All work product is subject to the editorial standards of the Foresight Desk."
              </p>
              <Button
                onClick={logout}
                variant="outline"
                className="mt-5 h-10 w-full rounded-sm border-border font-mono-data text-[11px] uppercase tracking-[0.2em] cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" /> End Session
              </Button>
            </div>
          </aside>
        </div>
      </section>

      <Dialog open={!!selectedBriefForView} onOpenChange={(o) => !o && setSelectedBriefForView(null)}>
        {selectedBriefForView && (
          <DialogContent className="max-w-2xl bg-card border-border rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[85vh]">
            <DialogHeader className="border-b border-border/80 pb-4">
              <div className="flex items-center justify-between text-[9px] font-mono-data text-muted-foreground uppercase tracking-widest">
                <span>VERIPOLICY ARCHIVE · DOSSIER {selectedBriefForView.ref_id}</span>
                <span>{new Date(selectedBriefForView.updated_at).toLocaleDateString()}</span>
              </div>
              <DialogTitle className="font-display text-2xl font-semibold text-foreground mt-3 leading-snug">
                {selectedBriefForView.title}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-6 space-y-6 text-sm text-foreground">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 font-sans border border-border/60 bg-muted/20 p-4 rounded-xl">
                {selectedBriefForView.body || "No body content available in draft."}
              </div>

              <div className="border-t border-border pt-4 flex flex-col gap-2 font-mono-data text-[10px] text-muted-foreground uppercase tracking-wider">
                <div className="flex items-center justify-between">
                  <span>Status: {selectedBriefForView.status}</span>
                  <span>Jurisdiction: {selectedBriefForView.tag || "General"}</span>
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
