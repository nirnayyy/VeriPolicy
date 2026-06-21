import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — VeriPolicy" },
      {
        name: "description",
        content:
          "Review the VeriPolicy Terms of Service and Data Use Policy before creating an account.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-6 py-16 sm:px-8">
        <div className="mb-10 flex items-center justify-between gap-4">
          <div>
            <p className="font-mono-data text-[11px] uppercase tracking-[0.26em] text-muted-foreground">
              Terms and Policy
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Account terms and data use
            </h1>
          </div>
          <Link
            to="/signup"
            className="inline-flex items-center rounded-sm border border-border px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/5"
          >
            Back to signup
          </Link>
        </div>

        <div className="space-y-8 rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Terms of Service</h2>
            <p className="text-sm leading-7 text-muted-foreground">
              By creating an account, you agree to use VeriPolicy only for legitimate analysis and policy research.
              You must provide accurate account information and may not impersonate another person or institution.
            </p>
            <p className="text-sm leading-7 text-muted-foreground">
              Accounts are intended for analysts, researchers, and policy professionals. VeriPolicy is provided as an
              advisory intelligence workspace and is not a substitute for legal or official government advice.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Data Use Policy</h2>
            <p className="text-sm leading-7 text-muted-foreground">
              We use your email, organization, and role information to manage access, provide the service, and send
              account-related notifications. We also collect usage data to improve product quality and platform
              reliability.
            </p>
            <p className="text-sm leading-7 text-muted-foreground">
              We do not sell your personal information. Data shared with third parties is limited to service providers
              required to operate the application and to comply with applicable law.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Your agreement</h2>
            <ul className="space-y-3 text-sm leading-7 text-muted-foreground">
              <li>
                <strong className="text-foreground">Account acceptance:</strong> you must accept the terms and
                policies before creating an account.
              </li>
              <li>
                <strong className="text-foreground">Privacy:</strong> we retain information required to authenticate
                your account and to troubleshoot service issues.
              </li>
              <li>
                <strong className="text-foreground">Responsible use:</strong> do not upload or publish content that
                violates applicable laws or policy restrictions.
              </li>
            </ul>
          </section>

          <div className="rounded-2xl bg-background p-5 text-sm leading-6 text-muted-foreground">
            <p className="font-semibold text-foreground">Note</p>
            <p>
              You can review these terms before signing up. The signup form will require acceptance of the Terms of
              Service and Data Use Policy to continue.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
