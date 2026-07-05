# AI Builders Curriculum

An open, vendor-neutral curriculum that takes you from zero to a deployed full-stack AI application — plus hackathon starter kits you can clone and ship in a weekend.

Maintained by the [**AI Builders Foundation**](https://aibuildershq.org), a 501(c)(3) public charity (EIN 42-1986706). Free forever, MIT-licensed, and built to be cloned, remixed, and taught by anyone.

---

## Why this exists

Most people who want to build with AI get stuck in the same place: not on the model, but on everything *around* the model. Where does the data live? How do users log in? How does the frontend talk to the backend? How do you actually put a working thing on the internet?

This curriculum teaches the whole loop — data, auth, functions/APIs, model and agent integration, and deployment — as **transferable concepts and patterns**, not as a tour of one company's product. Every lesson uses a plain, widely available stack (TypeScript/Node, a little Python, standard SQL, HTTP) and a **provider-agnostic LLM pattern**, so the skills carry across whatever tools, frameworks, and model vendors you end up using.

It is the teaching material behind the Foundation's free hackathons and cohorts. It is also completely self-serve: you do not need to attend anything to use it.

## Who it's for

- **Self-learners** who can write a little code and want to build a real AI app end-to-end.
- **Educators and bootcamps** looking for an open, adaptable syllabus they can teach from directly.
- **Hackathon organizers** who need starter kits and a shared baseline so participants spend the weekend building, not configuring.

**Prerequisites:** basic programming (variables, functions, loops), comfort in a terminal, and Node.js 18+ installed. You do *not* need prior AI, backend, or deployment experience — that's what this teaches.

## The learning path

The curriculum is a spine. Each module builds on the last, and together they form one complete application: a small AI app with stored data, real user accounts, an API, a model-backed feature, and a public deployment.

| # | Module | You'll learn to… |
|---|--------|------------------|
| 01 | [Data & Storage](curriculum/01-data-and-storage.md) | Model data, choose a database, write schema and migrations, query safely |
| 02 | [Auth & Users](curriculum/02-auth-and-users.md) | Hash passwords, run sessions, protect routes, understand OAuth and roles |
| 03 | [Functions & APIs](curriculum/03-functions-and-apis.md) | Build HTTP endpoints, validate input, handle errors, design a clean API |
| 04 | [AI & Agents](curriculum/04-ai-and-agents.md) | Call an LLM behind an env var, get structured output, use tools, run an agent loop |
| 05 | [Deploy](curriculum/05-deploy.md) | Package the app, manage secrets, ship to a host, add health checks and logging |

Each module contains: **learning objectives → explanation with worked examples → a hands-on exercise → a "Check yourself" section** so you can confirm you actually got it.

Alongside the reading, the [`starter-kits/`](starter-kits/) directory gives you runnable scaffolding.

## How to use this

### If you're a self-learner

1. Read the modules in order, starting with [01 — Data & Storage](curriculum/01-data-and-storage.md).
2. Type the worked examples yourself; don't just read them.
3. Do the exercise at the end of each module before moving on.
4. When you reach Module 04, open the [`ai-app-starter`](starter-kits/ai-app-starter/) kit and connect the model.
5. Finish with Module 05 and put your app on the internet.

Budget roughly a focused weekend per two modules, or one module per evening.

### If you're an educator

- Fork or clone the repo and teach directly from `curriculum/`. It's MIT-licensed — adapt freely.
- Each module maps to about one 90-minute session plus homework (the exercise).
- The "Check yourself" sections double as quick formative assessments.
- Swap in your preferred database, framework, or model provider — the concepts are written to survive substitution. If you improve a lesson, please [contribute it back](CONTRIBUTING.md).

### If you're a hackathon organizer

- Point participants at [`starter-kits/ai-app-starter`](starter-kits/ai-app-starter/) as the shared baseline so everyone starts from a running full-stack AI skeleton instead of a blank folder.
- Assign Modules 01–04 as pre-reading; run the event against the kit.
- The kit's LLM client reads a provider and key from environment variables, so you can standardize on whatever model API your sponsors or budget dictate without rewriting anyone's code.

## How this maps to the Foundation's mission

The AI Builders Foundation's mission is to **educate and support AI builders** through free courses, community events, and open source. This repository is those three pillars expressed as code:

- **Courses** — the `curriculum/` modules.
- **Events** — the `starter-kits/` used to run free hackathons and cohorts.
- **Open source** — all of it, MIT-licensed and public, so the public good compounds instead of expiring.

Everything here is given away. There is no paid tier, no upsell, and no lock-in to any commercial platform — including the Foundation's own.

## Repository layout

```
ai-builders-curriculum/
├── README.md                     ← you are here
├── LICENSE                       ← MIT
├── CONTRIBUTING.md               ← how to propose and submit changes
├── CODE_OF_CONDUCT.md            ← Contributor Covenant
├── funding.json                  ← FLOSS/fund manifest
├── curriculum/                   ← the lessons
│   ├── 01-data-and-storage.md
│   ├── 02-auth-and-users.md
│   ├── 03-functions-and-apis.md
│   ├── 04-ai-and-agents.md
│   └── 05-deploy.md
└── starter-kits/
    └── ai-app-starter/           ← runnable full-stack AI app skeleton
```

## Contributing

This is a living, community-maintained resource, and contributions are genuinely welcome — a fixed typo, a clearer explanation, a new exercise, a translation, or a whole new module or starter kit. Start with [CONTRIBUTING.md](CONTRIBUTING.md), and note that participation is governed by our [Code of Conduct](CODE_OF_CONDUCT.md).

If you're not sure where to start, open an issue describing what confused you as a learner. That feedback is one of the most valuable contributions there is.

## License

Released under the [MIT License](LICENSE). Copyright © AI Builders Foundation. You may use, adapt, teach, and redistribute this material — including commercially — with attribution.

## Contact

- Web: [aibuildershq.org](https://aibuildershq.org)
- Email: [hello@aibuildershq.org](mailto:hello@aibuildershq.org)

Built in the open by the AI Builders Foundation and its contributors.
