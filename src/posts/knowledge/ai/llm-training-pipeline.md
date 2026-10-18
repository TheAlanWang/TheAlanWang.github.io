---
layout: layouts/post.njk
title: "LLM Training Pipeline"
description: "How an LLM is trained: pre-training, mid-training, and post-training with SFT, preference optimization, and RL, plus data scales and common uses."
excerpt: "How an LLM is trained: pre-training, mid-training, and post-training with SFT, preference optimization, and RL, plus data scales and common uses."
date: 2026-10-17T12:00:00-07:00
category: Knowledge
subcategory: AI
topic: "Models & Training"
kind: Note
tags:
  - posts
permalink: /posts/llm-training-pipeline/index.html
---

## Step 1: Pre-training

- Self-supervised next-token prediction: use preceding tokens to predict the next token
- Learn **broad** knowledge, language patterns, and foundational capabilities
- Data cleaning: deduplicate, filter low-quality and harmful text
- Data: ~10T+ tokens (Llama 3: ~15T, DeepSeek-V3: ~14.8T)
- Output: a **raw base model**

## Step 2: Mid-training

- Improve core capabilities: coding, math, and **domain** knowledge
- Extend context length
- Train on curated or domain-specific data (Companies **add proprietary domain data** here to build a competitive edge)
- Data governance: licensing, privacy, and compliance of training data
- Data: ~tens of billions to ~1T tokens (Llama 3's long-context stage: ~800B)
- Output: a **stronger base model** (often with longer context)

## Step 3: Post-training

Three training methods, plus common uses of them

### Overview

| Method                                                   | Learns from               | Definition                                                                                             | Typical (exceptions exist)                                           |
| -------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| [SFT](#sft)                | Given answers             | Imitate **given** reference answers                                                                    | Written by humans or a larger model                                  |
| [Preference Optimization](#preference-optimization) | Given comparisons         | Train on **pre-labeled** "which answer is better" data; the model generates no new answers in training | **Pairwise**; labeled by humans or an AI judge; e.g. DPO             |
| [RL](#rl)                  | Scores on its own answers | The model **generates its own** answers in training → gets a score → updates, in a loop                | **Pointwise**; scored by a program or a reward model; e.g. RLHF, RLVR |

- **Pairwise:** two answers are compared; you only learn which one is better
- **Pointwise:** each answer is scored on its own, with no second answer needed

Split by training mode: offline (SFT, preference optimization) vs. online (RL).

### Training Methods

<h4 id="sft">1. Supervised Fine-Tuning (SFT)</h4>

- Learn from high-quality **instruction–response examples**
- Improve instruction following and response format
- Data: ~10K–1M+ examples

<h4 id="preference-optimization">2. Preference Optimization</h4>

- Learn which answer is better from pre-labeled comparisons
- Data: ~100K–1M+ comparison pairs
- Main method: **DPO** (Direct Preference Optimization)

<h4 id="rl">3. Reinforcement Learning (RL)</h4>

- The model generates answers → each gets a score → the model moves toward high-scoring answers
- **RL = reward signal + optimization algorithm**
    - Reward signal: where the score comes from
    - Optimization algorithm: how to update the model, e.g. PPO (Proximal Policy Optimization), GRPO (Group Relative Policy Optimization)
- Data: ~10K–100K+ prompts, each sampled many times
- Main methods:
    - **RLHF** (Reinforcement Learning from Human Feedback): score comes from a reward model trained on human preferences
    - **RLVR** (RL with Verifiable Rewards): score comes from checking the answer (math, code); the main recipe behind reasoning models

### Common Uses

These are not new methods; they reuse the three above.

| Use                       | Goal                                                             | Methods used                                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reasoning Training        | Think step by step before answering (e.g. o1, DeepSeek-R1)       | [SFT](#sft) on long step-by-step examples → RLVR ([RL](#rl))                            |
| Tool Use / Agent Training | Call tools (functions, search, code) and finish multi-step tasks | [SFT](#sft) on tool-call examples → [RL](#rl) in real environments (reward = task done) |
| Safety / Policy Alignment | Teach the model what to refuse and how                           | [SFT](#sft) (refusal examples) + [PO](#preference-optimization) / [RL](#rl)        |
| Distillation              | Train a smaller model on a larger model's outputs                | [SFT](#sft) on the larger model's answers                                                                             |
| Rejection Sampling        | Make training data from the model's own outputs                  | Generate many answers → keep the best → [SFT](#sft) on them                                                           |

## Compute Split

- Pre-training: ~90%
- Mid-training: ~8%
- Post-training: ~2%

Rough split, as shared by a Gemini team speaker at a talk; it varies by lab and model.

Data scales are rough orders of magnitude; the examples come from the [Llama 3](https://arxiv.org/abs/2407.21783) and [DeepSeek-V3](https://arxiv.org/abs/2412.19437) technical reports.
