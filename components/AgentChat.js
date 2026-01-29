'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  ArrowRight,
  CircleDot,
  CornerDownLeft,
  Loader2,
  User,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const DEFAULT_GREETING =
  "Hi! I'm the StarkLabs support assistant. Ask me about orders, quotes, shipping, or products.";

const QUICK_STARTS = [
  'Where is my order?',
  'How do I request a quote?',
  'What is your return policy?',
  'Do you ship to my location?',
];

const STORAGE_KEY_UUID = 'helloquip_agent_chat_uuid';
const STORAGE_KEY_MESSAGES = 'helloquip_agent_chat_messages';

function getOrCreateUuid() {
  if (typeof window === 'undefined') return null;
  let u = localStorage.getItem(STORAGE_KEY_UUID);
  if (!u) {
    try {
      u = crypto.randomUUID();
    } catch {
      u = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0, v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
    localStorage.setItem(STORAGE_KEY_UUID, u);
  }
  return u;
}

export default function AgentChat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: DEFAULT_GREETING },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true); // assume anonymous until auth resolves
  const hasLoadedRef = useRef(false);
  const bottomRef = useRef(null);
  const router = useRouter();

  const canSend = input.trim().length > 0 && !loading;
  const lastMessages = useMemo(() => messages.slice(-10), [messages]);

  // Resolve auth: only persist for anonymous (not logged in)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setIsAnonymous(!user);
    });
    return () => unsub();
  }, []);

  // Load persisted history once when anonymous
  useEffect(() => {
    if (!isAnonymous || hasLoadedRef.current || typeof window === 'undefined') return;
    hasLoadedRef.current = true;
    getOrCreateUuid();
    try {
      const raw = localStorage.getItem(STORAGE_KEY_MESSAGES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch (_) {}
  }, [isAnonymous]);

  // Persist messages when anonymous
  useEffect(() => {
    if (!isAnonymous || typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
    } catch (_) {}
  }, [isAnonymous, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(overrideMessage) {
    const outgoing = (overrideMessage ?? input).trim();
    if (!outgoing) return;

    const newMessages = [...messages, { role: 'user', content: outgoing }];
    setMessages(newMessages);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: outgoing,
          messages: lastMessages,
        }),
      });

      const data = await res.json();
      const reply =
        typeof data.reply === 'string' && data.reply.trim().length > 0
          ? data.reply
          : 'Sorry, I did not get a response. Please try again.';

      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError('Connection error. Please try again.');
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Sorry, I hit a connection error.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex h-full w-full flex-col">
      <section className="flex flex-1 flex-col overflow-hidden rounded-none md:rounded-2xl border-0 md:border md:border-slate-200 bg-white shadow-none md:shadow-sm">
        <div className="fixed top-0 left-0 right-0 z-20 flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-5 py-4 md:static md:z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2e4493]/10">
              <User className="h-5 w-5 text-[#2e4493]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                StarkLabs Support
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CircleDot className="h-3 w-3 text-emerald-500" />
                Online now
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setMessages([{ role: 'assistant', content: DEFAULT_GREETING }])
              }
              className="text-xs font-medium text-slate-500 hover:text-[#2e4493] transition"
            >
              Clear Chat
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
              aria-label="Close and return to main"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pt-20 pb-6 md:pt-6 space-y-4 bg-gradient-to-b from-white to-slate-50">
          {messages.map((msg, index) => (
            <div
              key={`${msg.role}-${index}`}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'user' ? (
                <div className="max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow bg-[#2e4493] text-white rounded-br-md">
                  <div className="flex items-center gap-2 text-[11px] text-white/80 mb-1">
                    <User className="h-3 w-3" />
                    You
                  </div>
                  <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                </div>
              ) : (
                <div className="w-full max-w-[85%]">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-1">
                    <User className="h-3 w-3 text-[#2e4493]" />
                    StarkLabs Support
                  </div>
                  <div className="whitespace-pre-wrap text-sm text-slate-800">{msg.content}</div>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start w-full max-w-[85%] items-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#2e4493]" />
              Waiting for reply....
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length === 1 && (
          <div className="border-t border-slate-100 px-5 py-4 bg-white">
            <p className="text-xs font-semibold text-slate-500 mb-2">
              Quick starts
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_STARTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-[#2e4493] hover:text-[#2e4493] transition"
                  onClick={() => sendMessage(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage();
          }}
          className="border-t border-slate-100 bg-white px-5 py-4"
        >
          <div className="relative">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Message StarkLabs"
              className="w-full resize-none rounded-full border border-slate-200 pl-4 pr-14 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2e4493]/30"
              disabled={loading}
            />
            <div className="absolute right-0 top-0 bottom-0 flex items-center justify-end p-2 pointer-events-none [&>*]:pointer-events-auto">
              <button
                type="submit"
                disabled={!canSend}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2e4493] text-white transition hover:bg-[#1d2b66] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <CornerDownLeft className="h-3 w-3" />
            Press Enter to send, Shift+Enter for a new line
          </div>
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </form>
      </section>
    </div>
  );
}
