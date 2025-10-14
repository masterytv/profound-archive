"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Bot, Loader2, AlertCircle, ArrowUpRight } from "lucide-react"

export default function ChatPage() {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([])
  const [input, setInput] = useState("")
  const [sessionId, setSessionId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [webhookConfigured, setWebhookConfigured] = useState(true)

  useEffect(() => {
    setSessionId(crypto.randomUUID())
    const webhookUrl = process.env.NEXT_PUBLIC_CHAT_TEST_WEBHOOK_URL
    if (!webhookUrl || webhookUrl === 'YOUR_CHAT_TEST_WEBHOOK_URL_HERE') {
      console.error("[v0] NEXT_PUBLIC_CHAT_TEST_WEBHOOK_URL is not configured")
      setWebhookConfigured(false)
    } else {
      console.log("[v0] Webhook URL configured:", webhookUrl)
    }
  }, [])

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return

    const userMessage = { role: "user" as const, content: messageText.trim() }
    setMessages(prevMessages => [...prevMessages, userMessage])
    setIsLoading(true)

    try {
      const webhookUrl = process.env.NEXT_PUBLIC_CHAT_TEST_WEBHOOK_URL

      if (!webhookUrl || webhookUrl === 'YOUR_CHAT_TEST_WEBHOOK_URL_HERE') {
        console.error("[v0] Webhook URL not configured")
        throw new Error("WEBHOOK_NOT_CONFIGURED")
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: sessionId,
          chatInput: messageText.trim(),
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()

      let formattedContent = "I apologize, but I couldn't generate a response."
      if (data.output) {
        formattedContent = data.output
      } else if (Array.isArray(data) && data.length > 0 && data[0].output) {
        formattedContent = data[0].output
      } else if (data.response) {
        formattedContent = data.response
      } else if (data.message) {
        formattedContent = data.message
      } else if (typeof data === "string") {
        formattedContent = data
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: formattedContent,
        },
      ])
    } catch (error) {
      console.error("[v0] Chat error:", error)
      let errorMessage = "I apologize, but I encountered an error. Please try again."
      if (error instanceof Error) {
        if (error.message === "WEBHOOK_NOT_CONFIGURED") {
          errorMessage =
            "The chatbot webhook is not configured. Please add the NEXT_PUBLIC_CHAT_TEST_WEBHOOK_URL environment variable."
        } else if (error.message.includes("Failed to fetch")) {
          errorMessage =
            "Unable to connect to the chatbot service. Please check that the webhook URL is correct and accessible."
        } else if (error.message.includes("NetworkError")) {
          errorMessage = "Network error. Please check your internet connection and the webhook URL."
        } else {
          errorMessage = error.message
        }
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errorMessage,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = () => {
    sendMessage(input)
    setInput("")
  }

  const renderMessageContent = (content: string) => {
    const paragraphs = content.split('\n\n');
  
    return paragraphs.map((paragraph, pIndex) => {
      const referenceRegex = /\[(\d+)\]\s*(.*?)\s*\((https?:\/\/[^\s)]+)\)/;
      const lines = paragraph.split('\n');
  
      return (
        <div key={pIndex} className="mb-4 last:mb-0">
          {lines.map((line, lIndex) => {
            if (line.trim().startsWith('[')) {
              const match = line.match(referenceRegex);
              if (match) {
                const number = match[1];
                const title = match[2].trim();
                const url = match[3];
                
                return (
                  <div key={lIndex} className="flex items-start text-sm">
                    <span className="mr-2">[{number}]</span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center group"
                    >
                      <span>{title}</span>
                      <ArrowUpRight className="w-4 h-4 ml-1 flex-shrink-0" />
                    </a>
                  </div>
                );
              }
            }
            return <span key={lIndex} className="block">{line}</span>;
          })}
        </div>
      );
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-md p-8 min-h-[600px] flex flex-col">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Bot className="w-8 h-8" />
            <h1 className="text-3xl font-extrabold text-foreground">NDE Test Chatbot</h1>
          </div>
          <p className="text-muted-foreground">For Testing Prompts and Responses</p>
          <span className="inline-block mt-2 text-xs bg-blue-100 text-primary px-3 py-1 rounded-full">
            experimental
          </span>

          {!webhookConfigured && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 text-sm text-yellow-800">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Webhook not configured. Please add NEXT_PUBLIC_CHAT_TEST_WEBHOOK_URL environment variable.</span>
            </div>
          )}
        </div>

        {/* Welcome Message or Chat */}
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center pt-8 space-y-6">
            <p className="text-center text-muted-foreground">Welcome! Ask me anything about Near-Death Experiences.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 mb-6">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === "user" ? "text-white" : "bg-gray-100 text-foreground"
                  }`}
                  style={message.role === "user" ? { backgroundColor: "#2563eb" } : {}}
                >
                  <div className="whitespace-pre-wrap">{renderMessageContent(message.content)}</div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-foreground rounded-lg px-4 py-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input Area */}
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            className="text-white"
            style={{ backgroundColor: "#2563eb" }}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
