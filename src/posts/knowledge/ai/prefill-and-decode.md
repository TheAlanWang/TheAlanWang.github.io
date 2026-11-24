---
layout: layouts/post.njk
title: Prefill and Decode
description: "The two phases of LLM inference: prefill reads the whole prompt in one pass and is compute-bound; decode writes one token at a time and is memory-bound. What TTFT and TPOT measure, and why the two phases get in each other's way."
excerpt: "Every request runs in two phases: prefill reads the whole prompt at once and produces the first token; decode then writes the answer one token at a time. They have different bottlenecks and different latency metrics."
date: 2026-11-14T00:40:00-08:00
category: Knowledge
subcategory: AI
topic: "Inference & Serving"
kind: Note
tags:
  - posts
permalink: /posts/prefill-and-decode/index.html
series: inference
seriesOrder: 5
zh: true
order: 1
---
## Overview

> Prefill computes the **K and V** of every token in the **prompt** at once, and then generates the **first token**. Decode uses the previous tokens' K and V from the **KV cache** to generate the **next token**, one at a time.
>
> Prefill is **compute-bound**: it needs to do more calculation, because all the prompt tokens are processed with one read of the weights. Decode is **memory-bound**: each step **reads** all the weights and the KV cache, but only computes one token, so most of the time is spent reading memory.

Every LLM request goes through queue → prefill → decode → finish (see [Continuous Batching](/posts/continuous-batching/) for the full path). The two phases that do the work:

| | Prefill | Decode |
|---|---|---|
| What it does | reads the **whole prompt** | writes the answer |
| Tokens per step | all prompt tokens, at once | **1** per request |
| Output | K and V for every prompt token, plus the **first** output token | 1 more token, and its K and V |
| Bottleneck | **compute** (the GPU's math units) | **memory bandwidth** (reading weights and the KV cache) |
| Latency metric | **TTFT**: time to first token | **TPOT**: time per output token |

An analogy: an exam. Prefill is reading the whole question; you see all of it at once. Decode is writing the answer, one word at a time, and each word depends on the words before it.

## Prefill: Read the Whole Prompt at Once

When a request arrives, its prompt is already known: every token of it. So the model can process **all prompt tokens in one forward pass**:

1. Stack the prompt's tokens into one matrix (e.g. 1,000 tokens × 4096 numbers).
2. Run it through every layer. Each layer computes Q, K and V for all 1,000 tokens at once. Causal masking makes each token look only at the tokens before it, so doing them together gives the same result as doing them one by one.
3. Store every token's K and V in the [KV cache](/posts/kv-cache/).
4. The output at the **last** position is the first generated token.

So prefill does two jobs: it **fills the KV cache** for the prompt, and it **produces the first token**.

## Decode: Write One Token at a Time

After prefill, the answer is generated one token per step:

1. Feed in the token just generated (only 1 token).
2. Each layer computes this token's Q, K and V, reads the cached K and V of every earlier token, and appends the new K and V to the cache.
3. The output is the next token. Repeat until an end token or the length limit.

Decode cannot be parallel within one request: token 5 is not known until token 4 is generated.

## Why the Bottlenecks Differ

Each forward pass reads **all the weights** from GPU memory (about 16 GB for an 8B model in FP16). What differs is how much math is done with them:

- **Prefill**: the weights are read once and used for 1,000 tokens. Lots of math per byte read, so the math units are the limit: **compute-bound**. Time grows with prompt length.
- **Decode**: the weights are read once and used for 1 token per request. Little math per byte read, so the GPU mostly waits on memory: **memory-bound**.

That is why [continuous batching](/posts/continuous-batching/) helps decode so much: putting many requests in one step lets them share one read of the weights. Prefill gains less from batching, because it already has plenty of tokens per pass.

## The Metrics

- **TTFT** (time to first token): from sending the request to seeing the first token. Mostly queueing time plus prefill, so it grows with **prompt length**.
- **TPOT** (time per output token): the average time between tokens after the first. Set by decode, so it grows with **batch size** and **context length**.
- **ITL** (inter-token latency): the gap between two consecutive tokens. TPOT is its average; ITL also shows spikes.
- Total time ≈ TTFT + TPOT × (output tokens − 1).

A chat user feels TTFT as "how long before it starts answering" and TPOT as "how fast the text streams".

## When the Two Phases Share a Step

With continuous batching, a new request's prefill and other requests' decode run in the **same step**. A long prefill makes that step slow, so every decoding request's next token is late: an ITL spike.

**Chunked prefill** splits a long prompt into chunks, so each step does decode tokens for the running requests plus one chunk of prefill, within a token budget (`--max-num-batched-tokens` in vLLM). Prompts that fit in the budget are not split.

The trade-off: smaller chunks keep decoding smooth (steady ITL), but a long prompt takes more steps to finish, so its TTFT goes up.

## Making Each Phase Cheaper

- **Prefill**: [prefix caching](/posts/kv-cache/) reuses the K and V of a prompt start that an earlier request already computed, so that part is skipped and TTFT drops.
- **Decode**: batching, GQA and quantization (FP8) all cut the bytes read per token. See [Inference Optimization Layers](/posts/inference-optimization-layers/).

## Where My Work Fits

I measured prefix caching on re-runs: **TTFT fell from 3.07 s to 0.71 s**, because the cached part of the prompt skipped prefill. Raising client concurrency from 1 to 8 let vLLM batch decode steps, which raised throughput 2.5×.

## Q&A

**Q: Why can prefill process all prompt tokens at once but decode cannot?**

A: The prompt is fully known before the model starts, so all its tokens can go in one pass (causal masking keeps each token from seeing later ones). In decode, the next token does not exist until the current one is generated.

**Q: Which phase does prefix caching speed up, and which metric shows it?**

A: Prefill, so TTFT. The output after the first token is unchanged.

**Q: Why does TPOT get worse when more requests run at once?**

A: Each step does more work (more tokens, more KV cache to read), so each step takes a bit longer. Throughput still rises, because each step produces a token for every request in it.

## Demo

### What Each Layer Does

A scaled-down model (4 numbers per vector, 3 layers) with real math. Step through prefill, then switch to decode to compare.

<div class="qkv-demo pf-demo" data-pf-demo></div>
<script src="/assets/notes/prefill-flow-demo.js" defer></script>

### Why the Bottlenecks Differ

One step reads all the weights once, then does the math for every token in the step. Pick a preset or drag the slider to change how many tokens share that one read.

<div class="qkv-demo pd-demo" data-pd-demo></div>
<script src="/assets/notes/prefill-decode-demo.js" defer></script>
