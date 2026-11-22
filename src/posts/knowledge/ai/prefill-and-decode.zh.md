---
layout: layouts/post.njk
title: Prefill 和 Decode
description: "LLM 推理的两个阶段：prefill 一次读完整个 prompt，瓶颈在算力；decode 一次写一个 token，瓶颈在显存带宽。TTFT 和 TPOT 分别衡量什么，以及两个阶段为什么会互相干扰。"
excerpt: "每个请求都分两个阶段：prefill 一次读完整个 prompt，生成第一个 token；decode 再一个 token 一个 token 地写出回答。两个阶段的瓶颈不同，延迟指标也不同。"
date: 2026-11-14T00:40:00-08:00
category: Knowledge
subcategory: AI
topic: "Inference & Serving"
kind: Note
tags:
  - posts
permalink: /posts/prefill-and-decode/zh/index.html
lang: zh
eleventyExcludeFromCollections: true
---
## 概览

> Prefill 一次算出 **prompt** 里每个 token 的 **K 和 V**，然后生成**第一个 token**。Decode 用 **KV cache** 里前面 token 的 K 和 V 生成**下一个 token**，一次一个。
>
> Prefill 是 **compute-bound**：它要做的计算更多，因为所有 prompt token 只读一次权重就一起处理。Decode 是 **memory-bound**：每一步都要**读**全部权重和 KV cache，却只算一个 token，所以大部分时间花在读显存上。

每个 LLM 请求都要经过 排队 → prefill → decode → 结束（完整路径见 [Continuous Batching](/posts/continuous-batching/)）。真正干活的是中间两个阶段：

| | Prefill | Decode |
|---|---|---|
| 做什么 | 读**整个 prompt** | 写回答 |
| 每步 token 数 | 所有 prompt token，一次处理 | 每个请求 **1** 个 |
| 输出 | 每个 prompt token 的 K 和 V，加上**第一个**输出 token | 多 1 个 token，以及它的 K 和 V |
| 瓶颈 | **算力**（GPU 的计算单元） | **显存带宽**（读权重和 KV cache） |
| 延迟指标 | **TTFT**：首个 token 的时间 | **TPOT**：每个输出 token 的时间 |

打个比方：考试。Prefill 是读题，整道题一眼都能看到。Decode 是写答案，一次写一个字，每个字都取决于前面写的字。

## Prefill：一次读完整个 prompt

请求到达时，prompt 已经完全确定：每个 token 都知道。所以模型可以**在一次 forward pass 里处理所有 prompt token**：

1. 把 prompt 的 token 叠成一个矩阵（比如 1,000 个 token × 4096 个数）。
2. 让它依次经过每一层。每一层一次算出这 1,000 个 token 的 Q、K、V。Causal mask 让每个 token 只能看到它前面的 token，所以一起算和一个一个算，结果是一样的。
3. 把每个 token 的 K 和 V 存进 [KV cache](/posts/kv-cache/)。
4. **最后一个**位置的输出就是生成的第一个 token。

所以 prefill 干两件事：**填满** prompt 的 **KV cache**，以及**生成第一个 token**。

## Decode：一次写一个 token

Prefill 之后，回答每步生成一个 token：

1. 输入刚生成的 token（只有 1 个）。
2. 每一层算出这个 token 的 Q、K、V，读出前面所有 token 缓存的 K 和 V，再把新的 K 和 V 追加到 cache 里。
3. 输出就是下一个 token。重复，直到遇到结束 token 或达到长度上限。

在同一个请求内，decode 没法并行：第 4 个 token 生成之前，不知道第 5 个是什么。

## 为什么瓶颈不同

每次 forward pass 都要从显存读出**全部权重**（8B 模型在 FP16 下大约 16 GB）。区别在于读出来之后做了多少计算：

- **Prefill**：权重读一次，用于 1,000 个 token。每读一个字节要做很多计算，所以计算单元是瓶颈：**compute-bound**。耗时随 prompt 长度增长。
- **Decode**：权重读一次，每个请求只用于 1 个 token。每读一个字节只做很少的计算，所以 GPU 大部分时间在等显存：**memory-bound**。

这就是 [continuous batching](/posts/continuous-batching/) 对 decode 帮助那么大的原因：把很多请求放进同一步，它们就能共用一次权重读取。Prefill 从 batching 里得到的好处少一些，因为它每次 pass 本来就有很多 token。

## 指标

- **TTFT**（time to first token）：从发出请求到看到第一个 token 的时间。主要是排队时间加上 prefill，所以随 **prompt 长度**增长。
- **TPOT**（time per output token）：第一个 token 之后，相邻 token 之间的平均时间。由 decode 决定，所以随 **batch 大小**和**上下文长度**增长。
- **ITL**（inter-token latency）：相邻两个 token 之间的间隔。TPOT 是它的平均值；ITL 还能看出尖峰。
- 总时间 ≈ TTFT + TPOT × (输出 token 数 − 1)。

聊天用户感受到的 TTFT 是「多久开始回答」，TPOT 是「文字出来得多快」。

## 两个阶段挤在同一步里

用了 continuous batching 之后，新请求的 prefill 和其他请求的 decode 会在**同一步**里跑。一个很长的 prefill 会让这一步变慢，于是每个正在 decode 的请求，下一个 token 都会晚到：这就是 ITL 尖峰。

**Chunked prefill** 把长 prompt 切成几块，每一步做正在运行的请求的 decode token，再加一块 prefill，总量不超过一个 token 预算（vLLM 里是 `--max-num-batched-tokens`）。预算放得下的 prompt 不会被切。

取舍：块越小，decode 越平稳（ITL 稳定），但长 prompt 要更多步才能处理完，所以它的 TTFT 会变高。

## 让每个阶段更便宜

- **Prefill**：[prefix caching](/posts/kv-cache/) 复用之前请求已经算过的、相同 prompt 开头的 K 和 V，这部分直接跳过，TTFT 下降。
- **Decode**：batching、GQA 和量化（FP8）都能减少每个 token 要读的字节数。见 [Inference Optimization Layers](/posts/inference-optimization-layers/)。

## 我的工作在哪里

我测过重复运行时的 prefix caching：**TTFT 从 3.07 s 降到 0.71 s**，因为 prompt 被缓存的部分跳过了 prefill。把客户端并发从 1 提到 8，vLLM 就能把 decode 步合并成 batch，吞吐提升到 2.5 倍。

## Q&A

**Q：为什么 prefill 能一次处理所有 prompt token，decode 却不行？**

A：模型开始之前，prompt 就已经完全确定，所以它的 token 可以在一次 pass 里一起处理（causal mask 保证每个 token 看不到后面的 token）。而在 decode 里，下一个 token 要等当前这个生成出来才存在。

**Q：prefix caching 加速的是哪个阶段？哪个指标能看出来？**

A：Prefill，所以看 TTFT。第一个 token 之后的输出不变。

**Q：同时跑的请求越多，为什么 TPOT 越差？**

A：每一步要做的工作更多（token 更多，要读的 KV cache 也更多），所以每一步都慢一点。但吞吐还是会上升，因为每一步都会给其中每个请求各生成一个 token。

## Demo

### 每一层在做什么

一个缩小版模型（每个向量 4 个数，3 层），计算都是真的。先一步步走完 prefill，再切到 decode 对比。

<div class="qkv-demo pf-demo" data-pf-demo></div>
<script src="/assets/notes/prefill-flow-demo.js" defer></script>

### 为什么瓶颈不同

一步要把全部权重读一次，然后为这一步里的每个 token 做计算。选一个预设，或者拖动滑块，改变有多少个 token 共用这一次读取。

<div class="qkv-demo pd-demo" data-pd-demo></div>
<script src="/assets/notes/prefill-decode-demo.js" defer></script>
