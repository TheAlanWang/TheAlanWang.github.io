---
layout: layouts/post.njk
title: Attention Is All You Need
description: A sketch of the Transformer paper, with the main architecture pieces and a few key questions to keep in mind while reading it.
excerpt: A sketch of the Transformer paper, with the main architecture pieces and a few key questions to keep in mind while reading it.
date: 2026-04-11
category: AI
subcategory: ML
tags:
  - posts
image: /assets/sketches/attention-is-all-you-need.svg
imageFit: contain
permalink: /posts/attention-is-all-you-need/index.html
---
This sketch is a compact overview of *Attention Is All You Need*, the 2017 paper that introduced the Transformer. The paper was first presented in the context of machine translation, but it became a turning point for modern language models because it replaced recurrence with attention and made sequence modeling much more parallelizable.

Compared with RNN-based models, the Transformer removed the need to process tokens one step at a time, which made training much faster on modern hardware. Compared with CNN-based sequence models, it also made it easier to connect information across distant positions in a sequence. More precisely, the paper helped with long-range dependencies, not "memory" in the human sense, but the model's ability to relate far-apart tokens directly.

The paper also showed better translation quality than prior RNN- and CNN-based sequence models, while being much more parallelizable. In the original results, the authors reported improvements in BLEU, a machine translation metric that compares generated text with reference translations by measuring overlapping word sequences.

![Attention Is All You Need](/assets/sketches/attention-is-all-you-need.svg)

## What It Covers

- the high-level Transformer architecture
- how attention replaces recurrence in the model
- where positional encoding fits into the design
- how multi-head attention changes representation capacity
- the main blocks that shaped later language models beyond machine translation

## Questions and Answers

### Why was replacing recurrence such a big step?

RNNs process sequences step by step, which makes training slower and harder to parallelize. Self-attention removed that sequential bottleneck by letting each token interact with all other tokens directly, so the model could capture long-range dependencies more efficiently and train much faster on parallel hardware.

### What problem do multi-head attention and positional encoding solve?

Multi-head attention lets the model attend to different relationships in parallel, while positional encoding gives the architecture a sense of token order that attention alone does not provide.

### Why does scaling the dot product matter in attention?

Scaling the dot product keeps attention scores from growing too large, which helps softmax stay well-behaved and keeps gradients more stable during training.

### How do residual connections and layer normalization help training?

Residual connections help information and gradients flow through deep stacks, and layer normalization makes optimization more stable across layers.

### Why did this paper become the foundation for later large language models?

The paper was introduced for machine translation, but the architecture turned out to be much more broadly useful. The Transformer scaled well, trained efficiently, and provided a flexible backbone for larger models, which is why it became the base design for later large language models.

This sketch is a useful reference before going deeper into Transformer training, scaling, and later model variants.
