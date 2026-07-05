# Contributing to the AI Builders Curriculum

Thank you for helping teach the next generation of AI builders. This is an open educational resource maintained by the [AI Builders Foundation](https://aibuildershq.org), and it gets better every time someone who found a lesson confusing, incomplete, or out of date takes the time to fix it.

You do not need to be an expert to contribute. If you learned from this material, you are qualified to improve it.

## Ways to contribute

All of these are valuable, roughly in order of how easy they are to start with:

- **Report a problem.** Open an issue for anything that's wrong, unclear, broken, or out of date — a code sample that doesn't run, a confusing explanation, a dead link, a factual error.
- **Improve an existing lesson.** Fix a typo, tighten an explanation, add a clarifying diagram, or add a worked example.
- **Add an exercise or a "Check yourself" question.** More practice is almost always welcome.
- **Translate a module** into another language.
- **Contribute a starter kit** — a new runnable scaffold for a different kind of AI app.
- **Propose a new module** for the curriculum spine.

## Ground rules for content

The curriculum has a specific character. Please keep contributions aligned with it.

1. **Vendor-neutral.** Teach concepts and patterns that transfer across stacks. Use widely available, standard tools (plain TypeScript/Node, Python, SQL, HTTP) and a provider-agnostic LLM pattern that reads its endpoint and key from environment variables. Do **not** tie lessons to a single commercial platform, framework, or model vendor. It's fine to *mention* named tools as examples ("e.g. PostgreSQL, SQLite, or MySQL"); it's not fine to make a lesson only work with one of them.
2. **Teach, don't just show.** A learner should come away understanding *why*, not only *what to type*. Explain the concept before the code. Prefer a small, correct, runnable example over a large abstract one.
3. **Accurate and current.** Verify that code samples actually run on the stated prerequisites (Node.js 18+, etc.). If you reference a fast-moving detail (a model capability, an API shape), keep it generic enough to age well.
4. **Warm and plain.** Write for a motivated beginner. Short sentences, concrete examples, no gatekeeping and no hype. Avoid emoji-heavy or filler prose.
5. **Self-contained modules.** Each module states its own learning objectives and ends with an exercise and a "Check yourself" section. Keep that structure.

## Module structure

If you add or substantially rewrite a module, follow the established shape so the curriculum stays consistent:

```markdown
# NN — Module Title

> One-sentence summary of what this module gives the learner.

## Learning objectives
- Bulleted, verb-first, checkable outcomes.

## <Concept sections>
Explanation, with worked examples and code snippets.

## Hands-on exercise
A concrete build task the reader does themselves.

## Check yourself
Questions (with brief answers or answer sketches) that confirm understanding.

## What's next
One or two lines pointing to the next module.
```

## Style guide

- **Markdown:** one `#` H1 per file; sentence-case headings; fenced code blocks with a language tag (```ts, ```python, ```sql, ```bash).
- **Code:** small and runnable. Include imports. Prefer clarity over cleverness. Add a comment where a beginner would otherwise be lost, but don't over-comment obvious lines.
- **Secrets:** never hard-code an API key, password, or token in an example — read it from an environment variable and show a matching `.env.example` entry.
- **Line length:** wrap prose at natural sentence boundaries; don't hard-wrap at a fixed column.
- **Links:** use relative links between files in this repo so they work on any fork.

## Pull request process

1. **Fork** the repository and create a branch with a descriptive name, e.g. `fix/module-02-session-typo` or `feat/starter-kit-python`.
2. **Make your change.** Keep each PR focused on one thing — a single lesson, a single fix, a single kit. Small PRs get reviewed faster.
3. **Check your work:**
   - Read your prose out loud once. If a sentence is hard to say, it's hard to read.
   - Run any code you added or changed and confirm it works on Node.js 18+ (or the stated runtime).
   - Confirm internal links still resolve.
4. **Open the PR** with a clear title and a description that explains *what* changed and *why*. If it addresses an open issue, reference it (`Closes #123`).
5. **Review.** A maintainer will read it, possibly suggest changes, and merge once it fits. We aim to give a first response within a week. Please be patient — this is run by a small nonprofit and volunteers.

By contributing, you agree that your contribution is licensed under the repository's [MIT License](LICENSE).

## Proposing something big

For a whole new module, a new starter kit, or a structural change, please **open an issue first** describing your idea before you write it. That lets us agree on scope and placement so your work doesn't collide with someone else's or get lost. A short proposal now saves a large rewrite later.

## Getting help

Stuck, or not sure whether an idea fits? Open a [discussion or issue](https://github.com/ai-builders-foundation/ai-builders-curriculum/issues), or email [hello@aibuildershq.org](mailto:hello@aibuildershq.org). We're glad you're here.
