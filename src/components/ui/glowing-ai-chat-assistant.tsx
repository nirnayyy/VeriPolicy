import React, { useState, useRef, useEffect } from 'react';
import { Send, Info, Bot, X } from 'lucide-react';

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

const FloatingAiAssistant: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: 'Welcome to VeriPolicy. Ask me about policy scenarios, defence data, emissions trends, or platform features.' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const maxChars = 2000;
  const chatRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= maxChars) setMessage(e.target.value);
  };

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || isTyping) return;

    const userMsg: Message = { sender: 'user', text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setMessage('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: [...messages, userMsg],
        }),
      });

      const data = await res.json();

      if (res.ok && data.reply) {
        setMessages((prev) => [...prev, { sender: 'ai', text: data.reply }]);
      } else {
        setMessages((prev) => [...prev, { sender: 'ai', text: data.error || 'Something went wrong. Please try again.' }]);
      }
    } catch {
      setMessages((prev) => [...prev, { sender: 'ai', text: 'Network error. Please check your connection.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(event.target as Node) && !(event.target as HTMLElement).closest('.floating-ai-button')) {
        setIsChatOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        className={`floating-ai-button relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 transform cursor-pointer ${isChatOpen ? 'rotate-90 scale-95' : 'rotate-0'}`}
        onClick={() => setIsChatOpen(!isChatOpen)}
        style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
          boxShadow: '0 0 20px rgba(226,149,120,0.6), 0 0 40px rgba(226,149,120,0.4), 0 0 60px rgba(131,197,190,0.2)',
          border: '2px solid rgba(255,255,255,0.2)',
        }}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent opacity-30" />
        <div className="absolute inset-0 rounded-full border-2 border-white/10" />
        <div className="relative z-10 text-white">
          {isChatOpen ? <X className="w-6 h-6" /> : <Bot className="w-7 h-7" />}
        </div>
        <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-[var(--primary)]" />
      </button>

      {isChatOpen && (
        <div ref={chatRef} className="absolute bottom-20 right-0 w-[380px] sm:w-[440px] transition-all duration-300 origin-bottom-right animate-pop-in">
          <div className="relative flex flex-col rounded-3xl bg-zinc-900/95 border border-zinc-700/60 shadow-2xl backdrop-blur-3xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-zinc-800/60">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold tracking-wider uppercase text-zinc-300">Policy Assistant</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-[10px] font-mono tracking-wider bg-zinc-800 text-zinc-300 rounded-full">GEMINI 2.0</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 rounded-full">Live</span>
                <button onClick={() => setIsChatOpen(false)} className="p-1 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer">
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[320px] min-h-[220px] bg-zinc-950/20" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === 'ai' && (
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-[10px] text-white font-mono font-bold shadow-md">VP</div>
                  )}
                  <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed max-w-[80%] ${msg.sender === 'user' ? 'bg-[var(--primary)] text-[var(--primary-foreground)] rounded-tr-none shadow-sm' : 'bg-zinc-800/90 text-zinc-100 rounded-tl-none border border-zinc-700/30'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-[10px] text-white font-mono font-bold shadow-md">VP</div>
                  <div className="rounded-2xl px-4 py-3 bg-zinc-800/90 text-zinc-400 rounded-tl-none border border-zinc-700/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="relative border-t border-zinc-800/60 bg-zinc-950/20">
              <textarea
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={2}
                className="w-full px-5 py-4 bg-transparent border-none outline-none resize-none text-sm leading-relaxed text-zinc-100 placeholder-zinc-500"
                placeholder="Ask anything about policy scenarios..."
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              />
            </div>

            {/* Controls */}
            <div className="px-5 pb-5">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-mono text-zinc-500">{message.length}/{maxChars}</div>
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || isTyping}
                  className="group relative p-2.5 bg-gradient-to-r from-[var(--primary)] to-[color-mix(in_oklab,var(--primary)_85%,black)] text-[var(--primary-foreground)] border-none rounded-xl cursor-pointer transition-all duration-300 shadow-lg hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
                  style={{ boxShadow: '0 4px 12px rgba(226,149,120,0.25)' }}
                >
                  <Send className="w-4 h-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800/50 text-[10px] text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <Info className="w-3 h-3" />
                  <span>Press <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-400 font-mono text-[9px]">Shift+Enter</kbd> for line break</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <span>Operational</span>
                </div>
              </div>
            </div>

            <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(226,149,120,0.04), transparent, rgba(131,197,190,0.04))' }} />
          </div>
        </div>
      )}
    </div>
  );
};

export { FloatingAiAssistant };
