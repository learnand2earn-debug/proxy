'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  Loader2,
  HelpCircle,
  Activity
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  toolsUsed?: string[];
  timestamp: string;
}

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  onRefreshData
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      text: `Hello! I am your **Proxy Intelligence Copilot**. I query your live proxy inventory with zero hallucinations using real diagnostic tools.\n\nAsk me questions like:\n* *"Show all currently active proxies"*\n* *"Which inactive proxies recovered today?"*\n* *"Why did this endpoint fail?"*\n* *"Find malformed entries in my imported list"*\n* *"Summarize today's discovery and health-check results"*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSendQuery = async (queryText?: string) => {
    const q = queryText || inputQuery.trim();
    if (!q || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process AI query');
      }

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: data.answer,
        toolsUsed: data.toolsUsed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: `Error processing request: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const samplePrompts = [
    'Show all currently active proxies.',
    'Which inactive proxies recovered today?',
    'Why did this endpoint fail?',
    'Find malformed entries in my imported list.',
    'Summarize today\'s discovery and health-check results.'
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg bg-[#0a0f1d] border-l border-[#1a2540] h-full flex flex-col shadow-2xl relative">
        {/* Drawer Header */}
        <div className="h-16 px-5 border-b border-[#1a2540] flex items-center justify-between bg-[#0e1628]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-glow-sm">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Proxy Intelligence AI</span>
                <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-1.5 py-0.5 rounded uppercase font-semibold">
                  Zero Hallucination
                </span>
              </h2>
              <p className="text-[10px] text-slate-400">Structured function calls to real DB state</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg bg-[#131d35]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Suggested Prompt Chips */}
        <div className="p-3 bg-[#0d1424] border-b border-[#1a2540] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {samplePrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendQuery(prompt)}
              className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-[#131d35] hover:bg-[#1e2d54] text-slate-300 hover:text-white border border-[#1e2d54] transition-all flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>{prompt}</span>
            </button>
          ))}
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                {m.sender === 'assistant' ? (
                  <>
                    <Bot className="w-3 h-3 text-blue-400" />
                    <span className="font-semibold text-slate-300">Proxy Copilot</span>
                  </>
                ) : (
                  <>
                    <User className="w-3 h-3 text-slate-300" />
                    <span className="font-semibold text-slate-300">You</span>
                  </>
                )}
                <span>•</span>
                <span>{m.timestamp}</span>
              </div>

              {/* Tool badge if executed */}
              {m.toolsUsed && m.toolsUsed.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {m.toolsUsed.map((tool, ti) => (
                    <span
                      key={ti}
                      className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                    >
                      <Wrench className="w-2.5 h-2.5" />
                      Executed: {tool}()
                    </span>
                  ))}
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`p-3.5 rounded-2xl text-xs max-w-[92%] leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-xs shadow-sm font-medium'
                    : 'bg-[#131d35] border border-[#1e2d54] text-slate-200 rounded-tl-xs shadow-sm'
                }`}
              >
                <div className="prose prose-invert prose-xs max-w-none space-y-2 whitespace-pre-wrap">
                  {m.text}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 p-3 text-xs text-blue-300 bg-[#131d35] border border-[#1e2d54] rounded-xl w-fit">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span>Querying backend diagnostic telemetry...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-[#1a2540] bg-[#0e1628]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask about active proxies, recoveries, failures, or errors..."
              className="flex-1 bg-[#131d35] border border-[#1e2d54] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 transition-all shadow-glow-sm cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="text-[10px] text-slate-400 mt-2 text-center">
            Explicit confirmation required before destructive actions (deletions / proxy switching).
          </div>
        </div>
      </div>
    </div>
  );
};
