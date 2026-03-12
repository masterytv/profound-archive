// src/app/compass/page.tsx
import { Metadata } from "next";
import { QuizClient } from "@/components/quiz/QuizClient";

export const metadata: Metadata = {
  title: "NDE Compass | Project Profound",
  description:
    "Four questions. Five starting points. Find the NDE accounts most relevant to you — whether you're grieving, curious, or carrying your own experience.",
};

export default function CompassPage() {
  return <QuizClient />;
}
