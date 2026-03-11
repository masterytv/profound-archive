// src/app/unsubscribe/page.tsx
// Unsubscribe confirmation page. Rendered after clicking the unsubscribe link in an email.

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Unsubscribed — Project Profound",
  robots: "noindex",
};

interface Props {
  searchParams: { success?: string; error?: string; archetype?: string };
}

export default function UnsubscribePage({ searchParams }: Props) {
  const isSuccess = searchParams.success === "1";
  const hasError  = !!searchParams.error;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "#FDFAF6" }}
    >
      <div className="max-w-md w-full text-center space-y-6">
        {isSuccess ? (
          <>
            <div className="text-5xl">✓</div>
            <h1
              className="text-3xl font-bold text-slate-900"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
              You&apos;re unsubscribed.
            </h1>
            <p className="text-slate-500 leading-relaxed">
              You won&apos;t receive any more story emails from Project Profound.
              The archive will always be here if you want to return.
            </p>
            <Link
              href="/quiz"
              className="text-sm text-blue-600 hover:underline"
            >
              Change your frequency instead →
            </Link>
          </>
        ) : hasError ? (
          <>
            <div className="text-5xl">⚠</div>
            <h1
              className="text-3xl font-bold text-slate-900"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
              That link has expired.
            </h1>
            <p className="text-slate-500">
              If you&apos;d like to unsubscribe, email us at{" "}
              <a
                href="mailto:hello@projectprofound.org"
                className="text-blue-600 hover:underline"
              >
                hello@projectprofound.org
              </a>
            </p>
          </>
        ) : (
          <>
            <div className="text-5xl">✦</div>
            <h1
              className="text-3xl font-bold text-slate-900"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
              Unsubscribe
            </h1>
            <p className="text-slate-500">Processing your request…</p>
          </>
        )}

        <div className="pt-4">
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            ← Back to Project Profound
          </Link>
        </div>
      </div>
    </div>
  );
}
