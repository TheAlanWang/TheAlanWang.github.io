---
layout: layouts/post.njk
title: Native to Agentic RAG
description: A two-stage RAG project that starts with a local LangChain baseline and grows into a LangGraph agentic workflow with grading, routing, retries, and web fallback.
excerpt: A two-stage RAG project that moves from a local baseline to an agentic workflow with grading, routing, retries, and web fallback.
date: 2026-04-07
category: AI
subcategory: RAG
kind: Project
tags:
  - posts
image: /assets/projects/agentic-rag.svg
imageFit: contain
permalink: /posts/native-to-agentic-rag/index.html
---

This project explores how a retrieval-augmented generation system changes as it moves from a simple local pipeline to a more agentic workflow. I structured it in two stages so the progression stays clear: first a baseline RAG system, then a graph-based workflow that adds judgment, retries, and fallback behavior.

Repository: [TheAlanWang/native-to-agentic-rag](https://github.com/TheAlanWang/native-to-agentic-rag)

## Overview

- built a local RAG baseline around markdown documents, embeddings, retrieval, and prompt assembly
- extended that baseline into a LangGraph workflow with routing, grading, retries, and web fallback
- used a paper-reading scenario over a small NLP corpus including _Attention Is All You Need_ and _BERT_
- focused on the system design tradeoff between a clean baseline and a more resilient agentic flow

## Why It Matters

One of the harder parts of evaluating agentic RAG systems is that many examples jump directly to orchestration. They show routing and evaluation logic before the underlying retrieval loop is clearly established.

I wanted this project to make that progression explicit. The baseline shows the core retrieval pipeline in a simple form. The second stage shows what has to be added once the system needs better control flow, recovery paths, and confidence checks.

That shift is what makes the project interesting to me. It turns a straightforward RAG demo into a systems problem: how to route work, judge intermediate outputs, and recover when local retrieval is not enough.

## Stage 1: Native RAG

The first stage is a local LangChain pipeline. It uses markdown as the source format, Chroma as the vector store, and local models served through Ollama.

![LangChain native RAG architecture](/assets/projects/native-rag.svg)

This part keeps the core loop visible:

- load documents
- split them into chunks
- embed them
- retrieve the most relevant pieces
- assemble context
- generate an answer

The goal here is clarity rather than complexity. It establishes the retrieval path that the second stage builds on.

## Stage 2: Agentic RAG

The second stage moves to LangGraph and treats the system more like a workflow than a single pass through retrieval and generation.

![LangGraph agentic RAG architecture](/assets/projects/agentic-rag.svg)

This stage adds:

- shared graph state
- routing between steps
- document relevance checks
- answer-quality checks
- retry behavior
- web fallback when local context is weak

This is where the project starts to feel more like systems engineering than prompt wiring. Once retrieval quality becomes uncertain, the workflow needs routing decisions, answer checks, and fallback logic that can keep the system useful under weaker conditions.

## Stack

- [Python](https://www.python.org/)
- [LangChain](https://python.langchain.com/docs/introduction/)
- [LangGraph](https://langchain-ai.github.io/langgraph/)
- [Ollama](https://ollama.com/) with [`qwen3:4b`](https://ollama.com/library/qwen3) and [`embeddinggemma`](https://ollama.com/library/embeddinggemma)
- [Chroma](https://docs.trychroma.com/)
- [Firecrawl](https://www.firecrawl.dev/)
- [Tavily](https://tavily.com/)

## What This Project Shows

What I value most in this repo is the transition between the two stages. It makes the system easier to reason about: what stays the same, what gets added, and why a plain retrieval pipeline eventually needs better orchestration.

For me, that is the main takeaway. RAG becomes more interesting when it is treated as a systems design problem, not just a prompt template around a vector store.
