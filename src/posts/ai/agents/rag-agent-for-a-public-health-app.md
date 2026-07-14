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
