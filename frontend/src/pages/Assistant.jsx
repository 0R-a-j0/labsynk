import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { Bot, Send, User, Sparkles, MessageCircle, Lightbulb, Beaker, BookOpen, Cpu, RotateCcw } from 'lucide-react';

const SUGGESTED_QUESTIONS = [
    { icon: Beaker, text: "How do I set up a titration experiment?", color: "from-violet-500 to-purple-500" },
    { icon: Cpu, text: "Explain the working of an oscilloscope", color: "from-blue-500 to-cyan-500" },
    { icon: BookOpen, text: "What safety precautions for a chemistry lab?", color: "from-emerald-500 to-teal-500" },
    { icon: Lightbulb, text: "Suggest experiments for digital electronics", color: "from-amber-500 to-orange-500" },
];

/* Lightweight markdown-ish renderer */
const renderMessage = (text) => {
    if (!text) return text;
    // Split into paragraphs
    const paragraphs = text.split(/\n{2,}/);
    return paragraphs.map((para, pi) => {
        // Check for bullet lists
        const lines = para.split('\n');
        const isList = lines.every(l => /^[\-\*•]\s/.test(l.trim()) || !l.trim());
        if (isList) {
            return (
                <ul key={pi} className="list-disc list-inside space-y-1 my-1">
                    {lines.filter(l => l.trim()).map((l, li) => (
                        <li key={li}>{formatInline(l.replace(/^[\-\*•]\s*/, ''))}</li>
                    ))}
                </ul>
            );
        }
        // Check for numbered lists
        const isNumbered = lines.every(l => /^\d+[\.\)]\s/.test(l.trim()) || !l.trim());
        if (isNumbered) {
            return (
                <ol key={pi} className="list-decimal list-inside space-y-1 my-1">
                    {lines.filter(l => l.trim()).map((l, li) => (
                        <li key={li}>{formatInline(l.replace(/^\d+[\.\)]\s*/, ''))}</li>
                    ))}
                </ol>
            );
        }
        // Regular paragraph
        return <p key={pi} className="my-1">{lines.map((l, li) => (
            <React.Fragment key={li}>{li > 0 && <br />}{formatInline(l)}</React.Fragment>
        ))}</p>;
    });
};

const formatInline = (text) => {
    // Bold (**text**) and inline code (`code`)
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={i} className="bg-black/10 px-1.5 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
        }
        return part;
    });
};

const Assistant = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (overrideText) => {
        const text = overrideText || input.trim();
        if (!text || loading) return;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: text }]);
        setLoading(true);

        try {
            // Build context from recent conversation
            const contextMessages = messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');
            const response = await api.chatWithAI(text, contextMessages);
            setMessages(prev => [...prev, { role: 'assistant', content: response.response || response.message || "I couldn't process that." }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleReset = () => {
        setMessages([]);
        setInput('');
    };

    const showWelcome = messages.length === 0 && !loading;

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
            {/* Header */}
            <div className="glass-card overflow-hidden mb-6">
                <div className="bg-gradient-to-r from-lab-primary via-lab-secondary to-lab-accent p-6 flex items-center gap-3">
                    <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-xl">
                        <Bot className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">AI Lab Assistant</h1>
                        <p className="text-white/60 text-sm">Powered by AI • Ask anything about your lab</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        {messages.length > 0 && (
                            <button onClick={handleReset} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white px-3 py-1.5 rounded-full text-xs font-medium transition-all" title="New conversation">
                                <RotateCcw size={12} /> New Chat
                            </button>
                        )}
                        <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-full text-xs font-semibold">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                            Online
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="section-card overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 320px)', minHeight: '400px' }}>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Welcome / Suggested Questions */}
                    {showWelcome && (
                        <div className="flex flex-col items-center justify-center h-full animate-fade-in">
                            <div className="bg-gradient-to-br from-lab-primary to-lab-secondary w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-lg">
                                <MessageCircle size={28} className="text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-1">How can I help you today?</h2>
                            <p className="text-gray-400 text-sm mb-8">Ask me about experiments, equipment, procedures, or lab safety</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                                {SUGGESTED_QUESTIONS.map((q, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSend(q.text)}
                                        className="group flex items-start gap-3 p-3.5 bg-gray-50 hover:bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all text-left"
                                    >
                                        <div className={`bg-gradient-to-br ${q.color} w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}>
                                            <q.icon size={14} className="text-white" />
                                        </div>
                                        <span className="text-sm text-gray-600 group-hover:text-gray-900 leading-snug">{q.text}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Message bubbles */}
                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`flex gap-3 animate-fade-in-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                            style={{ animationDelay: '50ms' }}
                        >
                            <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${msg.role === 'assistant'
                                ? 'bg-gradient-to-br from-lab-primary to-lab-secondary'
                                : 'bg-gradient-to-br from-lab-accent to-cyan-500'
                                }`}>
                                {msg.role === 'assistant'
                                    ? <Sparkles size={14} className="text-white" />
                                    : <User size={14} className="text-white" />}
                            </div>

                            <div className={`max-w-[75%] px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                                ? 'bg-lab-primary text-white rounded-2xl rounded-br-md'
                                : 'bg-gray-100 text-gray-800 rounded-2xl rounded-bl-md'
                                }`}>
                                {msg.role === 'assistant' ? renderMessage(msg.content) : msg.content}
                            </div>
                        </div>
                    ))}

                    {/* Typing indicator */}
                    {loading && (
                        <div className="flex gap-3 animate-fade-in">
                            <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-lab-primary to-lab-secondary">
                                <Sparkles size={14} className="text-white" />
                            </div>
                            <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce-dot" />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce-dot" style={{ animationDelay: '160ms' }} />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce-dot" style={{ animationDelay: '320ms' }} />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-gray-200/60 p-4">
                    <div className="flex gap-3">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            className="input-field !rounded-2xl"
                            placeholder="Ask about experiments, equipment, procedures..."
                            disabled={loading}
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={loading || !input.trim()}
                            className="btn-primary !rounded-2xl !px-4 disabled:opacity-40"
                            aria-label="Send message"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Assistant;
