---
layout: layouts/post.njk
title: PagedAttention
description: "PagedAttention in short: why reserving KV cache memory per request wastes most of it, how vLLM splits the cache into fixed-size blocks like OS memory pages, and how that enables more concurrent requests and prefix sharing."
excerpt: "Instead of reserving max-length memory for every request, vLLM hands out small KV cache blocks on demand, like an operating system's memory pages. Almost nothing is wasted, so more requests fit at once."
date: 2026-11-06T14:00:00-08:00
category: Knowledge
subcategory: AI
topic: "Inference & Serving"
kind: Note
tags:
  - posts
permalink: /posts/paged-attention/index.html
---
## Overview

> PagedAttention manages the **KV cache**. Instead of reserving the maximum length for every request, it splits GPU memory into small **fixed-size blocks**, 16 tokens by default. When a request's last block is full, it gets a new block. Each request has a **block table** that records where its blocks are. So almost no memory is wasted, and **more requests can run at the same time**.
>
> The trade-off: since nothing is reserved, memory can **run out** in the middle of generation. Then vLLM pauses a request, frees its blocks, and **recomputes** its KV cache later. Also, a request's blocks are scattered in memory, so attention needs a **special kernel** that follows the block table to find them.

PagedAttention is how **vLLM manages KV cache memory**. It does not change *what* is stored (that is the [KV cache](/posts/kv-cache/)); it changes *how the cache is laid out* in GPU memory. The idea comes from **paging** in operating systems.

## The Problem

When a request starts, nobody knows how many tokens it will end up with. The traditional approach reserves one **contiguous** chunk of memory sized for the **maximum length** (`max_model_len`):

- `max_model_len` = 8K, so every request reserves room for 8,000 tokens' K and V.
- The request finishes after 500 tokens. The other 7,500 slots sat empty the whole time, and no other request could use them.
- Gaps between chunks of different sizes add more waste (**fragmentation**).

The vLLM paper measured that existing systems used only **20–40%** of KV cache memory for actual tokens.

## How It Works

1. At startup, vLLM claims a pool of GPU memory (`--gpu-memory-utilization`) and cuts the part left after the weights into fixed-size **blocks**, e.g. 16 tokens' K and V each.
2. A request starts with one block and takes another only when the current one fills up.
3. Blocks do **not** need to sit next to each other. Each request keeps a **block table** that maps its logical positions to physical blocks, like a page table.
4. When the request finishes, its blocks go back to the pool for the next request.

Waste per request is at most the unused part of its last block: fewer than 16 tokens.

| | Traditional | PagedAttention |
|---|---|---|
| Allocation | one contiguous chunk, sized for max length | small blocks, on demand |
| Memory layout | must be contiguous | blocks can be anywhere |
| Waste | most of the reservation | under one block per request |
| Requests that fit | few | many more |

## What It Enables

- **Continuous batching**: PagedAttention frees the memory; continuous batching fills it with more requests. Together they are why vLLM's throughput is high.
- **Prefix caching**: requests that start with the same tokens can point their block tables at the **same physical blocks**, so the shared prefix is stored once.
- **Preemption**: when the pool runs out, vLLM can pause a request, release its blocks, and recompute them later, instead of failing.

## Where It Fits

PagedAttention is a **system-level** optimization: it manages memory and leaves the model's math unchanged. The KV cache itself is algorithm-level. See [Inference Optimization Layers](/posts/inference-optimization-layers/).

SGLang manages its KV cache in pages too, but its signature feature is **RadixAttention**: a radix tree over token prefixes that finds and reuses the longest matching prefix automatically, which helps most in multi-turn chat and agents.

## Q&A

**Q: Is PagedAttention a different kind of cache?**

A: No. It is a way of storing the KV cache. The K and V values are the same; only their placement in memory changes.

**Q: Why are blocks 16 tokens and not 1 or 1,000?**

A: It is a trade-off. Bigger blocks waste more space at the end of each request. Smaller blocks make block tables longer and lookups more expensive. 16 is vLLM's default.

**Q: What happens when all blocks are in use?**

A: New requests wait in the queue. If a running request needs another block and none is free, vLLM preempts some requests: it frees their blocks and recomputes their K and V when space opens up.

## Try It

<div class="qkv-demo kv-cache-demo paged-demo" data-paged-demo></div>
<script src="/assets/notes/paged-attention-demo.js" defer></script>
