# Weekly Product Review Pulse

**A repeatable, MCP-delivered weekly insight report that turns public app store reviews for fintech products into a one-page narrative for product, support, and leadership teams.**

> **Document type:** Project context / problem statement
> **Status:** Active build
> **Owner:** Harsh (Product)
> **Last updated:** _add date_

---

## 1. TL;DR

The Weekly Product Review Pulse is an automated agent that ingests public Apple App Store and Google Play reviews for selected fintech products, clusters and ranks the feedback, and uses an LLM to produce a concise one-page report of **themes → verbatim quotes → action ideas**. The report is appended to a single running Google Doc per product and announced via a short Gmail teaser with a deep link back to that section.

The defining architectural constraint: **all human-visible delivery happens through MCP (Model Context Protocol) servers** — the agent writes to Google Docs and sends Gmail through dedicated MCP servers, never through ad-hoc Google API calls embedded in the agent. This keeps credentials, delivery logic, and reasoning cleanly separated.

**Supported products (initial):** INDMoney, Groww, PowerUp Money, Wealth Monitor, Kuvera.

---

## 2. The problem

Product, support, and leadership teams all want to know the same thing every week: *what are customers actually saying about our app?* The signal exists — it sits in plain sight in App Store and Play Store reviews — but turning it into something usable is manual, inconsistent, and easy to drop.

Today that work looks like:

- Someone manually scrolls through store reviews when they remember to.
- Findings get pasted into one-off spreadsheets or Slack messages that nobody can find later.
- There's no shared system of record, so trends across weeks are invisible.
- Different teams read the same reviews and walk away with different (or no) conclusions.

The result is that **customer voice is available but not operationalized.** Recurring complaints take too long to surface, roadmap conversations lack evidence, and leadership has no lightweight, trustworthy health snapshot tied to real users.

### Why now / why this matters
Store reviews are one of the highest-signal, lowest-cost sources of unsolicited customer feedback. The cost of *gathering* them is near zero; the cost of *synthesizing them reliably and repeatably* is what's missing. Automating the synthesis (not just the scraping) is the actual product.

---

## 3. Who this helps

| Audience | Job to be done | Value delivered |
|---|---|---|
| **Product** | "When I plan the roadmap, I want to know which problems recur most across real users, so I can prioritize with evidence." | Prioritize roadmap from recurring, ranked themes instead of anecdotes. |
| **Support** | "When I look at this week's reviews, I want to spot repeating complaints and quality regressions early, so I can get ahead of ticket volume." | Cluster and surface repeating complaints and emerging quality issues. |
| **Leadership** | "When I check on a product, I want a fast, trustworthy health snapshot in customer language, so I don't have to dig." | A one-page, customer-voice health snapshot, delivered on schedule. |

The report explicitly closes with a short **"who this helps"** section so each reader knows which parts are aimed at them.

---

## 4. Objective

Give product, support, and leadership teams a **repeatable weekly snapshot** of what customers are saying in store reviews — themes, representative quotes, and actionable ideas — **without manual copy-paste or one-off spreadsheets**, and with a permanent, searchable history.

### Goals
1. Replace manual review-reading with a scheduled, repeatable weekly process.
2. Produce output that is concise (one page) and immediately actionable.
3. Maintain a single, durable system of record per product so trends are visible over time.
4. Keep every quote and theme **traceable back to real review text** — no fabrication.
5. Deliver through MCP servers so the agent never holds Google credentials or owns delivery logic.

---

## 5. What the system does (end to end)

### 5.1 Ingest
Pull public reviews from the **last 8–12 weeks** (configurable rolling window), per product, from both sources:
- **Apple App Store** — via the iTunes customer-reviews RSS feed.
- **Google Play** — via a scraper-based ingestion module.

### 5.2 Reason (cluster + summarize)
- Embed review text and apply **density-based clustering** (e.g. UMAP for dimensionality reduction + HDBSCAN for clustering) to group related feedback.
- Rank clusters by significance (volume, recency, severity signal).
- Use an **LLM to name each theme, pull verbatim quotes, and propose action ideas.**
- Apply **quote validation**: every quote in the output must appear in real, scrubbed review text. Quotes that can't be matched are dropped.

### 5.3 Render
Produce a concise **one-page narrative** containing:
- **Top themes** (named, ranked)
- **Real user quotes** (validated verbatim)
- **Action ideas** (concrete, mapped to themes)
- A short **"who this helps"** section

The report is rendered in two structured forms: one optimized for the **Google Doc** (append-as-section) and one as **HTML/text** for the Gmail teaser.

### 5.4 Deliver (MCP only)
- **Google Docs MCP** — append each week's report as a **new dated section** to a single running document per product (e.g. *Weekly Review Pulse — Groww*). This Doc is the **system of record** and preserves full history.
- **Gmail MCP** — send a short stakeholder email: a teaser (e.g. top themes as bullets) plus a **"Read full report" deep link** to that week's heading in the Doc — **not** a duplicate full report in the email.

---

## 6. Architecture & separation of concerns

The agent is an **MCP host/client**. It orchestrates reasoning but **does not embed Google credentials and does not call the Docs/Gmail REST APIs directly for delivery.** OAuth secrets live in the MCP servers' configuration, not in the agent codebase.

| Concern | Where it lives |
|---|---|
| **Data retrieval** | Ingestion modules (App Store RSS + Play Store scraper) |
| **Reasoning** | Clustering (UMAP + HDBSCAN) + LLM summarization (themes, quotes, actions) |
| **Output generation** | Report + email rendering (structured for Docs; HTML/text for Gmail) |
| **Human-visible delivery** | MCP tools only → Google Docs MCP + Gmail MCP |

**Why this matters (PM rationale):** keeping delivery behind MCP servers means the agent's reasoning layer can evolve independently of how/where output is published, credentials are centralized and auditable, and the same pattern can extend to other Workspace surfaces later without re-plumbing the agent.

---

## 7. Key requirements

### Functional
- **MCP-based delivery.** Append to the shared Google Doc and send Gmail only via the respective MCP servers' tools (document batch update; draft/create/send flows as defined in architecture).
- **Weekly cadence.** Designed to run once per product per week (e.g. scheduled Monday morning IST), with a **CLI for backfill of any ISO week**.
- **Idempotent runs.** Re-running the same product + ISO week must **not** create duplicate Doc sections or duplicate sends. Enforced via a **stable section anchor** in the Doc and a **run-scoped idempotency check** on email.
- **Auditable.** Each run records delivery identifiers (e.g. Doc heading / message IDs) and enough metadata to answer *"what was sent, when, for which week?"*

### Non-functional — safety & quality
- **PII scrubbing** on review text **before** it reaches the LLM and **before** publishing.
- **Reviews are treated as data, not instructions** (prompt-injection resistance — review text cannot redirect the agent).
- **Cost/token limits per run** to keep spend bounded and predictable.
- **Quote fidelity** — validation ensures no quote appears in the report unless it exists in real review text.

---

## 8. Scope

### In scope
- Docs append + Gmail send/draft, exactly as the pulse needs.
- Apple App Store + Google Play as review sources.
- The five initial fintech products.

### Non-goals (explicit)
- A generic Google Workspace product beyond what the pulse needs (Docs append + Gmail send/draft).
- Real-time streaming analytics or a BI dashboard — **the running Google Doc is the living artifact.**
- Social sources (Twitter/X, Reddit, etc.) in the initial scope.
- Storing Google OAuth secrets in the agent codebase — they belong in the MCP servers' configuration.

---

## 9. Delivery expectations (stakeholder-facing)

- Each run adds **one clearly labeled, dated/week-labeled section** to the product's pulse Google Doc.
- The email is a **brief teaser** (e.g. top themes as bullets) plus a **"Read full report" link** to that section.
- Development/staging may default to **draft-only email** until explicit confirmation to send, per the implementation plan.

---

## 10. Success metrics (suggested)

> These aren't in the original brief — adding them strengthens the portfolio framing. Tune before publishing.

**Adoption / usage**
- % of stakeholders who open the weekly email (open rate on the teaser).
- Click-through rate on the "Read full report" deep link.
- Number of products with an active, up-to-date pulse Doc.

**Quality / trust**
- Quote validation pass rate (quotes retained vs. dropped) — proxy for output fidelity.
- Manual correction rate: how often a human edits a theme/action after delivery.
- Idempotency: zero duplicate sections / duplicate sends across re-runs.

**Outcome / impact**
- Number of roadmap or support actions that cite a Pulse theme as evidence.
- Time-to-surface for a recurring complaint vs. the old manual process.

---

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Scraper breakage / source changes (esp. Play Store) | Modular ingestion; fail loudly; allow partial runs with source-level reporting. |
| LLM hallucinates quotes or themes | Mandatory quote validation against real text; drop unmatched quotes. |
| Prompt injection via review text | Treat reviews strictly as data; never as instructions. |
| Duplicate publishing on re-run | Stable Doc section anchors + run-scoped idempotency checks. |
| Cost overrun | Per-run token/cost ceilings. |
| PII exposure | Scrub before LLM and before publish. |
| Accidental over-sending in dev | Draft-only default in staging until explicit send confirmation. |

---

## 12. Sample output (illustrative)

> **Groww — Weekly Review Pulse**
> **Period:** Last 8–12 weeks (rolling window)
>
> **Top themes**
> 1. **App performance & bugs** — Lag, crashes during trading hours; login/session timeouts.
> 2. **Customer support friction** — Slow responses; unresolved tickets.
> 3. **UX & feature gaps** — Confusing navigation for portfolio insights; missing advanced analytics.
>
> **Real user quotes**
> - "The app freezes exactly when the market opens, very frustrating."
> - "Support takes days to reply and doesn't solve the issue."
> - "Good for beginners but lacks detailed analysis tools."
>
> **Action ideas**
> 1. **Stabilize peak-time performance** — Scale infra during market hours; improve crash visibility.
> 2. **Improve support SLA visibility** — Expected response time in-app; ticket status tracking.
> 3. **Enhance power-user features** — Advanced portfolio analytics; clearer investments navigation.
>
> **What this solves**
> Same intent as today — roadmap alignment for product, issue clustering for support, and a leadership-friendly snapshot — now automated, archived in Google Docs, and announced by email with a link back to the canonical section.

---

## 13. Open questions / future considerations

- Should theme taxonomy be stabilized across weeks (so "support friction" is the same bucket every week and trendable), or re-derived each run?
- Cross-product / competitive view: is there value in a combined leaderboard across the five products?
- Severity weighting: should low-star recent reviews count more heavily in ranking?
- Expansion path: which Workspace surface (Sheets for trend tables, Chat for alerts) comes after Docs + Gmail, if any?
- Source expansion: when do social sources become worth the added noise?

---

_This document is the living context reference for the project. Keep architecture and requirements sections in sync with implementation; treat the Google Doc per product as the system of record for actual weekly output._