"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Bot, Loader2 } from "lucide-react"

export default function CompassionateChatPage() {
    const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([])
    const [input, setInput] = useState("")
    const [sessionId, setSessionId] = useState<string>("")
    const [isLoading, setIsLoading] = useState(false)

    const [randomQuestions, setRandomQuestions] = useState<string[]>([])

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
        "What is the verifiable perception in NDEs?"
    ];

    useEffect(() => {
        setSessionId(crypto.randomUUID())

        // Pick 4 random unique questions
        const shuffled = [...ALL_QUESTIONS].sort(() => 0.5 - Math.random());
        setRandomQuestions(shuffled.slice(0, 4));
    }, [])

    const sendMessage = async (messageText: string) => {
        if (!messageText.trim() || isLoading) return

        const userMessage = { role: "user" as const, content: messageText.trim() }
        setMessages(prevMessages => [...prevMessages, userMessage])
        setIsLoading(true)

        try {
            const response = await fetch("/api/chat-compassionate", {
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

            const formattedContent = data.output || "I apologize, but I couldn't generate a response."

            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: formattedContent,
                },
            ])
        } catch (error) {
            console.error("Chat error:", error)
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: "I apologize, but I encountered an error. Please try again.",
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

    const handleExampleClick = (question: string) => {
        sendMessage(question)
    }

    const renderMessageContent = (content: string) => {
        const paragraphs = content.split('\n\n');

        return paragraphs.map((paragraph, pIndex) => {
            const lines = paragraph.split('\n');
            return (
                <div key={pIndex} className="mb-4 last:mb-0">
                    {lines.map((line, lIndex) => (
                        <span key={lIndex} className="block">{line}</span>
                    ))}
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
                        <h1 className="text-3xl font-extrabold text-foreground">Compassionate AI Companion</h1>
                    </div>
                    <p className="text-muted-foreground">Compassionate agent with access to more than 5000 NDEs</p>
                </div>

                {/* Welcome Message or Chat */}
                {messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center pt-8 space-y-6">
                        <p className="text-center text-muted-foreground">Welcome. I am here to listen and share insights from NDE accounts.</p>
                        <div className="text-center">
                            <p className="text-sm font-medium mb-3">You might ask:</p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {randomQuestions.map((question, index) => (
                                    <Button
                                        key={index}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleExampleClick(question)}
                                        className="text-sm"
                                    >
                                        {question}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto space-y-4 mb-6">
                        {messages.map((message, index) => (
                            <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[80%] rounded-lg px-4 py-3 ${message.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-foreground"
                                        }`}
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
                        placeholder="Share your thoughts or ask a question..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSend()}
                        className="flex-1"
                        disabled={isLoading}
                    />
                    <Button
                        onClick={handleSend}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                </div>
            </div>
        </div>
    )
}
