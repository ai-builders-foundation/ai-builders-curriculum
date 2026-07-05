/**
 * llm.ts — the provider-agnostic LLM client.
 *
 * This is the ONLY file in the app that knows which model provider you use.
 * Everything else imports `chat()` and never touches a vendor SDK or URL.
 * To switch providers (or point at a local, self-hosted model), change the
 * three environment variables in `.env` — no code changes anywhere else.
 *
 * The request shape below is the widely-adopted OpenAI-compatible
 * `/chat/completions` format, which many providers and self-hosting tools
 * implement. If your provider differs, adapt THIS file only.
 */

// No vendor defaults here on purpose — you supply all three in .env.
const BASE_URL = process.env.LLM_BASE_URL ?? "";
const API_KEY = process.env.LLM_API_KEY ?? "";
const MODEL = process.env.LLM_MODEL ?? "";
const OFFLINE = process.env.LLM_OFFLINE === "1";

export type Role = "system" | "user" | "assistant";

export interface Message {
  role: Role;
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
}

/**
 * Send a list of messages to the model and return its text reply.
 * Remember: the model is stateless — pass all the context it needs every call.
 */
export async function chat(messages: Message[], opts: ChatOptions = {}): Promise<string> {
  // Offline demo mode: no network, no key required. Also kicks in automatically
  // if the provider isn't fully configured, so the app always runs. Set
  // LLM_OFFLINE=0 and fill in all three LLM_* vars in .env for real output.
  if (OFFLINE || !API_KEY || !BASE_URL || !MODEL) {
    return offlineStub(messages);
  }

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 512,
    }),
  });

  if (!res.ok) {
    // Log detail server-side; the caller turns this into a generic 500 for clients.
    const detail = await res.text();
    throw new Error(`LLM request failed (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

/** A dependency-free stand-in so the app runs end-to-end without a provider. */
function offlineStub(messages: Message[]): string {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const text = (lastUser?.content ?? "").trim();
  const words = text.split(/\s+/).filter(Boolean);
  const preview = words.slice(0, 20).join(" ");
  const ellipsis = words.length > 20 ? "…" : "";
  return (
    "[offline demo — add LLM_API_KEY to .env and set LLM_OFFLINE=0 for real output] " +
    `Input was about ${words.length} words. It begins: "${preview}${ellipsis}"`
  );
}
