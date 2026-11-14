---
layout: layouts/post.njk
title: KV Cache
description: "KV cache in short: what it stores, why it makes LLM generation faster, how big it gets, and how it relates to PagedAttention and prefix caching."
excerpt: "An LLM keeps the keys and values of every earlier token so it never recomputes them. That trade of memory for compute is why GPU memory, not compute, limits how many requests can run at once."
date: 2026-11-06T12:00:00-08:00
category: Knowledge
subcategory: AI
topic: "Inference & Serving"
kind: Note
tags:
  - posts
permalink: /posts/kv-cache/index.html
---
## Overview

> The KV cache is **per request**. For each token, we store its **K and V vectors** at every layer, so the next token doesn't need to **recompute** them.
> The trade-off is **GPU memory**. The cache grows with every token, so memory limits how many requests can run at once.

An LLM generates text one **token** at a time. To produce each new token, every attention layer looks back at all earlier tokens through their **K (key)** and **V (value)** vectors. (New to Q, K and V? Start with [Q, K, V: Attention Basics](/posts/qkv-attention-basics/).)

**What it stores**: the K and V vectors of every token already processed, for every layer.

**Why it speeds things up**: without the cache, each new token would recompute K and V for all earlier tokens. With the cache, each step computes K and V for the **new token only** and appends them. It trades **memory for compute**.

**The cost**: the cache grows with every token and lives in GPU memory, so memory, not compute, limits how many requests can run at once.

## How Big It Gets

```text
per token = 2 (K and V) × layers × KV heads × head dim × bytes per number
total     = per token × tokens × concurrent requests
```

Example, Llama-3-8B (32 layers, 8 KV heads, head dim 128, FP16 = 2 bytes):

- per token: 2 × 32 × 8 × 128 × 2 ≈ **128 KB**
- one 8K-token request ≈ **1 GB**
- 32 such requests ≈ **32 GB**, more than the model weights (about 16 GB)

GPU memory = model weights + KV cache (+ a small amount of activations).

## In vLLM

- `--max-model-len`: the most tokens one request can use. A larger limit lets one request take more cache, so fewer requests fit at once.
- `--gpu-memory-utilization` (default 0.9): how much GPU memory vLLM claims at startup. What is left after the weights becomes KV cache space.
- **[PagedAttention](/posts/paged-attention/)** splits the cache into fixed-size blocks and allocates them on demand, so little memory is wasted.
- **Prefix caching** reuses cached blocks when a new request starts with exactly the same tokens.

## Which Layer

The KV cache is an **algorithm-level** optimization: it changes *what* gets computed. Managing it in memory, as PagedAttention does, is a system-level problem. See [Inference Optimization Layers](/posts/inference-optimization-layers/).

## Q&A

**Q: Why does the KV cache grow with context length?**

A: Every token adds its own K and V to the cache, for every layer, so the size is proportional to the number of tokens.

**Q: Why not set `max_model_len` as large as possible?**

A: vLLM must be able to fit at least one max-length sequence in memory, so a very large limit may stop a big model from starting at all. With PagedAttention, vLLM does not reserve that much for every request up front, but a larger limit still lets a single request grow its cache that far, so a few very long requests can take most of the memory and crowd out the rest.

**Q: KV cache vs. prefix caching?**

A: The KV cache lives inside one request and saves recomputing earlier tokens while that request generates. Prefix caching lets **different requests** share cached blocks when they start with **exactly the same tokens**, such as the same system prompt. The match must start from the first token and be exact: one different token ends the shared part. The shared part is computed once, so the next request skips that work and its first token comes back sooner. Output is unchanged, because the reused K and V are identical to what would have been recomputed.

## Try It

Three figures, from one token to the whole cache: how a token's K and V are cut into heads (and how MHA, GQA and MQA differ), how the cache grows by one column per new token, and how much memory it all takes.

<div class="qkv-demo kv-cache-demo" data-kv-cache-demo></div>
<script src="/assets/notes/kv-cache-demo.js" defer></script>
