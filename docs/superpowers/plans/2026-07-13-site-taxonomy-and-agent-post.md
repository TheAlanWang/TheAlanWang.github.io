# Site Taxonomy Restructure + Production Agent Post Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the post taxonomy into Knowledge / Projects / System Design sections, rename the Knowledge Map page to a default-collapsed Table of Contents, and publish a new production-agent lessons-learned post.

**Architecture:** Eleventy (11ty) static site. Taxonomy lives entirely in per-post frontmatter (`category` / `subcategory` / `topic` / `kind`); the posts-page filters and the grouped index page derive all values from frontmatter at build time, so the restructure is a frontmatter rewrite plus one page rename. Post URLs never change because every post declares an explicit `permalink`.

**Tech Stack:** Eleventy 11ty, Nunjucks templates, Node (one throwaway retag script).

## Global Constraints

- The working tree has pre-existing uncommitted changes in `css/main.css` and `src/_data/site.js` — never stage or commit those files; stage task files explicitly by path.
- Post URLs must not change (all posts have explicit `permalink`).
- Post files stay in their current directories.
- CSS class names keep the `knowledge-` / `knowledge-map-` prefixes (no CSS churn).
- `kind` values are unchanged for existing posts.
- Verification command for every task: `npx @11ty/eleventy` must exit 0.
- Spec: `docs/superpowers/specs/2026-07-13-site-taxonomy-and-agent-post-design.md`.

---

### Task 1: Retag all 34 posts to the new taxonomy

**Files:**
- Create (scratchpad, not committed): `/private/tmp/claude-501/-Users-alanwang-MyFiles-Project-TheAlanWang-github-io/5efb70c2-3d78-48da-839e-44a47dd1821b/scratchpad/retag.js`
- Modify: all 34 `.md` files under `src/posts/` (frontmatter `category` / `subcategory` / `topic` lines only)

**Interfaces:**
- Produces: frontmatter values consumed by Task 2's grouped index page — `category` ∈ {`Knowledge`, `Projects`, `System Design`}, `subcategory` ∈ {`AI`, `Backend`, `Data Systems`, `Messaging`, `Networking`, `Cloud`, `HPC`, `OOD`, `Tools`}.

- [ ] **Step 1: Write the retag script**

Write this file to the scratchpad path above:

```js
const fs = require("fs");

const POSTS = "/Users/alanwang/MyFiles/Project/TheAlanWang.github.io/src/posts/";

// rel path -> [category, subcategory, topic]
const map = {
  // ── Knowledge (24)
  "ai/agents/agent-harness-overview.md": ["Knowledge", "AI", "Agents"],
  "ai/agents/agentic-workflow.md": ["Knowledge", "AI", "Agents"],
  "ai/ml/attention-is-all-you-need.md": ["Knowledge", "AI", "ML"],
  "ai/ml/relu-nnet-backpropagation.md": ["Knowledge", "AI", "ML"],
  "ai/rag/rag-overview.md": ["Knowledge", "AI", "RAG"],
  "hpc/distributed-data-parallel-ddp-poster.md": ["Knowledge", "HPC", "GPU / PyTorch"],
  "hpc/hpc-gpu-pytorch-backprop.md": ["Knowledge", "HPC", "GPU / PyTorch"],
  "systems/database-basic-optimistic-lock-vs-pessimistic-lock.md": ["Knowledge", "Data Systems", "Database Basics"],
  "systems/distributed-databases-why-we-distribute.md": ["Knowledge", "Data Systems", "Distributed Databases"],
  "systems/postgres-gin-index-knowledge-card.md": ["Knowledge", "Data Systems", "PostgreSQL"],
  "systems/redis-overview.md": ["Knowledge", "Data Systems", "Redis"],
  "systems/fastapi-concurrency-implementation.md": ["Knowledge", "Backend", "FastAPI"],
  "systems/fastapi-websocket-basics.md": ["Knowledge", "Backend", "WebSocket"],
  "systems/websocket-connection-manager.md": ["Knowledge", "Backend", "WebSocket"],
  "systems/websocket-protocol-fundamentals.md": ["Knowledge", "Backend", "WebSocket"],
  "systems/python-backend-concurrency-model.md": ["Knowledge", "Backend", "Concurrency"],
  "systems/python-gil-threading-vs-async.md": ["Knowledge", "Backend", "Concurrency"],
  "systems/kafka-overview.md": ["Knowledge", "Messaging", "Event Streaming"],
  "systems/message-queues-decoupling-work-without-losing-reliability.md": ["Knowledge", "Messaging", "Queueing"],
  "systems/rabbitmq-in-python-exchanges-routing-and-bindings.md": ["Knowledge", "Messaging", "Message Brokers"],
  "systems/network-layer-model.md": ["Knowledge", "Networking", "Foundations"],
  "systems/tcp-handshake-basics.md": ["Knowledge", "Networking", "Protocols"],
  "tools/git-command-cheatsheet.md": ["Knowledge", "Tools", "Command Line"],
  "tools/python-command-cheatsheet.md": ["Knowledge", "Tools", "Python"],
  // ── Projects (5 existing; the new post is Task 3)
  "ai/agents/building-a-react-agent.md": ["Projects", "AI", "Agents"],
  "ai/rag/native-to-agentic-rag.md": ["Projects", "AI", "RAG"],
  "cloud/aws-event-driven-s3-cleanup-system.md": ["Projects", "Cloud", "AWS"],
  "cloud/aws-s3-object-backup-and-delayed-cleanup-system.md": ["Projects", "Cloud", "AWS"],
  "cloud/aws-migration-for-stateful-monoliths.md": ["Projects", "Cloud", "AWS"],
  // ── System Design (5)
  "ood/parking-lot-ood-basics.md": ["System Design", "OOD", "Parking Lot"],
  "ood/ood-interview-answer-flow.md": ["System Design", "OOD", "Interview Prep"],
  "systems/database-basic-like-feature-system-design.md": ["System Design", "Data Systems", "Database Basics"],
  "systems/database-basic-choosing-relational-vs-non-relational-database.md": ["System Design", "Data Systems", "Database Basics"],
  "ai/agents/core-questions-in-agent-and-rag-system-design.md": ["System Design", "AI", "Agents"],
};

let changed = 0;
for (const [rel, [category, subcategory, topic]] of Object.entries(map)) {
  const file = POSTS + rel;
  const parts = fs.readFileSync(file, "utf8").split("---");
  // parts[1] is the frontmatter block; body "---" separators are restored by join.
  const updated = parts[1]
    .replace(/^category:.*$/m, `category: ${category}`)
    .replace(/^subcategory:.*$/m, `subcategory: ${subcategory}`)
    .replace(/^topic:.*$/m, `topic: ${topic}`);
  if (updated === parts[1]) throw new Error(`no change applied: ${rel}`);
  parts[1] = updated;
  fs.writeFileSync(file, parts.join("---"));
  changed += 1;
}
console.log(`updated ${changed} posts`);
```

- [ ] **Step 2: Run the script**

Run: `node "/private/tmp/claude-501/-Users-alanwang-MyFiles-Project-TheAlanWang-github-io/5efb70c2-3d78-48da-839e-44a47dd1821b/scratchpad/retag.js"`
Expected output: `updated 34 posts`

- [ ] **Step 3: Verify the new distribution**

Run: `grep -rh "^category:" src/posts --include="*.md" | sort | uniq -c`
Expected exactly:

```
  24 category: Knowledge
   5 category: Projects
   5 category: System Design
```

Also run: `grep -rh "^subcategory:" src/posts --include="*.md" | sort | uniq -c` and confirm the only values are AI, Backend, Cloud, Data Systems, HPC, Messaging, Networking, OOD, Tools (no `Languages` remaining).

- [ ] **Step 4: Verify the build**

Run: `npx @11ty/eleventy`
Expected: exits 0, "Wrote N files" with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/posts
git commit -m "Restructure post taxonomy into Knowledge / Projects / System Design sections

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

(`git status` must show `css/main.css` and `src/_data/site.js` still unstaged.)

---

### Task 2: Rename Knowledge Map to Table of Contents, default-collapse to category

**Files:**
- Rename: `src/knowledge-map.njk` → `src/table-of-contents.njk` (then modify)
- Modify: `src/_includes/layouts/base.njk:38`
- Modify: `.eleventy.js:32`

**Interfaces:**
- Consumes: Task 1's `category` values (three sections render as the top-level `<details>` groups).
- Produces: collection name `collections.tableOfContents` (replaces `collections.knowledgeMap`); nav URL `/table-of-contents/`; `navKey: table-of-contents`.

- [ ] **Step 1: Rename the page file**

```bash
git mv src/knowledge-map.njk src/table-of-contents.njk
```

- [ ] **Step 2: Update the page frontmatter and copy**

In `src/table-of-contents.njk`, replace the frontmatter and lead panel:

Old frontmatter (lines 1–6):
```
---
layout: layouts/base.njk
title: Knowledge Map
description: A topic-based map of Alan Wang's technical notes, sketches, and study posts.
navKey: knowledge-map
---
```

New:
```
---
layout: layouts/base.njk
title: Table of Contents
description: A table of contents for Alan Wang's posts, grouped by section, domain, and topic.
navKey: table-of-contents
---
```

Old lead panel (lines 24–26):
```html
            <p class="section-kicker">Knowledge Map</p>
            <h2 class="lead-title">Topic Index</h2>
            <p class="lead-copy">Posts grouped by category and subcategory.</p>
```

New:
```html
            <p class="section-kicker">Contents</p>
            <h2 class="lead-title">Table of Contents</h2>
            <p class="lead-copy">Posts grouped by section, domain, and topic.</p>
```

- [ ] **Step 3: Rename the collection references and default-collapse**

In `src/table-of-contents.njk`, apply three edits:

1. Both loops (sidebar pills at line 16 and main loop at line 30): `collections.knowledgeMap` → `collections.tableOfContents`.
2. Remove the `open` attribute from the category-level details (line 31):

Old:
```html
                <details class="knowledge-category" id="{{ category.name | slugify }}" open>
```
New:
```html
                <details class="knowledge-category" id="{{ category.name | slugify }}">
```

3. Add an anchor-expand script immediately before the closing `</div>` at the end of the file (after `</main>`):

```html
<script>
    (() => {
        const openTarget = () => {
            const hash = decodeURIComponent(window.location.hash.slice(1));
            if (!hash) return;
            const target = document.getElementById(hash);
            if (target && target.tagName === "DETAILS") {
                target.open = true;
            }
        };
        openTarget();
        window.addEventListener("hashchange", openTarget);
    })();
</script>
```

- [ ] **Step 4: Update the collection name in `.eleventy.js`**

Line 32, old:
```js
    eleventyConfig.addCollection("knowledgeMap", (collectionApi) => {
```
New:
```js
    eleventyConfig.addCollection("tableOfContents", (collectionApi) => {
```

- [ ] **Step 5: Update the nav link in `src/_includes/layouts/base.njk`**

Line 38, old:
```html
                <a href="/knowledge-map/" class="site-nav-link{% if navKey == 'knowledge-map' %} current{% endif %}">Knowledge Map</a>
```
New:
```html
                <a href="/table-of-contents/" class="site-nav-link{% if navKey == 'table-of-contents' %} current{% endif %}">Table of Contents</a>
```

- [ ] **Step 6: Verify no stale references and build**

Run: `grep -rn "knowledgeMap\|knowledge-map" src .eleventy.js`
Expected: only CSS class-name hits (`knowledge-map-section` in the template's `class` attribute); no `collections.knowledgeMap`, no `/knowledge-map/` URL, no `navKey: knowledge-map`.

Run: `rm -rf _site && npx @11ty/eleventy` (clean first — Eleventy does not remove stale output, so the old `knowledge-map/` page would otherwise linger in `_site`)
Expected: exits 0; `_site/table-of-contents/index.html` exists; `_site/knowledge-map/` is absent. Confirm with:

```bash
ls _site/table-of-contents/index.html
ls _site/knowledge-map 2>&1   # expected: No such file or directory
grep -c "details class=\"knowledge-category\" id=" _site/table-of-contents/index.html   # expected: 3
grep -c "knowledge-category\" id=\"[^\"]*\" open" _site/table-of-contents/index.html    # expected: 0
```

- [ ] **Step 7: Commit**

```bash
git add src/table-of-contents.njk src/_includes/layouts/base.njk .eleventy.js
git commit -m "Rename Knowledge Map to Table of Contents, collapse to sections by default

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: New post — Shipping a RAG Agent for a Public Health App

**Files:**
- Create: `assets/sketches/ai-agent-architecture.png` (copied from `/Users/alanwang/MyFiles/excalidraw/ai_agent.png`)
- Create: `src/posts/ai/agents/rag-agent-for-a-public-health-app.md`

**Interfaces:**
- Consumes: Task 1's taxonomy values (`Projects` / `AI` / `Agents`).
- Produces: post at `/posts/rag-agent-for-a-public-health-app/`.

- [ ] **Step 1: Copy the architecture diagram**

```bash
cp /Users/alanwang/MyFiles/excalidraw/ai_agent.png assets/sketches/ai-agent-architecture.png
```

- [ ] **Step 2: Create the post**

Create `src/posts/ai/agents/rag-agent-for-a-public-health-app.md` with exactly this content:

````markdown
---
layout: layouts/post.njk
title: "Shipping a RAG Agent for a Public Health App: What Actually Broke"
description: Five production lessons from running a LangGraph RAG agent in a public health app - hallucinated citations, history pollution, and safety gates that backfired.
excerpt: Five production lessons from running a LangGraph RAG agent in a public health app - hallucinated citations, history pollution, and safety gates that backfired.
date: 2026-07-13
category: Projects
subcategory: AI
topic: Agents
kind: Project
tags:
  - posts
image: /assets/sketches/ai-agent-architecture.png
imageFit: contain
permalink: /posts/rag-agent-for-a-public-health-app/index.html
---
For the past few months I have been building and operating a RAG agent for a public health app. The architecture is not the interesting part — it is close to what any LangGraph tutorial would give you. The interesting part was watching reasonable-looking design decisions fail in production, one specific way at a time. This post walks through the five failures that taught me the most.

## The System in One Paragraph

A FastAPI WebSocket layer accepts connections, verifies JWTs against Supabase JWKS (or admits the client as an anonymous guest), and hands each message to a LangGraph agent. The agent runs a safety gate, then an assistant node on Gemini 2.5 Flash whose system prompt is loaded from a prompt-config store. When the model wants context it calls a retrieval tool: the query is embedded with Vertex `text-embedding-004` (768 dimensions) and matched against document sections in Supabase pgvector through an RPC, with a 0.6 similarity floor. Conversation memory is a LangGraph checkpointer — `PostgresSaver` for authenticated users, `InMemorySaver` for guests.

![RAG agent architecture: WebSocket layer, LangGraph agent, retrieval tools, and dual checkpointers](/assets/sketches/ai-agent-architecture.png)

Everything below is what this diagram does not show.

## Lesson 1: Citations Cannot Come From the Model

Health answers need sources. My first instinct was the obvious one: instruct the model to append the titles of the documents it used. It complied — with fluent, plausible titles that did not exist in the corpus. A citation produced by a language model is just more generated text, and it hallucinates at exactly the moment a citation matters most.

The fix was to take citations out of the model's hands entirely. The retrieval tool now returns two things: the passage text, which goes into the model's context, and a structured artifact — document IDs, titles, section anchors — that the harness forwards straight to the frontend as an out-of-band payload. The model never repeats the source metadata, so it cannot corrupt it. The general rule I took away: anything that must be exact should travel around the LLM, not through it.

<!-- TODO: screenshot — test console showing out-of-band source payload alongside the model answer -->

## Lesson 2: A Stored Refusal Is a Learned Refusal

This one was the most dramatic, and the hardest to diagnose.

The safety gate returned a canned refusal — "I'm sorry, I can't answer that question." — and that reply was checkpointed into the thread history like any other assistant message. The agent replays full history every turn. So the model kept re-reading its own refusal, decided that refusing was part of its persona, and started declining perfectly normal questions. The debugging was maddening because the current question was innocent and the gate was passing it; the poison was upstream, sitting in the conversation history.

The stopgap was the least dignified fix in engineering: truncate the three checkpoint tables (`checkpoints`, `checkpoint_blobs`, `checkpoint_writes`). Delete the history and the pollution source is gone. It was also the right call. The faucet fix was replacing the gate that kept generating those refusals (next lesson), so new canned refusals rarely enter history anymore.

Here is the honest part: the architecture still replays full history, unchanged. Any future mis-block, error message, or off-the-rails reply that lands in a checkpoint is a fresh pollution source, and today the only cure is another truncate. The structural fix — excluding refusal and error turns when history gets truncated or summarized — is still in the backlog. We turned off the faucet; we have not built the immune system.

## Lesson 3: Allowlist Gates Kill Follow-Ups

The first version of the safety gate was an allowlist: embed the user message with MiniLM, compare it against 14 reference on-topic phrases, and block anything below 0.8 similarity. It worked in single-turn tests and fell apart the first time a real user asked a follow-up. "What else?" after a legitimate answer scores near zero against every reference phrase — blocked.

The failure is structural, not a tuning problem. A topic gate looks at one message in isolation, but a follow-up's meaning lives in the conversation history the gate never sees. Any allowlist strict enough to catch topic drift will also execute your follow-ups.

So I inverted it. The gate now only blocks a small blacklist — violence and self-harm — and topic control moved into the system prompt, where the model actually has the context to judge relevance. One product note that mattered more than the architecture: in a health product, self-harm input should never get a cold refusal. It should route to crisis resources. That is a different response path, not a different threshold.

## Lesson 4: The Model Will Skip Retrieval

The corpus contained randomized controlled trials directly on point for a test question. Gemini answered fluently from general knowledge instead — zero tool calls, zero citations. Sharpening the tool description ("ALWAYS search before answering") changed nothing reliably; the model still decided, turn by turn, whether searching felt necessary.

For a public health product this is the most dangerous failure mode of all, and it is not the one people expect. The danger is not a wrong answer — it is a fluent answer with no grounding, which reads exactly like a grounded one unless you inspect the trace. So the first response was observability: a trace panel that shows, per turn, which tools ran and what they returned. You cannot fix a silent failure you cannot see. The next step is forced retrieval — making search a structural node in the graph rather than a choice the model gets to make.

<!-- TODO: screenshot — trace panel showing a turn with no retrieval call -->

## Lesson 5: Guests Are One Argument Away

My favorite decision in the system is also the smallest. Thread IDs are `user:<id>` for authenticated users and `anon:<conn_id>` for guests, and the only difference between the two modes is which checkpointer `builder.compile()` receives: `PostgresSaver` or `InMemorySaver`. Guest conversations never touch the database and evaporate when the connection closes. Privacy did not require a policy layer or a cleanup job — it is a compile-time argument.

## What Is Still Broken

An honest roadmap, because "we fixed everything" would be a lie:

- **Memory layering.** History truncation and summarization that filters out refusal and error turns — the real immune system for Lesson 2's pollution problem.
- **An eval net.** Today regressions are caught by a manual test console and my own suspicion. The gate inversion and the skipped-retrieval fix both need automated evals before I can trust changes.
- **Dropping torch.** The MiniLM gate dragged a full PyTorch dependency into the image, and the blacklist gate still uses it. It is the heaviest thing in the container and I want it gone.

Every one of these is a known hole. Shipping the agent taught me that the list of known holes, kept honestly, is worth more than any of the individual fixes.
````

- [ ] **Step 3: Verify the build and rendered output**

Run: `npx @11ty/eleventy`
Expected: exits 0. Then:

```bash
ls _site/posts/rag-agent-for-a-public-health-app/index.html
grep -c "ai-agent-architecture.png" _site/posts/rag-agent-for-a-public-health-app/index.html   # expected: >= 1
grep -o "Projects" _site/table-of-contents/index.html | head -1                                # expected: Projects
```

- [ ] **Step 4: Commit**

```bash
git add assets/sketches/ai-agent-architecture.png src/posts/ai/agents/rag-agent-for-a-public-health-app.md
git commit -m "Add post: Shipping a RAG Agent for a Public Health App

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Final Verification (after all tasks)

- [ ] `npx @11ty/eleventy` exits 0.
- [ ] Posts page Category dropdown offers exactly: All, Knowledge, Projects, System Design.
- [ ] `/table-of-contents/` shows three collapsed sections; clicking a sidebar pill expands the target section.
- [ ] New post renders with the architecture diagram and appears under Projects → AI → Agents.
- [ ] `git status` still shows only the pre-existing `css/main.css` and `src/_data/site.js` modifications.
