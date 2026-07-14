---
layout: layouts/post.njk
title: "Building a RAG Agent for a Public Health App: What Actually Broke"
description: Five lessons from building and testing a LangGraph RAG agent for a public health app - history pollution, citations that must travel around the model, and a safety gate that backfired.
excerpt: Five lessons from building and testing a LangGraph RAG agent for a public health app - history pollution, citations that must travel around the model, and a safety gate that backfired.
date: 2026-07-13T12:00:00-07:00
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
For the past few months I have been building a RAG agent for a public health app — not yet serving the public, but tested end-to-end against a real corpus, real authentication, and real multi-turn conversations. The architecture is not the interesting part; it is close to what any LangGraph tutorial would give you. The interesting part was watching reasonable-looking design decisions fail during testing, one specific way at a time. This post walks through the five failures that taught me the most, before any of them could reach a user.

## The System in One Paragraph

A FastAPI WebSocket layer accepts connections, verifies JWTs against Supabase JWKS (or admits the client as an anonymous guest), and hands each message to a LangGraph agent. The agent runs a safety gate, then an assistant node on Gemini 2.5 Flash whose system prompt is loaded from a prompt-config store. When the model wants context it calls a retrieval tool: the query is embedded with Vertex `text-embedding-004` (768 dimensions) and matched against ~27,000 document sections in Supabase pgvector through an RPC, with a 0.6 similarity floor. Conversation memory is a LangGraph checkpointer — `PostgresSaver` for authenticated users, `InMemorySaver` for guests.

![RAG agent architecture: WebSocket layer, LangGraph agent, retrieval tools, and dual checkpointers](/assets/sketches/ai-agent-architecture.png)

Everything below is what this diagram does not show.

## Lesson 1: Citations Cannot Come From the Model

Health answers need sources. The obvious approach is to instruct the model to append the titles of the documents it used — and it is a known failure mode. A citation produced by a language model is just more generated text: the model will comply with fluent, plausible-looking titles whether or not they exist in your corpus, and it hallucinates at exactly the moment a citation matters most. I never let that path near the app.

Instead, citations travel around the model. The retrieval tool returns two things: the passage text, which goes into the model's context, and a structured artifact — the source document names — that the harness forwards straight to the frontend as an out-of-band payload. In LangChain terms, the tool uses `response_format="content_and_artifact"`: the content is for the LLM, the artifact rides along in the `ToolMessage` where the model never touches it. The model cannot corrupt what it never repeats.

The general rule I took away: **anything that must be exact should travel around the LLM, not through it.**

![Test console: the model's answer on the left contains no citations, while the right side shows the retrieval trace and a Sources panel populated out-of-band with the actual document names](/assets/screenshots/rag-console-out-of-band-sources.png)

*The answer text (left) never mentions a document. The sources — three research PDFs — arrive through the tool artifact channel and render in their own panel (bottom right), with the full tool trace above them.*

## Lesson 2: A Stored Refusal Is a Learned Refusal

This one was the most dramatic, and the hardest to diagnose.

The safety gate returned a canned refusal — "I'm sorry, I can't answer that question." — and that reply was checkpointed into the thread history like any other assistant message. The agent replays full history every turn. So the model kept re-reading its own refusal, decided that refusing was part of its persona, and started declining perfectly normal questions. The debugging was maddening because the current question was innocent and the gate was passing it; the poison was upstream, sitting in the conversation history.

To see why, look at what the model actually receives on every turn — the entire thread, verbatim, with the new question appended at the end:

```python
[
  # 1. System prompt (prepended every turn)
  SystemMessage("You are a helpful and caring assistant... use search_supabase..."),

  # 2. The ENTIRE thread history, replayed verbatim
  HumanMessage("what is migraine?"),
  AIMessage(tool_calls=[search_supabase("what is migraine?")]),
  ToolMessage("Migraine Overview — Definition: A migraine is..."),  # full retrieved chunks
  AIMessage("A migraine is a neurological disorder..."),

  HumanMessage("<a question the gate mis-blocked>"),
  AIMessage("I'm sorry, I can't answer that question."),  # ← the poison

  # 3. This turn's new question
  HumanMessage("who am i?"),
]
```

The model's only job is to write the next message in this array. It reads the array, sees that "in this conversation, when a question feels odd, I refuse," and imitates itself. This is not a cache hit — the refusals came back *paraphrased*, not verbatim, and a brand-new thread answered the same questions normally. The model wasn't looking anything up; it was staying in character.

The stopgap was the least dignified fix in engineering: truncate the three checkpoint tables (`checkpoints`, `checkpoint_blobs`, `checkpoint_writes`). Delete the history and the pollution source is gone. It was also the right call. The faucet fix was replacing the gate that kept generating those refusals (next lesson), so new canned refusals rarely enter history anymore.

Here is the honest part: the architecture still replays full history, unchanged. Any future mis-block, error message, or off-the-rails reply that lands in a checkpoint is a fresh pollution source, and today the only cure is another truncate. The structural fix — excluding refusal and error turns when history gets trimmed or summarized — is still in the backlog. We turned off the faucet; we have not built the immune system.

## Lesson 3: Allowlist Gates Kill Follow-Ups

The first version of the safety gate was an allowlist: embed the user message with MiniLM, compare it against 14 reference on-topic phrases, and block anything below 0.8 similarity. It worked in single-turn tests and fell apart in the first realistic conversation. "What else?" after a legitimate answer scores near zero against every reference phrase — blocked.

The failure is structural, not a tuning problem. A topic gate looks at one message in isolation, but a follow-up's meaning lives in the conversation history the gate never sees. Any allowlist strict enough to catch topic drift will also kill your follow-ups.

So I inverted it. The gate is now a denylist: it blocks only a small set of categories — violence and self-harm — where the message itself, alone, carries the signal. Topic control moved into the system prompt, where the model actually has the context to judge relevance.

One product note that mattered more than the architecture: in a health product, self-harm input should never get a cold refusal. It should route to crisis resources — a different response path, not a different threshold. Migraine has high depression comorbidity; the gate's job there is not to block a user but to catch one.

## Lesson 4: The Model Will Skip Retrieval

The corpus contained randomized controlled trials directly on point for the question "how to relieve migraine" — I verified it by calling the retrieval function directly and getting guideline and RCT chunks back. Gemini answered fluently from general knowledge instead: zero tool calls, zero citations. The tell was in the timing — a grounded answer took about six seconds end-to-end; the ungrounded one came back in three, because it skipped the retrieval round-trip entirely. Sharpening the tool description ("ALWAYS search before answering") changed nothing reliably; the model still decided, turn by turn, whether searching felt necessary.

For a public health product this is the most dangerous failure mode of all, and it is not the one people expect. The danger is not a wrong answer — it is a fluent answer with no grounding, which reads exactly like a grounded one unless you inspect the trace. So the first response was observability: every response now carries a per-turn trace of which tools ran, with what arguments, and what they returned, rendered in a debug panel next to the chat. You cannot fix a silent failure you cannot see. The next step is forced retrieval — making search a structural step in the graph rather than a choice the model gets to make.

## Lesson 5: Guests Are One Argument Away

My favorite decision in the system is also the smallest. Thread IDs are `user:<id>` for authenticated users and `anon:<conn_id>` for guests, and the only difference between the two modes is which checkpointer `builder.compile()` receives:

```python
graph = builder.compile(checkpointer=postgres_saver)          # users: durable
guest_graph = builder.compile(checkpointer=InMemorySaver())   # guests: RAM only
```

Guest conversations never touch the database and evaporate when the connection closes — verified by counting checkpoint rows before and after a guest session: zero writes. Privacy did not require a policy layer or a cleanup job. It is a compile-time argument.

## What Is Still Broken

An honest roadmap, because "we fixed everything" would be a lie:

- **Memory layering.** History trimming and summarization that filters out refusal and error turns — the real immune system for Lesson 2's pollution problem.
- **An eval net.** Today regressions are caught by a manual test console and my own suspicion. The gate inversion and the skipped-retrieval fix both need automated evals before I can trust changes.
- **Dropping torch.** The MiniLM gate dragged a full PyTorch dependency into the image, and the denylist gate still uses it. It is the heaviest thing in the container and I want it gone.

Every one of these is a known hole. Building this agent taught me that the list of known holes, kept honestly, is worth more than any of the individual fixes.
