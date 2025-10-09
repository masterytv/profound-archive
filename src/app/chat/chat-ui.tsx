'use client';

import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getChatResponse } from '../actions';
import { Bot, Loader2, Send, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];
}

export default function ChatUI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const suggestionQuestions = [
    'Do pets appear in NDEs?',
    'What is the feeling of peace like?',
    'Tell me about the life review process.',
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const sendMessage = async (messageContent: string) => {
    if (!messageContent.trim()) return;

    const userMessage: Message = { role: 'user', content: messageContent };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setInput('');

    const response = await getChatResponse(messageContent);
    
    if (response.success && response.data) {
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.answer,
        citations: response.data.citations,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } else {
      const errorMessage: Message = {
        role: 'assistant',
        content: response.error || 'Sorry, I encountered an error. Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
    setIsLoading(false);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendMessage(input);
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
        // A bit of a hack to scroll to the bottom.
        setTimeout(() => {
             if (scrollAreaRef.current) {
                const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
                if (viewport) {
                    viewport.scrollTop = viewport.scrollHeight;
                }
             }
        }, 100);
    }
  }, [messages]);


  return (
    <div className="flex flex-col h-[70vh]">
      <ScrollArea className="flex-grow p-4 border rounded-lg mb-4" ref={scrollAreaRef}>
        <div className="space-y-6">
          {messages.length === 0 && (
             <div className="text-center text-muted-foreground">
                <p>Ask a question to start the conversation.</p>
             </div>
          )}
          {messages.map((message, index) => (
            <div key={index} className={cn('flex items-start gap-4', message.role === 'user' ? 'justify-end' : '')}>
              {message.role === 'assistant' && (
                <Avatar className="w-8 h-8 border">
                  <AvatarFallback><Bot className="w-5 h-5" /></AvatarFallback>
                </Avatar>
              )}
              <div className={cn("max-w-md p-3 rounded-lg", message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.citations && message.citations.length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <h4 className="text-xs font-semibold mb-1">References:</h4>
                    <ul className="list-disc list-inside text-xs">
                      {message.citations.map((citation, i) => (
                        <li key={i}><Link href="#" className="underline hover:no-underline">{citation}</Link></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {message.role === 'user' && (
                <Avatar className="w-8 h-8 border">
                  <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-4">
                 <Avatar className="w-8 h-8 border">
                  <AvatarFallback><Bot className="w-5 h-5" /></AvatarFallback>
                </Avatar>
                <div className="max-w-md p-3 rounded-lg bg-secondary">
                    <Loader2 className="w-5 h-5 animate-spin" />
                </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="mb-4 flex flex-wrap gap-2 justify-center">
        {suggestionQuestions.map((q) => (
          <Button key={q} variant="outline" size="sm" onClick={() => sendMessage(q)} disabled={isLoading}>
            {q}
          </Button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Textarea
          value={input}
          onChange={handleInputChange}
          placeholder="Type your question here..."
          className="flex-grow resize-none"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as any);
            }
          }}
        />
        <Button type="submit" disabled={isLoading || !input.trim()} size="lg">
          <Send className="w-5 h-5" />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  );
}
