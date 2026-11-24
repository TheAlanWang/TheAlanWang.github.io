---
layout: layouts/post.njk
title: Multi-Head Attention and GQA
description: "How attention is split into heads, worked through on Llama-3-8B: how the head size is set, what one head computes at each step, and why 4 Q heads share one K/V head (GQA)."
excerpt: "Q is cut into 32 heads of 128 numbers, K and V into only 8, and every 4 Q heads share one K/V head. That sharing cuts the KV cache by 4×, not the math."
date: 2026-11-23T18:00:00-08:00
category: Knowledge
subcategory: AI
topic: "Models & Training"
kind: Note
tags:
  - posts
permalink: /posts/multi-head-gqa/index.html
series: inference
seriesOrder: 2
order: 2
---
## Overview

<!-- Alan's summary goes here -->

[Q, K, V: Attention Basics](/posts/qkv-attention-basics/) showed one attention pass. Real models split it into heads. The running example is Llama-3-8B: x is 4,096 numbers, with 32 Q heads and 8 K/V heads.

## Why Cut into Heads

Q, K and V are cut into several equal parts called **heads**. Each head runs its own attention, with its own score table, so different heads can follow different things. The heads' results are joined end to end, and `o_proj` mixes them.

## How the Sizes Are Set

Q heads set the **head dim**, and KV heads set the K/V width:

```text
head dim = x width ÷ Q heads    = 4,096 ÷ 32 = 128 numbers
K width  = KV heads × head dim  = 8 × 128    = 1,024 numbers
```

K heads must be the same length as Q heads (128) so they can be compared, but how many there are is a design choice: Llama 3 picks 8. So `q_proj` is 4,096 × 4,096 and `k_proj` is 4,096 × 1,024. V is the same as K.

Cutting needs no math: head 1 is the first 128 numbers, head 2 the next 128, and so on.

<div class="qkv-demo mw-demo im-shape"><div class="mh-flow"><div class="mh-tag">K (and V): multiply, then cut into heads</div><div class="mh-line"><span class="mh-box "><span class="mh-m" style="grid-template-columns:repeat(6, 8px)"><i></i><i></i><i></i><i></i><i class="dots">⋯</i><i></i></span><b>x</b><em>1×4096</em></span><span class="mh-op">×</span><span class="mh-box "><span class="mh-m" style="grid-template-columns:repeat(4, 8px)"><i></i><i></i><i class="dots">⋯</i><i></i><i></i><i></i><i class="dots">⋯</i><i></i><i></i><i></i><i class="dots">⋯</i><i></i><i></i><i></i><i class="dots">⋯</i><i></i><i class="dots">⋮</i><i class="dots">⋮</i><i class="dots">⋱</i><i class="dots">⋮</i><i></i><i></i><i class="dots">⋯</i><i></i></span><b>k_proj</b><em>4096×1024</em></span><span class="mh-op">=</span><span class="mh-box "><span class="mh-m" style="grid-template-columns:repeat(4, 8px)"><i></i><i></i><i class="dots">⋯</i><i></i></span><b>K</b><em>1×1024</em></span></div><div class="im-cut"><span class="im-cut-l">cut K every 128:</span><span class="im-segs"><i class="g1">128<b>head 1</b></i><i class="g2">128<b>head 2</b></i><i class="more">⋯</i><i class="g2">128<b>head 8</b></i></span></div><div class="mh-tag">Q: same x, a wider matrix</div><div class="mh-line"><span class="mh-box "><span class="mh-m" style="grid-template-columns:repeat(6, 8px)"><i></i><i></i><i></i><i></i><i class="dots">⋯</i><i></i></span><b>x</b><em>1×4096</em></span><span class="mh-op">×</span><span class="mh-box "><span class="mh-m" style="grid-template-columns:repeat(6, 8px)"><i></i><i></i><i></i><i></i><i class="dots">⋯</i><i></i><i></i><i></i><i></i><i></i><i class="dots">⋯</i><i></i><i></i><i></i><i></i><i></i><i class="dots">⋯</i><i></i><i></i><i></i><i></i><i></i><i class="dots">⋯</i><i></i><i class="dots">⋮</i><i class="dots">⋮</i><i class="dots">⋮</i><i class="dots">⋮</i><i class="dots">⋱</i><i class="dots">⋮</i><i></i><i></i><i></i><i></i><i class="dots">⋯</i><i></i></span><b>q_proj</b><em>4096×4096</em></span><span class="mh-op">=</span><span class="mh-box "><span class="mh-m" style="grid-template-columns:repeat(6, 8px)"><i></i><i></i><i></i><i></i><i class="dots">⋯</i><i></i></span><b>Q</b><em>1×4096</em></span></div><div class="im-cut"><span class="im-cut-l">cut Q every 128:</span><span class="im-segs"><i class="g1">128<b>head 1</b></i><i class="g1">128<b>head 2</b></i><i class="more">⋯</i><i class="g2">128<b>head 32</b></i></span></div><div class="mh-tag">Every 4 Q heads share one K/V head (GQA)</div><div class="im-gqa"><div class="im-grp g1"><div class="im-qs"><i>Q1</i><i>Q2</i><i>Q3</i><i>Q4</i></div><div class="im-k">K/V 1</div></div><div class="im-grp g2"><div class="im-qs"><i>Q5</i><i>Q6</i><i>Q7</i><i>Q8</i></div><div class="im-k">K/V 2</div></div><div class="im-grp im-more">⋯</div><div class="im-grp g2"><div class="im-qs"><i>Q29</i><i>Q30</i><i>Q31</i><i>Q32</i></div><div class="im-k">K/V 8</div></div></div></div><p class="qd-hint">One token. 4096 ÷ 32 Q heads = 128 per head; K/V: 8 heads × 128 = 1024; 4 Q heads per K/V head. Only K and V go into the cache.</p></div>

## One Head, Step by Step

For a prompt of n tokens, Q head h and its shared K/V head g:

```text
scores = Q_h (n × 128) · K_gᵀ (128 × n)   → n × n
shares = softmax(scores ÷ √128)           → n × n
A_h    = shares (n × n) × V_g (n × 128)   → n × 128
```

Each token only scores itself and earlier tokens. All 32 heads do this, giving 32 results of n × 128. Joined end to end they are n × 4,096 again, and `o_proj` (4,096 × 4,096) turns them into the output, the same shape as x so it can be added back.

## GQA: Sharing K and V

Sharing does not merge the Q heads. Q1 to Q4 each score against the same K1 and mix the same V1, so they still give four different results, A1 to A4. GQA saves KV memory, not math.

Only K and V are cached: a token's Q is used once, so extra Q heads cost no memory. How many K/V heads a model has is fixed by its design:

| Design | KV heads (with 32 Q heads) | KV cache per token* |
|---|---|---|
| **MHA** (multi-head) | 32, one per Q head | 524 KB |
| **GQA** (grouped-query) | 8, shared by 4 Q heads each | 131 KB |
| **MQA** (multi-query) | 1, shared by all | 16 KB |

\* 32 layers, head dim 128, 2 bytes per number, 1 KB = 1,000 bytes. The formula is in [Inference Math](/posts/inference-math/). Llama 3 uses GQA: almost the same quality as MHA with a quarter of the KV cache.

## Q&A

**Q: Why does Q have more heads than K and V?**

A: Only K and V are stored in the KV cache and re-read at every decode step. Q is used once and thrown away, so Q heads are kept for quality and K/V heads are cut to save memory.

**Q: If 4 Q heads share one K/V head, do they give the same result?**

A: No. Each Q head is different, so each gets its own scores against the shared K, and its own mix of the shared V.

**Q: Does GQA make attention cheaper to compute?**

A: Not the math: all 32 Q heads still score every earlier token. It cuts KV memory by 4× and the bytes read per decode step, and decode is limited by reading, so it still gets faster.

## Demo

Every matrix in one attention layer, with its true shape: multiply and cut into heads, run each Q head with its K/V head, then join. Switch models to compare: Llama-2-7B has no sharing (MHA), Llama-3-8B shares each K/V head among 4 Q heads, Llama-3-70B among 8.

<div class="qkv-demo pf-demo mw-demo mh-demo" data-mh-demo data-mh-size="real"></div>

<script src="/assets/notes/tiny-llama.js" defer></script>
<script src="/assets/notes/multi-head-demo.js" defer></script>
