import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { Bot, Send, User, Sparkles } from 'lucide-react';

const Assistant = () => {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello! I\'m your lab assistant. Ask me about experiments, equipment, or lab procedures.' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            const response = await api.chatWithAI(userMsg);
            setMessages(prev => [...prev, { role: 'assistant', content: response.response || response.message || 'I couldn\'t process that.' }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    };

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
                    <div className="ml-auto flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-full text-xs font-semibold">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        Online
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="section-card overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 320px)', minHeight: '400px' }}>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`flex gap-3 animate-fade-in-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                            style={{ animationDelay: '50ms' }}
                        >
                            {/* Avatar */}
                            <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${msg.role === 'assistant'
                                ? 'bg-gradient-to-br from-lab-primary to-lab-secondary'
                                : 'bg-gradient-to-br from-lab-accent to-cyan-500'
                                }`}>
                                {msg.role === 'assistant'
                                    ? <Sparkles size={14} className="text-white" />
                                    : <User size={14} className="text-white" />}
                            </div>

                            {/* Bubble */}
                            <div className={`max-w-[75%] px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                                ? 'bg-lab-primary text-white rounded-2xl rounded-br-md'
                                : 'bg-gray-100 text-gray-800 rounded-2xl rounded-bl-md'
                                }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}

                    {/* Typing Indicator */}
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
                            onClick={handleSend}
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
