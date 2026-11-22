---
layout: layouts/post.njk
title: 模型权重（Model Weights）
description: "LLM 的权重文件里装了什么：一串有名字、有形状的矩阵；每一层是同一套矩阵、不同的数字；以及 Llama-3-8B 为什么大约 16 GB。附一个可以打开、一步步运行的小模型。"
excerpt: "模型文件就是一串有名字的矩阵。每一层都是同一套矩阵、不同的数字。小模型让你看到每一个数字，Llama-3-8B 让你看到文件为什么是 16 GB。"
date: 2026-11-19T12:00:00-08:00
category: Knowledge
subcategory: AI
topic: "Models & Training"
kind: Note
tags:
  - posts
permalink: /posts/model-weights/zh/index.html
lang: zh
eleventyExcludeFromCollections: true
---
## 概览

<!-- Alan's summary goes here -->

权重就是模型在训练中学到的那些数字。这篇文章打开一个模型文件，看看里面装了什么。[Forward Pass](/posts/forward-pass/zh/) 再跟着这些数字走完一次完整的计算。

| 章节 | 你会看到 |
|---|---|
| [权重是什么](#权重是什么) | 一个权重到底是什么 |
| [文件里存了什么](#文件里存了什么) | 文件怎么存这些数字 |
| [一层里的矩阵](#一层里的矩阵) | 一层里有哪些矩阵 |
| [真实尺寸](#真实尺寸-llama-3-8b) | Llama-3-8B 为什么是 16 GB |
| [Demo](#demo) | 小模型的每个矩阵 |

## 权重是什么

神经网络那张「圆圈连线」的图，和一个矩阵，是同一组数字的两种画法。每一条线是一个权重，每个权重就是矩阵里的一格：

```text
 输入 x（4 个数）            输出 Q（4 个数）
   x₁ ○ ───────────────────── ○ Q₁
   x₂ ○ ──╲ ╱──────────────── ○ Q₂      一条线 = 一个权重
   x₃ ○ ──╱ ╲──────────────── ○ Q₃      4 × 4 = 16 条线
   x₄ ○ ───────────────────── ○ Q₄      = 一个 4 × 4 的矩阵
                                        （16 条线这里只画了几条）
```

要算 `Q₁`：把每个输入乘上它连到 `Q₁` 那条线上的权重，四个结果加起来。矩阵的行是输入（x₁ … x₄），列是输出（Q₁ … Q₄）。这就是 `x × W` 的一列。把下面 [Demo](#demo) 里的 Model File 切到 "Circles and lines"，就能看到同一个矩阵的两种画法。

## 文件里存了什么

模型文件（通常是 `.safetensors`）就是一串 **tensor（张量）**：每个都有一个名字、一个形状，数字一个接一个地存着。比如：

```text
model.layers.0.self_attn.q_proj.weight   形状 [4096, 4096]   16,777,216 个数
```

名字说明它属于哪里：第 0 层、attention 部分、用来算 Q 的那个矩阵。形状说明怎么把这一长串数字重新折回成行和列。

**横着还是竖着？** 这篇文章写成 `x × W`，W 是「输入 × 输出」，所以 `Q = x × W_Q` 从左往右读。PyTorch 存的是同一个矩阵翻转过来的样子，也就是「输出 × 输入」，乘的时候再翻回来。数字一样，结果也一样。demo 里每个矩阵都按 `x × W` 的样子显示，旁边标出文件里的形状。

## 一层里的矩阵

每一层都有同样的一套矩阵，各自的数字不同：

| Tensor | 作用 |
|---|---|
| `input_layernorm` | attention 之前把 x 缩放一下（是一个向量，不是矩阵） |
| `q_proj`<br>`k_proj`<br>`v_proj` | 把 x 变成 Q、K、V |
| `o_proj` | 把 attention 的结果 A 变成 O（O 是 output，attention 的输出），再加回 x |
| `post_attention_`<br>`layernorm` | feed-forward 之前把 x 缩放一下 |
| `up_proj`<br>`gate_proj`<br>`down_proj` | feed-forward：先把 x 变宽成更长的向量 h（h 是 hidden，中间层的意思），筛选，再缩回 F（F 是 feed-forward 的输出），加回 x |

第 0 层和第 1 层名字一样、形状一样，但**数字不一样**。第一层之前还有 `embed_tokens`（每个词一行，是查表，不是乘法）。最后一层之后是 `norm` 和 `lm_head`（每个词一列，把最后的向量变成每个词的分数）。

## 真实尺寸：Llama-3-8B

名字一样，形状大得多（来自它的 `config.json`：每个向量 4,096 个数、32 层、词表 128,256 个词、bfloat16）：

| Tensor | 形状（`x × W`） | 数字个数 |
|---|---|---|
| `embed_tokens` | 128,256 × 4,096 | 525,336,576 |
| **每一层：** | | |
| `q_proj` | 4,096 × 4,096 | 16,777,216 |
| `k_proj` | 4,096 × 1,024 | 4,194,304 |
| `v_proj` | 4,096 × 1,024 | 4,194,304 |
| `o_proj` | 4,096 × 4,096 | 16,777,216 |
| `gate_proj` | 4,096 × 14,336 | 58,720,256 |
| `up_proj` | 4,096 × 14,336 | 58,720,256 |
| `down_proj` | 14,336 × 4,096 | 58,720,256 |
| 2 个 layer norm | 各 4,096 | 8,192 |
| **= 一层** | | **218,112,000** |
| **× 32 层** | | **6,979,584,000** |
| `norm` | 4,096 | 4,096 |
| `lm_head` | 4,096 × 128,256 | 525,336,576 |
| **总共** | | **8,030,261,248** |

80.3 亿个数 × 每个 2 bytes ≈ **16.06 GB**。每一层里大部分是 feed-forward：`gate_proj` + `up_proj` + `down_proj` = 2.18 亿里的 1.76 亿（81%）。`k_proj` 和 `v_proj` 比较窄，是因为 32 个 Q head 共用 8 个 K/V head，每个 128 个数（GQA，见 [Q, K, V: Attention Basics](/posts/qkv-attention-basics/)）。文件里每个 `nn.Linear` 矩阵都是翻转后存的（比如 `k_proj` 存成 [1024, 4096]）；下面 [Demo](#demo) 里的 Model File 列出了每个矩阵在文件里的形状，并按比例画了出来。

## Prefill 怎么用这些权重

一次前向计算时，GPU 一层一层地读权重：先读第 0 层的矩阵，再读第 1 层的，一直到第 31 层。这一步里所有 token 都乘同一层的同一套矩阵。prefill 时所有 prompt token 共用一次读取；decode 时只有一个 token 却要承担整次读取，这就是 decode 卡在读显存的原因（见 [Prefill and Decode](/posts/prefill-and-decode/)）。Q、K、V 在 attention 里怎么用，见 [Q, K, V: Attention Basics](/posts/qkv-attention-basics/)。

## Q&A

**Q：每一层的权重都一样吗？**

A：不一样。每一层的名字和形状都一样，但数字是各自训练出来的。

**Q：权重矩阵是横着存还是竖着存？**

A：在文件里是一长串数字加一个形状。PyTorch 里 `q_proj` 的形状是「输出 × 输入」；写成 `x × W` 时是「输入 × 输出」。不管哪种写法，数字都一样。

**Q：Llama-3-8B 为什么大约是 16 GB？**

A：大约 80.3 亿个权重，bfloat16 每个占 2 bytes。大部分在 32 层里（每层 2.18 亿个），剩下的在 `embed_tokens` 和 `lm_head`。

## Demo

一个跟 Llama 形状一样的小模型：词表 8 个词，每个向量 4 个数，2 层。下面打开它的文件；[Forward Pass](/posts/forward-pass/zh/) 拿同一个模型跑 "I like cats"，一步一步看。

### Model File（模型文件）

<div class="qkv-demo mw-demo" data-mw-file></div>

<script src="/assets/notes/tiny-llama.js" defer></script>
<script src="/assets/notes/model-weights-file-demo.js" defer></script>
