import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Link, Code, Mic, Send, Info, Bot, X } from 'lucide-react';

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

const FloatingAiAssistant: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [charCount, setCharCount] = useState<number>(0);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: "Welcome to VeriPolicy. I am your policy intelligence assistant. Ask me anything about our tracked policy scenarios, historical analogies, or platform features."
    }
  ]);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  const maxChars = 2000;
  const chatRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxChars) {
      setMessage(value);
      setCharCount(value.length);
    }
  };

  const getAssistantResponse = (userMsg: string): string => {
    const lower = userMsg.toLowerCase();
    if (lower.includes('hello') || lower.includes('hi ') || lower.includes('hey')) {
      return "Hello! How can I assist your research today? We can discuss defense budgets, carbon emissions, or policy briefings.";
    }
    if (lower.includes('defence') || lower.includes('defense') || lower.includes('spending') || lower.includes('budget')) {
      return "VeriPolicy aggregates SIPRI military expenditure datasets. You can run scenarios in the 'Scenario Simulator' tab (e.g. raises defense budget to 3% GDP) to see forecasted industry effects and emissions impacts.";
    }
    if (lower.includes('emissions') || lower.includes('carbon') || lower.includes('co2') || lower.includes('climate')) {
      return "We track CO2 emission trajectories alongside industrial output. Our simulator analyzes how defense spending reallocations might impact clean energy milestones based on historical cases.";
    }
    if (lower.includes('simulator') || lower.includes('scenario') || lower.includes('forecast')) {
      return "The Scenario Simulator maps your custom inputs against historical precedents using all-MiniLM embeddings and generates a structured analyst memo via Gemini 2.0. Try out the examples on the simulator page!";
    }
    if (lower.includes('data') || lower.includes('source') || lower.includes('jurisdiction')) {
      return "Our codebase links primary source historical data across 47 jurisdictions (with focus on USA, Germany, India, China, UK, Saudi Arabia, and Sweden), tracking 2.1M records.";
    }
    return "Understood. That is a relevant scenario factor. If you describe this in the Scenario Simulator, our AI foresight engine will cross-reference it with our historical catalog to generate a structured memorandum.";
  };

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed) {
      // Add user message
      const updatedMessages = [...messages, { sender: 'user', text: trimmed } as const];
      setMessages(updatedMessages);
      setMessage('');
      setCharCount(0);
      setIsTyping(true);

      // Simulate AI typing and response
      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          { sender: 'ai', text: getAssistantResponse(trimmed) }
        ]);
      }, 1000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-scroll messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Close chat when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest('.floating-ai-button')) {
          setIsChatOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating 3D Glowing AI Logo */}
      <button 
        className={`floating-ai-button relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 transform cursor-pointer ${
          isChatOpen ? 'rotate-90 scale-95' : 'rotate-0'
        }`}
        onClick={() => setIsChatOpen(!isChatOpen)}
        style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
          boxShadow: '0 0 20px rgba(226, 149, 120, 0.6), 0 0 40px rgba(226, 149, 120, 0.4), 0 0 60px rgba(131, 197, 190, 0.2)',
          border: '2px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        {/* 3D effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent opacity-30"></div>
        
        {/* Inner glow */}
        <div className="absolute inset-0 rounded-full border-2 border-white/10"></div>
        
        {/* AI Icon */}
        <div className="relative z-10 text-white">
          {isChatOpen ? <X className="w-6 h-6" /> : <Bot className="w-7 h-7" />}
        </div>
        
        {/* Glowing animation */}
        <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-[var(--primary)]"></div>
      </button>

      {/* Chat Interface */}
      {isChatOpen && (
        <div 
          ref={chatRef}
          className="absolute bottom-20 right-0 w-[380px] sm:w-[440px] transition-all duration-300 origin-bottom-right animate-pop-in"
        >
          <div className="relative flex flex-col rounded-3xl bg-zinc-900/95 border border-zinc-700/60 shadow-2xl backdrop-blur-3xl overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-zinc-800/60">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-semibold tracking-wider uppercase text-zinc-300">Policy Assistant</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-[10px] font-mono tracking-wider bg-zinc-800 text-zinc-300 rounded-full">
                  GEMINI 2.0
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 rounded-full">
                  Foresight
                </span>
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="p-1 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
            </div>

            {/* Chat History Panel */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[320px] min-h-[220px] bg-zinc-950/20 scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === 'ai' && (
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-[10px] text-white font-mono font-bold shadow-md">
                      VP
                    </div>
                  )}
                  <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed max-w-[80%] ${
                    msg.sender === 'user' 
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)] rounded-tr-none shadow-sm' 
                      : 'bg-zinc-800/90 text-zinc-100 rounded-tl-none border border-zinc-700/30'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-[10px] text-white font-mono font-bold shadow-md">
                    VP
                  </div>
                  <div className="rounded-2xl px-4 py-3 bg-zinc-800/90 text-zinc-400 rounded-tl-none border border-zinc-700/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Section */}
            <div className="relative border-t border-zinc-800/60 bg-zinc-950/20">
              <textarea
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={2}
                className="w-full px-5 py-4 bg-transparent border-none outline-none resize-none text-sm leading-relaxed text-zinc-100 placeholder-zinc-500 scrollbar-none"
                placeholder="Ask anything about policy scenarios..."
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              />
            </div>

            {/* Controls Section */}
            <div className="px-5 pb-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Attachment Group */}
                  <div className="flex items-center gap-1 p-1 bg-zinc-800/40 rounded-xl border border-zinc-800/80">
                    {/* File Upload */}
                    <button className="group relative p-2 bg-transparent border-none rounded-lg cursor-pointer transition-all duration-300 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transform">
                      <Paperclip className="w-3.5 h-3.5" />
                      <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-2.5 py-1.5 bg-zinc-950 text-zinc-300 text-[10px] rounded-lg whitespace-nowrap opacity-0 transition-all duration-300 pointer-events-none group-hover:opacity-100 group-hover:-translate-y-1 shadow-lg border border-zinc-800">
                        Upload files
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-950"></div>
                      </div>
                    </button>

                    {/* Link */}
                    <button className="group relative p-2 bg-transparent border-none rounded-lg cursor-pointer transition-all duration-300 text-zinc-500 hover:text-[var(--accent)] hover:bg-zinc-800/60 transform">
                      <Link className="w-3.5 h-3.5" />
                      <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-2.5 py-1.5 bg-zinc-950 text-zinc-300 text-[10px] rounded-lg whitespace-nowrap opacity-0 transition-all duration-300 pointer-events-none group-hover:opacity-100 group-hover:-translate-y-1 shadow-lg border border-zinc-800">
                        Web link
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-950"></div>
                      </div>
                    </button>

                    {/* Code */}
                    <button className="group relative p-2 bg-transparent border-none rounded-lg cursor-pointer transition-all duration-300 text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800/60 transform">
                      <Code className="w-3.5 h-3.5" />
                      <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-2.5 py-1.5 bg-zinc-950 text-zinc-300 text-[10px] rounded-lg whitespace-nowrap opacity-0 transition-all duration-300 pointer-events-none group-hover:opacity-100 group-hover:-translate-y-1 shadow-lg border border-zinc-800">
                        Code repo
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-950"></div>
                      </div>
                    </button>
                  </div>

                  {/* Voice Button */}
                  <button className="group relative p-2 bg-transparent border border-zinc-800 rounded-xl cursor-pointer transition-all duration-300 text-zinc-500 hover:text-[var(--accent)] hover:bg-zinc-800/60 hover:border-[var(--accent)]/30 transform">
                    <Mic className="w-3.5 h-3.5" />
                    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-2.5 py-1.5 bg-zinc-950 text-zinc-300 text-[10px] rounded-lg whitespace-nowrap opacity-0 transition-all duration-300 pointer-events-none group-hover:opacity-100 group-hover:-translate-y-1 shadow-lg border border-zinc-800">
                      Voice input
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-950"></div>
                    </div>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {/* Character Counter */}
                  <div className="text-[10px] font-mono text-zinc-500">
                    <span>{charCount}</span>/<span>{maxChars}</span>
                  </div>

                  {/* Send Button */}
                  <button 
                    onClick={handleSend}
                    disabled={!message.trim()}
                    className="group relative p-2.5 bg-gradient-to-r from-[var(--primary)] to-[color-mix(in_oklab,var(--primary)_85%,black)] text-[var(--primary-foreground)] border-none rounded-xl cursor-pointer transition-all duration-300 shadow-lg hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
                    style={{
                      boxShadow: '0 4px 12px rgba(226, 149, 120, 0.25)',
                    }}
                  >
                    <Send className="w-4 h-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>

              {/* Footer Info */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800/50 text-[10px] text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <Info className="w-3 h-3" />
                  <span>
                    Press <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-400 font-mono text-[9px]">Shift+Enter</kbd> for line break
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                  <span>Operational</span>
                </div>
              </div>
            </div>

            {/* Floating Overlay */}
            <div 
              className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{ 
                background: 'linear-gradient(135deg, rgba(226, 149, 120, 0.04), transparent, rgba(131, 197, 190, 0.04))' 
              }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export { FloatingAiAssistant };
