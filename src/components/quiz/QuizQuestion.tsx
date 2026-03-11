"use client";

import { type Question, type AnswerOption } from "@/lib/quiz/archetypes";

interface QuizQuestionProps {
  question: Question;
  questionText: { before: string; emphasis: string; after: string };
  onAnswer: (option: AnswerOption) => void;
}

export function QuizQuestion({ question, questionText, onAnswer }: QuizQuestionProps) {
  return (
    <div
      className="w-full max-w-2xl animate-quiz-slide"
    >
      {/* Question headline */}
      <h2
        className="text-3xl sm:text-4xl md:text-5xl font-normal text-foreground mb-10 leading-tight text-center"
        style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
      >
        {questionText.before}
        <em className="not-italic font-semibold text-primary">
          {questionText.emphasis}
        </em>
        {questionText.after}
      </h2>

      {/* Answer options */}
      <div className="flex flex-col gap-3">
        {question.options.map((option, i) => (
          <button
            key={i}
            onClick={() => onAnswer(option)}
            className="
              group w-full text-left px-5 py-4 rounded-2xl
              border border-border bg-card
              text-foreground text-[15px] leading-snug
              hover:border-primary hover:bg-primary/5
              hover:shadow-sm
              active:scale-[0.98]
              transition-all duration-150 ease-out
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
            "
          >
            <span className="flex items-start gap-3">
              {/* Letter bullet */}
              <span className="
                flex-shrink-0 mt-0.5 w-6 h-6 rounded-full border border-border
                flex items-center justify-center text-[11px] font-medium text-muted-foreground
                group-hover:border-primary group-hover:text-primary
                transition-colors
              ">
                {String.fromCharCode(65 + i)}
              </span>
              <span>{option.text}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
