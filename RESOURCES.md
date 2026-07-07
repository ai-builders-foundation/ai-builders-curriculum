# Awesome AI Builders — Curated Resources

A short, curated list of free and open resources for learning to build AI applications end to end. This is a companion to the [curriculum](curriculum/) — use it to go deeper on any topic, or as a standalone reading list even if you never open a module here.

**Curation rules:** everything below is free (or has a genuinely usable free tier), real, and something we'd actually hand a friend. Quality over quantity — a handful of good links per section, not a hundred mediocre ones. Nothing here is sponsored, and a link doesn't imply an exclusive endorsement of one vendor over its competitors; where several free options exist, we've tried to list more than one.

---

## Foundations

- **[MDN Web Docs](https://developer.mozilla.org)** — the definitive, free reference for HTML, CSS, JavaScript, and HTTP. When in doubt, MDN has the answer.
- **[freeCodeCamp](https://www.freecodecamp.org)** — free, project-based curriculum covering web fundamentals through backend development, with certifications.
- **[The Odin Project](https://www.theodinproject.com)** — a free, open-source full-stack curriculum (JavaScript and Ruby tracks) built by its own community.
- **[CS50x (Harvard)](https://cs50.harvard.edu/x/)** — Harvard's free, self-paced introduction to computer science, open to anyone.
- **[SQLBolt](https://sqlbolt.com)** — free, interactive lessons for learning SQL by writing it.
- **[roadmap.sh](https://roadmap.sh)** — free, community-maintained learning roadmaps for backend, full-stack, and DevOps paths.

## Full-stack patterns

- **[The Twelve-Factor App](https://12factor.net)** — the short, canonical methodology behind config-via-environment and reproducible deploys (this curriculum's Module 05 draws directly on it).
- **[OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org)** — free, community-maintained security reference: authentication, session management, input validation, and more.
- **[MDN: HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP)** — the reference for methods, status codes, and headers underneath every API.
- **[RESTful API Tutorial](https://restfulapi.net)** — a practical reference for REST conventions and when to use which status code.
- **[Node.js documentation](https://nodejs.org/en/docs)** — official docs for the runtime this curriculum's starter kits are built on.
- **[jwt.io](https://jwt.io)** — the standard introduction and debugger for JSON Web Tokens.

## Working with LLMs & agents

- **[Hugging Face NLP Course](https://huggingface.co/learn/nlp-course)** — a free course on transformers, tokenization, and embeddings — the concepts underneath every LLM API, regardless of provider.
- **[Prompt Engineering Guide](https://www.promptingguide.ai)** — a free, provider-neutral, continually updated reference on prompting techniques.
- **[OpenAI Cookbook](https://github.com/openai/openai-cookbook)** — open-source example code for patterns (structured output, function calling, retrieval) that generalize well past a single vendor.
- **["Attention Is All You Need"](https://arxiv.org/abs/1706.03762)** — the original transformer paper, free on arXiv, for anyone who wants to go one level deeper than "it's an API."
- **[Simon Willison's blog](https://simonwillison.net)** — ongoing, practically-minded writing on LLMs, agents, and where they actually fail.
- **[LangChain docs](https://python.langchain.com)** and **[LlamaIndex docs](https://docs.llamaindex.ai)** — open-source frameworks worth knowing once you outgrow a hand-rolled agent loop like the one in Module 04.

## Deployment

- **[Docker documentation](https://docs.docker.com)** — official docs for packaging an app reproducibly into a container.
- **[Fly.io docs](https://fly.io/docs)**, **[Render docs](https://render.com/docs)**, and **[Railway docs](https://docs.railway.app)** — three free-tier-friendly PaaS options for hosting a small full-stack app without managing servers yourself.
- **[Let's Encrypt](https://letsencrypt.org)** — free, automated TLS certificates. There's no excuse for an unencrypted production app.

## Free tiers & tools

- **[Neon](https://neon.tech)** — serverless Postgres with a real free tier; a natural next step when you outgrow SQLite (Module 01).
- **[Turso](https://turso.tech)** — a SQLite-compatible serverless database with a free tier, if you'd rather stay in SQLite-land as you scale.
- **[Cloudflare R2](https://developers.cloudflare.com/r2)** — S3-compatible object storage with a free tier, for the "store files in an object store" half of Module 01.
- **[GitHub](https://github.com)** — free public and private repos, CI minutes via Actions, and free static hosting via Pages.
- **[VS Code](https://code.visualstudio.com)** — a free, open-source editor.
- **[HTTPie](https://httpie.io)** — a free, open-source command-line HTTP client for exercising the APIs you build in Module 03 (or just use `curl`).
- **[ngrok](https://ngrok.com)** — a free tier for exposing your localhost to the internet, useful for testing webhooks.

## Communities

- **[Hacker News](https://news.ycombinator.com)** — general tech and startup discussion; a good place to share what you've built.
- **[dev.to](https://dev.to)** — a free, open developer blogging and discussion community.
- **[Stack Overflow](https://stackoverflow.com)** — still the reference for "why is this exact error happening."
- **[r/webdev](https://www.reddit.com/r/webdev/)** — general web development questions and discussion.
- **[r/LocalLLaMA](https://www.reddit.com/r/LocalLLaMA/)** — an active community focused on open and local LLMs.
- **A local in-person meetup** — search [Meetup.com](https://www.meetup.com) for a web dev, AI, or hackathon group near you. Building alongside other people in a room is still one of the fastest ways to learn.

## Further reading

- **[Eloquent JavaScript](https://eloquentjavascript.net)** — a free, complete online book on modern JavaScript.
- **[You Don't Know JS](https://github.com/getify/You-Dont-Know-JS)** — a free, open-source book series that goes deep on how JavaScript actually works.
- **[The System Design Primer](https://github.com/donnemartin/system-design-primer)** — a free, extremely popular open-source guide to designing large-scale systems, for when you're ready to think past a single server.
- **[Julia Evans' blog](https://jvns.ca)** — free, friendly, deeply technical posts on how computers, networks, and debugging actually work.
- **[Paul Graham's essays](https://paulgraham.com/articles.html)** — free essays on building things and building companies, useful well beyond the code.
- **[arXiv.org](https://arxiv.org)** — free access to the CS and ML papers behind almost everything in Module 04.

---

Know a resource that belongs here? [Open a PR](CONTRIBUTING.md) — this list is community-maintained, same as everything else in this repository.

Maintained by the [AI Builders Foundation](https://aibuildershq.org), a 501(c)(3) nonprofit. Back to [README](README.md).
