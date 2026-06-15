# Edge Cases — Weekly Product Review Pulse

**Companions:** `problem-statement.md` · `architecture.md` · `implementation.md`
**Current scope:** **INDMoney only**
**Status:** Active build
**Owner:** Harsh (Product)
**Last updated:** _add date_

---

## 0. How to use this document

This is the exhaustive catalog of things that can go wrong, organized by the components in `architecture.md`. Each row states the **scenario**, the **risk if unhandled**, the **expected handling**, and a **severity**. Use it to write tests (it maps onto `implementation.md §9`), to define "done" for each phase, and to avoid the silent failures that erode trust in an automated report.

### Severity legend
| Level | Meaning |
|---|---|
| 🔴 **Critical** | Can publish wrong/unsafe content, leak data, double-send, or corrupt the system of record. Must be handled before any real delivery. |
| 🟠 **High** | Breaks a run or degrades output quality materially. Handle before prod (Phase 5). |
| 🟡 **Medium** | Degrades quality or operability; acceptable to log + continue short-term. |
| ⚪ **Low** | Cosmetic or rare; document and revisit. |

### The non-obvious ones to read first (most likely to bite you)
1. 🔴 **PII vs quote-validation tension.** Quotes must be *published scrubbed* but still maintain fidelity to the original review. Resolution: Validate the candidate quote against the `text` field (which is already PII-scrubbed at ingestion), ensuring a perfect apples-to-apples comparison. `raw_text` is completely removed from the pipeline early to guarantee zero PII leakage to disk or memory.
2. 🔴 **Ledger-loss re-send.** Doc idempotency is enforced **server-side** (`section_exists`), but email idempotency relies on the **local run ledger**. If a run appends the Doc, then crashes before writing the ledger, a re-run sees the Doc section (skips append) but finds no email record (and may re-send). Resolution: write a "delivery intent" ledger entry **before** sending, and/or have Gmail MCP support a dedupe key.
3. 🔴 **Partial delivery.** Doc append succeeds, email send fails (or vice versa). The week is half-delivered. Resolution: order operations Doc-first, treat email as retryable, record per-step status, and make the re-run resume the missing step only.
4. 🟠 **Quote-as-instruction / unsafe verbatim.** A review may contain a phishing URL, abusive language, or a prompt-injection string that, if surfaced verbatim in a leadership Doc/email, is harmful. Resolution: strip/relativize URLs, flag abusive content, and keep reviews-as-data hardening end-to-end (not just at the LLM step).

---

## 1. Ingestion — general (all sources)

| Scenario | Risk | Expected handling | Severity |
|---|---|---|---|
| Zero reviews in the window | Empty report; misleading "no issues" | Produce a clearly-labeled "no new reviews this week" section; do not fabricate themes | 🟠 |
| A source hard-fails (timeout, 5xx, parse error) | Whole run could crash | Typed `SourceError`; isolate; `status="partial"`; report which sources are missing | 🔴 |
| Rate limited (429) | Incomplete/blocked fetch | Backoff + retry with cap; on exhaustion treat as source failure (partial run) | 🟠 |
| Pagination stops early / continuation token expires | Silent under-fetch (looks like fewer reviews) | Detect truncation; log fetched-vs-expected; mark window partially covered | 🟠 |
| Very high volume (thousands of reviews) | Cost/latency blow-up; clustering slow | Cap per-source record count (configurable) with newest-first; record that a cap was applied | 🟠 |
| Window boundary / timezone ambiguity | Reviews near the edge included/excluded inconsistently | Define window in a single canonical tz (UTC); document inclusive/exclusive boundary | 🟡 |
| Non-English / mixed-locale reviews | Poor clustering + odd theme names | Keep but tag locale; optionally filter or translate (decision); note in `brain/` | 🟡 |
| Malformed/unexpected payload shape | Crash or silent bad data | Schema-validate raw payloads; skip + log unparseable records | 🟠 |
| Network offline at run time | Run produces nothing | Fail fast with clear error; scheduler retries; record `status="failed"` | 🟠 |

---

## 2. Ingestion — App Store (iTunes RSS)

| Scenario | Risk | Expected handling | Severity |
|---|---|---|---|
| RSS feed empty for country `in` | No App Store data | Treat as empty source; log; continue | 🟡 |
| HTTP 403 / 503 from feed | Source failure | Retry/backoff → partial run if persistent | 🟠 |
| Review has no rating field | Null rating breaks assumptions | `rating` is already nullable in schema; handle gracefully | 🟡 |
| HTML entities / encoding in review body (`&amp;`, `&#39;`) | Garbled text + quote-match failures later | Decode entities at normalization; preserve decoded form in `text` | 🟠 |
| Emoji-only or punctuation-only review | Useless embedding; noise | Min-content filter (drop or down-weight) | 🟡 |
| Multiple country feeds enabled | Cross-feed duplicates | Dedup by `review_id`; restrict to configured countries | 🟡 |
| Feed schema/namespace change | Parser breaks | Schema-validate; fail loudly as source error | 🟠 |

---

## 3. Ingestion — Google Play (scraper)

| Scenario | Risk | Expected handling | Severity |
|---|---|---|---|
| Package name wrong / app not found | Zero data, looks like quiet week | Validate package on startup; hard error if not found (not silent empty) | 🔴 |
| Scraper library breaks on layout/API change | Recurring silent failure | Typed error; partial-run path; **fixtures in CI** so breakage is caught | 🔴 |
| Blocked / CAPTCHA / bot detection | Cannot fetch | Do **not** attempt CAPTCHA solving; treat as source failure; alert | 🟠 |
| Continuation token expires mid-fetch | Truncated set | Detect and mark partial; retry from start within limits | 🟠 |
| Developer replies interleaved with reviews | Replies treated as user reviews | Filter to user reviews only at adapter level | 🟠 |
| Reviews truncated by source ("Full review") | Quote validation fails on truncated text | Fetch full text where possible; else validate against what was actually retrieved | 🟡 |
| Locale/region leakage | Non-IN reviews included | Constrain to configured locale; tag others | 🟡 |
| Language segregation | Dropping local language reviews | Google Play strict feed segregation by `lang`. Scraper explicitly loops over `['en', 'hi']` to avoid English-only bias | 🔴 |

---


## 5. Normalization & canonical schema

| Scenario | Risk | Expected handling | Severity |
|---|---|---|---|
| Missing `created_at` | Window filtering + recency ranking break | Drop record or default conservatively; log | 🟠 |
| Same item re-ingested across runs | Duplicate `Review`s | Stable `review_id` hash dedup | 🟠 |
| Hash collision on `review_id` | Wrong dedup, lost review | Use sufficiently wide hash of `(source, native_id)`; near-zero risk | ⚪ |
| Non-UTF-8 / invalid bytes | Crash or mojibake | Normalize encoding at boundary; replace/skip invalid | 🟠 |
| `raw_text` vs `text` confusion | PII leak (publishing raw) or broken validation | Enforce: `raw_text` is entirely deleted at ingestion. All validation and processing uses the scrubbed `text` field | 🔴 |
| Extremely short text (1 word/emoji) | Noise; useless embedding | Min-length filter. However, track sentiment count (pos/neg/neu) and include as volume context in the report | 🟡 |
| Extremely long text | Embedding/token cost | Truncate to a max length for embedding; | 🟡 |
| Source-specific field leaks downstream | Coupling; brittle code | Normalizer is the only place that knows sources; downstream sees only `Review` | 🟠 |

---

## 6. PII scrubbing

| Scenario | Risk | Expected handling | Severity |
|---|---|---|---|
| Obfuscated PII ("name at gmail dot com", spaced phone) | Under-scrubbing → leak | Patterns cover common obfuscations; review test corpus | 🔴 |
| International phone formats (+91, spaces, dashes) | Missed numbers | Locale-aware phone patterns | 🟠 |
| Over-scrubbing brand/common words mistaken for names | Loses meaning; mangles quotes | Conservative name detection; allowlist product/brand terms | 🟠 |
| PII inside a quote that passes validation | Published PII in Doc/email | Scrub the validated quote before render; re-check mapping (see §0.1) | 🔴 |
| Scrubbing alters text so quote no longer "verbatim" | Valid quote dropped or mismatched | Validate against scrubbed `text`, render scrubbed; treat scrub as the canonical published form | 🟠 |
| PII appears in an LLM-generated **theme name** | Leak via theme, not quote | Scrub LLM outputs too, not just inputs | 🔴 |
| Names that are also usernames/handles | Partial scrubbing | Handle (@) stripping + name heuristics | 🟡 |

---

## 7. Embedding & clustering (UMAP + HDBSCAN)

| Scenario | Risk | Expected handling | Severity |
|---|---|---|---|
| Too few reviews to cluster (n < min) | UMAP/HDBSCAN error or meaningless clusters | Fallback: skip clustering, summarize flat list or emit "insufficient data" section | 🟠 |
| HDBSCAN labels everything noise (`-1`) | No themes | Lower `min_cluster_size` fallback or report top reviews ungrouped; flag low-confidence | 🟠 |
| One giant cluster | Single uninformative theme | Sub-cluster or cap cluster size; tune params | 🟡 |
| All reviews near-identical (spam/copy-paste) | Fake "theme" dominance | Dedup near-duplicates before clustering | 🟡 |
| Embedding API failure mid-batch | Partial embeddings | Retry; on failure abort reasoning cleanly (don't deliver partial themes) | 🟠 |
| Embedding model changed between runs | Dimension mismatch / incomparable | Pin model in config; invalidate cache on change | 🟠 |
| Non-determinism despite fixed seed | Irreproducible runs | Pin `random_state`; document residual nondeterminism; assert in tests | 🟡 |
| Multilingual reviews cluster by language not topic | Misleading themes | Optional translate-to-English before embedding (decision) | 🟡 |
| `n_neighbors` > n_samples (UMAP) | Hard error | Guard params against sample count | 🟠 |

---

## 8. LLM summarization

| Scenario | Risk | Expected handling | Severity |
|---|---|---|---|
| Malformed/invalid JSON output | Parse failure | Strict schema parse; one bounded retry with repair prompt; else abort with reason | 🟠 |
| LLM invents quotes not in cluster | Fabrication | Quote validator drops them (§9); never publish unvalidated | 🔴 |
| Prompt injection in review text | Agent hijack | Reviews delimited as data; system prompt forbids instruction-following; test fixture | 🔴 |
| LLM safety filter refuses on review content | Empty/blocked theme | Handle refusal gracefully; skip theme; log | 🟡 |
| Cluster too large for context window | Truncation / error | Chunk or sample representative reviews per cluster | 🟠 |
| Cost/token ceiling hit mid-summarization | Partial report | Abort cleanly **before** delivery; record reason; do not ship half a report | 🔴 |
| API timeout / rate limit / outage | Run fails | Retry/backoff; on failure `status="failed"`, no delivery | 🟠 |
| Duplicate/near-identical theme names | Confusing report | De-dupe/merge themes post-hoc | 🟡 |
| Empty themes returned | Blank report | Fallback "no clear themes" section | 🟡 |
| Offensive/abusive verbatim surfaced in action ideas | Harmful leadership-facing content | Content filter on outputs; neutralize tone in action ideas | 🟠 |

---

## 9. Quote validation

| Scenario | Risk | Expected handling | Severity |
|---|---|---|---|
| Quote is a paraphrase, not verbatim | Fabrication slips through | Reject; require match against scrubbed `text` | 🔴 |
| Whitespace/case/punctuation differences | False negative (real quote dropped) | Normalize (collapse whitespace, casefold, strip trailing punct) before compare | 🟠 |
| Quote concatenates two reviews | Misattributed quote | Reject multi-review spans; must map to one review | 🟠 |
| Quote matches but in a different review than cited | Wrong attribution | Validate against the cluster's reviews; attach correct source/url | 🟡 |
| Emoji/special chars normalize differently | False negative | Unicode-normalize both sides before compare | 🟡 |
| All quotes for a theme dropped | Theme with no evidence | Keep theme but flag "no quotable evidence" or drop theme per policy | 🟠 |
| Quote is essentially the entire review (very long) | Bloated report / copyright-ish | Length cap on quotes | 🟡 |
| Validated quote contains PII/URL | Leak in published quote | Scrub + de-link the validated quote before render (§6, §0.1) | 🔴 |

---

## 10. Rendering (Docs blocks + email teaser)

| Scenario | Risk | Expected handling | Severity |
|---|---|---|---|
| Report has zero themes | Empty/confusing Doc section | Render explicit "no themes this week" with counts | 🟠 |
| Theme has zero valid quotes | Evidence-free claim | Render theme without quotes + a note, or omit per policy | 🟡 |
| Special chars / markup in text break Docs blocks | Malformed section | Escape/sanitize before building blocks | 🟠 |
| Very long report | Doc bloat; email too long | Cap top-N themes/quotes; teaser stays short by design | 🟡 |
| Deep link unavailable (append failed) | Email links nowhere | Don't send email if Doc append failed (ordering); see §11 | 🔴 |
| Email HTML stripped by some clients | Broken teaser | Always include plain-text alternative | 🟡 |
| Non-ASCII in subject/body | Encoding issues | UTF-8 throughout; test with emoji/Indic scripts | 🟡 |
| Anchor/heading text collides with existing heading | Wrong deep link target | Use stable unique anchor `indmoney-{iso_week}` (not display text) | 🟠 |

---

## 11. MCP delivery — Google Docs

| Scenario | Risk | Expected handling | Severity |
|---|---|---|---|
| `find_or_create_doc` races → two docs | Split system of record | Idempotent create keyed by product; lock or check-first | 🟠 |
| `section_exists` stale (says no, but exists) | Duplicate section | Server-side anchor check authoritative; re-verify after append | 🔴 |
| `append_section` partially succeeds (heading yes, blocks no) | Corrupt/half section | Make append atomic on server; on failure, retry idempotently by anchor | 🔴 |
| MCP server down / unreachable | No delivery | Retry/backoff; `status="failed"`; no email sent | 🟠 |
| MCP auth/token expired | Delivery fails | Surface auth error from server; re-auth flow (in server, not agent) | 🟠 |
| Human deleted the Doc between runs | Append target missing | `find_or_create_doc` recreates; note history reset in audit | 🟡 |
| Doc write permission revoked | Server can't write | Clear error; alert; no fabricated success | 🟠 |
| Doc hits Google size/element limit | Append rejected eventually | Detect; rotate to a new Doc (e.g. yearly) or archive policy | 🟡 |
| Concurrent runs append same week | Duplicate sections | Anchor idempotency + run-level lock | 🔴 |
| Deep link returned malformed/empty | Email link broken | Validate link before using; fail the email step if absent | 🟠 |

---

## 12. MCP delivery — Gmail

| Scenario | Risk | Expected handling | Severity |
|---|---|---|---|
| Send succeeds but `message_id` not returned | Idempotency record incomplete | Treat as sent-uncertain; record best-effort; dedupe key on server | 🟠 |
| Draft created, ledger write fails | Orphan draft + re-draft next run | Write delivery-intent before action; reconcile orphans | 🟠 |
| Doc appended but email send fails | Half-delivered week | Email is retryable; re-run resumes email-only (§0.3) | 🔴 |
| Email sent twice (ledger race / lost ledger) | Stakeholder spam; trust hit | Run-scoped idempotency + server dedupe key (§0.2) | 🔴 |
| `send_email: true` in staging by mistake | Unintended real send | Draft-only default; explicit, gated promotion to send | 🔴 |
| No recipients configured but send enabled | Send fails or sends nowhere | Validate recipients on config load when `send_email: true` | 🟠 |
| Invalid recipient address | Bounce/failure | Validate format; surface server error | 🟡 |
| Gmail sending quota exceeded | Delivery fails | Backoff; `status="partial"` (doc ok, email pending) | 🟡 |

---

## 13. Idempotency, state & audit

| Scenario | Risk | Expected handling | Severity |
|---|---|---|---|
| Crash after Doc append, before ledger write | Re-run skips append (server) but may re-send email (no ledger) | Delivery-intent ledger entry before send; reconcile on re-run (§0.2) | 🔴 |
| Two runs same `(product, week)` concurrently | Duplicate section/send | Run-level lock on `(product, iso_week)` | 🔴 |
| Clock skew / wrong tz → wrong ISO week | Section labeled wrong week | Compute ISO week in one canonical tz; assert in tests | 🟠 |
| ISO week 52/53 / year rollover / W01 | Off-by-one week, wrong anchor | Use ISO-8601 week rules; test boundaries explicitly | 🟠 |
| Backfill a week that already ran | Duplicate work | Idempotent: detect existing section/send, skip | 🟠 |
| Backfill a future week | Nonsense report | Reject future weeks in CLI | 🟡 |
| Ledger DB locked / corrupt | Idempotency broken | Handle lock with retry; integrity check; safe failure | 🟠 |
| Audit record missing fields | Can't answer "what/when/which week" | Validate `RunRecord` completeness before marking `ok` | 🟡 |

---

## 14. Scheduling & CLI

| Scenario | Risk | Expected handling | Severity |
|---|---|---|---|
| Machine asleep/offline at scheduled time | Missed weekly run | Catch-up logic or alert on missed run; backfill command | 🟠 |
| Overlapping scheduled + manual run | Race / duplicates | Lock prevents concurrent same-key runs | 🟠 |
| `--send` and `--dry-run` together | Ambiguous intent | Reject conflicting flags | 🟡 |
| Missing `--product` | Unclear target | Required arg; clear usage error | ⚪ |
| Product not in config | Crash | Validate against config; friendly error | 🟡 |
| Invalid `--week` format | Crash / wrong target | Validate ISO-week format strictly | 🟡 |
| Scheduled run hangs indefinitely | Blocks next run | Per-run timeout; kill + record `failed` | 🟠 |

---

## 15. Configuration

| Scenario | Risk | Expected handling | Severity |
|---|---|---|---|
| Source `enabled: true` but identifier missing | Adapter crash | Validate on load; fail fast with field name | 🟠 |
| All sources disabled | Empty run | Reject or warn loudly | 🟡 |
| `window_weeks` outside 8–12 (or ≤0) | Out-of-spec data | Validate range; clamp or reject | 🟡 |
| `send_email: true` but no recipients | Send failure | Cross-field validation on load | 🟠 |
| Cost ceiling = 0 or missing | No work possible / unbounded | Require sane defaults; validate | 🟠 |
| Malformed YAML | Crash | Clear parse error with location | 🟡 |
| Secret referenced but env var unset | Auth failure mid-run | Validate required env vars at startup | 🟠 |

---

## 16. Security & safety (cross-cutting)

| Scenario | Risk | Expected handling | Severity |
|---|---|---|---|
| Google OAuth secret appears in agent repo/logs | Credential leak | Hard boundary: creds only in MCP servers; scan repo/logs in CI | 🔴 |
| Review text used as instruction anywhere | Injection / hijack | Reviews-as-data end-to-end, not just at LLM | 🔴 |
| Phishing URL in review surfaced verbatim | Harmful link in Doc/email | De-link/neutralize URLs in published quotes/themes | 🔴 |
| Abusive/hateful content in leadership report | Reputational/safety harm | Output content filter; neutralize action-idea tone | 🟠 |
| Secrets logged in structured logs | Leak | Redact secrets in logging; review log fields | 🟠 |
| PII leaked via theme/action (not quote) | Privacy breach | Scrub LLM outputs, not only inputs (§6) | 🔴 |

---

## 17. Cost & resource limits

| Scenario | Risk | Expected handling | Severity |
|---|---|---|---|
| Token ceiling hit mid-run | Partial/abandoned report | Abort before delivery; never ship a half report; record reason | 🔴 |
| Cost ceiling hit on scheduled prod run | Silent budget overrun | Enforce USD ceiling; alert on abort | 🟠 |
| Spike in review volume → cost spike | Budget blown | Per-source record caps; newest-first sampling | 🟠 |
| Embedding cost on huge corpus | Slow/expensive | Cache embeddings; cap corpus size | 🟡 |

---

## 18. Multi-product (future, Phase 6)

| Scenario | Risk | Expected handling | Severity |
|---|---|---|---|
| Two products share a subreddit | Cross-attribution of feedback | Per-product relevance filter (product name match) | 🟠 |
| Adding a product requires code change | Architecture violation | Must be config-only; if not, fix before scaling | 🟠 |
| Theme taxonomy drifts across weeks/products | No trending; inconsistent buckets | Decide stable-taxonomy mapping (nearest-centroid) before scaling | 🟡 |
| Per-product cost ceilings missing | One product blows shared budget | Per-product ceilings + recipients | 🟡 |

---

## 19. Dev environment (Antigravity)

| Scenario | Risk | Expected handling | Severity |
|---|---|---|---|
| Agent autonomously runs delivery layer | Irreversible real send/write | Keep delivery on step-approval; autonomy only on adapters/renderers | 🔴 |
| `brain/` context stale or contradicts current contracts | Agents build to wrong spec | Treat `architecture.md §6` + canonical schema as source of truth; refresh `brain/` on change | 🟠 |
| Multiple parallel agents edit same module | Merge conflicts / drift | Scope agents to distinct modules; reconcile via contracts | 🟡 |

---

## 20. Edge-case → test mapping

Each 🔴/🟠 row should have a corresponding test per `implementation.md §9`:

- **Ingestion** edge cases → adapter fixture tests + partial-run injection.
- **PII / quote validation** edge cases → input→output tables (incl. obfuscated PII, paraphrase, PII-in-quote).
- **Reasoning** edge cases → too-few-reviews fallback, all-noise fallback, injection fixture, cost-ceiling abort.
- **Delivery / idempotency** edge cases → double-run, crash-between-steps, partial-delivery resume, mock+real contract conformance.
- **Config** edge cases → load-time validation suite.

**Definition of done for edge-case coverage:** every 🔴 case has an automated test and a documented expected behavior; every 🟠 case has at least a documented behavior and is on the test backlog before Phase 5 (prod).

---

_This catalog is living. When a new failure mode is found in the wild, add it here with severity + handling, write the test, and reconcile `architecture.md`/`implementation.md` if the fix changes a contract._
