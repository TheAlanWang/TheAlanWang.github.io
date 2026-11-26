---
layout: layouts/post.njk
title: "Contents: LLM Inference"
description: "A reading map for LLM inference: what happens to one request from prompt to answer, and which post explains each part, from Q, K, V to continuous batching."
excerpt: "One request, from prompt to answer, and the order to read the posts that explain each part."
date: 2026-11-20T12:00:00-08:00
category: Knowledge
subcategory: AI
topic: "Overviews"
kind: Note
tags:
  - posts
permalink: /posts/llm-inference-pipeline/index.html
series: inference
seriesOrder: 0
order: 1
---
## Overview

> Inference means using a trained model to generate an answer: the weights stay fixed, and the model produces **one token at a time**.
>
> Each request runs in two phases:
>
> - **Prefill**: processes the whole prompt at once (**compute-bound**).
> - **Decode**: generates one token per step (**memory-bound**).
>
> Decode is slow because every step reads all the weights and the **KV cache** but computes only one token, so the second half of this series is about making inference faster and using less GPU memory.

## Contents

### 1. Basics: How a Request Runs

1. [Q, K, V: Attention Basics](/posts/qkv-attention-basics/): what each token computes inside a layer.
2. [Multi-Head Attention and GQA](/posts/multi-head-gqa/): how attention is cut into heads, and why 4 Q heads share one K/V head.
3. [Model Weights](/posts/model-weights/): the matrices it multiplies by, and how they are stored.
4. [Forward Pass](/posts/forward-pass/): one run of the model, step by step, from the token lookup to the next word.
5. [Prefill and Decode](/posts/prefill-and-decode/): why a request runs in two phases with different bottlenecks.
6. [Inference Math](/posts/inference-math/): the numbers behind it: weight size, KV per token, decode speed, and the roofline.

### 2. Optimizing Inference

1. [Inference Optimization Layers](/posts/inference-optimization-layers/): the map. Every speed-up sits in one of three layers: model, serving, or kernel.
2. [KV Cache](/posts/kv-cache/): keep every token's K and V instead of recomputing them, at the cost of GPU memory.
3. [PagedAttention](/posts/paged-attention/): split that memory into small blocks and hand them out as needed, so little is wasted.
4. [Continuous Batching](/posts/continuous-batching/): use the freed blocks to let new requests join at every step.

For how the weights are made in the first place, see [LLM Training Pipeline](/posts/llm-training-pipeline/).
