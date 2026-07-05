# 04 — AI & Agents

> This is the part that makes it an *AI* app. A large language model (LLM) is just an HTTP API that turns messages into text. This module teaches you to call one behind an environment variable in a provider-agnostic way, shape its input with prompts, get **structured output** you can actually use, give it **tools**, and wire those into a simple **agent loop** — while keeping cost and safety in view.

**Prerequisites:** [Module 03 — Functions & APIs](03-functions-and-apis.md). You should be comfortable making and handling HTTP requests.

## Learning objectives

By the end of this module you will be able to:

- Describe what an LLM does and the anatomy of a chat request (roles, messages, parameters).
- Call an LLM through a **provider-agnostic** client that reads its endpoint, key, and model from environment variables.
- Write **system** and **user** prompts that reliably steer output.
- Get **structured (JSON) output** and validate it before trusting it.
- Understand **streaming** and why it matters for UX.
- Explain **tool/function calling** and use it to let a model take actions.
- Build a minimal **agent loop** (think → act → observe → repeat).
- Explain **RAG** (retrieval-augmented generation) at a working level.
- Reason about **cost, latency, and safety** so your app is responsible and affordable.

## What an LLM actually is

An LLM is a function that, given some text, predicts likely continuation text. Modern chat models are trained to follow instructions, so in practice you hand it a **conversation** — a list of messages — and it returns the next message. It has **no memory** between calls: every request must carry all the context the model needs. It is also **non-deterministic** by default — the same input can yield slightly different output — and it can be confidently wrong (a "hallucination"). Design around all three of these facts.

Crucially for us: talking to an LLM is *just an HTTP POST*. You've done harder things in Module 03.

### The chat request anatomy

Nearly every chat LLM API takes a list of **messages**, each with a **role**:

- **`system`** — standing instructions that set the model's behavior, persona, and rules. Sent once, at the top.
- **`user`** — input from the person (or your app on their behalf).
- **`assistant`** — the model's previous replies (you include these to give it conversational memory).

Plus a few parameters you'll use constantly:

- **`model`** — which model to use.
- **`temperature`** — randomness. `0` is focused and repeatable; higher (~0.7–1.0) is more varied/creative. Use low temperature for extraction and classification, higher for brainstorming.
- **`max_tokens`** — a cap on the response length (and thus cost).

A **token** is a chunk of text — roughly ¾ of a word in English. You're billed per token, input **and** output, so tokens are the unit of both cost and the model's context limit.

## Calling an LLM the vendor-neutral way

Here's the key design decision for this whole curriculum: **never hard-code a provider.** Read the base URL, API key, and model name from environment variables. Then switching providers — or pointing at a local, self-hosted model — is a config change, not a code change.

Many providers expose an OpenAI-compatible `/chat/completions` endpoint, and self-hosting tools (llama.cpp servers, Ollama's compatibility layer, vLLM, and others) do too, so a single request shape reaches a large fraction of the ecosystem. Where a provider differs, you isolate that difference in this one client file and the rest of your app never notices.

```ts
// llm.ts — one small, provider-agnostic client. The ONLY file that knows
// which vendor you use. Everything else calls generate() / chat().

const BASE_URL = process.env.LLM_BASE_URL; // your provider's chat-completions endpoint
const API_KEY = process.env.LLM_API_KEY;
const MODEL = process.env.LLM_MODEL;       // a chat model your provider offers

if (!BASE_URL || !API_KEY || !MODEL) {
  throw new Error("Set LLM_BASE_URL, LLM_API_KEY, and LLM_MODEL (see .env.example)");
}

export type Message = { role: "system" | "user" | "assistant"; content: string };

export async function chat(
  messages: Message[],
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
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
      max_tokens: opts.maxTokens ?? 800,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`LLM request failed (${res.status}): ${detail}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}
```

Your `.env.example` documents the knobs without leaking a real key:

```bash
# .env.example — copy to .env and fill in. .env is git-ignored.
LLM_BASE_URL=https://api.your-provider.example/v1
LLM_API_KEY=sk-replace-me
LLM_MODEL=some-capable-model
```

Now a feature is a few lines:

```ts
import { chat } from "./llm";

export async function summarize(text: string): Promise<string> {
  return chat(
    [
      { role: "system", content: "You summarize text into 2-3 tight sentences. No preamble." },
      { role: "user", content: text },
    ],
    { temperature: 0.3, maxTokens: 200 } // low temp: we want a faithful, stable summary
  );
}
```

> If your provider's request/response shape differs, you change *only* `llm.ts`. That isolation is the whole point of the pattern — and it's what keeps this curriculum, and your app, free of lock-in.

### Beyond text: multimodal input

Many modern models are **multimodal** — a message's content can include images (and, with some models, audio or video) alongside text, so you can ask "what's in this screenshot?" or "extract the total from this receipt photo." Mechanically it's the same request; the `content` of a message becomes a list of parts (some text, some an image reference) instead of a plain string. The concept doesn't change — messages in, text out — so treat it as an extension of what you already know, not a new system. Related, most providers also expose an **embeddings** endpoint that turns text into vectors; that's the engine behind semantic search and RAG, which we cover below.

## Prompting that works

The prompt is your programming interface to the model. A few reliable habits:

- **Put durable rules in the `system` message.** Persona, format, constraints, tone. Put the specific task and data in `user`.
- **Be specific about the output.** "Reply with a JSON object with keys `title` and `tags`" beats "give me some tags."
- **Show, don't just tell.** One or two examples ("few-shot") of input → desired output dramatically improve consistency for tricky formats.
- **Give the model an out.** Tell it what to do when it can't comply: "If the text has no clear action items, return an empty list." This reduces made-up answers.
- **Keep context lean.** Every token costs money and dilutes attention. Send what's relevant, not everything.

Prompting is empirical — write it, test it on real inputs, tighten it. Treat prompts like code: keep them in version control and review changes.

## Structured output you can trust

Free-form text is nice for humans and terrible for programs. When your code needs to *use* the model's output — store it, branch on it, render it — ask for **JSON**, and then **validate it**. The model can still return malformed or unexpected JSON, so never trust it blind: parse, validate against a schema (Zod/Pydantic from Module 03), and handle the failure.

```ts
import { z } from "zod";
import { chat } from "./llm";

const Extraction = z.object({
  title: z.string(),
  action_items: z.array(z.string()),
  sentiment: z.enum(["positive", "neutral", "negative"]),
});

export async function extract(note: string) {
  const raw = await chat(
    [
      {
        role: "system",
        content:
          "Extract structured data. Reply with ONLY a JSON object matching: " +
          '{ "title": string, "action_items": string[], "sentiment": "positive"|"neutral"|"negative" }. ' +
          "If there are no action items, use an empty array. No prose, no code fences.",
      },
      { role: "user", content: note },
    ],
    { temperature: 0 } // deterministic-ish for extraction
  );

  // The model is not a trusted source. Parse and validate.
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Model did not return valid JSON");
  }
  return Extraction.parse(parsed); // throws if the shape is wrong
}
```

Two safeguards, always: **temperature 0** for extraction, and **schema validation** on the way out. Many providers also offer a "JSON mode" or schema-constrained decoding that guarantees valid JSON — use it when available, but keep validating, because valid JSON isn't necessarily *correct* JSON.

## Streaming (a UX note)

Models generate token by token, so a long answer takes seconds. **Streaming** sends tokens to the client as they're produced, so the user sees text appear immediately instead of staring at a spinner. Mechanically, the API returns a stream (server-sent events) that you forward to the browser. It doesn't change *what* the model says — only how quickly the user starts seeing it. It's worth adding once your basic calls work; start without it.

## Tool calling: letting the model act

By itself a model can only produce text. **Tool calling** (a.k.a. function calling) lets it *do* things: you describe some functions (name, purpose, parameters); the model, instead of answering directly, can respond "call `get_weather` with `{city: 'Lisbon'}`"; your code runs the real function and hands the result back; the model uses it to answer. The model never runs your code — it *requests* a call, and you stay in control of what actually executes.

```ts
const tools = [
  {
    type: "function",
    function: {
      name: "search_notes",
      description: "Full-text search the user's notes. Returns matching titles and ids.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "words to search for" } },
        required: ["query"],
      },
    },
  },
];

// You send `tools` alongside `messages`. If the model decides to use one, the
// response contains a tool call instead of a final answer:
//   { role: "assistant", tool_calls: [{ function: { name: "search_notes",
//     arguments: '{"query":"quarterly budget"}' } }] }
// You then run the REAL function and append its result as a `tool` message,
// then call the model again so it can answer with the data.
```

This is the bridge from "chatbot" to "app that gets things done." And running that bridge in a loop is what makes an agent.

## The agent loop

An **agent** is a model in a loop: it *thinks*, optionally *acts* by calling a tool, *observes* the result, and repeats until the task is done. That's the entire idea — there's no magic beyond "call the model, run any tool it asks for, feed the result back, repeat."

```ts
import { chatWithTools, runTool } from "./llm"; // a chat() variant that returns tool calls

async function runAgent(userGoal: string, tools, toolImpls, maxSteps = 6) {
  const messages = [
    { role: "system", content: "You are a helpful assistant. Use tools when they help. " +
      "When you have enough information, give a final answer." },
    { role: "user", content: userGoal },
  ];

  for (let step = 0; step < maxSteps; step++) {   // ALWAYS bound the loop
    const reply = await chatWithTools(messages, tools);
    messages.push(reply);

    if (!reply.tool_calls || reply.tool_calls.length === 0) {
      return reply.content;                        // model gave a final answer — done
    }

    for (const call of reply.tool_calls) {         // act + observe
      const args = JSON.parse(call.function.arguments);
      const result = await runTool(toolImpls, call.function.name, args);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }
  return "Stopped: reached the step limit without finishing.";
}
```

The three habits that keep agents from becoming disasters:

- **Bound the loop.** Always cap the number of steps. A model that loops forever burns money and time.
- **Least privilege for tools.** Give the agent only the tools it needs, and make each tool enforce its own permissions (an agent acting for user 42 must only touch user 42's data — the auth scoping from Module 02 applies *inside* every tool).
- **Treat tool outputs, and the model, as untrusted.** Validate arguments before executing; never let a tool run arbitrary shell/SQL from model output; keep destructive actions behind confirmation.

Frameworks exist to help orchestrate agents, but the loop above *is* the concept. Build it by hand once and every framework will make sense.

## RAG in one section

Models don't know your private data or anything after their training cutoff, and stuffing everything into the prompt is expensive and hits the context limit. **Retrieval-Augmented Generation (RAG)** fixes this: retrieve the few relevant pieces of *your* data and put only those in the prompt.

The standard recipe:

1. **Chunk** your documents into passages.
2. **Embed** each chunk — turn it into a vector (a list of numbers capturing meaning) using an embeddings model.
3. **Store** the vectors in a vector index (a dedicated vector database, or a Postgres/SQLite extension — vendor-neutral either way).
4. At query time, **embed the user's question**, find the nearest chunks by vector similarity, and **inject** them into the prompt as context.
5. The model answers grounded in retrieved facts — and you can cite the sources.

RAG is how you build "chat with your docs," support bots, and internal knowledge tools. It reduces hallucination by giving the model real material to work from, and it keeps costs down by sending only what's relevant. A dedicated module goes deeper; for now, know the shape: **embed → store → retrieve → inject → generate.**

## Cost, latency, and safety

Three forces to keep in view from day one:

- **Cost.** You pay per token, input and output. Long prompts, long histories, and verbose outputs add up fast at scale. Trim context, cap `max_tokens`, cache repeated calls, and use a smaller/cheaper model where it's good enough (summarization and classification rarely need your biggest model).
- **Latency.** LLM calls take hundreds of milliseconds to many seconds. Stream to keep the UI responsive, run independent calls in parallel, and don't put a slow model call on a path that needs to be instant.
- **Safety and reliability.** The model can be wrong, biased, or manipulated. Never trust its output for consequential actions without validation or a human check. Beware **prompt injection**: if you feed the model untrusted text (a web page, a user's document), that text may contain instructions trying to hijack it — so keep the model's authority low, validate tool arguments, and don't let retrieved/user content silently override your system rules. Don't send secrets or another user's private data into a prompt. Respect your provider's usage policies, and be transparent with users that they're interacting with AI.

None of this is a reason not to build. It's the difference between a demo and something you'd responsibly put in front of real people.

## Hands-on exercise

Add an AI feature to your task tracker, then make it an agent.

1. **Provider-agnostic client.** Create `llm.ts` (or `llm.py`) that reads `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL` from the environment. Add matching entries to `.env.example`. Confirm you can swap the model by changing only the env var.
2. **A generation feature.** Add `POST /projects/:id/summary` that gathers the project's tasks and returns a short natural-language summary of what's outstanding. Use a low temperature.
3. **Structured output.** Add `POST /tasks/parse` that takes a free-text line like *"email the vendor about the overdue invoice by Friday"* and returns validated JSON `{ title, due_hint, priority }`. Validate with a schema; handle the case where the model returns bad JSON.
4. **A tool + an agent.** Define one tool, `search_tasks(query)`, that searches the current user's tasks. Build the bounded agent loop from this module so a user can ask *"what do I still owe the design team?"* and the agent searches, reads results, and answers. Cap it at a small number of steps, and make `search_tasks` enforce the `user_id` scope so the agent can never see another user's data.
5. **Cost awareness.** Log the approximate token usage (most APIs return a `usage` field) for each call so you can see what your feature costs.

The [`ai-app-starter`](../starter-kits/ai-app-starter/) kit gives you a runnable version of steps 1–2 to build on.

## Check yourself

1. **Why does every LLM request have to include the full conversation history?**
   The model is stateless — it has no memory between calls. Any context it needs (prior turns, retrieved facts, instructions) must be sent every time.

2. **What's the point of putting the LLM's endpoint, key, and model in environment variables?**
   It makes the app provider-agnostic: you can switch vendors or point at a self-hosted model by changing configuration, not code, and you keep secrets out of the source. It confines all vendor-specific knowledge to one client file.

3. **You asked the model for JSON and got back valid JSON with an unexpected extra field and a missing one. What should your code do?**
   Treat the model as untrusted: validate the parsed JSON against a schema and handle the failure (reject, retry, or fall back). Valid JSON isn't guaranteed to be correctly shaped or correct.

4. **In tool calling, who runs the tool — the model or your code? Why does that distinction matter for safety?**
   Your code runs it; the model only *requests* a call. That keeps you in control: you validate the arguments and enforce permissions before anything executes, so the model can't directly perform unsafe actions.

5. **Describe the agent loop in one sentence, and name one guardrail it must have.**
   Call the model, execute any tool it requests, feed the result back, and repeat until it produces a final answer — with a hard cap on the number of steps (and least-privilege, permission-scoped tools) as essential guardrails.

6. **What problem does RAG solve, and what are its five steps?**
   It grounds the model in your private or up-to-date data without exceeding the context window or cost budget: embed your documents, store the vectors, retrieve the most relevant chunks for a query, inject them into the prompt, and generate a grounded answer.

7. **Name two ways to reduce the cost of an AI feature without hurting quality much.**
   Trim the context you send and cap `max_tokens`; cache repeated calls; and use a smaller/cheaper model for easy tasks like classification or summarization (any two).

## What's next

Your app now stores data, authenticates users, serves an API, and does something genuinely AI-powered. The last step is to make it real for other people: [**05 — Deploy**](05-deploy.md) covers packaging, secrets in production, choosing a host, and the health checks and logging that keep it alive.
