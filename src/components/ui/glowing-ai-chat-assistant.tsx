import React, { useState, useRef, useEffect } from 'react';
import { Send, Info, Bot, X, Volume2, VolumeX } from 'lucide-react';

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

// ── Knowledge base for VeriPolicy ──────────────────────────────────────
type KBEntry = { patterns: RegExp[]; response: string };

const KNOWLEDGE_BASE: KBEntry[] = [
  // Greetings
  {
    patterns: [/^(hi|hello|hey|howdy|greetings|good\s*(morning|afternoon|evening))/i],
    response: "Hello! I'm your VeriPolicy assistant. I can help you with:\n• Scenario Simulator — generate foresight memos\n• Policy Tracker — browse live policy news\n• Comparison Dashboard — compare CO₂ vs military spending\n• Your Profile & saved briefs\n\nWhat would you like to know?",
  },
  // What is VeriPolicy
  {
    patterns: [/what\s*(is|does|'s)\s*veripolicy/i, /about\s*(this|the)\s*(site|platform|app|website)/i, /tell\s*me\s*about/i, /explain\s*(veripolicy|this|the\s*platform)/i],
    response: "VeriPolicy is an AI-powered policy intelligence platform. It turns raw defence, climate, and strategic technology data into decision-ready foresight briefs in seconds. It covers 47 jurisdictions with 2.1M indexed records from SIPRI military expenditure and global CO₂ emissions datasets.",
  },
  // Scenario Simulator
  {
    patterns: [/scenario\s*simulator/i, /simulator/i, /foresight\s*memo/i, /generate\s*(a\s*)?(memo|brief|report)/i, /how\s*(do\s*i|to|can\s*i)\s*(use|run|open)\s*(the\s*)?simulator/i],
    response: "The Scenario Simulator lets you enter a policy scenario (e.g. \"India increases defence spending by 15% and cuts fuel subsidies by 20%\") and generates an analyst-grade foresight memo.\n\nHow to use it:\n1. Go to the 'Scenario Simulator' tab in the navbar\n2. Type or pick an example scenario\n3. Click 'Generate Foresight Memo'\n4. View the memo with emissions trajectory, defence effects, economic spillovers, and confidence score\n\nThe memo is auto-saved to your profile as a draft brief.",
  },
  // Policy Tracker
  {
    patterns: [/policy\s*tracker/i, /tracker/i, /live\s*policy/i, /news\s*feed/i, /policy\s*(feed|news)/i, /recent\s*polic/i],
    response: "The Policy Tracker shows live policy news sourced from global news APIs, categorized into Defence, Climate, and Energy. Each story can have an AI-generated Impact Brief with:\n• What was decided\n• Immediate impacts (0–6 months)\n• Second-order effects\n• Open questions\n• Confidence score\n\nPolicies are automatically refreshed daily. You can filter by category using the filter buttons.",
  },
  // Comparison Dashboard
  {
    patterns: [/comparison/i, /compare/i, /dashboard/i, /co2\s*vs/i, /military\s*vs/i, /expenditure/i, /chart/i],
    response: "The Comparison Dashboard lets you compare CO₂ emissions vs military expenditure across major economies (US, China, India, Germany, UK, Saudi Arabia, Sweden).\n\nYou can:\n• Select which countries to compare\n• Choose time windows (1850–1950, 1950–2000, 2000–2023, or full history)\n• View interactive trend charts\n\nAccess it from the Scenario Simulator results or directly from the comparison link.",
  },
  // Profile / Briefs
  {
    patterns: [/profile/i, /my\s*(account|briefs|memos|drafts)/i, /saved\s*(brief|memo)/i, /past\s*draft/i],
    response: "Your Profile page shows:\n• Your account details and clearance level\n• All saved foresight briefs with status (Draft, In Review, Published)\n• Brief metrics: citations count and forecast accuracy\n• Recent activity log\n\nMemos generated in the Scenario Simulator are automatically saved as Draft briefs in your profile.",
  },
  // Data sources
  {
    patterns: [/data\s*source/i, /sipri/i, /where\s*(does|do)\s*(the\s*)?data/i, /dataset/i, /source\s*of\s*data/i, /2\.1\s*m/i, /records/i, /jurisdiction/i],
    response: "VeriPolicy uses:\n• SIPRI military expenditure data — global defence spending since 1949\n• Global CO₂ emissions data — territorial emissions since 1850\n• NewsData API — live policy news for the Policy Tracker\n\nThe platform covers 47 jurisdictions with 2.1M indexed records. Historical analogies are embedded using all-MiniLM-L6-v2 and stored in a Supabase vector database for semantic retrieval.",
  },
  // How it works / Tech
  {
    patterns: [/how\s*(does\s*it|does\s*this)\s*work/i, /tech(nology)?/i, /ai\s*model/i, /gemini/i, /llm/i, /embedding/i, /rag/i, /vector/i],
    response: "VeriPolicy's pipeline:\n1. You enter a policy scenario\n2. The text is embedded using all-MiniLM-L6-v2 (384-dim)\n3. Supabase vector search finds the 3 most similar historical analogies\n4. Gemini 2.0 Flash generates a structured memo grounded in those analogies\n5. The memo includes scaled projections based on your specific percentages\n\nFallback: if Gemini is unavailable, Groq (Llama 3.3 70B) is used.",
  },
  // Login / Signup / Auth
  {
    patterns: [/log\s*in/i, /sign\s*(up|in)/i, /register/i, /create\s*(an\s*)?account/i, /auth/i, /password/i],
    response: "To use VeriPolicy:\n1. Click 'Sign Up' to create a new account with your email and password\n2. Or click 'Log In' if you already have an account\n3. You'll need to be authenticated to access the Scenario Simulator, Policy Tracker, and your Profile\n\nThe home page and about page are publicly accessible.",
  },
  // Navigation
  {
    patterns: [/nav(igation|bar)?/i, /menu/i, /pages?/i, /where\s*(can\s*i|do\s*i)\s*(find|go)/i, /tabs?/i],
    response: "VeriPolicy's main pages (accessible from the top navbar):\n• Home — Platform overview and quick access\n• Scenario Simulator — Generate foresight memos\n• Policy Tracker — Browse live policy news\n• Comparison — Compare country-level CO₂ & defence data\n• Profile — Your saved briefs and account details\n• About — Platform mission and methodology",
  },
  // Confidence score
  {
    patterns: [/confidence/i, /accuracy/i, /score/i, /how\s*reliable/i, /trust/i],
    response: "Confidence scores are calculated from the cosine similarity of your scenario against historical analogies:\n• High — average similarity ≥ 0.75 (strong historical precedent)\n• Medium — similarity 0.50–0.74\n• Low — similarity < 0.50 (limited precedent, higher uncertainty)\n\nThe score tells you how well-grounded the memo is in real historical data.",
  },
  // Countries
  {
    patterns: [/countr(y|ies)/i, /india/i, /china/i, /united\s*states/i, /germany/i, /saudi/i, /sweden/i, /uk|united\s*kingdom|britain/i],
    response: "VeriPolicy has detailed analytics data for 7 focus countries:\n• United States\n• China\n• India\n• Germany\n• United Kingdom\n• Saudi Arabia\n• Sweden\n\nWhen you enter a scenario mentioning a country, the simulator automatically shows relevant trend charts for that country.",
  },
  // Defence / Military
  {
    patterns: [/defen[cs]e/i, /military/i, /army|navy|air\s*force/i, /nato/i, /weapon/i, /procurement/i],
    response: "VeriPolicy tracks defence spending patterns using SIPRI data. You can:\n• Run scenarios about defence budget changes in the Simulator\n• Compare military expenditure across countries in the Comparison Dashboard\n• View defence-tagged policy news in the Tracker\n\nTry a scenario like: \"Germany raises defence spending to 3% of GDP.\"",
  },
  // Climate / Emissions
  {
    patterns: [/climate/i, /emission/i, /carbon/i, /co2/i, /green/i, /renewable/i, /fossil/i, /energy\s*policy/i, /subsid/i],
    response: "VeriPolicy covers climate and emissions data:\n• CO₂ emissions trajectories per country since 1850\n• Impact of defence spending changes on emissions\n• Renewable energy and subsidy reallocation scenarios\n\nTry: \"India cuts fossil fuel subsidies by 20% and redirects to renewables.\"",
  },
  // Download / Export
  {
    patterns: [/download/i, /export/i, /save/i, /pdf/i, /txt/i],
    response: "After generating a foresight memo, you can:\n• Download it as a .txt file using the 'Download Brief' button\n• The memo is also auto-saved to your Profile as a draft brief\n• View all saved briefs in your Profile page",
  },
  // Help
  {
    patterns: [/help/i, /what\s*can\s*you\s*do/i, /assist/i, /support/i, /guide/i],
    response: "I can help you with anything about VeriPolicy:\n• How to use the Scenario Simulator\n• Understanding the Policy Tracker\n• Navigating the Comparison Dashboard\n• Your profile and saved briefs\n• Data sources and methodology\n• Understanding confidence scores\n\nJust ask your question!",
  },
  // Thanks
  {
    patterns: [/thank/i, /thanks/i, /thx/i, /cheers/i, /appreciate/i],
    response: "You're welcome! Let me know if you need anything else about VeriPolicy.",
  },
];

const NOT_RELATED_RESPONSE = "This question isn't related to VeriPolicy. I can only help with our platform — the Scenario Simulator, Policy Tracker, Comparison Dashboard, your profile, data sources, and how to use them. Please ask something related!";

function getResponse(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "Please type a question about VeriPolicy.";

  for (const entry of KNOWLEDGE_BASE) {
    for (const pattern of entry.patterns) {
      if (pattern.test(trimmed)) return entry.response;
    }
  }

  // Check if the input contains at least one VeriPolicy-relevant keyword
  const relevantKeywords = /polic|simulator|tracker|comparison|brief|memo|veripolicy|profile|data|chart|country|defence|defense|climate|emission|carbon|login|signup|account|navigation|confidence|download|score|analogy|historical/i;
  if (relevantKeywords.test(trimmed)) {
    return "I understand you're asking about a VeriPolicy feature. Could you be more specific? I can help with:\n• Scenario Simulator\n• Policy Tracker\n• Comparison Dashboard\n• Profile & Briefs\n• Data sources\n• How the AI pipeline works";
  }

  return NOT_RELATED_RESPONSE;
}

// ── Component ──────────────────────────────────────────────────────────

const FloatingAiAssistant: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: "Hi! I'm your VeriPolicy assistant. Ask me about the Scenario Simulator, Policy Tracker, Comparison Dashboard, or any platform feature." }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const maxChars = 500;
  const chatRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSpeak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speakingText === text) {
      window.speechSynthesis.cancel();
      setSpeakingText(null);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setSpeakingText(null);
      utterance.onerror = () => setSpeakingText(null);
      setSpeakingText(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || isTyping) return;

    const currentHistory = [...messages];
    setMessages((prev) => [...prev, { sender: 'user', text: trimmed }]);
    setMessage('');
    setIsTyping(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history: currentHistory }),
      });

      if (!response.ok) {
        throw new Error("Assistant API returned error status");
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { sender: 'ai', text: data.reply }]);
    } catch (err) {
      console.warn("Live assistant API failed, using local fallback", err);
      setTimeout(() => {
        const reply = getResponse(trimmed);
        setMessages((prev) => [...prev, { sender: 'ai', text: reply }]);
      }, 300);
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
                <span className="text-xs font-semibold tracking-wider uppercase text-zinc-300">VeriPolicy Assistant</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 rounded-full">Help</span>
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
                  <div className={`relative group rounded-2xl px-4 py-2.5 text-sm leading-relaxed max-w-[80%] whitespace-pre-line ${msg.sender === 'user' ? 'bg-[var(--primary)] text-[var(--primary-foreground)] rounded-tr-none shadow-sm' : 'bg-zinc-800/90 text-zinc-100 rounded-tl-none border border-zinc-700/30'}`}>
                    {msg.text}
                    {msg.sender === 'ai' && (
                      <button
                        onClick={() => handleSpeak(msg.text)}
                        className="absolute -right-7 bottom-1.5 p-1 rounded bg-zinc-800/70 border border-zinc-700/40 text-zinc-400 hover:text-zinc-200 cursor-pointer shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        title={speakingText === msg.text ? "Mute" : "Speak text"}
                      >
                        {speakingText === msg.text ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                    )}
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
                onChange={(e) => { if (e.target.value.length <= maxChars) setMessage(e.target.value); }}
                onKeyDown={handleKeyDown}
                rows={2}
                className="w-full px-5 py-4 bg-transparent border-none outline-none resize-none text-sm leading-relaxed text-zinc-100 placeholder-zinc-500"
                placeholder="Ask about VeriPolicy features..."
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
                  <span>Ask about VeriPolicy features only</span>
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
