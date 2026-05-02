---
layout: layouts/post.njk
title: RAG Overview
description: A visual overview of retrieval, ranking, and generation flow in a RAG pipeline.
excerpt: A visual overview of retrieval, ranking, and generation flow in a RAG pipeline.
date: 2026-03-31
type: Sketch
topic: RAG
tags:
  - posts
image: /assets/sketches/rag-overview.svg
imageFit: contain
permalink: /posts/rag-overview/index.html
---
This post is a high-level sketch of a retrieval-augmented generation pipeline. The focus is structural: what the major steps are, how retrieval and ranking fit together, and where generation actually happens.

![RAG Overview](/assets/sketches/rag-overview.svg)

## What It Covers

- query handling
- retrieval and ranking stages
- prompt assembly
- model generation
- how these pieces relate in one pipeline

I use this kind of sketch as a quick mental model before getting into implementation detail.
