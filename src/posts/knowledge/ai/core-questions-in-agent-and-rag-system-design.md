---
layout: layouts/post.njk
title: "Agent System Architecture"
description: A simple overview of agent system architecture, the orchestrator and its four core components, LLM, tools, memory, and context engineering.
excerpt: A simple overview of agent system architecture, the orchestrator and its four core components, LLM, tools, memory, and context engineering.
date: 2026-04-22
category: Knowledge
subcategory: AI
topic: Agents
kind: Note
tags:
  - posts
image: /assets/projects/agent-rag-interview-notes.svg
imageFit: contain
permalink: /posts/core-questions-in-agent-and-rag-system-design/index.html
---

An agent system centers on an **orchestrator** (planner + orchestrator) that receives a request and coordinates four things: the model that reasons, the tools that act, the memory that persists, and the context engineering that assembles what the model sees.

![Agent system architecture](/assets/projects/agent-rag-interview-notes.svg)

## 1. LLM / Model

The model reasons over the current context and decides the next action or the final answer. It is the only component that "thinks"; everything else exists to feed it the right input or carry out what it decides.

## 2. Tools / APIs

Tools give the agent access to the outside world: a database, a search/browser tool, or a code executor and other external services. The orchestrator calls a tool when the model decides it needs one, then feeds the result back into the loop.

## 3. Memory

Memory splits into two kinds:

- **Short-term memory**: session state, Redis, or a checkpoint. Scoped to the current conversation.
- **Long-term memory**: a profile DB, document store, or vector store. Reusable across sessions.

## 4. Context Engineering

Context engineering assembles what actually gets sent to the model: the prompt and instructions, retrieved context from a RAG/knowledge base, and other docs, logs, or state. This is a different concern from memory: memory decides what gets stored, context engineering decides what gets retrieved and shown to the model for this particular call.
