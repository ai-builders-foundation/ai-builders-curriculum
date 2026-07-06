# Security Policy

The AI Builders Curriculum is open teaching material: an MIT-licensed curriculum plus
**starter kits that learners clone, adapt, and deploy.** Because those templates get copied
into real projects, we take their security seriously — a weakness in a starter kit can be
replicated across every fork.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately, one of two ways:

1. **GitHub private advisory** — use the repository's **Security → Report a vulnerability**
   tab (GitHub private vulnerability reporting). This is preferred.
2. **Email** — [hello@aibuildershq.org](mailto:hello@aibuildershq.org) with the subject
   line `SECURITY: <short summary>`.

Please include: what you found, where (file / starter kit / endpoint), how to reproduce,
and the impact you think it has. A minimal proof of concept helps us confirm quickly.

## What to expect

We are a small, all-volunteer nonprofit, so we set expectations honestly:

- **Acknowledgement:** we aim to reply within **5 business days**.
- **Assessment:** we'll confirm the issue, agree on severity, and share a rough fix timeline.
- **Fix + disclosure:** we'll fix in a private branch, then publish the fix and credit you
  (unless you prefer to stay anonymous). We favor coordinated disclosure and will agree a
  timeline with you rather than impose one.

## Scope

**In scope**
- The curriculum content and code samples in this repository.
- The **starter kits** under `starter-kits/` — their server code, dependencies, and the
  security patterns they teach (auth handling, secret management, input validation, etc.).

**Out of scope**
- Vulnerabilities that require a learner to have already misconfigured their own deployment
  in a way the kit's docs warn against.
- Third-party services or model providers a learner chooses to plug in — the kits are
  provider-agnostic; secure use of any specific vendor is that vendor's responsibility.
- Findings in a learner's own fork after they've modified it.

## A note for learners deploying a starter kit

The starter kits are **teaching templates, not hardened production systems.** Before you
deploy one for real: rotate every example secret, set real environment variables (never
commit `.env`), put the app behind TLS, and review the auth and input-validation code for
your use case. Each kit's README calls out its known limitations — read it first.

---

*Maintained by the [AI Builders Foundation](https://aibuildershq.org), a 501(c)(3) nonprofit.
Everything here is free and MIT-licensed.*
