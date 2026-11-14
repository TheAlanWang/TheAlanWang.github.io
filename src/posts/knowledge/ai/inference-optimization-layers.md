---
layout: layouts/post.njk
title: Inference Optimization Layers
description: "Three layers for making LLM inference faster: algorithm-level (what gets computed), system-level (how requests and memory are managed), and kernel-level (how fast one GPU operation runs)."
excerpt: "LLM inference gets faster at three layers: change what gets computed, change how requests and memory are managed, or make a single GPU operation run faster."
date: 2026-11-13T11:00:00-08:00
category: Knowledge
subcategory: AI
topic: "Inference & Serving"
kind: Note
tags:
  - posts
permalink: /posts/inference-optimization-layers/index.html
---
## Overview

LLM inference can be made faster at three layers:

| Layer | What it changes | Examples |
|---|---|---|
| **Algorithm-level** | **what** gets computed | [KV cache](/posts/kv-cache/), quantization (FP8 / INT4), speculative decoding |
| **System-level** (serving) | **how requests and memory are managed** | PagedAttention, continuous batching, prefix caching |
| **Kernel-level** | **how fast one operation runs on the GPU** | FlashAttention, CUDA / Triton kernels, fused operators |

## Algorithm-level

Change the math or the amount of work, so the model does less.

- **[KV cache](/posts/kv-cache/)**: store the K and V of earlier tokens instead of recomputing them. Trades memory for compute.
- **GQA**: let several query heads share one K/V head, so there is less to store. See [Q, K, V: Attention Basics](/posts/qkv-attention-basics/).
- **Quantization**: store weights (and sometimes the KV cache) in fewer bits, e.g. FP8 instead of FP16. Less memory, faster reads, small quality loss.
- **Speculative decoding**: a small model drafts several tokens, and the large model checks them in one step.

## System-level (serving)

Keep the GPU busy and the memory full of useful work. This is what vLLM and SGLang do.

- **[PagedAttention](/posts/paged-attention/)**: split the KV cache into fixed-size blocks and allocate them on demand, so almost no memory is wasted.
- **Continuous batching**: add and remove requests at every step instead of waiting for a whole batch to finish.
- **Prefix caching**: reuse KV cache blocks across requests that start with the same tokens.

## Kernel-level

Make a single GPU operation faster. This needs CUDA or Triton knowledge.

- **FlashAttention**: compute attention in tiles that fit in fast on-chip memory, so the GPU reads slow memory less often.
- **Fused operators**: combine several small operations into one kernel to avoid extra memory trips.

## Where My Work Fits

My vLLM work was **client-side**: I changed an evaluation harness from serial requests to 8 concurrent requests, so vLLM's **system-level** continuous batching could take effect (2.5× throughput). I also measured **prefix caching**, another system-level feature. I did not work on kernels.

## Q&A

**Q: Is KV cache the same layer as PagedAttention?**

A: No. KV cache is algorithm-level: it decides not to recompute. PagedAttention is system-level: it decides how to store that cache in GPU memory without waste.

**Q: Have you done kernel-level optimization?**

A: No. I worked on the client side and used vLLM's system-level features. Kernel work like FlashAttention is a separate skill (CUDA / Triton).
