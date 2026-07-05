# 02 — Auth & Users

> The moment your app has more than one user, you need to answer two questions on every request: *who is this?* (authentication) and *are they allowed to do this?* (authorization). Getting these wrong is how data leaks. This module teaches you to do them correctly with standard tools — no magic, no vendor lock-in.

**Prerequisites:** [Module 01 — Data & Storage](01-data-and-storage.md). Basic HTTP familiarity helps but isn't required.

## Learning objectives

By the end of this module you will be able to:

- Distinguish **authentication** from **authorization** and know which one a bug belongs to.
- Choose your app's default **access posture** (open to the public vs. gated behind login).
- Store passwords safely by **hashing** them with a slow, salted algorithm — and explain why you never store the password itself.
- Implement a signup/login flow and issue a **session**.
- Offer **passwordless (magic link)** login, **email verification**, and **password reset**.
- Compare **session cookies** and **JWTs** (and **refresh tokens**) and choose between them deliberately.
- Protect a route so only a logged-in user can reach it, and enforce **row-level, owner-scoped** access to data.
- Explain what **OAuth** does and when to use "Log in with X" instead of passwords.
- Add simple **role-based access control (RBAC)**.

## Two words that sound alike and aren't

- **Authentication (authn):** proving *who* you are. Logging in. "This request is from user 42."
- **Authorization (authz):** deciding *what* you may do. "User 42 may read note 100 because they own it; they may **not** read note 200, which belongs to user 43."

Almost every serious security incident is an authorization failure: the system correctly knew who you were, but let you touch something that wasn't yours. Keep the two ideas separate in your head, because they're fixed in different places in the code.

## Your app's default posture: open or gated

Before wiring up any login, decide the app's **default access posture**, because it determines what an *unauthenticated* request is allowed to do:

- **Public by default** — anonymous visitors can read (and maybe write) some things. A blog, a public catalog, a landing page. You then gate the *specific* actions that require an account.
- **Authenticated by default** — nothing is accessible without logging in. A dashboard, an internal tool, most SaaS apps. Every request must carry a valid identity or it's rejected.

Pick deliberately and make it the default in one place (your middleware), rather than remembering to protect each new route by hand — forgetting one is how data leaks. A good rule: **default to gated, and open up only what you consciously decide should be public.** It's far safer to accidentally over-protect than to accidentally expose. Note that even a "public" posture doesn't mean unprotected data — public read of *some* rows still requires per-row rules, which we get to below.

## Storing passwords: the one rule

**Never store a password.** Not in plain text, not encrypted-so-you-can-decrypt-it. If your database is ever leaked — and databases leak — every stored password is exposed, and because people reuse passwords, you've endangered their other accounts too.

Instead, store a **hash**. A password hash is a one-way function: easy to compute forward (password → hash), practically impossible to reverse (hash → password). At login you hash the submitted password and compare it to the stored hash. You verify the password without ever keeping it.

But not any hash. Use a **password-hashing algorithm** built to be *slow* and *salted*: **bcrypt**, **scrypt**, or **argon2**. Two properties matter:

- **Salt:** a random value mixed into each password before hashing, stored alongside the hash. It means two users with the same password get different hashes, and it defeats precomputed "rainbow table" attacks. Good libraries generate and manage the salt for you.
- **Deliberate slowness (work factor):** these algorithms are tuned to take a meaningful fraction of a second. That's invisible to a real user logging in once, but it makes brute-forcing billions of guesses economically hopeless. Fast, general-purpose hashes like plain SHA-256 are the *wrong* tool here precisely because they're fast.

### Worked example: hashing at signup, verifying at login

Using the widely available `bcrypt` library (the same pattern applies to argon2):

```ts
import bcrypt from "bcrypt";

const COST = 12; // work factor; higher = slower = harder to brute-force

// --- at signup ---
export async function createUser(db, email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, COST); // salt handled internally
  const info = db
    .prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
    .run(email, passwordHash);
  return { id: info.lastInsertRowid, email };
}

// --- at login ---
export async function verifyLogin(db, email: string, password: string) {
  const user = db
    .prepare("SELECT id, email, password_hash FROM users WHERE email = ?")
    .get(email);

  // Always run a compare even when the user doesn't exist, so an attacker
  // can't tell "no such user" from "wrong password" by timing the response.
  const ok = user
    ? await bcrypt.compare(password, user.password_hash)
    : await bcrypt.compare(password, "$2b$12$invalidinvalidinvalidinvalidinv");

  if (!ok || !user) return null;
  return { id: user.id, email: user.email };
}
```

Note the two habits baked in: we never keep the plaintext, and we don't reveal whether an email exists via different behavior or timing.

This means adding a `password_hash TEXT NOT NULL` column to the `users` table from Module 01.

## Sessions: staying logged in

HTTP is **stateless** — each request arrives with no memory of the last. After a user logs in, how does the *next* request know it's still them? You issue a **session**.

The shape is always the same:

1. User submits correct credentials.
2. Server creates a session identifier — a long, random, unguessable token.
3. Server sends that token back to the browser, which stores it (usually in a cookie).
4. On every later request, the browser sends the token; the server looks up who it belongs to.
5. Logout (or expiry) invalidates the token.

There are two common ways to carry the session.

### Option A: server-side session + cookie

Store session records in your database (or a fast store), keyed by a random id. Put that id in a cookie. Each request, you look the id up to find the user.

```ts
import crypto from "crypto";

export function startSession(db, userId: number) {
  const token = crypto.randomBytes(32).toString("hex"); // 256 bits of randomness
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  db.prepare(
    "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)"
  ).run(token, userId, expiresAt);
  return token;
}

export function userForToken(db, token: string) {
  return db
    .prepare(
      `SELECT u.id, u.email FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > datetime('now')`
    )
    .get(token);
}
```

Set the cookie with the security flags that matter:

```ts
res.setHeader(
  "Set-Cookie",
  `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`
);
```

- **`HttpOnly`** — JavaScript in the page can't read the cookie, which blunts token theft via cross-site scripting.
- **`Secure`** — the cookie is only sent over HTTPS.
- **`SameSite=Lax`** — the browser won't send the cookie on most cross-site requests, mitigating cross-site request forgery (CSRF).

**Upside:** you can revoke a session instantly (delete the row). **Downside:** you must store and look up sessions.

### Option B: stateless token (JWT)

A **JSON Web Token** packs the user's identity into a signed string. The signature (made with a secret only your server knows) lets you *verify* the token without storing anything — if the signature checks out and it hasn't expired, you trust the claims inside.

**Upside:** no session store; scales trivially across servers. **Downside:** you can't easily revoke one before it expires (it's valid until then), so keep lifetimes short and pair long-lived logins with a refresh mechanism.

The common fix is a **two-token** scheme: a short-lived **access token** (minutes) that authorizes each request, plus a long-lived **refresh token** (days/weeks, stored securely and revocable) whose only job is to mint fresh access tokens. If an access token leaks, it expires almost immediately; the refresh token, which you *can* revoke, controls whether the session continues. This buys back most of the revocation you lose with stateless tokens.

> **Which to choose?** For most apps, **server-side sessions with a secure cookie are the simpler, safer default** — instant revocation and fewer footguns. Reach for JWTs when you specifically need stateless verification across many services. Either way: the token must be long, random or signed, sent over HTTPS, and expiring.

## Beyond passwords: magic links, verification, and reset

Passwords aren't the only way to prove identity, and a real app needs a few more flows. All of them rest on the *same* primitive you already know: a **long, random, single-use, time-limited token** that you email to the user and check when they come back. Learn the primitive once and these flows are variations on it.

- **Magic-link (passwordless) login.** The user enters their email; you generate a token, store it with a short expiry, and email a link containing it. Clicking the link hits your server, which verifies the token (unexpired, unused), marks it used, and starts a session — no password ever involved. Upside: nothing to store, forget, or breach. Downside: login is only as secure as the user's email account, and it depends on email delivery.
- **Email verification.** At signup, generate a token, store it, and email a confirmation link. Until the user clicks it, mark their account unverified and limit what it can do. This proves they control the address and blocks throwaway/typo signups.
- **Password reset.** "Forgot password" generates a short-lived, single-use token emailed to the address on file; the reset page accepts the token plus a new password, verifies the token, updates the *hash*, and invalidates the token (and ideally existing sessions).

Three rules keep these flows safe:

1. **Tokens are single-use and short-lived** (minutes to an hour). Mark them used the moment they're redeemed so a leaked link can't be replayed.
2. **Don't leak who has an account.** "If that email exists, we've sent a link" — regardless of whether it does — so an attacker can't probe your user list.
3. **Send over HTTPS, store only the token's hash** if you can (same reasoning as passwords), and rate-limit the request endpoints so no one can spam a victim's inbox or brute-force a code.

Sending the emails themselves is a job for a transactional email provider (any of several); the auth logic above is provider-independent.

## Protecting a route

Authorization lives in **middleware** — a function that runs before your handler and can reject the request. The pattern: read the token, resolve the user, attach it to the request, or return `401 Unauthorized`.

```ts
export function requireAuth(db) {
  return (req, res, next) => {
    const token = parseCookie(req.headers.cookie)?.session;
    const user = token && userForToken(db, token);
    if (!user) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ error: "Not authenticated" }));
    }
    req.user = user; // now downstream handlers know who's calling
    next();
  };
}
```

Now — and this is the part beginners miss — **authorization is not the same as authentication**. Being logged in doesn't mean you may touch *this specific row*. Always scope data access to the current user:

```ts
// GOOD: the query itself refuses to return another user's note.
app.get("/notes/:id", requireAuth(db), (req, res) => {
  const note = db
    .prepare("SELECT * FROM notes WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.id);          // ← scoped to the owner
  if (!note) return res.status(404).json({ error: "Not found" });
  res.json(note);
});
```

Compare with the broken version that only checks *authentication*:

```ts
// BROKEN: any logged-in user can read any note by guessing an id.
app.get("/notes/:id", requireAuth(db), (req, res) => {
  const note = db.prepare("SELECT * FROM notes WHERE id = ?").get(req.params.id);
  res.json(note);   // leaks other users' data — a classic "IDOR" vulnerability
});
```

The fix costs one `AND user_id = ?`. That habit — always scope queries to the authenticated user — prevents an entire class of the most common real-world breaches (called *insecure direct object reference*, IDOR).

## Authorization at the data layer: row-level security

Scoping every query to `req.user.id` by hand works, but it has a weakness: it's only as good as your memory. Add a new endpoint, forget the `AND user_id = ?`, and you've opened a hole. In an app with many tables and many queries — especially a **multi-tenant** app where different customers' data shares the same tables — you want the guarantee to live somewhere you *can't* forget it.

That's the idea behind **row-level security (RLS)**: authorization enforced at the **data layer** rather than scattered through application code. Instead of each query remembering to filter by owner, you attach a **policy** to the table that says, in effect, "a user may only see or modify rows they own," and the database applies it to *every* query automatically. Even a query that forgot its `WHERE` clause returns only the caller's rows.

Concretely, in a database that supports it (PostgreSQL is the common example), you:

1. Tell the database **who the current user is** for this request — typically by setting a request-scoped variable to the authenticated user's id.
2. Enable RLS on a table and define a policy that compares each row's `user_id` to that current-user value.

```sql
-- Enable row-level security on the table
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Policy: a row is visible/modifiable only if its owner matches the current user.
-- (current_user_id() here reads a value your app set per-request from the session.)
CREATE POLICY notes_owner_only ON notes
  USING (user_id = current_user_id())          -- which rows can be read/updated/deleted
  WITH CHECK (user_id = current_user_id());     -- what new/updated rows are allowed
```

Now the database itself refuses to return another user's note, no matter what the query says. The `USING` clause governs which existing rows are visible; the `WITH CHECK` clause prevents a user from *inserting* or *updating* a row into someone else's ownership.

**The general principle transfers to any stack**, even ones without built-in RLS: put your authorization guarantee as close to the data as you can, and make "only the owner" the default that code has to actively opt out of — not a filter every query must remember to add. Whether you enforce it with database policies or a single shared data-access layer that every query goes through, the goal is one place to get right instead of a hundred places to get wrong. Application-level scoping (`AND user_id = ?`) and data-layer RLS aren't rivals — defense in depth means using both.

## OAuth and "Log in with X"

Sometimes you don't want to handle passwords at all. **OAuth 2.0** lets a user log in through a provider they already trust (Google, GitHub, and others). At a high level:

1. Your app redirects the user to the provider.
2. The user authenticates *there* and consents to share basic identity with you.
3. The provider redirects back with a short-lived code.
4. Your server exchanges that code (using your app's secret) for the user's verified identity.
5. You create or look up a local user record and start your own session as usual.

**Why use it:** you never see or store passwords; users skip creating another account; you inherit the provider's security (2FA, breach detection). **What to know:** you depend on that provider, and you still run your own sessions and authorization afterward — OAuth handles *authentication*, not *authorization* inside your app. Don't hand-roll the crypto; use a maintained OAuth client library for your language.

## Roles: authorization at scale

As apps grow, "can this user do this?" gets more nuanced than "do they own the row?" **Role-based access control** assigns each user a role and gates actions by role.

```ts
// add a `role TEXT NOT NULL DEFAULT 'member'` column to users
export function requireRole(role: string) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      res.statusCode = 403; // Forbidden: authenticated, but not allowed
      return res.end(JSON.stringify({ error: "Insufficient permissions" }));
    }
    next();
  };
}

app.delete("/admin/users/:id", requireAuth(db), requireRole("admin"), handler);
```

Note the status codes: **401** means "I don't know who you are" (authn); **403** means "I know who you are, and you may not do this" (authz). Using the right one is both correct and a debugging aid.

## Hands-on exercise

Extend the task tracker from Module 01 with real accounts.

1. Add `password_hash` to `users`, and create a `sessions` table (`token`, `user_id`, `expires_at`).
2. Build **signup**: validate the email, reject weak/empty passwords, hash with bcrypt or argon2, insert the user. Handle the "email already taken" case gracefully.
3. Build **login**: verify the password against the hash, start a session, set a `HttpOnly; Secure; SameSite=Lax` cookie.
4. Build **logout**: delete the session row and clear the cookie.
5. Write a `requireAuth` middleware and protect the task routes with it.
6. Make the app **gated by default**: `requireAuth` runs on everything except signup/login, so a new route is protected unless you consciously open it.
7. Make **every** task/project query scoped to `req.user.id` so no user can read or modify another user's data. Then try to break it: log in as user A and attempt to fetch user B's task by id. You should get a 404. Write down where you'd move this guarantee to the data layer (a shared query helper, or database row-level policies) so a forgotten `WHERE` can't leak data.
8. Build a **password-reset** flow: a `reset_tokens` table (token, user_id, expires_at, used), a "request reset" endpoint that emails (or, for the exercise, logs) a single-use link, and a "complete reset" endpoint that verifies the token and updates the hash. Make the request endpoint respond identically whether or not the email exists.
9. Add a `role` column and an admin-only route guarded by `requireRole("admin")`.

**Stretch:** add **magic-link** login (reuse the single-use-token primitive from the reset flow, but start a session on success), and "Log in with GitHub" via a maintained OAuth library — both creating a local user on first login and reusing your existing session flow afterward.

## Check yourself

1. **A logged-in user fetches `/notes/999`, which belongs to someone else, and it works. Is this an authentication or an authorization bug?**
   Authorization. The system correctly authenticated the user; it failed to check that they're *allowed* to access that specific note. Fix by scoping the query with `AND user_id = ?`.

2. **Why is SHA-256 a poor choice for hashing passwords, when bcrypt/argon2 are good?**
   SHA-256 is fast and unsalted by default, which makes mass brute-forcing cheap. Password hashers are deliberately slow and salted, making guessing attacks economically infeasible.

3. **What does the `HttpOnly` cookie flag protect against, and what does `SameSite` protect against?**
   `HttpOnly` stops page JavaScript from reading the session token (mitigating theft via XSS). `SameSite` stops the browser from sending the cookie on cross-site requests (mitigating CSRF).

4. **Give one advantage and one disadvantage of JWTs versus server-side sessions.**
   Advantage: stateless — no session store, easy to verify across many servers. Disadvantage: hard to revoke before expiry, so a leaked token stays valid until it times out.

5. **What does OAuth handle for you, and what does it *not* handle?**
   It handles authentication (verifying identity through a trusted provider) so you never store passwords. It does not handle authorization inside your app — you still run your own sessions and permission checks.

6. **When should you return `401` versus `403`?**
   `401 Unauthorized` when the request isn't authenticated (unknown user). `403 Forbidden` when the user is authenticated but not permitted to perform the action.

7. **What is row-level security, and why is it safer than remembering to add `AND user_id = ?` to every query?**
   RLS enforces authorization at the data layer: a policy attached to the table filters every query by the current user automatically. It's safer because the guarantee lives in one place the database always applies, so a query that forgets its owner filter still can't leak another user's rows.

8. **Magic-link login, email verification, and password reset all rely on the same primitive. What is it, and what two rules keep it safe?**
   A long, random, single-use, time-limited token emailed to the user and checked on return. Keep it short-lived and mark it used immediately (no replay), and don't reveal whether an account exists for a given email.

9. **Your app is a private dashboard. What default access posture should it have, and how do you implement that default?**
   Authenticated by default (gated): apply the auth middleware to everything and open up only the specific routes (signup, login) that must be public — so a newly added route is protected automatically rather than by remembering to protect it.

## What's next

Users can log in and their data is protected. Now let's build the surface the frontend talks to: [**03 — Functions & APIs**](03-functions-and-apis.md) covers HTTP, REST, input validation, error handling, and designing endpoints that are a pleasure to consume.
