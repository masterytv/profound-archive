import { Metadata } from "next";
import Link from "next/link";
import { ARCHETYPES, type ArchetypeId } from "@/lib/quiz/archetypes";
import { ArrowLeft } from "lucide-react";
import { AllTypesClient } from "@/components/quiz/AllTypesClient";

export const metadata: Metadata = {
  title: "All NDE Types | Project Profound",
  description:
    "All 7 NDE visitor archetypes — discover which resonates with you and subscribe to receive matched stories in your inbox.",
};

const ORDER: ArchetypeId[] = [
  "griever", "seeker", "experiencer", "skeptic", "curious", "reexp", "crisis",
];

export default function AllTypesPage() {
  const archetypes = ORDER.map((id) => ARCHETYPES[id]);

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <Link
          href="/quiz"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to quiz
        </Link>

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-2">
            All 7 types
          </p>
          <h1
            className="text-4xl font-normal text-foreground"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            Which type are you?
          </h1>
          <p className="text-[15px] text-muted-foreground mt-3 leading-relaxed">
            Every person who arrives at this archive comes for a different reason.
            Find the archetype that resonates — then subscribe to receive matched
            stories in your inbox.
          </p>
        </div>

        <AllTypesClient archetypes={archetypes} />
      </div>
    </div>
  );
}
