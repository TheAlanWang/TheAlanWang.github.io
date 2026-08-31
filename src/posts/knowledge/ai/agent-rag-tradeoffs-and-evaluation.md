---
layout: layouts/post.njk
title: "Agent and RAG Tradeoffs: Cost, Latency, Quality, and Evaluation"
description: A practical note on cost-latency-quality tradeoffs in agent and RAG systems, how to evaluate RAG by separating retrieval quality from answer quality, and how to structure a project narrative.
excerpt: A practical note on cost-latency-quality tradeoffs in agent and RAG systems, how to evaluate RAG by separating retrieval quality from answer quality, and how to structure a project narrative.
date: 2026-08-31T12:00:00-07:00
category: Knowledge
subcategory: AI
topic: RAG
kind: Note
tags:
  - posts
image: /assets/projects/agent-rag-interview-notes.svg
imageFit: contain
permalink: /posts/agent-rag-tradeoffs-and-evaluation/index.html
---

Split out of [Agent System Architecture](/posts/core-questions-in-agent-and-rag-system-design/): the parts that are specifically about RAG systems rather than agent architecture in general, cost/latency/quality tradeoffs, evaluating RAG, and how to narrate a project.

## 1. Cost, Latency, and Quality

### Key answer

Agent and RAG systems usually cannot optimize cost, latency, and quality at the same time.
- Cost comes from model usage, tokens, retrieval, and tool calls.
- Latency comes from retrieval time, inference time, and serial execution chains.
- Quality depends on recall, reasoning quality, and final answer usefulness.

The practical goal is to define the minimum acceptable quality first, and then optimize the other two around that constraint.

### Follow-up

If the next question is how to reduce cost or latency without breaking quality, a good answer is to mention smaller routing models, tighter context windows, lower retrieval depth, caching, or selective tool usage, but only after stating that any optimization still has to be checked against answer quality and task success.

### Best practice

Fix the quality bar first, then tune cost and latency against it.

### Minimal example

```python
def retrieve_context(query, top_k=3):
    return vector_store.search(query, top_k=top_k)

def answer_question(query):
    docs = retrieve_context(query, top_k=3)
    return llm.generate(query, docs)
```

This is where tradeoffs become concrete.

- larger `top_k` may improve recall
- larger `top_k` also increases tokens, latency, and noise
- smaller `top_k` is cheaper and faster, but may miss key evidence

### A more practical optimization example

```python
def route_model(query):
    if len(query) < 30:
        return "small-model"
    return "large-model"
```

This is the kind of answer interviewers often want: not "I would optimize latency," but "I would reduce average cost and latency by routing simpler requests to a smaller model, then verify that task quality still meets the bar."

### Concrete scenario

Imagine an internal docs assistant. A user asks:

`How do I reset my VPN credentials?`

One design might use:

- a large model
- `top_k = 10`
- long retrieved context

That may improve recall, but it also increases tokens, latency, and noise.

A different design might use:

- a smaller routing model
- `top_k = 3`
- stricter retrieval

That is faster and cheaper, but it may miss edge-case documentation.

This is the real shape of the tradeoff. Cost, latency, and quality usually change through ordinary system parameters like model size, retrieval depth, and number of tool calls.

## 2. RAG Evaluation

### Key answer

RAG evaluation can be separated into retrieval quality and answer quality. Retrieval quality asks whether the right information was actually brought back. Answer quality asks whether the final response is correct, grounded in evidence, and useful for the task. Offline metrics help during development, but online validation is still needed once the system is exposed to real usage.

### Follow-up

If the next question is how to validate RAG online, a good answer is to mention trace review, sampled human evaluation, failure analysis, and observing how often the system retrieves the right evidence but still answers poorly, or answers confidently without sufficient grounding.

### Best practice

Score retrieval and answer quality separately, both offline and online.

### Minimal example

```python
gold_doc_ids = {"doc_1", "doc_7"}
retrieved_doc_ids = {"doc_1", "doc_3", "doc_9"}

hit = len(gold_doc_ids & retrieved_doc_ids) > 0
recall = len(gold_doc_ids & retrieved_doc_ids) / len(gold_doc_ids)
```

This is a retrieval-level evaluation. It tells you whether the retrieval system brought back useful evidence.

It does **not** tell you whether the final answer was good.

### Why the separation matters

```python
result = {
    "retrieval_hit": True,
    "answer_correct": False,
}
```

This is a very common failure mode. The system retrieved relevant evidence, but the generation step still answered poorly.

The opposite can also happen:

```python
result = {
    "retrieval_hit": False,
    "answer_confident": True,
}
```

Now the system sounds good, but it is not well grounded.

### Concrete scenario

Imagine a user asks:

`What is the refund policy for annual subscriptions?`

Two different failures are possible:

1. the system retrieves the correct policy document, but the model summarizes it incorrectly
2. the system fails to retrieve the right document, but the model still produces a confident answer

Those are not the same failure. The first is mainly a generation problem. The second is a retrieval and grounding problem.

That is why RAG evaluation questions are really about whether you can tell where the system failed, not just whether the final answer looked good or bad.

## A Better Way To Structure Project Answers

A lot of these questions become easier if the project itself is introduced cleanly. The most stable structure is:

1. the business or user problem
2. the technical design you chose
3. the way you validated that it worked

This is usually a stronger project narrative than starting with the model name or the framework name. The real difference is often not API familiarity. It is whether you can explain why the system was designed that way and how you knew it was effective.

### Minimal example

```text
Problem: users needed grounded answers from internal docs
Design: retrieval + answer generation with selective tool calls
Validation: retrieval hit rate, answer review, trace inspection
```

### Concrete scenario

Instead of saying:

- I used GPT-4
- I used LangGraph
- I used a vector database

it is usually stronger to say:

- users were asking policy questions that pure LLM answers got wrong
- I introduced retrieval so answers could reference internal documents
- I validated it by checking whether the right documents were retrieved and whether the final answers were grounded in them

## Key Takeaways

- tradeoff answers should show that cost, latency, and quality are design constraints, not afterthoughts
- evaluation answers should distinguish retrieval quality from final answer quality
- the clearest project explanations usually follow the sequence: problem, design, validation

## References

- Lewis et al., *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*: [NeurIPS 2020](https://papers.nips.cc/paper/2020/hash/6b493230205f780e1bc26945df7481e5-Abstract.html)
- OpenAI, *Agent evals*: [OpenAI Agent Evals](https://platform.openai.com/docs/guides/agent-evals)
