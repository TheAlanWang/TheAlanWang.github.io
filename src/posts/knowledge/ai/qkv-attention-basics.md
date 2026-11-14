---
layout: layouts/post.njk
title: "Q, K, V: Attention Basics"
description: "How attention works from scratch: what Q, K and V are, how they are computed, how one token mixes in the others, what heads and GQA are, and why K and V are cached."
excerpt: "Every token makes three vectors: Q to ask, K to be matched, V to hand over. Attention compares one token's Q with every K, then mixes the V's by those scores."
date: 2026-11-13T13:00:00-08:00
category: Knowledge
subcategory: AI
topic: "Models & Training"
kind: Note
tags:
  - posts
permalink: /posts/qkv-attention-basics/index.html
---
## Overview

To understand a word, a model has to look at the other words around it. In "Tom gave Mom an apple, and she smiled", "she" only makes sense after looking back at "Mom". **Attention**, introduced with the Transformer in [Attention Is All You Need](/posts/attention-is-all-you-need/), is how every token decides which other tokens to look at, and how much.

Each token makes three vectors:

| | Analogy (video search) | Role |
|---|---|---|
| **Q** (query) | the words you type in the search box | what am I looking for? |
| **K** (key) | each video's title and tags | what am I? used to be matched |
| **V** (value) | the video itself | my content, handed over when picked |

Short version: **Q asks, K matches, V gives.**

## How Q, K and V Are Computed

A token first becomes a vector (4096 numbers in Llama-3-8B, looked up from a table learned in training). Then each layer multiplies it by three learned weight tables:

```text
Q = x × W_Q    (4096 numbers)
K = x × W_K    (1024 numbers)
V = x × W_V    (1024 numbers)
```

The number of columns in each table sets the output size. K and V are computed smaller from the start; nothing is merged.

## One Attention Step

1. **Score**: compare the token's Q with every earlier token's K (and its own). The comparison is a dot product: the more alike, the higher the score.
2. **Softmax**: turn the scores into shares that add up to 100%.
3. **Mix**: add up every token's V, weighted by those shares. The result is this token's output for the layer, passed to the next layer.

## Heads and GQA

The vector is cut into pieces of 128 numbers, and each piece runs its own attention. Each piece is a **head**, and each head learns to look for a different relation. Q and K heads must be the same length (128) so they can be compared.

How many K and V heads a model has is fixed by its design:

| Design | KV heads (with 32 Q heads) | KV cache per token* |
|---|---|---|
| **MHA** (multi-head) | 32, one per Q head | 512 KB |
| **GQA** (grouped-query) | 8, shared by 4 Q heads each | 128 KB |
| **MQA** (multi-query) | 1, shared by all | 16 KB |

\* 32 layers, head size 128, FP16. Llama-3 uses GQA: almost the same quality as MHA with a quarter of the KV cache. GQA is an algorithm-level way to make inference cheaper; see [Inference Optimization Layers](/posts/inference-optimization-layers/).

## Why K and V Are Cached

- A token's **Q** is used once, by that token, at its own step.
- Its **K** and **V** are read by every later token, at every layer.
- Attention is **causal**: a token only sees tokens before it, so its K and V never change once computed.

So K and V are stored instead of recomputed. That store is the [KV cache](/posts/kv-cache/).

## Q&A

**Q: Why does generating a token need earlier tokens' K and V but not their Q?**

A: Q is only used by its own token to search. K and V are what later tokens search and read, so they are needed at every new step.

**Q: Are Q and K matched one to one?**

A: In length, yes: each head is 128 numbers so the dot product works. In count, not with GQA: 4 Q heads share one K head and its paired V head. Across tokens, one Q is compared with every earlier K.

**Q: Why can K and V be cached at all?**

A: Causal attention. A token only looks at earlier tokens, so later tokens cannot change its K and V. Compute once, reuse every step.

## Try It

Step through one attention pass on the example sentence, from the neural-network picture of Q, K and V to how the KV cache fills up across layers.

<div class="qkv-demo" data-qkv-demo></div>
<script src="/assets/notes/qkv-demo.js" defer></script>
