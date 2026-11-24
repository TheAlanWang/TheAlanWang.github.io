---
layout: layouts/post.njk
title: Continuous Batching
description: "Continuous batching in short: why batching makes LLM decoding cheaper, why static batches waste the GPU, and how vLLM adds and removes requests at every step instead."
excerpt: "A static batch waits for its slowest request before anyone new can start. Continuous batching lets finished requests leave and waiting ones join at every generation step, so the GPU stays full."
date: 2026-11-14T00:20:00-08:00
category: Knowledge
subcategory: AI
topic: "Inference & Serving"
kind: Note
tags:
  - posts
permalink: /posts/continuous-batching/index.html
series: inference
seriesOrder: 10
order: 6
---
## Overview

> Continuous batching is how an **inference engine** (vLLM, SGLang, TensorRT-LLM) **schedules requests**. Instead of running a fixed batch until every request finishes, it **rebuilds the batch at every step**: finished requests leave right away, and waiting requests join when there are **free KV cache blocks**. This keeps the GPU busy.
>
> The trade-off: nothing is reserved for a request's future tokens, so memory can **run out during generation**. Then the engine **preempts** a running request and recomputes it later.

It is also called **iteration-level scheduling**. The idea comes from the Orca paper (OSDI 2022); vLLM combined it with [PagedAttention](/posts/paged-attention/), which hands out the [KV cache](/posts/kv-cache/) in small blocks.

## Why Batch at All

Generating one token (a **decode step**) means reading **all the model weights** from GPU memory, about 16 GB for an 8B model in FP16, to do a small amount of math for that one token. The GPU spends most of the step waiting on memory, not computing.

If 8 requests run in the same step, the weights are read **once** and used for all 8. The step takes only a little longer, but it produces 8 tokens instead of 1. That is why batching raises **throughput** (tokens per second across all requests) so much.

## Static vs. Continuous

The simple way is **static batching**: collect a batch, run it until every request is done, then start the next batch.

- Requests have different lengths. If one answer is 20 tokens and another is 500, the short one finishes early, and the batch keeps running with one request fewer until the long one ends.
- A new request that arrives mid-batch **waits** for the whole batch to finish, even though there is room.

So the GPU runs below capacity most of the time, and short requests pay for long ones. Continuous batching fixes both:

| | Static batching | Continuous batching |
|---|---|---|
| Batch changes | only between batches | every step |
| Finished request | its room sits unused until the batch ends | leaves at once, room reused next step |
| New request | waits for the whole batch | joins at the next step if the checks pass |
| GPU use | drops as requests finish | stays close to full |

## How It Works

A request's life:

```text
queue     wait until all 3 checks pass
  ↓
prefill   whole prompt at once, gives token 1
  ↓
decode    1 token per step, repeat
  ↓       (no free block: may be preempted, back to queue)
finish    free all its blocks
```

- **Prefill** computes K and V for the whole prompt and stores them in the KV cache; the same pass gives the first token. See [Prefill and Decode](/posts/prefill-and-decode/).
- **Decode** adds one token per step and appends its K and V to the cache. When its last block is full it gets a new one.
- **Finish**: at an end-of-sequence token or the length limit, the request frees all its blocks.

What the scheduler does at every step:

1. **Serves running requests first**: each gets 1 token, or the next chunk of its prompt. A request whose last block is full gets a new block; if none is free, the request that started last is **preempted** (paused, blocks freed, recomputed later).
2. **Admits waiting requests**, in arrival order, while all three checks pass:
   - fewer requests running than the limit (`--max-num-seqs` in vLLM);
   - token budget left in this step (`--max-num-batched-tokens`). A running request needs 1 token, but a new one needs its prompt's tokens, so a prompt bigger than the budget left is split across steps (**chunked prefill**);
   - enough free KV cache blocks for the tokens it computes now.

   If a request was preempted in this step, nobody new is admitted.
3. **Runs one forward pass** for everyone scheduled.
4. **Frees** the blocks of requests that just finished, so the next step can use them.

## Where It Fits

Continuous batching is a **system-level** optimization: it changes how requests are scheduled, not the model's math. See [Inference Optimization Layers](/posts/inference-optimization-layers/).

It needs [PagedAttention](/posts/paged-attention/). With max-length reservations, few requests fit in memory, so there is little to schedule. PagedAttention hands out the KV cache in small blocks, so many more requests fit, and continuous batching keeps them all moving. One frees the memory; the other fills it.

## Where My Work Fits

Continuous batching is always on in vLLM, but it only helps if the client **sends requests concurrently**. My evaluation harness first sent requests **one at a time**, so vLLM always ran a batch of 1. I changed it to send **8 concurrent requests**, which let continuous batching fill the batch. Throughput went from **6.2 to 15.3 video segments per minute (2.5×)**.

## Q&A

**Q: Does batching make each request faster?**

A: No. Each step does a bit more work, so one request's time per token can go up slightly. What improves is **throughput**: the GPU produces many more tokens per second in total.

**Q: Why not batch as many requests as possible?**

A: The KV cache. Every running request holds cache for all its tokens, so GPU memory caps the batch. Past a point, more concurrency only means more queueing or preemption, and per-token latency keeps rising.

**Q: Continuous batching vs. PagedAttention?**

A: PagedAttention is about **memory**: how the KV cache is stored so little is wasted. Continuous batching is about **scheduling**: which requests run in each step. They work together but solve different problems. Both are system-level optimizations: neither changes what the model computes, so the output stays the same.

## Demo

<div class="qkv-demo kv-cache-demo paged-demo cb-demo" data-cb-demo></div>
<script src="/assets/notes/continuous-batching-demo.js" defer></script>
