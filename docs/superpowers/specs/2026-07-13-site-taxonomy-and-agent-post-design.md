# Site Taxonomy Restructure + Production Agent Post — Design

Date: 2026-07-13
Status: Approved pending user review

## Goals

1. Restructure the post taxonomy so the three frontmatter levels each carry one meaning:
   reader-facing section, domain, and fine-grained topic.
2. Rename the "Knowledge Map" page to "Table of Contents", move it to `/table-of-contents/`,
   and collapse it to category level by default.
3. Publish a new post: an English lessons-learned write-up of a production LangGraph
   agent system, filed under the new taxonomy.

## 1. New taxonomy

| Level | Meaning | Values |
|---|---|---|
| `category` | Section (reader intent) | `Knowledge`, `Projects`, `System Design` |
| `subcategory` | Domain | `AI`, `Backend`, `Data Systems`, `Messaging`, `Networking`, `Cloud`, `HPC`, `OOD`, `Tools` |
| `topic` | Fine-grained grouping | mostly the old `subcategory` value (e.g. `Agents`, `WebSocket`, `Database Basics`) |
| `kind` | Format tag (not rendered in filters) | `Note`, `Project`, `Cheatsheet`, `Poster`, `Guide` |

Rules applied:

- New `subcategory` = old `category` (with `Languages` folded into `Tools`).
- New `topic` = old `subcategory`, except OOD posts which keep their old `topic`
  (`Parking Lot`, `Interview Prep`-style values) because their old subcategory names
  collide with the new section names.
- The old per-post unique `topic` values are dropped; that granularity lives in titles.
- `kind` is unchanged and stays as pure metadata (`data-kind` attribute only).

### Full mapping (34 existing posts)

**Knowledge (24)** — `category: Knowledge`

| Post | subcategory | topic | kind |
|---|---|---|---|
| agent-harness-overview | AI | Agents | Note |
| agentic-workflow | AI | Agents | Note |
| attention-is-all-you-need | AI | ML | Note |
| relu-nnet-backpropagation | AI | ML | Note |
| rag-overview | AI | RAG | Note |
| distributed-data-parallel-ddp-poster | HPC | GPU / PyTorch | Note |
| hpc-gpu-pytorch-backprop | HPC | GPU / PyTorch | Guide |
| database-basic-optimistic-lock-vs-pessimistic-lock | Data Systems | Database Basics | Note |
| distributed-databases-why-we-distribute | Data Systems | Distributed Databases | Note |
| postgres-gin-index-knowledge-card | Data Systems | PostgreSQL | Note |
| redis-overview | Data Systems | Redis | Note |
| fastapi-concurrency-implementation | Backend | FastAPI | Note |
| fastapi-websocket-basics | Backend | WebSocket | Note |
| websocket-connection-manager | Backend | WebSocket | Note |
| websocket-protocol-fundamentals | Backend | WebSocket | Note |
| python-backend-concurrency-model | Backend | Concurrency | Note |
| python-gil-threading-vs-async | Backend | Concurrency | Note |
| kafka-overview | Messaging | Event Streaming | Note |
| message-queues-decoupling-work-without-losing-reliability | Messaging | Queueing | Note |
| rabbitmq-in-python-exchanges-routing-and-bindings | Messaging | Message Brokers | Note |
| network-layer-model | Networking | Foundations | Poster |
| tcp-handshake-basics | Networking | Protocols | Note |
| git-command-cheatsheet | Tools | Command Line | Cheatsheet |
| python-command-cheatsheet | Tools | Python | Cheatsheet |

**Projects (5 existing + 1 new)** — `category: Projects`

| Post | subcategory | topic | kind |
|---|---|---|---|
| building-a-react-agent | AI | Agents | Project |
| native-to-agentic-rag | AI | RAG | Project |
| aws-event-driven-s3-cleanup-system | Cloud | AWS | Project |
| aws-s3-object-backup-and-delayed-cleanup-system | Cloud | AWS | Project |
| aws-migration-for-stateful-monoliths | Cloud | AWS | Project |
| **NEW: production agent post** | AI | Agents | Project |

**System Design (5)** — `category: System Design`

| Post | subcategory | topic | kind |
|---|---|---|---|
| parking-lot-ood-basics | OOD | Parking Lot | Note |
| ood-interview-answer-flow | OOD | Interview Prep | Cheatsheet |
| database-basic-like-feature-system-design | Data Systems | Database Basics | Note |
| database-basic-choosing-relational-vs-non-relational-database | Data Systems | Database Basics | Note |
| core-questions-in-agent-and-rag-system-design | AI | Agents | Note |

### What does not change

- Post URLs (every post declares an explicit `permalink`).
- Post file locations under `src/posts/` (directories are file management only).
- The posts-page filter script (`src/posts/index.njk`) — dropdown options are derived
  from frontmatter automatically.
- The `knowledgeMap` collection *logic* in `.eleventy.js` (grouping by
  category → subcategory → topic keeps working); the collection is renamed, see below.
- CSS class names (`knowledge-*`) stay as-is to avoid churn.

## 2. Table of Contents page

- Rename `src/knowledge-map.njk` → `src/table-of-contents.njk`; URL becomes
  `/table-of-contents/` (no redirect from `/knowledge-map/` — no known external links).
- Nav label in `src/_includes/layouts/base.njk`: "Knowledge Map" → "Table of Contents";
  `navKey` becomes `table-of-contents`.
- Page copy: title "Table of Contents", kicker/description updated to match
  ("Posts grouped by section, domain, and topic").
- Rename the `knowledgeMap` collection to `tableOfContents` in `.eleventy.js` and its
  template references (the sidebar pills in the ToC page).
- **Default collapse to category:** remove the `open` attribute from the category-level
  `<details>` so the page initially shows only the three sections. Subcategories stay
  collapsed as they are today.
- Add a small script: clicking a sidebar anchor pill (or arriving with a `#hash`)
  sets `open` on the target category `<details>` before scrolling, so anchors still work
  with collapsed sections.

## 3. New post: production agent lessons-learned

- **File:** `src/posts/ai/agents/rag-agent-for-a-public-health-app.md`
- **Language:** English (site-wide convention).
- **Frontmatter:**
  - title: "Shipping a RAG Agent for a Public Health App: What Actually Broke"
  - date: 2026-07-13
  - category: Projects / subcategory: AI / topic: Agents / kind: Project
  - image: `/assets/sketches/ai-agent-architecture.png` (copied from
    `/Users/alanwang/MyFiles/excalidraw/ai_agent.png`), imageFit: contain
  - permalink: `/posts/rag-agent-for-a-public-health-app/index.html`
  - tags: posts
- **Structure (per approved outline):**
  1. **Architecture overview** — one paragraph walking the diagram: WebSocket entry →
     JWT/guest handshake → LangGraph agent → retrieval tool → Supabase pgvector. Brief.
  2. **Citations cannot come from the model** — letting the LLM emit document names
     hallucinates; solution: tool artifacts as an out-of-band channel so sources bypass
     the LLM and reach the frontend directly. (Test-console screenshot: placeholder
     comment, image added later.)
  3. **History pollution** — the dramatic centerpiece. A canned refusal from the safety
     gate persisted as an AIMessage in checkpointed history; full-history replay fed it
     back every turn and the model began imitating its own refusals on normal questions.
     Stopgap: truncate the three checkpoint tables (checkpoints, checkpoint_blobs,
     checkpoint_writes). Faucet fix: replace the gate that produced refusals. Honest
     admission: full-history replay is unchanged, any future bad turn is a new pollution
     source; the structural fix (filtering refusal/error turns during history
     truncation/summarization) is still in the backlog.
  4. **Allowlist gates kill follow-ups** — "what else?" scores ~0 similarity against 14
     reference phrases at a 0.8 threshold and gets blocked; topic gates are context-blind.
     Inverted to a blacklist (violence/self-harm only), topic control moved to the system
     prompt. Product note: self-harm should route to crisis resources, not a cold refusal.
  5. **The LLM skips retrieval** — corpus contains directly relevant RCTs, yet Gemini
     answers fluently from general knowledge with zero citations; hardening the tool
     description does not fix it. In a medical product the danger is not wrong answers
     but fluent answers with no grounding. Leads into the trace panel (observability;
     screenshot placeholder) and forced retrieval as next step.
  6. **Guest dual storage** — one `builder.compile()` argument difference gives
     anonymous sessions zero persistence (InMemorySaver) vs per-user Postgres
     checkpoints. Small, elegant closer.
  7. **What is still unsolved** — memory layering, an eval net, dropping the torch
     dependency. Honest roadmap over "all done".
- **Tone:** first-person practice write-up; each section = symptom → wrong intuition →
  fix → what it cost / what remains.
- **Images:** architecture diagram only for now; two HTML-comment placeholders mark
  where the test-console and trace-panel screenshots will go.

## Error handling / verification

- After frontmatter edits: `npx @11ty/eleventy` build must pass; spot-check the posts
  page filters (three sections in Category dropdown), the ToC page grouping and default
  collapse, and the new post rendering.
- Grep for `knowledge-map` / `knowledgeMap` leftovers after the rename
  (excluding CSS class names, which intentionally keep the `knowledge-` prefix).

## Out of scope

- Redirect from `/knowledge-map/`.
- Renaming `knowledge-*` CSS classes.
- Moving post files between directories.
- A `kind` filter dropdown (possible later; data attribute already present).
- The two pending screenshots for the new post.
