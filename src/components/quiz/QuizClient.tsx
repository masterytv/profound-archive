"use client";

import { useState } from "react";
import { QUESTIONS, ARCHETYPES, computeArchetype, buildQuestionText, type AnswerOption, type ArchetypeId } from "@/lib/quiz/archetypes";
import { QuizQuestion } from "./QuizQuestion";
import { QuizResult } from "./QuizResult";

export function QuizClient() {
  const [step, setStep] = useState(0);          // 0-5 = questions, 6 = result
  const [answers, setAnswers] = useState<AnswerOption[]>([]);
  const [result, setResult] = useState<ArchetypeId | null>(null);

  function handleAnswer(option: AnswerOption) {
    const newAnswers = [...answers, option];
    setAnswers(newAnswers);

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      // All questions answered
      setResult(computeArchetype(newAnswers));
      setStep(QUESTIONS.length); // triggers result screen
    }
  }

  function handleRestart() {
    setStep(0);
    setAnswers([]);
    setResult(null);
  }

  const progress = step / QUESTIONS.length; // 0 → 1

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar — thin line at very top */}
      <div className="h-0.5 w-full bg-border fixed top-0 left-0 z-50">
        <div
          className="h-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        {step < QUESTIONS.length && result === null ? (
          <>
            {/* Step indicator */}
            <p className="text-xs font-medium text-muted-foreground mb-8 tracking-widest uppercase">
              {step + 1} / {QUESTIONS.length}
            </p>

            <QuizQuestion
              key={step}                         // remounts for fresh animation each Q
              question={QUESTIONS[step]}
              questionText={buildQuestionText(QUESTIONS[step])}
              onAnswer={handleAnswer}
            />
          </>
        ) : result ? (
          <QuizResult
            archetype={ARCHETYPES[result]}
            onRestart={handleRestart}
          />
        ) : null}
      </div>
    </div>
  );
}
