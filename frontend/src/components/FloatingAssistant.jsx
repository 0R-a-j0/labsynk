import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { Bot, Send, User, Sparkles, MessageCircle, X, Minus, RotateCcw, Lightbulb, Beaker, BookOpen, Cpu } from 'lucide-react';

const SUGGESTED_QUESTIONS = [
    { icon: Beaker, text: "How do I set up a titration experiment?", color: "from-violet-500 to-purple-500" },
    { icon: Cpu, text: "Explain the working of an oscilloscope", color: "from-blue-500 to-cyan-500" },
    { icon: BookOpen, text: "What safety precautions for a chemistry lab?", color: "from-emerald-500 to-teal-500" },
    { icon: Lightbulb, text: "Suggest experiments for digital electronics", color: "from-amber-500 to-orange-500" },
];

/* Lightweight markdown-ish renderer */
const renderMessage = (text) => {
    if (!text) return text;
    const paragraphs = text.split(/\n{2,}/);
    return paragraphs.map((para, pi) => {
        const lines = para.split('\n');
        const isList = lines.every(l => /^[-*•]\s/.test(l.trim()) || !l.trim());
        if (isList) {
            return (
                <ul key={pi} className="list-disc list-inside space-y-1 my-1">
                    {lines.filter(l => l.trim()).map((l, li) => (
                        <li key={li}>{formatInline(l.replace(/^[-*•]\s*/, ''))}</li>
                    ))}
                </ul>
            );
        }
        const isNumbered = lines.every(l => /^\d+[.)]\s/.test(l.trim()) || !l.trim());
        if (isNumbered) {
            return (
                <ol key={pi} className="list-decimal list-inside space-y-1 my-1">
                    {lines.filter(l => l.trim()).map((l, li) => (
                        <li key={li}>{formatInline(l.replace(/^\d+[.)]\s*/, ''))}</li>
                    ))}
                </ol>
            );
        }
        return <p key={pi} className="my-1">{lines.map((l, li) => (
            <React.Fragment key={li}>{li > 0 && <br />}{formatInline(l)}</React.Fragment>
        ))}</p>;
    });
};

const formatInline = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={i} className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
        }
        return part;
    });
};

const FloatingAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen && !isMinimized) {
            setHasUnread(false);
            // Small delay to let animation finish
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen, isMinimized]);

    const handleSend = async (overrideText) => {
        const text = overrideText || input.trim();
        if (!text || loading) return;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: text }]);
        setLoading(true);

        try {
            const contextMessages = messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');
            const response = await api.chatWithAI(text, contextMessages);
            const newMsg = { role: 'assistant', content: response.response || response.message || "I couldn't process that." };
            setMessages(prev => [...prev, newMsg]);
            if (isMinimized) setHasUnread(true);
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
        <>
            {/* Floating Bubble Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full 
                               bg-gradient-to-br from-lab-primary via-lab-secondary to-lab-accent
                               text-white shadow-lg shadow-lab-primary/30
                               hover:shadow-xl hover:shadow-lab-primary/40 hover:scale-110
                               transition-all duration-300 flex items-center justify-center
                               group cursor-pointer"
                    style={{
                        animation: 'floatBubble 3s ease-in-out infinite',
                    }}
                    aria-label="Open AI Assistant"
                    id="floating-assistant-trigger"
                >
                    <MessageCircle size={24} className="group-hover:scale-110 transition-transform" />
                    {hasUnread && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-lab-danger rounded-full border-2 border-white dark:border-gray-900 animate-pulse" />
                    )}
                    {/* Tooltip */}
                    <span className="absolute right-full mr-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        AI Lab Assistant
                    </span>
                </button>
            )}

            {/* Chat Panel */}
            {isOpen && (
                <aside
                    className={`fixed bottom-6 right-6 z-50 w-[380px] rounded-2xl overflow-hidden
                               shadow-2xl shadow-black/20 dark:shadow-black/50
                               border border-gray-200/80 dark:border-gray-700/80
                               bg-white dark:bg-gray-900
                               transition-all duration-300 ease-out
                               ${isMinimized ? 'h-14' : 'h-[560px]'}
                               `}
                    style={{
                        animation: 'slideUpChat 0.3s ease-out',
                        maxHeight: 'calc(100vh - 48px)',
                    }}
                    role="dialog"
                    aria-label="AI Lab Assistant chat"
                >
                    {/* Header */}
                    <header className="bg-gradient-to-r from-lab-primary via-lab-secondary to-lab-accent px-4 py-3 flex items-center gap-3 cursor-pointer select-none"
                        onClick={() => setIsMinimized(!isMinimized)}
                    >
                        <div className="bg-white/20 backdrop-blur-sm p-1.5 rounded-lg">
                            <Bot className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-sm font-bold text-white leading-tight">AI Lab Assistant</h2>
                            <p className="text-white/60 text-[10px]">Powered by AI</p>
                        </div>
                        <div className="flex items-center gap-1">
                            {messages.length > 0 && !isMinimized && (
                                <button onClick={(e) => { e.stopPropagation(); handleReset(); }}
                                    className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors cursor-pointer"
                                    aria-label="New conversation"
                                    title="New conversation"
                                >
                                    <RotateCcw size={14} />
                                </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                                className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors cursor-pointer"
                                aria-label={isMinimized ? 'Expand chat' : 'Minimize chat'}
                            >
                                <Minus size={14} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); setIsMinimized(false); }}
                                className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors cursor-pointer"
                                aria-label="Close chat"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </header>

                    {/* Body */}
                    {!isMinimized && (
                        <div className="flex flex-col" style={{ height: 'calc(100% - 56px)' }}>
                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {showWelcome && (
                                    <div className="flex flex-col items-center justify-center h-full animate-fade-in">
                                        <div className="bg-gradient-to-br from-lab-primary to-lab-secondary w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                                            <MessageCircle size={22} className="text-white" />
                                        </div>
                                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">How can I help?</h3>
                                        <p className="text-gray-400 text-xs mb-5">Ask about experiments, equipment, or procedures</p>
                                        <div className="grid grid-cols-1 gap-2 w-full">
                                            {SUGGESTED_QUESTIONS.map((q, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => handleSend(q.text)}
                                                    className="group flex items-center gap-2.5 p-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-700 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-sm transition-all text-left cursor-pointer"
                                                >
                                                    <div className={`bg-gradient-to-br ${q.color} w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0`}>
                                                        <q.icon size={12} className="text-white" />
                                                    </div>
                                                    <span className="text-xs text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white leading-snug">{q.text}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {messages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={`flex gap-2.5 animate-fade-in-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                                        style={{ animationDelay: '50ms' }}
                                    >
                                        <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${msg.role === 'assistant'
                                            ? 'bg-gradient-to-br from-lab-primary to-lab-secondary'
                                            : 'bg-gradient-to-br from-lab-accent to-cyan-500'
                                            }`}>
                                            {msg.role === 'assistant'
                                                ? <Sparkles size={12} className="text-white" />
                                                : <User size={12} className="text-white" />}
                                        </div>

                                        <div className={`max-w-[80%] px-3 py-2 text-xs leading-relaxed ${msg.role === 'user'
                                            ? 'bg-lab-primary text-white rounded-2xl rounded-br-md'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl rounded-bl-md'
                                            }`}>
                                            {msg.role === 'assistant' ? renderMessage(msg.content) : msg.content}
                                        </div>
                                    </div>
                                ))}

                                {loading && (
                                    <div className="flex gap-2.5 animate-fade-in">
                                        <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-lab-primary to-lab-secondary">
                                            <Sparkles size={12} className="text-white" />
                                        </div>
                                        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-3 py-2 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce-dot" />
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce-dot" style={{ animationDelay: '160ms' }} />
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce-dot" style={{ animationDelay: '320ms' }} />
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="border-t border-gray-200/60 dark:border-gray-700/60 p-3">
                                <div className="flex gap-2">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs
                                                   focus:ring-2 focus:ring-lab-primary/20 focus:border-lab-primary outline-none transition-all
                                                   text-gray-900 dark:text-white placeholder-gray-400"
                                        placeholder="Ask about experiments..."
                                        disabled={loading}
                                    />
                                    <button
                                        onClick={() => handleSend()}
                                        disabled={loading || !input.trim()}
                                        className="bg-lab-primary hover:bg-lab-secondary text-white rounded-xl px-3 py-2 transition-all duration-200 disabled:opacity-40 cursor-pointer"
                                        aria-label="Send message"
                                    >
                                        <Send size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </aside>
            )}
        </>
    );
};

export default FloatingAssistant;
