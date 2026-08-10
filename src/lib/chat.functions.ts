/** Travel chat client: always tries live Gemini first, then the local Python backend. */
import { API_BASE, SHOULD_TRY_BACKEND } from "./api";

type ChatMsg = { role: "user" | "assistant" | "system"; content: string };

const SYSTEM_PROMPT = `You are WanderCompanion's onboard travel concierge for India.

You help travelers DREAM, ANALYZE, PLAN, OPTIMIZE, SIGHTSEE, BOOK and TRAVEL.
The user can later push the conversation into our Dream / Plan / Optimize tools.

Style:
- Friendly but tight. Short sentences. Markdown lists when useful.
- Prices in ₹ INR. Use tables for comparisons.
- Always end with one clarifying question OR a clear next step.
- When the user mentions a destination, mood, season or budget, surface
  matching ideas and tell them which tool to open (e.g. "Open Dream to see ranked picks").
- Never invent flight numbers / hotel names. For real booking always tell
  the user to open the Book tool which deep-links to Skyscanner / IRCTC / Booking.com.
`;

const CHAT_TIMEOUT_MS = 12_000;

function withTimeout(ms: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(id) };
}

export async function chat(messages: ChatMsg[]) {
  let lastFailure = "Live AI did not return a response.";
  const liveTimeout = withTimeout(CHAT_TIMEOUT_MS);
  try {
    const res = await fetch(`/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, system: SYSTEM_PROMPT }),
      signal: liveTimeout.signal,
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.text) return { text: json.text as string, error: false };
    lastFailure = json?.text || `/api/chat returned ${res.status}`;
  } catch {
    lastFailure = "Same-origin Gemini chat route is unavailable.";
    // Try the local Python backend next.
  } finally {
    liveTimeout.done();
  }

  if (SHOULD_TRY_BACKEND) {
    const timeout = withTimeout(CHAT_TIMEOUT_MS);
    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, system: SYSTEM_PROMPT }),
        signal: timeout.signal,
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.text) return { text: json.text as string, error: false };
      }
    } catch {
      // Fall through to an explicit wiring error instead of canned answers.
    } finally {
      timeout.done();
    }
  }

  return {
    text: `⚠️ Live AI is not connected. ${lastFailure}\n\nCheck \`GEMINI_API_KEY\` in \`backend/.env\` and restart the backend. The old canned offline chat is disabled so you do not see fake/pre-filled travel answers.`,
    error: true,
  };
}