---
layout: layouts/post.njk
title: Inference Math
description: "The cost model behind LLM inference, worked out with real numbers: weight size, KV cache per token, how much fits in GPU memory, decode speed, FLOPs per token, arithmetic intensity and the roofline, and prefill time. Llama-3-8B on an H200."
excerpt: "Every inference number from one short chain of formulas: 16 GB of weights, 131 KB of KV per token, about 300 tokens/s for decode, and why decode is memory-bound by about 200×."
date: 2026-11-23T12:00:00-08:00
category: Knowledge
subcategory: AI
topic: "Inference & Serving"
kind: Note
tags:
  - posts
permalink: /posts/inference-math/index.html
series: inference
seriesOrder: 6
order: 2
zh: true
---
## Overview

<!-- Alan's summary goes here -->

[Prefill and Decode](/posts/prefill-and-decode/) said decode is memory-bound and prefill is compute-bound. This post puts numbers on it: seven formulas, each using the result of the one before. The running example is Llama-3-8B in BF16 (2 bytes per number) on one H200.

| | Numbers used below |
|---|---|
| Llama-3-8B | 8.03 B parameters, 32 layers, 32 Q heads and 8 KV heads, head dim 128 |
| H200 | 141 GB memory, 4.8 TB/s bandwidth, 989 TFLOPS in FP16 / BF16 |

The three GPU numbers: **memory** is how much it holds; **bandwidth** is how many bytes it reads from that memory per second (1 TB = 1,000 GB); **TFLOPS** (tera floating-point operations per second) is how many multiplies or adds it does per second, in units of 10¹², when the numbers are 16-bit (FP16 or BF16).

## 1. Weights

```text
weights = params × bytes per number
        = 8.03 B params × 2 bytes
        = 16,060,000,000 bytes
        = 16,060,000 KB = 16,060 MB ≈ 16 GB
```

Every decode step reads all 16 GB once. The 2 comes from the format: 16 bits ÷ 8 bits per byte. New models like Llama 3 ship in BF16; FP16 is the same size. Each format splits its bits into sign / range / precision:

| Format | Bits | Digits | Max |
|---|---|---|---|
| FP32 (4 bytes) | 1 / 8 / 23 | ~7 | 3 × 10³⁸ |
| FP16 (2 bytes) | 1 / 5 / 10 | ~3 | 65,504 |
| BF16 (2 bytes) | 1 / 8 / 7 | ~2 | 3 × 10³⁸ |
| FP8 (1 byte) | 1 / 4 / 3 | 1–2 | 448 |

BF16 moves 3 bits from precision to range, so it has FP32's range and does not overflow in training. Weights are small numbers, mostly between −0.1 and 0.1, so precision matters more than range. FP8 (the E4M3 variant here) halves the bytes, but with only 1 to 2 digits it needs a scale factor per group of weights.

## 2. KV per Token

```text
KV per token = 2 (K and V) × KV heads × head dim × bytes per number × layers
             = (2 × 8 heads × 128 numbers × 2 bytes) × 32 layers
             = 4,096 bytes per layer × 32 layers
             = 131,072 bytes
             ≈ 131 KB
```

Q heads set the **head dim**, and KV heads set the K/V width:

```text
head dim = x width ÷ Q heads    = 4,096 ÷ 32 = 128 numbers
K width  = KV heads × head dim  = 8 × 128    = 1,024 numbers
```

The head dim is set by Q first. K heads must be the same length (128) so each can be compared with a Q head, but there are only 8 of them. So `q_proj` is 4,096 × 4,096 and `k_proj` is 4,096 × 1,024, and every 4 Q heads share one K/V head (GQA). V is the same as K.

<div class="qkv-demo mw-demo im-shape"><div class="mh-flow"><div class="mh-tag">K (and V): multiply, then cut into heads</div><div class="mh-line"><span class="mh-box "><span class="mh-m" style="grid-template-columns:repeat(6, 8px)"><i></i><i></i><i></i><i></i><i class="dots">⋯</i><i></i></span><b>x</b><em>1×4096</em></span><span class="mh-op">×</span><span class="mh-box "><span class="mh-m" style="grid-template-columns:repeat(4, 8px)"><i></i><i></i><i class="dots">⋯</i><i></i><i></i><i></i><i class="dots">⋯</i><i></i><i></i><i></i><i class="dots">⋯</i><i></i><i></i><i></i><i class="dots">⋯</i><i></i><i class="dots">⋮</i><i class="dots">⋮</i><i class="dots">⋱</i><i class="dots">⋮</i><i></i><i></i><i class="dots">⋯</i><i></i></span><b>k_proj</b><em>4096×1024</em></span><span class="mh-op">=</span><span class="mh-box "><span class="mh-m" style="grid-template-columns:repeat(4, 8px)"><i></i><i></i><i class="dots">⋯</i><i></i></span><b>K</b><em>1×1024</em></span></div><div class="im-cut"><span class="im-cut-l">cut K every 128:</span><span class="im-segs"><i class="g1">128<b>head 1</b></i><i class="g2">128<b>head 2</b></i><i class="more">⋯</i><i class="g2">128<b>head 8</b></i></span></div><div class="mh-tag">Q: same x, a wider matrix</div><div class="mh-line"><span class="mh-box "><span class="mh-m" style="grid-template-columns:repeat(6, 8px)"><i></i><i></i><i></i><i></i><i class="dots">⋯</i><i></i></span><b>x</b><em>1×4096</em></span><span class="mh-op">×</span><span class="mh-box "><span class="mh-m" style="grid-template-columns:repeat(6, 8px)"><i></i><i></i><i></i><i></i><i class="dots">⋯</i><i></i><i></i><i></i><i></i><i></i><i class="dots">⋯</i><i></i><i></i><i></i><i></i><i></i><i class="dots">⋯</i><i></i><i></i><i></i><i></i><i></i><i class="dots">⋯</i><i></i><i class="dots">⋮</i><i class="dots">⋮</i><i class="dots">⋮</i><i class="dots">⋮</i><i class="dots">⋱</i><i class="dots">⋮</i><i></i><i></i><i></i><i></i><i class="dots">⋯</i><i></i></span><b>q_proj</b><em>4096×4096</em></span><span class="mh-op">=</span><span class="mh-box "><span class="mh-m" style="grid-template-columns:repeat(6, 8px)"><i></i><i></i><i></i><i></i><i class="dots">⋯</i><i></i></span><b>Q</b><em>1×4096</em></span></div><div class="im-cut"><span class="im-cut-l">cut Q every 128:</span><span class="im-segs"><i class="g1">128<b>head 1</b></i><i class="g1">128<b>head 2</b></i><i class="more">⋯</i><i class="g2">128<b>head 32</b></i></span></div><div class="mh-tag">Every 4 Q heads share one K/V head (GQA)</div><div class="im-gqa"><div class="im-grp g1"><div class="im-qs"><i>Q1</i><i>Q2</i><i>Q3</i><i>Q4</i></div><div class="im-k">K/V 1</div></div><div class="im-grp g2"><div class="im-qs"><i>Q5</i><i>Q6</i><i>Q7</i><i>Q8</i></div><div class="im-k">K/V 2</div></div><div class="im-grp im-more">⋯</div><div class="im-grp g2"><div class="im-qs"><i>Q29</i><i>Q30</i><i>Q31</i><i>Q32</i></div><div class="im-k">K/V 8</div></div></div></div><p class="qd-hint">One token. 4096 ÷ 32 Q heads = 128 per head; K/V: 8 heads × 128 = 1024; 4 Q heads per K/V head. Only K and V go into the cache.</p></div>

Sharing does not merge the Q heads. Q1 to Q4 each score against the same K1 and mix the same V1, so they still give four different results, A1 to A4. All 32 results are joined back into 4,096 numbers. GQA saves KV memory, not math. The Multi-Head demo in [Forward Pass](/posts/forward-pass/#demo) draws this.

Only K and V are cached: a new token's Q is used once, to score against the earlier K's. Without GQA, K and V would have 32 heads too, and this would be 4× bigger (524 KB).

This post counts 1 KB = 1,000 bytes, the same way GPU memory is quoted (141 GB). The 128 KB you often hear divides by 1,024 instead.

## 3. How Much KV Fits

```text
memory left for KV = H200 memory − model weights
                   = 141 GB − 16 GB
                   ≈ 125 GB

tokens that fit    = memory left ÷ KV per token
                   = 125 GB ÷ 131 KB
                   ≈ 950,000 tokens

assume each request has 1,024 tokens (prompt + answer so far)

requests at once   = tokens that fit ÷ tokens per request
                   = 950,000 ÷ 1,024
                   ≈ 930 requests (116 if each has 8,192 tokens)
```

So about 930 requests can run at once. When the KV fills up, new requests wait. In practice it is a bit fewer: vLLM uses 90% of memory by default, and activations need some too.

## 4. Decode Speed

```text
bytes per step = weights + batch × context × KV per token
               = 16.06 GB + 1 × 1,024 × 131 KB
               = 16.06 GB + 0.13 GB ≈ 16.2 GB
step time      = bytes per step ÷ bandwidth
               = 16.2 GB ÷ 4.8 TB/s
               = 16.2 GB ÷ 4,800 GB/s
               ≈ 0.0034 s
               = 3.4 ms
tokens/s       = 1,000 ms ÷ 3.4 ms ≈ 300 tokens/s
```

So one token reads **16.2 GB** from memory: all the weights once, plus this request's KV.

Rule of thumb for one request: **bandwidth ÷ weight size**. On an H100 (3.35 TB/s) it is about 209 tokens/s.

## 5. Math per Token

Step 4 counted the bytes read per token; this step counts the math. A **FLOP** (floating-point operation) is one multiply or one add, and 1 GFLOP (giga) = 10⁹ FLOP. Steps 6 and 7 use this number to tell whether **reading** or **math** is the bottleneck.

```text
x × q_proj, k_proj, v_proj, o_proj, FFN (every weight, 32 layers)
weights   = 2 × params = 2 × 8.03 B ≈ 16.06 GFLOP
            (2 = one × and one + per weight)

Q · K (score), then score × V, with every earlier token
attention = 4 × layers × context × (Q heads × head dim)
          = 4 × 32 × 1,024 × 4,096 ≈ 0.54 GFLOP
            (4 = 2 for Q · K + 2 for score × V)

total     = 16.06 + 0.54 ≈ 16.6 GFLOP per token
```

So one token takes **16.6 GFLOP**: about 16.6 billion multiplies and adds.

## 6. Arithmetic Intensity and the Roofline

Every step does two things: read bytes from memory and do math. The GPU does both at the same time, so the step takes as long as the slower one:

```text
step time = max(reading time, math time)

decode:  reading = 16.2 GB ÷ 4.8 TB/s       ≈ 3.4 ms     ← slower
         math    = 16.6 GFLOP ÷ 989 TFLOPS  ≈ 0.017 ms
```

Reading is about 200× slower, so decode is **memory-bound**: the math units mostly wait for data.

Which side is slower comes down to one comparison. Math is the slower side only when:

```text
FLOPs ÷ peak FLOPS  >  bytes ÷ bandwidth        ← math time > reading time
FLOPs ÷ bytes       >  peak FLOPS ÷ bandwidth   ← move terms: work left, GPU right
intensity           >  machine balance          ← name the two sides
decode:     1       <  206 (H200)               ← not true, so reading is slower
```

The left side, **arithmetic intensity**, depends only on the work: FLOPs per byte read. The right side, **machine balance**, depends only on the GPU. Below 206, the GPU waits for data; above it, for math.

A **roofline** draws the same max as a speed (FLOPs ÷ step time):

```text
speed  = min(peak FLOPS, bandwidth × intensity)
decode = min(989, 4.8 × 1) ≈ 4.8 TFLOPS   (0.5% of peak)

TFLOPS (log)
  989 |                    *-----------*---- roof: peak FLOPS
      |                   /  corner  prefill ≈ 1,000
      |                 /    (206)
      |               /
      |             /   slope: bandwidth × intensity
  4.8 |           * decode ≈ 1
      +-----------+--------+-----------+---> FLOP/byte (log)
                  1       206        1,000
```

To move right, a step needs more math per byte read. **Batching** does that: it shares one weight read across B requests, but each request still reads its own KV, so the intensity stops growing:

```text
FLOPs = B × 16.6 GFLOP
bytes = 16.06 GB (weights, shared) + B × 0.134 GB (KV, one per request)

very large B:  intensity → 16.6 GFLOP ÷ 0.134 GB  ≈ 124   (1K context)
                           20 GFLOP ÷ 1.07 GB     ≈ 19    (8K context)
```

Both are below 206, so decode stays memory-bound however big the batch.

## 7. Prefill Time

```text
math = 2 × params × prompt length + attention
     = 2 × 8.03 B × 1,024 + 0.3 TFLOP ≈ 16.7 TFLOP
math time = 16.7 TFLOP ÷ 989 TFLOPS ≈ 17 ms
read time = 16 GB ÷ 4.8 TB/s        ≈ 3.4 ms
```

The math takes longer than the read, so prefill is compute-bound. The ideal TTFT is about 17 ms, plus queueing. With a very short prompt (about 200 tokens or fewer), even prefill is memory-bound.

## 8. What Each Optimization Changes

| Optimization | Which number it changes |
|---|---|
| Batching | One weight read (step 4) is shared by B tokens, so intensity (step 6) grows about B× |
| FP8 weights | Bytes per number 2 → 1: weights (step 1) halve, decode (step 4) about 2× faster |
| FP8 KV cache | KV per token (step 2) halves: twice as many tokens fit (step 3) |
| GQA | KV heads 32 → 8: KV per token (step 2) ÷ 4 |
| PagedAttention | Little of the free memory (step 3) is wasted, so it really holds that many tokens |
| Prefix caching | Skips the prefill math (step 7) for the cached part of the prompt |
| Speculative decoding | One weight read (step 4) checks several tokens instead of one |

[Inference Optimization Layers](/posts/inference-optimization-layers/) goes through these one by one.

## Q&A

**Q: About how fast can one request decode with an 8B model on an H200?**

A: Each token reads all the weights once: 4.8 TB/s ÷ 16 GB ≈ 300 tokens/s. That is an upper bound; real numbers are lower.

**Q: Why does batching help decode so much, but prefill hardly at all?**

A: Decode does about 1 FLOP per byte, far below the GPU's 206, so sharing one weight read across more requests is almost free. Prefill already does about 1,000 FLOPs per byte and is limited by compute.

**Q: Can Llama-3-70B in BF16 run on one H200?**

A: No. Its weights are 70.6 B × 2 = 141 GB, all of the GPU's memory, with nothing left for the KV cache. Use FP8 (71 GB) or split it across two GPUs.

## Demo

Change the model, GPU, precision, batch and context, and every number above is recomputed. Turn on "Hide answers" to work each one out first, then click it to check.

<div class="qkv-demo im-demo" data-im-demo></div>
<script src="/assets/notes/inference-math-demo.js" defer></script>
