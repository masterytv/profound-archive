import type { Metadata } from "next";
import UapChatUI from "./chat-ui";

export const metadata: Metadata = {
  title: "UFO/UAP Research Assistant | Project Profound",
  description:
    "Ask questions about UFO/UAP contact experiences, researchers, and phenomena. Answers are grounded in analyzed video testimonies from Project Profound's archive.",
};

export default function UapChatPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <UapChatUI />
      </div>
    </main>
  );
}
