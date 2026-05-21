'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Loader2, Send, User, ExternalLink, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getUapChatResponse, type UapChatResponse } from '../actions';
import ContentSafetyBanner from '@/components/uap/ContentSafetyBanner';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatSource {
  video_id: string;
  title: string;
  channel_name: string | null;
  snippet: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: ChatSource[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function UapChatUI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    'What types of entities do contactees describe?',
    'Are there common physical effects reported?',
    'What do experiencers say about telepathic communication?',
  ];

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const response = await getUapChatResponse(text);

    if (response.success && response.data) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: response.data!.answer,
          citations: response.data!.citations,
        },
      ]);
    } else {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: response.error || 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    }
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Parse [1], [2] etc. in LLM output and render as clickable superscript badges
  const renderContentWithCitations = (text: string, citations?: ChatSource[]) => {
    if (!citations || citations.length === 0) {
      return text;
    }

    // Split on citation patterns like [1], [2], [1][2], etc.
    const parts = text.split(/(\[\d+\])/g);
    return parts.map((part, i) => {
      const match = part.match(/^\[(\d+)\]$/);
      if (match) {
        const num = parseInt(match[1], 10);
        const cite = citations[num - 1];
        if (cite) {
          return (
            <Link
              key={i}
              href={`/uap/video/${cite.video_id}`}
              className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-100 dark:bg-green-900/40 text-[9px] font-bold text-green-700 dark:text-green-300 align-super mx-0.5 hover:bg-green-200 dark:hover:bg-green-800/60 transition-colors no-underline"
              title={cite.title}
            >
              {num}
            </Link>
          );
        }
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      {/* Safety Banner */}
      <ContentSafetyBanner variant="enhanced" storageKey="uap-chat-safety-dismissed" />

      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/40 mb-3">
          <Radio className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <h1
          className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100"
          style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
        >
          UFO/UAP Research Assistant
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Ask questions grounded in analyzed UFO/UAP testimonies
        </p>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1"
      >
        {messages.length === 0 && !isLoading && (
          <div className="space-y-3 mt-8">
            <p className="text-center text-sm text-slate-400 dark:text-slate-500 mb-4">
              Try a question to get started:
            </p>
            {suggestions.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 hover:border-green-300 dark:hover:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 text-sm text-slate-600 dark:text-slate-400 transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'flex gap-3 items-start',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
            )}

            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-green-600 text-white rounded-br-md'
                  : 'bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-bl-md'
              )}
            >
              <div className="whitespace-pre-wrap">
                {renderContentWithCitations(msg.content, msg.citations)}
              </div>

              {/* Citations */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Sources:
                  </p>
                  {msg.citations.map((cite, idx) => (
                    <Link
                      key={cite.video_id}
                      href={`/uap/video/${cite.video_id}`}
                      className="flex items-start gap-2 text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
                    >
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-100 dark:bg-green-900/40 text-[9px] font-bold text-green-700 dark:text-green-300 flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="line-clamp-1">{cite.title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 className="w-4 h-4 text-green-500 animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about UFO/UAP experiences..."
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 px-4 py-3 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-green-400 dark:focus:border-green-600 focus:ring-1 focus:ring-green-400/20 disabled:opacity-50 transition-colors"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="p-3 rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
