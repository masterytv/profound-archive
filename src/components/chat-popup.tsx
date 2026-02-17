"use client"

import { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { Send, X, Loader2, MessageCircle, Bot, ThumbsUp, ThumbsDown } from "lucide-react"

type Message = {
    role: "user" | "assistant"
    content: string
}

// Rotating question pool — same as /chat-compassionate
const ALL_QUESTIONS = [
    "What are common themes in NDEs?",
    "How do cultural backgrounds affect NDE reports?",
    "What percentage of people report seeing deceased relatives?",
    "Are there any negative NDEs in the database?",
    "Do people see a life review?",
    "What is the tunnel experience like?",
    "Do pets appear in NDEs?",
    "How does an NDE change a person's life?",
    "Do children describe NDEs differently than adults?",
    "What do people report about the nature of time?",
    "Is there a boundary or point of no return?",
    "Do people meet religious figures?",
    "What is the 'being of light'?",
    "Do blind people see during an NDE?",
    "Are NDEs caused by lack of oxygen?",
    "What emotions are most commonly felt?",
    "Do people report telepathic communication?",
    "What does the afterlife look like?",
    "Do people choose to come back?",
    "What is the 'void' experience?",
    "How do suicide attempt survivors describe their NDE?",
    "Do shared death experiences happen?",
    "What is the difference between an NDE and a hallucination?",
    "Do people gain psychic abilities after an NDE?",
    "What is the most convincing evidence for NDEs?",
    "Do skeptics have NDEs?",
    "What is the 'city of light'?",
    "Do people report enhanced senses?",
    "Is there judgment during the life review?",
    "Do people meet strangers in their NDE?",
    "What is the role of love in NDEs?",
    "Do people report traveling to other planets?",
    "What happens to the physical body during an NDE?",
    "Do people report learning universal knowledge?",
    "How do NDEs affect fear of death?",
    "Do people report seeing the future?",
    "What is the silver cord?",
    "Do distressing NDEs turn positive?",
    "How common are out-of-body experiences?",
    "Do people describe a sense of oneness?",
    "What sounds or music do people hear?",
    "Do people encounter a barrier?",
    "How do drugs or anesthesia affect NDEs?",
    "Do people remember everything clearly?",
    "What is the 'light' made of?",
    "Do people feel pain during an NDE?",
    "Do people see angels?",
    "How do family members react to NDE stories?",
    "Can NDEs occur during meditation?",
    "What is the verifiable perception in NDEs?",
]

export default function ChatPopup() {
    const pathname = usePathname()
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [sessionId, setSessionId] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [quickActions, setQuickActions] = useState<string[]>([])
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Hide popup on the full-page chat route
    const isHidden = pathname === "/chat-compassionate"

    // Initialize session ID and randomize quick actions once
    useEffect(() => {
        setSessionId(crypto.randomUUID())
        const shuffled = [...ALL_QUESTIONS].sort(() => 0.5 - Math.random())
        setQuickActions(shuffled.slice(0, 3))
    }, [])

    // Auto-scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, isLoading])

    // Focus input when panel opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300)
        }
    }, [isOpen])

    const sendMessage = async (messageText: string) => {
        if (!messageText.trim() || isLoading) return

        const userMessage: Message = { role: "user", content: messageText.trim() }
        setMessages((prev) => [...prev, userMessage])
        setInput("")
        setIsLoading(true)

        try {
            const response = await fetch("/api/chat-compassionate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionId,
                    chatInput: messageText.trim(),
                }),
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`HTTP ${response.status}: ${errorText}`)
            }

            const data = await response.json()
            const formattedContent = data.output || "I apologize, but I couldn't generate a response."

            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: formattedContent },
            ])
        } catch (error) {
            console.error("Chat popup error:", error)
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "I apologize, but I encountered an error. Please try again." },
            ])
        } finally {
            setIsLoading(false)
        }
    }

    const handleSend = () => {
        sendMessage(input)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const renderMessageContent = (content: string) => {
        const paragraphs = content.split("\n\n")
        return paragraphs.map((paragraph, pIndex) => {
            const lines = paragraph.split("\n")
            return (
                <div key={pIndex} className="mb-3 last:mb-0">
                    {lines.map((line, lIndex) => (
                        <span key={lIndex} className="block">{line}</span>
                    ))}
                </div>
            )
        })
    }

    if (isHidden) return null

    return (
        <>
            {/* ── Floating Trigger Button ── */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 px-5 py-3
                     bg-[#2563EB] text-white
                     rounded-full shadow-lg shadow-blue-600/25
                     hover:scale-105 hover:bg-[#1d4ed8] active:scale-95
                     transition-all duration-300 ease-out
                     animate-subtle-pulse"
                    aria-label="Open chat"
                >
                    <MessageCircle className="w-5 h-5" />
                    <span className="font-semibold text-sm">Chat with NDEs</span>
                </button>
            )}

            {/* ── Chat Panel ── */}
            {isOpen && (
                <div
                    className="fixed bottom-6 right-6 z-[9999]
                     w-[380px] sm:w-[400px] max-w-[calc(100vw-2rem)]
                     h-[550px] max-h-[calc(100vh-6rem)]
                     flex flex-col
                     bg-white text-slate-800
                     rounded-2xl shadow-2xl shadow-slate-900/20
                     border border-slate-200/60
                     animate-chat-slide-up
                     overflow-hidden"
                >
                    {/* ─ Header ─ */}
                    <div className="flex items-center justify-between px-4 py-3
                          bg-[#2563EB]
                          flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                                <MessageCircle className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-white leading-tight">Profound Guide</h3>
                                <p className="text-[11px] text-white/70 leading-tight">NDE Companion</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors"
                            aria-label="Close chat"
                        >
                            <X className="w-4 h-4 text-white" />
                        </button>
                    </div>

                    {/* ─ Messages Area ─ */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin bg-slate-50/50">
                        {messages.length === 0 ? (
                            /* Empty State */
                            <div className="flex flex-col gap-4 pt-2">
                                {/* Welcome bubble */}
                                <div className="flex gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center mt-0.5">
                                        <Bot className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div className="bg-white rounded-xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%] border border-slate-200/60 shadow-sm">
                                        <p className="text-sm leading-relaxed text-slate-700">
                                            Welcome! I&apos;m here to explore near-death experiences with you. Ask me anything about the 5,000+ accounts in our database.
                                        </p>
                                        <div className="flex gap-2 mt-2 opacity-40">
                                            <ThumbsUp className="w-3.5 h-3.5 cursor-pointer hover:opacity-100 transition-opacity text-slate-400" />
                                            <ThumbsDown className="w-3.5 h-3.5 cursor-pointer hover:opacity-100 transition-opacity text-slate-400" />
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="mt-2">
                                    <p className="text-xs text-slate-400 mb-2.5 pl-1">Try asking:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {quickActions.map((action) => (
                                            <button
                                                key={action}
                                                onClick={() => sendMessage(action)}
                                                className="text-xs px-3 py-1.5 rounded-full
                                   border border-slate-200 text-slate-600 bg-white
                                   hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700
                                   transition-all duration-200 shadow-sm"
                                            >
                                                {action}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Messages */
                            messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`flex gap-2.5 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    {message.role === "assistant" && (
                                        <div className="w-7 h-7 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center mt-0.5">
                                            <Bot className="w-4 h-4 text-blue-600" />
                                        </div>
                                    )}
                                    <div
                                        className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${message.role === "user"
                                            ? "bg-[#2563EB] text-white rounded-br-sm shadow-sm"
                                            : "bg-white text-slate-700 rounded-tl-sm border border-slate-200/60 shadow-sm"
                                            }`}
                                    >
                                        <div className="whitespace-pre-wrap">{renderMessageContent(message.content)}</div>
                                        {message.role === "assistant" && (
                                            <div className="flex gap-2 mt-2 opacity-40">
                                                <ThumbsUp className="w-3.5 h-3.5 cursor-pointer hover:opacity-100 transition-opacity text-slate-400" />
                                                <ThumbsDown className="w-3.5 h-3.5 cursor-pointer hover:opacity-100 transition-opacity text-slate-400" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}

                        {/* Loading indicator */}
                        {isLoading && (
                            <div className="flex gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center">
                                    <Bot className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="bg-white rounded-xl rounded-tl-sm px-3.5 py-2.5 border border-slate-200/60 shadow-sm">
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* ─ Input Bar ─ */}
                    <div className="px-3 pb-3 pt-2 flex-shrink-0 border-t border-slate-200/60 bg-white">
                        <div className="flex items-center gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Ask me anything…"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={isLoading}
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-full
                           px-4 py-2.5 text-sm text-slate-800
                           placeholder:text-slate-400
                           focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100
                           disabled:opacity-50
                           transition-all"
                            />
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !input.trim()}
                                className="w-10 h-10 rounded-full bg-[#2563EB] hover:bg-[#1d4ed8]
                           flex items-center justify-center
                           disabled:opacity-40 disabled:cursor-not-allowed
                           transition-all duration-200 flex-shrink-0 shadow-sm"
                                aria-label="Send message"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                                ) : (
                                    <Send className="w-4 h-4 text-white" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
