# 05 — Deploy

> A project that only runs on your laptop isn't finished. This module takes your app the last mile: packaging it reproducibly, managing secrets in production, choosing a host without locking yourself in, and adding the health checks and logging that let you sleep at night. Deployment is where "it works for me" becomes "it works for everyone."

**Prerequisites:** Modules [01](01-data-and-storage.md)–[04](04-ai-and-agents.md). You should have an app with data, auth, an API, and an AI feature.

## Learning objectives

By the end of this module you will be able to:

- Distinguish the **build**, **run**, and **deploy** steps and configure an app purely through the environment.
- Manage **secrets** safely in production (never in the repo).
- **Package** an app reproducibly with a container (Docker) and know when you don't need one.
- Choose among common **hosting models** — PaaS, serverless, containers, VMs — with eyes open and no lock-in.
- Add a **health check**, structured **logging**, and basic **observability**.
- Follow a repeatable **deploy checklist** and set up simple **CI/CD**.

## The mental model: build, run, configure

A well-behaved app separates three things. Keep them straight and deployment gets simple; blur them and every environment behaves differently.

- **Build** — turn source into a runnable artifact (compile TypeScript, install dependencies, bundle the frontend). Happens once per version.
- **Run** — start the artifact. Same artifact everywhere: your laptop, staging, production.
- **Configure** — supply environment-specific values (database URL, `LLM_API_KEY`, port) *from the environment*, never baked into the artifact.

This is the heart of the widely used **twelve-factor** approach: **one build artifact, configured by the environment, running anywhere.** It's why Module 03 insisted that config and secrets come from environment variables — that discipline is what makes your app deployable at all. The same container image you tested is the one that runs in production; only the injected config differs.

## Secrets in production

You already keep secrets out of code and in a git-ignored `.env` locally (Modules 03–04). In production, **do not upload your `.env` file.** Instead, provide secrets through your host's mechanism:

- Every serious platform has a **secrets / environment-variables** manager in its dashboard or CLI. Set `LLM_API_KEY`, your session secret, and your database URL there.
- For anything larger, dedicated secret managers (HashiCorp Vault, cloud KMS/secret stores) inject secrets at runtime and support rotation and audit.

Rules that prevent the common disasters:

1. **A secret in git is a leaked secret** — even if you later delete it, it's in history. If it happens, **rotate the key immediately**; don't just remove the commit.
2. **Different secrets per environment.** Staging and production must not share an API key or database.
3. **Least privilege.** A key or database user should be able to do only what the app needs.
4. **Rotate periodically**, and immediately on any suspected exposure.

Verify before you ship: is `.env` in `.gitignore`? Does `git log -p` show any key you ever committed? Are production secrets set on the host, not in the image?

## Packaging with containers

Your app runs on your machine because your machine has the right Node version, the right libraries, the right OS packages. The server might not. A **container** (Docker being the standard) packages your app *with* its runtime and dependencies into a single image that runs identically anywhere Docker runs. It's the most reliable answer to "works on my machine."

A minimal `Dockerfile` for a Node/TypeScript service:

```dockerfile
# Build stage: install deps and compile
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci                      # reproducible install from the lockfile
COPY . .
RUN npm run build               # e.g. tsc → dist/

# Run stage: a lean image with only what's needed to run
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev           # production dependencies only
COPY --from=build /app/dist ./dist
EXPOSE 3000
# Secrets/config are injected at run time, NOT baked into the image:
#   docker run -p 3000:3000 --env-file .env myapp
CMD ["node", "dist/index.js"]
```

Two things to notice. The **multi-stage build** keeps build tools out of the final image, so it's smaller and has less attack surface. And **no secrets are copied in** — they arrive as environment variables at `docker run` / on the host. Add a `.dockerignore` (mirroring `.gitignore`) so `node_modules`, `.env`, and `.git` never enter the image.

You don't *always* need Docker — many platforms build from your source directly. But understanding containers means you can deploy almost anywhere and reproduce a bug locally that only appears in production.

## Choosing a host (without lock-in)

There's no single right answer; there are trade-offs. Here are the four common models, from least to most operational burden. All of these are offered by multiple vendors — pick on the merits, keep your app portable, and you can move later.

| Model | What you manage | Good for | Watch out for |
|-------|-----------------|----------|---------------|
| **PaaS** (platform-as-a-service) | Just your code/container | Most web apps; fastest path to live | Less control; pricing at scale |
| **Serverless functions** | Individual functions | Spiky/low traffic, event-driven, APIs | Cold starts; statelessness; per-vendor quirks |
| **Containers on a managed orchestrator** | Images + config | Teams needing control + scale | More moving parts to learn |
| **A plain VM** | The whole box | Full control; learning; special needs | *You* patch, secure, and monitor it |

Guidance for a first real deploy: **start with a PaaS or a serverless platform.** They get you to a public URL in minutes and handle TLS, scaling, and restarts for you. Graduate to containers/orchestration when you have a concrete reason (cost at scale, specific control).

**On lock-in:** the same habits that make this curriculum vendor-neutral protect you here. Because your app is configured through the environment, uses a standard runtime, and (optionally) ships as a portable container, moving hosts is a redeploy, not a rewrite. Keep provider-specific glue (the platform's build config, one deploy script) thin and at the edges. Prefer portable interfaces — a standard Postgres connection string over a proprietary data client, an env-var-driven LLM endpoint (Module 04) over a hard-wired SDK.

Whatever you pick: your app must **read its port from `process.env.PORT`** (hosts assign it), serve over **HTTPS** (nearly all PaaS/serverless do this automatically), and never assume a writable local disk persists — use a managed database for anything that must survive a restart.

### Custom domains and TLS

Your host gives you a default URL, but real apps run on their own domain. The shape of this is the same everywhere: in your DNS provider, point a record at the host — usually a **CNAME** for a subdomain (`app.example.com`) or the host's instructions for a root domain — then tell the platform which domain to expect. The platform provisions a **TLS certificate** (almost always free and automatic now, via Let's Encrypt or the host) so the site is served over HTTPS. DNS changes can take a little while to propagate. This is standard across providers, so a custom domain is another reason your app stays portable: the domain points wherever you aim the DNS record.

## Health checks

Hosts and load balancers need to know if your app is alive. Expose a tiny **health-check endpoint** that returns `200` when the app is up:

```ts
app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "ok", time: new Date().toISOString() });
});
```

Keep it cheap and dependency-light so it answers fast. If you want a *readiness* check (is the app ready to serve real traffic, including its database?), make a separate endpoint that pings the database — and return `503` if a critical dependency is down, so the platform stops routing traffic to a broken instance instead of serving errors.

## Logging and observability

When something breaks in production — and it will — logs are how you find out what and why. Two habits:

- **Log to standard output**, not to a local file. Hosts collect stdout/stderr automatically and let you search it. Writing to a local file on ephemeral infrastructure just loses the logs.
- **Log structured data** (JSON with fields), not bare strings. Structured logs are searchable and filterable; `console.log("something broke")` is not.

```ts
function log(level: string, message: string, extra: object = {}) {
  console.log(JSON.stringify({ level, message, time: new Date().toISOString(), ...extra }));
}

log("info", "note created", { userId: 42, noteId: 100 });
log("error", "llm call failed", { status: 500, provider: process.env.LLM_BASE_URL });
```

**Never log secrets or full personal data** — no API keys, no passwords, no raw request bodies that might contain them. As you grow, add the three pillars of observability: **logs** (what happened), **metrics** (how much/how fast — request rate, error rate, latency), and **traces** (the path of one request across services). For a first app, clean structured logs plus a health check are plenty.

## Continuous integration & delivery (CI/CD)

Deploying by hand is fine once; it's error-prone as a habit. **CI/CD** automates the path from commit to production so it's repeatable and boring (boring is good).

- **CI (Continuous Integration):** on every push/PR, automatically install, build, run the linter and tests. This catches breakage *before* it ships. Every major host (GitHub Actions and others) supports this.
- **CD (Continuous Delivery/Deployment):** when the main branch is green, automatically build the artifact and deploy it.

A minimal CI workflow does four things: check out the code, install dependencies, build, and test. Add deploy once you trust the tests. The payoff is that shipping stops being a scary manual ritual and becomes a merge.

## A deploy checklist

Run through this before every production deploy. Copy it into your project.

- [ ] Secrets are set on the host, and `.env` is git-ignored and never committed.
- [ ] The app reads **all** config (port, database URL, `LLM_API_KEY`) from the environment.
- [ ] Database **migrations** have run against the production database (Module 01).
- [ ] A **health-check** endpoint exists and returns `200`.
- [ ] The app serves over **HTTPS** and reads `PORT` from the environment.
- [ ] Logs go to **stdout** as structured JSON; no secrets or personal data in them.
- [ ] Tests pass in CI; the build produces a clean artifact.
- [ ] Error responses are generic to clients; full detail is logged server-side (Module 03).
- [ ] You know how to **roll back** to the previous version if this one is bad.
- [ ] Rate limiting / cost caps are in place on any LLM-backed endpoint (Module 04).

## Hands-on exercise

Take your task tracker from your laptop to the public internet.

1. **Configure through the environment.** Confirm the app reads `PORT`, the database URL, and `LLM_*` from env vars with no hard-coded values. Fix any that aren't.
2. **Containerize it.** Write a `Dockerfile` (multi-stage) and a `.dockerignore`. Build the image and run it locally with `--env-file .env`, confirming it behaves exactly as `npm run dev` did.
3. **Add a health check** at `/healthz` returning `200`, plus a readiness check that verifies the database connection.
4. **Structured logging.** Replace ad-hoc `console.log`s with a small structured logger writing JSON to stdout. Confirm no secret ever appears in a log line.
5. **Deploy** to a PaaS or serverless platform of your choice. Set your secrets in its dashboard/CLI. Run your migrations against the production database. Get a public HTTPS URL and load your app in a browser.
6. **Set up CI** that installs, builds, and runs your tests on every push.
7. **Walk the checklist** above and fix anything it catches.

**Stretch:** wire up CD so merging to `main` redeploys automatically, and practice a rollback to the previous version.

## Check yourself

1. **Why should the same build artifact run in every environment, with only configuration differing?**
   It guarantees that what you tested is what runs in production; differences come only from injected config, which eliminates a huge class of "works on my machine" bugs and makes deploys predictable and reversible.

2. **You discover an API key was committed to git three months ago but has since been deleted from the code. Are you safe? What do you do?**
   No — it's in the git history and must be considered compromised. Rotate (revoke and reissue) the key immediately; removing the commit is not enough.

3. **What problem does a container solve that just copying your source files does not?**
   It packages the app with its exact runtime and dependencies, so it runs identically regardless of what's installed on the host — solving environment drift and "works on my machine."

4. **Why log to standard output as structured JSON rather than to a local text file?**
   Hosts collect stdout/stderr automatically and let you search it, while local files on ephemeral infrastructure are lost on restart. Structured JSON is searchable and filterable; plain strings are not.

5. **What does a health-check endpoint let the platform do, and when should a readiness check return `503`?**
   It lets the platform detect whether an instance is alive and route traffic (or restart it) accordingly. A readiness check should return `503` when a critical dependency (like the database) is unavailable, so traffic stops going to a broken instance.

6. **A first-time deployer asks whether to start on a raw VM or a PaaS. What do you advise and why?**
   Start on a PaaS (or serverless): it handles TLS, scaling, restarts, and gets you to a public URL fast, so you focus on the app. Move to VMs/containers only when a concrete need (control, cost at scale) justifies the extra operational burden.

## What's next

You've built and shipped a full-stack AI application — data, auth, API, model, and deployment. That's the whole loop, and it's the foundation everything else builds on.

Where to go from here:

- **Deepen a layer.** Real RAG pipelines, evaluation and testing of AI outputs, streaming UIs, background jobs and queues, or caching.
- **Build for the hackathon.** Take the [`ai-app-starter`](../starter-kits/ai-app-starter/) kit and ship something of your own in a weekend.
- **Teach it back.** The fastest way to cement this is to explain it to someone else — and if you improve a lesson along the way, [contribute it back](../CONTRIBUTING.md).

Welcome to building with AI. You have the whole stack now.
