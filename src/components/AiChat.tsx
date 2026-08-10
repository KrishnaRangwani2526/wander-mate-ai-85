import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  MessageSquare, X, Send, Sparkles, Trash2, ArrowRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { chat } from "@/lib/chat.functions";

type Msg = { role: "user" | "assistant"; content: string; ts: number };
type AskChatEvent = CustomEvent<{ prompt?: string }>;

const LS_KEY = "wc.chat.v1";

function loadHistory(): Msg[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Msg[]) : [];
    return parsed.filter((msg) => !/AI backend error|Make sure your local engine is running/i.test(msg.content));
  } catch {
    return [];
  }
}

function saveHistory(m: Msg[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(m.slice(-100)));
  } catch {
    /* ignore */
  }
}

/** Public helper: read the most recent user message so other pages
 *  (Dream / Plan / Optimize) can prefill from the chat. */
export function readLatestUserPrompt(): string {
  const h = loadHistory();
  for (let i = h.length - 1; i >= 0; i--) {
    if (h[i].role === "user") return h[i].content;
  }
  return "";
}

const SUGGESTIONS = [
  "Plan a 5-day Manali trip in December for 2 people, mid-budget",
  "Compare Goa vs Kerala backwaters for a beach lover",
  "Best season for Ladakh and how many days do I need?",
  "I have ₹40,000 for a couple — where in India should we go?",
];

export function AiChatLauncher() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const ask = async (messages: Msg[]) => {
    const res = await chat(messages.map((m) => ({ role: m.role, content: m.content })));
    return res;
  };

  useEffect(() => {
    setMessages(loadHistory());
  }, []);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  useEffect(() => {
    const handler = (event: Event) => {
      const prompt = (event as AskChatEvent).detail?.prompt?.trim();
      setOpen(true);
      if (prompt) window.setTimeout(() => send(prompt), 0);
    };
    window.addEventListener("wc:chat:ask", handler);
    return () => window.removeEventListener("wc:chat:ask", handler);
  }, [messages, busy]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: trimmed, ts: Date.now() }];
    setMessages(next);
    saveHistory(next);
    setInput("");
    setBusy(true);
    try {
      const res = await ask(next);
      const final: Msg[] = [
        ...next,
        { role: "assistant", content: res.text || "(no reply)", ts: Date.now() },
      ];
      setMessages(final);
      saveHistory(final);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      const final: Msg[] = [...next, { role: "assistant", content: `⚠️ ${msg}`, ts: Date.now() }];
      setMessages(final);
      saveHistory(final);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function clearChat() {
    setMessages([]);
    saveHistory([]);
  }

  return (
    <>
      {/* Floating launcher button */}
      <button
        aria-label="Open AI travel chat"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-2xl ring-1 ring-black/10 transition hover:scale-105 sm:bottom-6 sm:right-6"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <MessageSquare className="h-4 w-4" />
        <span className="hidden sm:inline">Ask AI</span>
      </button>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-2xl sm:w-[440px]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-foreground text-background">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-sm font-bold text-foreground">Travel concierge</div>
                  <div className="text-[11px] text-muted-foreground">
                    Powered by AI · chat saved in this browser
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearChat}
                  aria-label="Clear chat"
                  title="Clear chat"
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <div className="rounded-2xl bg-secondary/60 p-4">
                    <div className="text-sm font-semibold text-foreground">
                      Hi 👋 I'm your travel concierge.
                    </div>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      Tell me your mood, dates, budget, or paste a destination — I'll suggest
                      where to go, how long, and what it costs. You can also send our reply into
                      <b> Dream</b>, <b>Plan</b> or <b>Optimize</b>.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="block w-full rounded-xl border border-border bg-white px-3 py-2.5 text-left text-[13px] text-foreground transition hover:bg-secondary"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                      m.role === "user"
                        ? "bg-foreground text-background"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_table]:my-2 [&_table]:text-xs [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_td]:border [&_th]:border-border [&_td]:border-border">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      m.content
                    )}
                  </div>
                </div>
              ))}

              {busy && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-secondary px-3.5 py-2.5">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-foreground/40" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-foreground/40 [animation-delay:120ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-foreground/40 [animation-delay:240ms]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick actions when there's a conversation */}
            {messages.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
                <Link
                  to="/dream"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2.5 py-1 text-[11px] font-semibold text-pink-700 hover:bg-pink-100"
                >
                  → Send to Dream <ArrowRight className="h-3 w-3" />
                </Link>
                <Link
                  to="/plan"
                  search={{} as any}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                >
                  → Send to Plan <ArrowRight className="h-3 w-3" />
                </Link>
                <Link
                  to="/optimize"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  → Send to Optimize <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="border-t border-border p-3"
            >
              <div className="flex items-end gap-2 rounded-2xl border border-border bg-white p-2 focus-within:ring-2 focus-within:ring-foreground/30">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  rows={1}
                  placeholder="Ask anything about traveling India…"
                  className="min-h-[36px] max-h-32 flex-1 resize-none bg-transparent px-1 text-[13.5px] outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background transition hover:opacity-90 disabled:opacity-40"
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}
