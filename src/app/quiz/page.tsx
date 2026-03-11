import { Metadata } from "next";
import { QuizClient } from "@/components/quiz/QuizClient";

export const metadata: Metadata = {
  title: "What's Your NDE Type? | Project Profound",
  description:
    "Answer 6 questions to discover which of 7 NDE explorer archetypes you are — and get video picks matched to exactly what you're looking for.",
  openGraph: {
    title: "What's Your NDE Type?",
    description: "Discover your NDE archetype in 6 questions.",
    url: "https://projectprofound.org/quiz",
  },
};

export default function QuizPage() {
  return <QuizClient />;
}
