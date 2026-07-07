# AI Builders Curriculum

**Learn to build and ship a real, full-stack AI application.** Five short modules and two runnable starter kits take you from an empty folder to a deployed app with a database, real user accounts, an API, and an AI feature — free, open source, and taught with a vendor-neutral stack so the skills transfer no matter which tools you end up using.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Free Forever](https://img.shields.io/badge/price-free%20forever-success.svg)](#)
[![Vendor Neutral](https://img.shields.io/badge/stack-vendor--neutral-informational.svg)](#)
[![Nonprofit](https://img.shields.io/badge/made%20by-a%20501c3%20nonprofit-orange.svg)](https://aibuildershq.org)

---

## Build this in a weekend

Two small, readable starter kits — each a complete app, not a toy demo. Clone one and it's running locally in about a minute, with **no API key required** to try it.

### 🗒️ `ai-app-starter` — a full-stack AI app

A notes app with a database, an HTTP/JSON API, and an LLM-powered **Summarize** button.

```bash
git clone https://github.com/ai-builders-foundation/ai-builders-curriculum.git
cd ai-builders-curriculum/starter-kits/ai-app-starter
npm install && npm start
```

Open **http://localhost:3000**, write a note, click **Summarize**, and watch the backend call a language model. It ships in offline demo mode by default, so this works with zero configuration — point it at any OpenAI-compatible endpoint later by editing three environment variables. Nothing else in the code changes.

### 📚 `rag-starter` — a "chat with your docs" app

Paste in text, ask a question, and get an answer grounded in *only* what you pasted — with the exact source chunk cited.

```bash
cd ../rag-starter        # from the same clone, or start fresh
npm install && npm start
```

Open **http://localhost:3000** and ask *"What are the five steps of RAG?"* — the answer comes back grounded in a sample document that's seeded automatically, with the retrieved chunk shown as a source. Again, no API key needed to see it work end to end.

Both kits are small enough to read in one sitting — plain Node.js, SQLite, no framework, no build step — and are the concrete, runnable version of the curriculum below.

## The learning path

**📦 Data → 🔐 Auth → 🔌 Functions/APIs → 🤖 AI & Agents → 🚀 Deploy**

| # | Module | You'll learn to… |
|---|--------|------------------|
| 01 | [Data & Storage](curriculum/01-data-and-storage.md) | Model data, choose a database, write schema & migrations, query safely |
| 02 | [Auth & Users](curriculum/02-auth-and-users.md) | Hash passwords, run sessions, protect routes, understand OAuth & roles |
| 03 | [Functions & APIs](curriculum/03-functions-and-apis.md) | Build HTTP endpoints, validate input, handle errors, design a clean API |
| 04 | [AI & Agents](curriculum/04-ai-and-agents.md) | Call an LLM behind an env var, get structured output, use tools, run an agent loop |
| 05 | [Deploy](curriculum/05-deploy.md) | Package the app, manage secrets, ship to a host, add health checks & logging |

Each module: **learning objectives → explanation with worked examples → hands-on exercise → "Check yourself."** Budget one module per evening, or two per weekend.

Looking for more free material on any of this? See **[RESOURCES.md](RESOURCES.md)** — a curated list of the best free resources for each topic above.

## Who it's for

- **Self-learners** who can write a little code and want to build a real AI app end to end.
- **Educators & bootcamps** who want an open, adaptable syllabus to teach from directly — it's MIT, fork it.
- **Hackathon organizers** who want a shared, runnable baseline so participants spend the weekend building, not configuring.

**Prerequisites:** basic programming (variables, functions, loops), a terminal, and Node.js 18+. No prior AI, backend, or deployment experience needed — that's what this teaches.

## Get involved

⭐ **Star this repo if it's useful — it helps other builders find it.**

🤝 PRs are genuinely welcome: a fixed typo, a clearer explanation, a new exercise, a translation, or a whole new module or starter kit. Start with [CONTRIBUTING.md](CONTRIBUTING.md).

<details>
<summary>Repository layout</summary>

```
ai-builders-curriculum/
├── README.md
├── RESOURCES.md                  ← curated list of free/open learning resources
├── LICENSE                       ← MIT
├── CONTRIBUTING.md               ← how to propose and submit changes
├── CODE_OF_CONDUCT.md            ← Contributor Covenant
├── SECURITY.md                   ← how to report a vulnerability
├── funding.json                  ← FLOSS/fund manifest
├── curriculum/                   ← the five modules
│   ├── 01-data-and-storage.md
│   ├── 02-auth-and-users.md
│   ├── 03-functions-and-apis.md
│   ├── 04-ai-and-agents.md
│   └── 05-deploy.md
└── starter-kits/
    ├── ai-app-starter/           ← runnable full-stack AI app
    └── rag-starter/              ← runnable "chat with your docs" app
```

</details>

---

Maintained by the **[AI Builders Foundation](https://aibuildershq.org)**, a 501(c)(3) public charity (EIN 42-1986706), whose mission is to educate and support AI builders through free courses, community events, and open source. This repository is those three pillars as code — free forever, with no paid tier and no lock-in to any platform, including our own.

[MIT License](LICENSE) · [Code of Conduct](CODE_OF_CONDUCT.md) · [Security Policy](SECURITY.md) · [hello@aibuildershq.org](mailto:hello@aibuildershq.org)
