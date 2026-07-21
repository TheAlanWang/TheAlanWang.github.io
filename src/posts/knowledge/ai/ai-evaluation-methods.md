---
layout: layouts/post.njk
title: "Five Ways to Evaluate an AI System"
description: "A guide to the five AI evaluation methods — deterministic checks, reference-based metrics, LLM-as-judge, human review, and online feedback — and how to layer them."
excerpt: "Deterministic checks, reference-based metrics, LLM-as-judge, human review, and online feedback: what each one compares, and when to reach for which."
date: 2026-07-20T12:00:00-07:00
category: Knowledge
subcategory: AI
topic: Evals
kind: Guide
tags:
  - posts
image: /assets/sketches/ai-evaluation-methods.png
imageFit: contain
permalink: /posts/ai-evaluation-methods/index.html
---

Traditional software has a comforting property: given the same input, it produces the same output, so a unit test settles the question of correctness once. LLM outputs break that property. The same prompt can produce different phrasings, all acceptable — or one subtly wrong. "Did the model answer well?" stops being a boolean and becomes a measurement problem.

![Five AI evaluation methods: deterministic, reference-based, LLM-as-judge, human, online](/assets/sketches/ai-evaluation-methods.png)

The diagram organizes the five standard evaluation methods along two axes that are worth keeping in mind for the rest of this post:

- **Who evaluates** — a program, an LLM, a human reviewer, or your end users.
- **What it compares** — actual behavior vs expected behavior, an answer vs ground truth, an answer vs a rubric, or a whole system vs user satisfaction.

Roughly in that order, each method gets more expensive, slower, and closer to what you actually care about.

## Deterministic

A program checks expected behavior against actual behavior. This works whenever some part of the output *is* deterministic even though the prose isn't: the model must call the right tool, must produce valid JSON, must not leak a system prompt, must refuse a disallowed request.

```python
def test_search_tool_called(agent):
    result = agent.run("What did the FDA approve last week?")
    tool_calls = [c.name for c in result.tool_calls]
    assert "web_search" in tool_calls
    assert result.output_schema_valid
```

These are ordinary tests — cheap, fast, and binary — so they belong in CI and run on every change. Their limit is scope: they verify the scaffolding around the answer, not the answer itself.

## Reference-based

A program compares the AI answer against a ground-truth answer you prepared ahead of time. The interesting part is the comparison function:

- **String overlap (BLEU, ROUGE)** — borrowed from machine translation; penalizes correct answers that happen to use different words.
- **Embedding similarity** — embeds both answers and measures cosine similarity; tolerant of paraphrase, but "the drug is safe" and "the drug is unsafe" embed uncomfortably close.
- **LLM-scored correctness (e.g. RAGAS answer correctness)** — uses an LLM to judge factual overlap with the reference, combining semantic tolerance with factual sensitivity.

```python
from ragas import evaluate
from ragas.metrics import answer_correctness

score = evaluate(
    dataset,  # question, answer, ground_truth
    metrics=[answer_correctness],
)
```

Reference-based evaluation is the workhorse for regression testing a Q&A or RAG system: build a golden dataset once, then rerun it every time you change the prompt, the model, or the retriever. Its cost is the dataset — someone has to write and maintain those ground-truth answers.

## LLM-as-Judge

When no ground truth exists — open-ended generation, summaries, conversations — an LLM scores the answer against a rubric instead of a reference. RAGAS faithfulness (is every claim supported by the retrieved context?) and answer relevancy (does it address the question?) are the canonical examples for RAG.

```text
You are grading an answer for FAITHFULNESS.
Context: {retrieved_context}
Answer: {answer}

List each factual claim in the answer. For each claim, state
whether it is supported by the context. Then output a score
from 1-5: 5 = every claim supported, 1 = mostly unsupported.
```

Judges scale to thousands of samples per day at API cost, which is why they carry most of the load in modern eval stacks. But a judge is itself an LLM, with known biases: it favors longer answers, favors its own model family's style, and drifts when the judge model is upgraded. Treat judge scores as relative signals — great for "did this change make things better or worse?", risky as absolute truth until calibrated against the next method.

## Human

A human expert compares the AI answer against their own judgment. This is the gold standard — humans catch the subtle domain errors every automated method misses — and it is also the slowest and most expensive method, so it can't be your everyday loop.

Its highest-leverage use is calibration: have experts label a few hundred samples, measure how well your LLM judge agrees with them, and fix the rubric until agreement is high. After that, the judge does the daily work and humans re-audit periodically or review the cases the judge flags as borderline.

## Online

Everything above happens offline, before release. Online evaluation compares the AI system against actual user satisfaction in production: A/B tests, thumbs up/down, regeneration rate, task completion, retention. It is the only method that measures what you ultimately care about — whether real users are better off — and it comes with real constraints: you need traffic, a shipped feature, and enough volume for statistical significance, and a bad variant affects real users while you measure it.

Online results are also the feedback loop for the offline stack. When users are unhappy with outputs your offline evals scored highly, your golden dataset or rubric is missing a dimension — mine the failing traffic for new test cases.

## Choosing a method

| Method | Cost per sample | Speed | Needs | Best for |
|---|---|---|---|---|
| Deterministic | ~free | instant | testable invariants | tool calls, format, safety gates |
| Reference-based | low | fast | golden dataset | regression testing Q&A / RAG |
| LLM-as-judge | API cost | fast | a good rubric | open-ended quality at scale |
| Human | high | slow | experts' time | calibrating judges, high-stakes audits |
| Online | traffic | weeks | production users | ground truth on satisfaction |

In practice these aren't alternatives to choose between — they stack, cheapest and most frequent at the bottom:

1. **Deterministic checks in CI**, on every commit.
2. **Reference-based + LLM-judge** on a golden dataset, on every prompt or model change.
3. **Human review** occasionally, to calibrate the judge and audit high-stakes flows.
4. **Online metrics** continuously, as the final word — and as the source of new offline test cases.

When I built the RAG agent described in [Inside a RAG Agent](/posts/what-building-a-rag-agent-taught-me-about-ai-agent-design/), faithfulness was the metric that mattered most: in a public-health context, an answer that goes beyond the retrieved sources isn't a style problem, it's a safety problem. That's the general pattern for picking where to invest — find the failure mode that hurts the most, and put the strongest evaluation layer you can afford in front of it.
