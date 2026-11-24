---
layout: layouts/post.njk
title: 推理计算
description: "用真实数字算一遍 LLM 推理的成本：权重多大、每个 token 的 KV cache 多大、显存能装多少、decode 多快、每个 token 要算多少、arithmetic intensity 和 roofline，以及 prefill 要多久。Llama-3-8B 跑在 H200 上。"
excerpt: "一串公式算出所有推理数字：16 GB 权重、每个 token 131 KB 的 KV、decode 约 300 tokens/s，以及为什么 decode 读数据比计算慢约 200 倍。"
date: 2026-11-23T12:00:00-08:00
category: Knowledge
subcategory: AI
topic: "Inference & Serving"
kind: Note
tags:
  - posts
permalink: /posts/inference-math/zh/index.html
lang: zh
eleventyExcludeFromCollections: true
---
## 概览

<!-- Alan's summary goes here -->

[Prefill 和 Decode](/posts/prefill-and-decode/zh/) 说过 decode 是 memory-bound、prefill 是 compute-bound。这篇用数字把它算出来：七个公式，每个都用上一个的结果。例子是 Llama-3-8B，BF16（每个数 2 bytes），跑在一张 H200 上。

| | 下面用到的数字 |
|---|---|
| Llama-3-8B | 8.03 B 参数，32 层，32 个 Q head、8 个 KV head，head dim 128 |
| H200 | 显存 141 GB，带宽 4.8 TB/s，FP16 / BF16 算力 989 TFLOPS |

GPU 的三个数字：**显存**是能装多少；**带宽**是每秒能从显存读多少 byte（1 TB = 1,000 GB）；**TFLOPS**（tera floating-point operations per second）是每秒能做多少次乘法或加法，单位是 10¹²，前提是数字是 16 bit（FP16 或 BF16）。

## 1. 权重

```text
weights = params × bytes per number
        = 8.03 B params × 2 bytes
        = 16,060,000,000 bytes
        = 16,060,000 KB = 16,060 MB ≈ 16 GB
```

每个 decode step 都要把这 16 GB 读一遍。2 来自数字格式：16 bit ÷ 每 byte 8 bit。Llama 3 这类新模型用 BF16 发布；FP16 大小一样。每种格式把 bit 分成 符号 / 范围 / 精度 三部分：

| 格式 | Bits | 有效位数 | 最大值 |
|---|---|---|---|
| FP32（4 bytes） | 1 / 8 / 23 | ~7 | 3 × 10³⁸ |
| FP16（2 bytes） | 1 / 5 / 10 | ~3 | 65,504 |
| BF16（2 bytes） | 1 / 8 / 7 | ~2 | 3 × 10³⁸ |
| FP8（1 byte） | 1 / 4 / 3 | 1–2 | 448 |

BF16 从精度挪了 3 bit 给范围，所以范围和 FP32 一样，训练时不会溢出。权重都是小数，大多在 −0.1 到 0.1 之间，所以精度比范围更重要。FP8（这里是 E4M3）把 byte 数减半，但只有 1 到 2 位有效数字，需要给每组权重配一个缩放系数。

## 2. 每个 Token 的 KV

```text
KV per token = 2 (K and V) × KV heads × head dim × bytes per number × layers
             = (2 × 8 heads × 128 numbers × 2 bytes) × 32 layers
             = 4,096 bytes per layer × 32 layers
             = 131,072 bytes
             ≈ 131 KB
```

Q head 数决定 **head dim**，KV head 数决定 K/V 的宽度：

```text
head dim = x width ÷ Q heads    = 4,096 ÷ 32 = 128 numbers
K width  = KV heads × head dim  = 8 × 128    = 1,024 numbers
```

head dim 先由 Q 定下来。K 的每个 head 必须一样长（128），才能和 Q head 做点积，但 K 只有 8 个 head。所以 `q_proj` 是 4,096 × 4,096，`k_proj` 是 4,096 × 1,024，每 4 个 Q head 共用一组 K/V（GQA）。V 和 K 一样。

<div class="qkv-demo mw-demo im-shape"><div class="mh-flow"><div class="mh-tag">K（V 一样）：先乘矩阵，再切成 head</div><div class="mh-line"><span class="mh-box "><span class="mh-m" style="grid-template-columns:repeat(6, 8px)"><i></i><i></i><i></i><i></i><i class="dots">⋯</i><i></i></span><b>x</b><em>1×4096</em></span><span class="mh-op">×</span><span class="mh-box "><span class="mh-m" style="grid-template-columns:repeat(4, 8px)"><i></i><i></i><i class="dots">⋯</i><i></i><i></i><i></i><i class="dots">⋯</i><i></i><i></i><i></i><i class="dots">⋯</i><i></i><i></i><i></i><i class="dots">⋯</i><i></i><i class="dots">⋮</i><i class="dots">⋮</i><i class="dots">⋱</i><i class="dots">⋮</i><i></i><i></i><i class="dots">⋯</i><i></i></span><b>k_proj</b><em>4096×1024</em></span><span class="mh-op">=</span><span class="mh-box "><span class="mh-m" style="grid-template-columns:repeat(4, 8px)"><i></i><i></i><i class="dots">⋯</i><i></i></span><b>K</b><em>1×1024</em></span></div><div class="im-cut"><span class="im-cut-l">K 每 128 个切一段：</span><span class="im-segs"><i class="g1">128<b>head 1</b></i><i class="g2">128<b>head 2</b></i><i class="more">⋯</i><i class="g2">128<b>head 8</b></i></span></div><div class="mh-tag">Q：同一个 x，更宽的矩阵</div><div class="mh-line"><span class="mh-box "><span class="mh-m" style="grid-template-columns:repeat(6, 8px)"><i></i><i></i><i></i><i></i><i class="dots">⋯</i><i></i></span><b>x</b><em>1×4096</em></span><span class="mh-op">×</span><span class="mh-box "><span class="mh-m" style="grid-template-columns:repeat(6, 8px)"><i></i><i></i><i></i><i></i><i class="dots">⋯</i><i></i><i></i><i></i><i></i><i></i><i class="dots">⋯</i><i></i><i></i><i></i><i></i><i></i><i class="dots">⋯</i><i></i><i></i><i></i><i></i><i></i><i class="dots">⋯</i><i></i><i class="dots">⋮</i><i class="dots">⋮</i><i class="dots">⋮</i><i class="dots">⋮</i><i class="dots">⋱</i><i class="dots">⋮</i><i></i><i></i><i></i><i></i><i class="dots">⋯</i><i></i></span><b>q_proj</b><em>4096×4096</em></span><span class="mh-op">=</span><span class="mh-box "><span class="mh-m" style="grid-template-columns:repeat(6, 8px)"><i></i><i></i><i></i><i></i><i class="dots">⋯</i><i></i></span><b>Q</b><em>1×4096</em></span></div><div class="im-cut"><span class="im-cut-l">Q 每 128 个切一段：</span><span class="im-segs"><i class="g1">128<b>head 1</b></i><i class="g1">128<b>head 2</b></i><i class="more">⋯</i><i class="g2">128<b>head 32</b></i></span></div><div class="mh-tag">每 4 个 Q head 共用一组 K/V（GQA）</div><div class="im-gqa"><div class="im-grp g1"><div class="im-qs"><i>Q1</i><i>Q2</i><i>Q3</i><i>Q4</i></div><div class="im-k">K/V 1</div></div><div class="im-grp g2"><div class="im-qs"><i>Q5</i><i>Q6</i><i>Q7</i><i>Q8</i></div><div class="im-k">K/V 2</div></div><div class="im-grp im-more">⋯</div><div class="im-grp g2"><div class="im-qs"><i>Q29</i><i>Q30</i><i>Q31</i><i>Q32</i></div><div class="im-k">K/V 8</div></div></div></div><p class="qd-hint">一个 token。4096 ÷ 32 个 Q head = 每个 head 128；K/V：8 个 head × 128 = 1024；每 4 个 Q head 共用一组 K/V。只有 K 和 V 进 cache。</p></div>

共用不等于把 Q head 合并。Q1 到 Q4 各自跟同一个 K1 打分、各自混合同一个 V1，所以还是得到四个不同的结果 A1 到 A4。32 个结果再拼回 4,096 个数。GQA 省的是 KV 显存，不是计算。[Multi-Head Attention and GQA](/posts/multi-head-gqa/) 有完整的图。

只有 K 和 V 进 cache：新 token 的 Q 只用一次，用来跟前面的 K 打分。没有 GQA 的话，K 和 V 也是 32 个 head，这里会大 4 倍（524 KB）。

本文按 1 KB = 1,000 bytes 算，和 GPU 显存的标法一样（141 GB）。常听到的 128 KB 是除以 1,024 算出来的。

## 3. 能装多少 KV

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

所以大约能同时跑 930 个请求。KV 装满以后，新请求就得排队。实际会少一点：vLLM 默认只用 90% 的显存，activation 也要占一些。

## 4. Decode 速度

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

所以生成一个 token 要从显存读 **16.2 GB**：所有权重读一遍，加上这个请求的 KV。

单个请求的估算方法：**带宽 ÷ 权重大小**。换成 H100（3.35 TB/s）大约是 209 tokens/s。

## 5. 每个 Token 的计算量

第 4 步算的是每个 token 读多少 byte；这一步算要做多少运算。一个 **FLOP**（floating-point operation）就是一次乘法或一次加法，1 GFLOP（giga）= 10⁹ FLOP。第 6、7 步用这个数判断瓶颈是**读**还是**算**。

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

所以生成一个 token 要做 **16.6 GFLOP**：大约 166 亿次乘法和加法。

## 6. Arithmetic Intensity 和 Roofline

每一步都要做两件事：从显存读数据、做运算。GPU 两件事同时进行，所以这一步花的时间由慢的那个决定：

```text
step time = max(reading time, math time)

decode:  reading = 16.2 GB ÷ 4.8 TB/s       ≈ 3.4 ms     ← 更慢
         math    = 16.6 GFLOP ÷ 989 TFLOPS  ≈ 0.017 ms
```

读比算慢约 200 倍，所以 decode 是 **memory-bound**：计算单元大部分时间在等数据。

哪边更慢，归结为一个比较。只有满足下面的条件，算才会比读慢：

```text
FLOPs ÷ peak FLOPS  >  bytes ÷ bandwidth        ← 计算时间 > 读取时间
FLOPs ÷ bytes       >  peak FLOPS ÷ bandwidth   ← 移项：任务放左边，GPU 放右边
intensity           >  machine balance          ← 给两边起名字
decode:     1       <  206 (H200)               ← 不成立，所以读更慢
```

左边叫 **arithmetic intensity**，只取决于任务：每读 1 byte 做几次运算。右边叫 **machine balance**，只取决于 GPU。低于 206，GPU 在等数据；高于 206，在等计算。

**Roofline**（屋顶线）把同一个 max 画成速度（FLOPs ÷ step time）：

```text
speed  = min(peak FLOPS, bandwidth × intensity)
decode = min(989, 4.8 × 1) ≈ 4.8 TFLOPS   (峰值的 0.5%)

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

想往右移，就要每读 1 byte 多做一些运算。**Batching** 就是这么做的：B 个请求共用一次权重读取，但每个请求还要读自己的 KV，所以 intensity 涨到一定程度就停了：

```text
FLOPs = B × 16.6 GFLOP
bytes = 16.06 GB (weights, shared) + B × 0.134 GB (KV, one per request)

very large B:  intensity → 16.6 GFLOP ÷ 0.134 GB  ≈ 124   (1K context)
                           20 GFLOP ÷ 1.07 GB     ≈ 19    (8K context)
```

两个都低于 206，所以 batch 再大，decode 也还是 memory-bound。

## 7. Prefill 时间

```text
math = 2 × params × prompt length + attention
     = 2 × 8.03 B × 1,024 + 0.3 TFLOP ≈ 16.7 TFLOP
math time = 16.7 TFLOP ÷ 989 TFLOPS ≈ 17 ms
read time = 16 GB ÷ 4.8 TB/s        ≈ 3.4 ms
```

算的时间比读长，所以 prefill 是 compute-bound。理想的 TTFT 约 17 ms，再加上排队时间。prompt 很短时（约 200 个 token 以下），prefill 也会变成 memory-bound。

## 8. 每种优化改的是哪个数

| 优化 | 改的是哪个数 |
|---|---|
| Batching | 一次权重读取（第 4 步）由 B 个 token 共用，intensity（第 6 步）约涨 B 倍 |
| FP8 权重 | 每个数 2 → 1 byte：权重（第 1 步）减半，decode（第 4 步）约快 2 倍 |
| FP8 KV cache | 每个 token 的 KV（第 2 步）减半：能装的 token（第 3 步）翻倍 |
| GQA | KV head 32 → 8：每个 token 的 KV（第 2 步）÷ 4 |
| PagedAttention | 剩余显存（第 3 步）几乎不浪费，真的能装下那么多 token |
| Prefix caching | prompt 里已缓存的部分跳过 prefill 计算（第 7 步） |
| Speculative decoding | 一次权重读取（第 4 步）验证多个 token，而不是一个 |

[Inference Optimization Layers](/posts/inference-optimization-layers/) 会逐个讲。

## Q&A

**Q：8B 模型在 H200 上，单个请求 decode 大约多快？**

A：每个 token 都要把权重读一遍：4.8 TB/s ÷ 16 GB ≈ 300 tokens/s。这是上限，实际会低一些。

**Q：为什么 batching 对 decode 帮助很大，对 prefill 几乎没用？**

A：Decode 每 byte 只做约 1 次运算，远低于 GPU 的 206，所以多几个请求共用一次权重读取几乎是免费的。Prefill 每 byte 已经做约 1,000 次运算，卡在算力上。

**Q：Llama-3-70B 用 BF16 能放进一张 H200 吗？**

A：不能。权重是 70.6 B × 2 = 141 GB，占满整张卡的显存，KV cache 没地方放。可以用 FP8（71 GB），或者拆到两张卡上。

## Demo

换模型、GPU、精度、batch 和 context，上面每个数都会重新算。打开 "Hide answers" 可以先自己算，再点开核对。

<div class="qkv-demo im-demo" data-im-demo></div>
<script src="/assets/notes/inference-math-demo.js" defer></script>
