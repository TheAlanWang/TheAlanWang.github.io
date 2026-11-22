---
layout: layouts/post.njk
title: Model Weights
description: "What is inside an LLM's weight file: named matrices with shapes, the same set in every layer with different numbers, and why Llama-3-8B is about 16 GB. With a tiny model you can open and run step by step."
excerpt: "A model file is a list of named matrices. Each layer has the same set with different numbers. A tiny model shows every number; Llama-3-8B shows why the file is 16 GB."
date: 2026-11-19T12:00:00-08:00
category: Knowledge
subcategory: AI
topic: "Models & Training"
kind: Note
tags:
  - posts
permalink: /posts/model-weights/index.html
series: inference
seriesOrder: 2
order: 2
zh: true
---
## Overview

<!-- Alan's summary goes here -->

The weights are the numbers a model learned in training. This post opens a model file and lists what is inside. [Forward Pass](/posts/forward-pass/) then follows the numbers through one run of the model.

| Section | What you'll see |
|---|---|
| [What a Weight Is](#what-a-weight-is) | what one weight is |
| [What's in the File](#what-s-in-the-file) | how the file holds them |
| [One Layer's Matrices](#one-layer-s-matrices) | the matrices of one layer |
| [Real Size](#real-size-llama-3-8b) | why Llama-3-8B is 16 GB |
| [Demo](#demo) | every matrix of a tiny model |

## What a Weight Is

The neural-net picture with circles and lines and a matrix are the same numbers drawn two ways. Each line is one weight, and each weight is one cell of the matrix:

```text
 input x (4 numbers)        output Q (4 numbers)
   x₁ ○ ───────────────────── ○ Q₁
   x₂ ○ ──╲ ╱──────────────── ○ Q₂      one line = one weight
   x₃ ○ ──╱ ╲──────────────── ○ Q₃      4 × 4 = 16 lines
   x₄ ○ ───────────────────── ○ Q₄      = a 4 × 4 matrix
                                        (only a few of the 16 drawn)
```

To get `Q₁`, multiply each input by the weight on its line to `Q₁` and add the four results. Rows of the matrix are the inputs (x₁ … x₄), columns are the outputs (Q₁ … Q₄). That is one column of `x × W`. Switch the Model File demo in [Demo](#demo) to "Circles and lines" to see both views of the same matrix.

## What's in the File

A model file (usually `.safetensors`) is a list of **tensors**: each one has a name, a shape, and its numbers stored one after another. For example:

```text
model.layers.0.self_attn.q_proj.weight   shape [4096, 4096]   16,777,216 numbers
```

The name says where it belongs: layer 0, the attention part, the matrix that makes Q. The shape says how to fold the long run of numbers back into rows and columns.

**Rows or columns?** This post writes `x × W` with W as (input × output), so `Q = x × W_Q` reads left to right. PyTorch stores the same matrix flipped, as (output × input), and flips it back when multiplying. Same numbers, same result. The demos show each matrix in the `x × W` view and give its file shape next to it.

## One Layer's Matrices

Every layer has the same set of matrices, each with its own numbers:

| Tensor | What it does |
|---|---|
| `input_layernorm` | rescales x before attention (a vector, not a matrix) |
| `q_proj`<br>`k_proj`<br>`v_proj` | turn x into Q, K and V |
| `o_proj` | turns the attention result A into O (O for output), which is added back to x |
| `post_attention_`<br>`layernorm` | rescales x before the feed-forward |
| `up_proj`<br>`gate_proj`<br>`down_proj` | the feed-forward: widen x into a longer vector h (h for hidden, the middle layer), filter, shrink back to F (F for feed-forward output), which is added back to x |

Layer 0 and layer 1 have the same names and shapes but **different numbers**. Before the first layer there is `embed_tokens` (one row per word, looked up, not multiplied). After the last layer come `norm` and `lm_head` (one column per word, turns the final vector into a score for every word).

## Real Size: Llama-3-8B

Same names, bigger shapes (from its `config.json`: 4,096 numbers per vector, 32 layers, vocabulary of 128,256 words, bfloat16):

| Tensor | Shape (`x × W`) | Numbers |
|---|---|---|
| `embed_tokens` | 128,256 × 4,096 | 525,336,576 |
| **every layer:** | | |
| `q_proj` | 4,096 × 4,096 | 16,777,216 |
| `k_proj` | 4,096 × 1,024 | 4,194,304 |
| `v_proj` | 4,096 × 1,024 | 4,194,304 |
| `o_proj` | 4,096 × 4,096 | 16,777,216 |
| `gate_proj` | 4,096 × 14,336 | 58,720,256 |
| `up_proj` | 4,096 × 14,336 | 58,720,256 |
| `down_proj` | 14,336 × 4,096 | 58,720,256 |
| 2 layer norms | 4,096 each | 8,192 |
| **= one layer** | | **218,112,000** |
| **× 32 layers** | | **6,979,584,000** |
| `norm` | 4,096 | 4,096 |
| `lm_head` | 4,096 × 128,256 | 525,336,576 |
| **total** | | **8,030,261,248** |

8.03 billion numbers × 2 bytes each ≈ **16.06 GB**. Most of each layer is the feed-forward: `gate_proj` + `up_proj` + `down_proj` = 176 million of 218 million (81%). `k_proj` and `v_proj` are narrower because 32 Q heads share 8 K/V heads of 128 numbers (GQA; see [Q, K, V: Attention Basics](/posts/qkv-attention-basics/)). The file stores each `nn.Linear` matrix flipped (e.g. `k_proj` as [1024, 4096]); the Model File demo in [Demo](#demo) lists every file shape and draws each matrix to scale.

## How Prefill Uses Them

During a forward pass, the GPU reads the weights layer by layer: layer 0's matrices, then layer 1's, down to layer 31. Every token in the step is multiplied by the same matrices of that layer. In prefill all prompt tokens share one read of each layer; in decode one token pays for the whole read, which is why decode is memory-bound (see [Prefill and Decode](/posts/prefill-and-decode/)). How Q, K and V are used inside attention is in [Q, K, V: Attention Basics](/posts/qkv-attention-basics/).

## Q&A

**Q: Are all layers' weights the same?**

A: No. Every layer has the same names and shapes, but its own numbers, learned in training.

**Q: Is a weight matrix stored as rows or columns?**

A: In the file, as one long run of numbers plus a shape. PyTorch's shape for `q_proj` is (output × input); written as `x × W` it is (input × output). Same numbers either way.

**Q: Why is Llama-3-8B about 16 GB?**

A: About 8.03 billion weights, 2 bytes each in bfloat16. Most of them are in the 32 layers (218 million per layer), and the rest in `embed_tokens` and `lm_head`.

## Demo

A tiny model shaped like Llama: a vocabulary of 8 words, 4 numbers per vector, 2 layers. Open its file below; [Forward Pass](/posts/forward-pass/) runs the same model on "I like cats", step by step.

### Model File

<div class="qkv-demo mw-demo" data-mw-file></div>

<script src="/assets/notes/tiny-llama.js" defer></script>
<script src="/assets/notes/model-weights-file-demo.js" defer></script>
