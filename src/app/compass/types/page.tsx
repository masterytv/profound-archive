import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AllTypesClient } from "@/components/quiz/AllTypesClient";

export const metadata: Metadata = {
  title: "All Compass Destinations | Project Profound",
  description:
    "Five NDE Compass destinations — find which one resonates with you and subscribe to receive matched NDE accounts in your inbox.",
};

export default function AllTypesPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <Link
          href="/compass"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to compass
        </Link>

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-2">
            NDE Compass — 5 Destinations
          </p>
          <h1
            className="text-4xl font-normal text-foreground"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            Where does your path begin?
          </h1>
          <p className="text-[15px] text-muted-foreground mt-3 leading-relaxed">
            Every person who arrives here comes for a different reason. Read through
            the five destinations below and find the one that fits — then subscribe
            to receive matched NDE accounts in your inbox.
          </p>
        </div>

        <AllTypesClient />
      </div>
    </div>
  );
}
