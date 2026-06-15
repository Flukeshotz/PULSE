# Weekly Product Review Pulse

**A repeatable, automated intelligence platform that turns public app store reviews for fintech products into a one-page narrative for product, support, and leadership teams.**

> **Document type:** Project context / problem statement
> **Status:** Completed Build
> **Owner:** Harsh (Product)

---

## 1. TL;DR

The Weekly Product Review Pulse is an automated agent that ingests public Apple App Store and Google Play reviews for selected fintech products, clusters and ranks the feedback, and uses an LLM to produce a concise dashboard of **themes → verbatim quotes → action ideas**. 

Rather than sending emails or pasting into Google Docs, the system generates a rich, interactive **React Dashboard** to display theme rankings, historical trends, and statistically validated quotes.

**Supported products:** INDMoney, Groww, PowerUp Money, Wealth Monitor, Kuvera.

---

## 2. The problem

Product, support, and leadership teams all want to know the same thing every week: *what are customers actually saying about our app?* The signal exists — it sits in plain sight in App Store and Play Store reviews — but turning it into something usable is manual, inconsistent, and easy to drop.

The result is that **customer voice is available but not operationalized.** Recurring complaints take too long to surface, roadmap conversations lack evidence, and leadership has no lightweight, trustworthy health snapshot tied to real users.

---

## 3. Who this helps

| Audience | Job to be done | Value delivered |
|---|---|---|
| **Product** | "When I plan the roadmap, I want to know which problems recur most across real users, so I can prioritize with evidence." | Prioritize roadmap from recurring, ranked themes instead of anecdotes. |
| **Support** | "When I look at this week's reviews, I want to spot repeating complaints and quality regressions early, so I can get ahead of ticket volume." | Cluster and surface repeating complaints and emerging quality issues. |
| **Leadership** | "When I check on a product, I want a fast, trustworthy health snapshot in customer language, so I don't have to dig." | A one-page, customer-voice health snapshot, delivered on schedule. |

---

## 4. Objective

Give product, support, and leadership teams a **repeatable weekly snapshot** of what customers are saying in store reviews — themes, representative quotes, and actionable ideas — **without manual copy-paste or one-off spreadsheets**, and with a permanent, searchable history.

### Goals
1. Replace manual review-reading with a scheduled, repeatable weekly process.
2. Produce output that is concise and immediately actionable.
3. Maintain a single, durable system of record per product so trends are visible over time.
4. Keep every quote and theme **traceable back to real review text** — no fabrication.

---

## 5. What the system does (end to end)

### 5.1 Ingest
Pull public reviews from the **last 8–12 weeks**, per product, from:
- **Apple App Store**
- **Google Play**

### 5.2 Reason (cluster + summarize)
- Apply **density-based clustering** (UMAP + HDBSCAN) to group related feedback.
- Rank clusters by significance (volume, severity signal).
- Use an **LLM to name each theme, pull verbatim quotes, and propose action ideas.**

### 5.3 Validate (Zero Hallucination Guarantee)
- Apply **quote validation**: every quote in the output must mathematically match real, scrubbed review text (RapidFuzz).
- Apply **semantic relevance scoring**: the LLM scores each quote (0-3). Irrelevant quotes are dropped.
- Apply **summary validation**: the LLM verifies its own summary against the proven quotes.

### 5.4 Render & Track
Produce a concise **JSON report** containing:
- **Top themes** (named, ranked, trend-tracked)
- **Real user quotes** (validated verbatim)
- **Action ideas** (concrete, mapped to themes)

The frontend **React Dashboard** natively loads this output into an interactive UI for stakeholders to read.