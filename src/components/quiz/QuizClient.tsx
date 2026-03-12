"use client";

import { useState } from "react";
import { QUESTIONS, ARCHETYPES, computeArchetype, type AnswerOption, type ArchetypeId } from "@/lib/quiz/archetypes";
import { QuizQuestion } from "./QuizQuestion";
import { QuizResult } from "./QuizResult";

const CRISIS_ANCHOR = (
  <p className="text-xs text-muted-foreground text-center mt-8 leading-relaxed">
    If you're in a dark place right now, you're still welcome here.{" "}
    <a
      href="tel:988"
      className="underline underline-offset-2 hover:text-foreground transition-colors"
    >
      988 Suicide &amp; Crisis Lifeline — call or text 988
    </a>{" "}
    is available anytime.
  </p>
);

export function QuizClient() {
  // step 0-3 = questions, QUESTIONS.length = write-in, result shown when result != null
  const [step, setStep]           = useState(0);
  const [answers, setAnswers]     = useState<AnswerOption[]>([]);
  const [writeIn, setWriteIn]     = useState("");
  const [result, setResult]       = useState<ArchetypeId | null>(null);
  const [showFrame, setShowFrame] = useState(true);

  function handleAnswer(option: AnswerOption) {
    const newAnswers = [...answers, option];
    setAnswers(newAnswers);
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      setStep(QUESTIONS.length);
    }
  }

  function handleWriteInSubmit() {
    setResult(computeArchetype(answers));
  }

  function handleRestart() {
    setStep(0);
    setAnswers([]);
    setWriteIn("");
    setResult(null);
    setShowFrame(true);
  }

  const isWriteInStep = step === QUESTIONS.length && result === null;
  const isResultStep  = result !== null;
  const progress      = isResultStep ? 1 : step / QUESTIONS.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar */}
      <div className="h-0.5 w-full bg-border fixed top-0 left-0 z-50">
        <div
          className="h-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Content — top-anchored with 150px padding from the navbar */}
      <div className="flex-1 flex flex-col items-center px-4 pt-[75px] pb-20">

        {/* ── Pre-quiz intro ── */}
        {showFrame && !isResultStep && step === 0 && (
          <div className="w-full max-w-2xl text-center">
            {/* Big brand title */}
            <h1
              className="text-5xl sm:text-6xl md:text-7xl font-normal text-foreground mb-6 leading-tight"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
              NDE Compass
            </h1>

            {/* Framing paragraph */}
            <p className="text-[16px] sm:text-[17px] text-muted-foreground leading-relaxed mb-10 max-w-lg mx-auto">
              People come to NDE accounts for very different reasons. It might be curiosity,
              grief, a personal experience, a sense of wonder, or something truly personal.
              This compass will help you find the videos and resources most relevant to you
              right now. When you see your results, you'll also get options for how you'd
              like those videos delivered.{" "}
              <span className="text-foreground font-medium">Four questions. No wrong answers.</span>
            </p>

            <button
              onClick={() => setShowFrame(false)}
              className="
                px-8 py-3.5 rounded-2xl bg-primary text-white font-medium text-[16px]
                hover:opacity-90 active:scale-[0.98] transition-all shadow-sm
              "
            >
              Find my starting point →
            </button>

            {CRISIS_ANCHOR}
          </div>
        )}

        {/* ── Scored questions ── */}
        {!showFrame && step < QUESTIONS.length && !isResultStep && (
          <div className="w-full max-w-2xl">
            <p
              className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 text-center"
              style={{ letterSpacing: "0.15em" }}
            >
              NDE Compass
            </p>
            <p className="text-xs font-medium text-muted-foreground mb-8 tracking-widest uppercase text-center">
              {step + 1} / {QUESTIONS.length}
            </p>

            <QuizQuestion
              key={step}
              question={QUESTIONS[step]}
              onAnswer={handleAnswer}
            />
            {CRISIS_ANCHOR}
          </div>
        )}

        {/* ── Write-in Q5 (optional) ── */}
        {isWriteInStep && (
          <div className="w-full max-w-2xl animate-quiz-slide space-y-6">
            <p
              className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 text-center"
              style={{ letterSpacing: "0.15em" }}
            >
              NDE Compass — One more thing
            </p>
            <h2
              className="text-3xl sm:text-4xl font-normal text-foreground text-center leading-tight"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
              Is there a question we&apos;re not asking?
            </h2>
            <p className="text-sm text-muted-foreground text-center">
              Optional — write as much or as little as you like.
            </p>
            <textarea
              value={writeIn}
              onChange={(e) => setWriteIn(e.target.value)}
              placeholder="Is there a question that you feel that a site like ours should answer?"
              rows={6}
              className="
                w-full rounded-2xl border border-border bg-card px-5 py-4
                text-[15px] text-foreground placeholder:text-muted-foreground
                focus:outline-none focus:ring-2 focus:ring-primary resize-none
                dark:[color-scheme:dark]
              "
            />
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleWriteInSubmit}
                className="px-6 py-3 rounded-2xl bg-primary text-white font-medium text-[15px] hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Show me my results →
              </button>
              <button
                onClick={handleWriteInSubmit}
                className="px-4 py-3 rounded-2xl border border-border text-muted-foreground text-[14px] hover:bg-muted/50 transition-all"
              >
                Skip
              </button>
            </div>
            {CRISIS_ANCHOR}
          </div>
        )}

        {/* ── Result ── */}
        {isResultStep && (
          <QuizResult
            archetype={ARCHETYPES[result]}
            writeIn={writeIn || undefined}
            onRestart={handleRestart}
          />
        )}
      </div>
    </div>
  );
}
