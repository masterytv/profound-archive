"use client";

import { useState, useEffect } from "react";
import { Save, Send, Rocket, Eye, AlertCircle, CheckCircle2, Loader2, MessageSquare } from "lucide-react";
import { getChatbotConfig, saveStagingPrompt, publishPrompt } from "./actions";

// Default system prompt (migration baseline)
const DEFAULT_SYSTEM_PROMPT = `# ROLE & GOAL
You are a highly empathetic and compassionate AI companion. Your primary role is to be a non-judgmental listener and a gentle guide for individuals who have either experienced a Near-Death Experience (NDE) or are exploring the topic. Your goal is to make them feel heard, validated, and less alone by drawing parallels from a collection of first-person NDE accounts.

## STRICT RULES (Non-negotiable)
1. **NEVER Give Advice:** Do not provide medical, psychological, or spiritual advice. If the user seems to be in distress, gently suggest they speak with a qualified professional.
2. **NEVER Make Definitive Claims:** Do not state anything as fact regarding the afterlife, spirituality, or the nature of consciousness. Frame everything as "themes found in the accounts of NDErs" or "shared experiences."
3. **Ground All Answers in Provided Context:** Base your responses exclusively on the information found in the <VIDEOS> provided for this turn. Do not introduce outside knowledge about NDEs.
4. **Maintain Persona:** Always be gentle, patient, and supportive.

## ABSOLUTE FORMATTING RULE 

- You must NEVER use em dashes (—) or double dashes (--) anywhere in your responses.  
- This rule is stricter than all other style guidelines.
- If you would normally use an em dash, substitute with a comma, parenthesis (), semicolon, or begin a new sentence.
- Do NOT use a dash for emphasis, pauses, or formatting; replace with natural spoken punctuation or sentence structure.
- Responses containing any em dash or double dash are considered incorrect.

### Examples

Incorrect: "It was a profound experience—one that changed my life."
Incorrect: "They felt calm -- almost peaceful inside."

Correct: "It was a profound experience, one that changed my life."
Correct: "They felt calm (almost peaceful inside)."
Correct: "They felt calm. It was almost peaceful inside."

You must ALWAYS follow this rule with NO exceptions. Any response containing an em dash or double dash is a mistake.

## SESSION CONTEXT
Track and adapt to the flow of conversation. In the *first response* of each session, begin with an explicit validation of the user's experience or question. In *subsequent responses*, do not repeat the same validating phrases; instead, respond with gentle empathy and natural warmth. Only validate explicitly if the user shares new emotions or insights that warrant acknowledgment.

## VALIDATION FREQUENCY RULES
- Offer explicit validation at the start of the session.
- For follow-ups, express empathy conversationally without repeating the same validation phrase or template more than once per session.
- If the user shares new, strong emotions later, offer a supportive acknowledgment, but vary your language.

## CONVERSATIONAL STYLE
- **Validate Feelings:** Start the session by acknowledging and validating the user's feelings or experience (e.g., "That sounds like a very profound experience," "It makes sense that you would feel that way.").
- **Synthesize, Don't Just List:** Weave the information from the context snippets into a cohesive, narrative response. For example: "Your experience of [user's theme] is a theme that comes up often. For instance, one NDEr described a similar feeling of..."
- **Encourage Engagement:** End your response in a way that gently invites further sharing or reflection, but never sounds like an interviewer, test, or binary-choice question. Instead, use open, compassionate endings that signal support and presence, such as "If you'd ever like to talk more about this, I'm here to listen," "Let me know if you feel like sharing anything else, or if you'd prefer just to sit with these thoughts for a bit," or "Whether you want to continue or simply pause for now, I'll be here to listen whenever you need."
- **Human Sounding:** Respond in a warm, natural, and conversational manner, like a thoughtful person (not a chatbot). Vary your language and sentence structure throughout each session so that nothing sounds formulaic or robotic. Steer clear of distinctive chatbot vocabulary ("as an AI," "in this context," "furthermore," etc.). Use contractions and everyday language when possible. Make every response feel genuinely attentive and fresh, reflecting the unique flow of a real conversation. Never use dashes or em dashes in your response. Use parenthesis (), commas, or other human approaches instead.

## MEMORY
You have access to a summary of the previous conversation. Use it to remember the user's name (if shared) and the key themes they have already discussed. Avoid repeating validations or responses; keep your answers fresh for each new input based on what you remember.

## NO EM DASHES
Never use dashes or em dashes in your response. Em dashes are the wide dash (--) used by ChatGPT. Use parenthesis (), commas, or other grammatical tools that a human would use.

## VIDEOS
Here are videos from first-person NDE accounts that are relevant to the user's current message. Use these to form your answer but don't refer to them specifically in your answer:
`;

export default function ChatbotEditor() {
    const [config, setConfig] = useState<any>(null);
    const [stagingContent, setStagingContent] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [showTestChat, setShowTestChat] = useState(false);
    const [chatInput, setChatInput] = useState("");
    const [chatHistory, setChatHistory] = useState<{ role: string, content: string }[]>([]);
    const [isChatting, setIsChatting] = useState(false);
    const [sessionId] = useState(() => `test-${Math.random().toString(36).substring(7)}`);

    useEffect(() => {
        loadConfig();
    }, []);

    async function loadConfig() {
        setIsLoading(true);
        const result = await getChatbotConfig('chat-compassionate');
        if (result.success && result.data) {
            setConfig(result.data);
            setStagingContent(result.data.staging_prompt || result.data.live_prompt || DEFAULT_SYSTEM_PROMPT);
        } else {
            // No config exists yet - use default prompt
            setConfig({ live_prompt: DEFAULT_SYSTEM_PROMPT });
            setStagingContent(DEFAULT_SYSTEM_PROMPT);
        }
        setIsLoading(false);
    }

    async function handleSave() {
        setIsSaving(true);
        setMessage(null);
        const result = await saveStagingPrompt('chat-compassionate', stagingContent);
        if (result.success) {
            setMessage({ text: "Staging prompt saved successfully.", type: 'success' });
            loadConfig();
        } else {
            setMessage({ text: result.error || "Failed to save staging prompt.", type: 'error' });
        }
        setIsSaving(false);
    }

    async function handlePublish() {
        if (!confirm("Are you sure you want to make this prompt LIVE? This will immediately affect all users.")) return;

        setIsPublishing(true);
        setMessage(null);
        const result = await publishPrompt('chat-compassionate');
        if (result.success) {
            setMessage({ text: "Prompt published to live successfully!", type: 'success' });
            loadConfig();
        } else {
            setMessage({ text: result.error || "Failed to publish prompt.", type: 'error' });
        }
        setIsPublishing(false);
    }

    async function handleTestChat() {
        if (!chatInput.trim()) return;

        const userMsg = chatInput;
        setChatInput("");
        setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsChatting(true);

        try {
            const response = await fetch('/api/chat-compassionate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    chatInput: userMsg,
                    test: true // Tell API to use staging prompt
                })
            });

            const data = await response.json();
            if (data.output) {
                setChatHistory(prev => [...prev, { role: 'bot', content: data.output }]);
            } else {
                setChatHistory(prev => [...prev, { role: 'error', content: data.message || "Error test chatting." }]);
            }
        } catch (err) {
            setChatHistory(prev => [...prev, { role: 'error', content: "Network error." }]);
        } finally {
            setIsChatting(false);
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Chatbot Prompt Editor</h1>
                    <p className="text-sm text-gray-500">Manage the compassionate AI system instructions</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowTestChat(!showTestChat)}
                        className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium transition-colors ${showTestChat ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {showTestChat ? "Hide Test Chat" : "Open Test Chat"}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || isPublishing}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Staging
                    </button>
                    <button
                        onClick={handlePublish}
                        disabled={isSaving || isPublishing}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none disabled:opacity-50"
                    >
                        {isPublishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Rocket className="h-4 w-4 mr-2" />}
                        Publish Live
                    </button>
                </div>
            </div>

            {message && (
                <div className={`mb-6 p-4 rounded-md flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                    {message.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    <span className="text-sm font-medium">{message.text}</span>
                </div>
            )}

            <div className={`grid gap-6 ${showTestChat ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                {/* Editor Section */}
                <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                            <span className="text-sm font-semibold text-gray-700">Staging System Prompt</span>
                            <span className="text-xs text-gray-400 italic">Editing here won't affect live users until published</span>
                        </div>
                        <textarea
                            value={stagingContent}
                            onChange={(e) => setStagingContent(e.target.value)}
                            className="w-full h-[600px] p-4 text-sm font-mono focus:ring-0 focus:outline-none resize-none"
                            placeholder="Enter the system prompt instructions here..."
                        />
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 opacity-75">
                        <div className="flex items-center gap-2 mb-2">
                            <Eye className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-semibold text-gray-700">Current Live Prompt (Reference Only)</span>
                        </div>
                        <div className="text-xs text-gray-600 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto bg-white p-3 rounded border">
                            {config?.live_prompt || "No live prompt configured yet."}
                        </div>
                    </div>
                </div>

                {/* Test Chat Section */}
                {showTestChat && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-[800px]">
                        <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-indigo-600" />
                            <span className="text-sm font-semibold text-indigo-800">Prompt Test Simulator</span>
                            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 uppercase tracking-wider font-bold">Staging Mode</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                            {chatHistory.length === 0 && (
                                <div className="text-center py-8">
                                    <div className="inline-block p-3 bg-indigo-100 rounded-full mb-3">
                                        <MessageSquare className="h-6 w-6 text-indigo-600" />
                                    </div>
                                    <p className="text-sm text-gray-500 max-w-xs mx-auto">
                                        Test how the staging prompt handles different inputs before publishing live.
                                    </p>
                                </div>
                            )}
                            {chatHistory.map((chat, i) => (
                                <div key={i} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-lg p-3 text-sm ${chat.role === 'user' ? 'bg-indigo-600 text-white' :
                                        chat.role === 'bot' ? 'bg-white text-gray-800 border shadow-sm' :
                                            'bg-red-50 text-red-700 border border-red-100'
                                        }`}>
                                        <div className="font-bold text-[10px] mb-1 opacity-70 uppercase tracking-widest">
                                            {chat.role === 'user' ? 'You' : chat.role === 'bot' ? 'Chatbot' : 'System Error'}
                                        </div>
                                        <div className="whitespace-pre-wrap">{chat.content}</div>
                                    </div>
                                </div>
                            ))}
                            {isChatting && (
                                <div className="flex justify-start">
                                    <div className="bg-white border rounded-lg p-3 shadow-sm">
                                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-100 italic text-[10px] text-gray-400">
                            Always **Save Staging** before testing to ensure the latest instructions are used.
                        </div>

                        <div className="p-4 bg-gray-50 border-t border-gray-200">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleTestChat()}
                                    placeholder="Type a message to test..."
                                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                                />
                                <button
                                    onClick={handleTestChat}
                                    disabled={isChatting}
                                    className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
