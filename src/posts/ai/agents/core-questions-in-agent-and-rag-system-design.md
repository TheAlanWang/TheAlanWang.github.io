---
layout: layouts/post.njk
title: "Core Questions in Agent and RAG System Design"
description: A practical note on core question clusters in agent and RAG system design, with key answers, best practices, concrete examples, and references.
excerpt: A practical note on core question clusters in agent and RAG system design, with key answers, best practices, concrete examples, and references.
date: 2026-04-22
type: Note
topic: AI
tags:
  - posts
image: /assets/projects/agent-rag-interview-notes.svg
imageFit: contain
permalink: /posts/core-questions-in-agent-and-rag-system-design/index.html
---

Agent and RAG systems often get discussed in terms of models, prompts, or frameworks. In practice, the harder questions are usually architectural: how the system is split, how memory is handled, how tradeoffs are made, and how outcomes are validated.

The useful way to answer these questions is not to list tools or framework names. It is to explain the system boundary clearly, show the design choice, and connect that choice to a concrete failure mode or product need. Most discussions usually cluster into four areas: architecture, memory, cost-latency-quality tradeoffs, and evaluation.

- definition -> purpose -> example or boundary

![Agent and RAG interview notes](/assets/projects/agent-rag-interview-notes.svg)

## 1. Architecture

### Key answer

An agent system is usually easier to reason about when it is split into four layers:

- `Model layer`
  Responsible for understanding the request, reasoning over context, and generating the next action or final answer.

- `Tool layer`
  Responsible for accessing external capabilities such as search, databases, APIs, or code execution.

- `Memory layer`
  Responsible for maintaining short-term session context and long-term reusable information.

- `Orchestration layer`
  Responsible for sequencing steps, managing state transitions, handling retries or fallbacks, and deciding how the system moves from one stage to the next.

### Follow-up

If the next question is why the system needs an explicit planner or orchestration layer at all, the clearest answer is that simple tasks may not need one, but multi-step systems with multiple tools, retries, fallback logic, or long-running state usually do. In those systems, the model helps decide the next step, tools perform external actions, memory keeps the useful context, and the workflow logic decides what to do next and when to stop.

### Best practice

Start with the simplest architecture that can make the workflow explicit. Add more orchestration only when the system actually needs multi-step control, recovery logic, or stateful coordination.

### Minimal example

```python
def run_agent(user_input, session_state):
    while True:
        context = memory.get_session_context(session_state)
        plan = planner.plan(user_input, context)

        if plan["type"] == "tool_call":
            tool_result = tools.execute(plan["tool"], plan["args"])
            memory.append_tool_result(session_state, tool_result)
            continue

        if plan["type"] == "finish":
            return llm.generate(user_input, context)
```

This example is intentionally small, but it shows the separation clearly:

- `planner` decides the next step
- `tools` execute outside capabilities
- `memory` provides context and gets updated after each tool result
- the outer loop acts as orchestration by deciding when the workflow should continue and when it should finish

That is the real reason architecture questions matter. The important part is whether you can keep model reasoning separate from the rest of the system logic.

### Concrete scenario

Imagine a travel assistant where the user says:

`Plan me a 3-day trip to San Francisco next weekend.`

In a system like this:

- the model interprets the request
- tools fetch weather, attractions, and hotel information
- memory keeps track of user preferences and the current trip state
- orchestration decides what to do first and how to combine the results

This is why architecture questions are rarely about naming a framework. They are usually about whether you can explain where reasoning happens, where external actions happen, and where workflow control lives.

## 2. Memory

### Key answer

Memory is usually easier to understand when it is divided into short-term and long-term memory. 
- Short-term memory supports the current task, such as recent conversation history, tool outputs, and session state. 
- Long-term memory stores information that is useful across sessions, such as user preferences, stable profile facts, or reusable knowledge.

### Follow-up

If the conversation goes one step deeper, the real issue is usually not storage by itself. It is policy: deciding what should stay in session state for continuity, what should become cross-session memory for personalization, what should be discarded, and how to retrieve only the useful parts later without polluting the prompt.

### Best practice

Treat memory as a policy problem before treating it as a storage problem. Start with reliable session state, then add structured long-term profile memory, and only later add more flexible semantic or episodic memory if the product really benefits from it.

### Minimal example

```python
session_state = {
    "messages": [],
    "tool_results": [],
    "current_plan": None,
}

user_profile = {
    "user_id": "123",
    "preferences": ["concise answers"],
    "location": "San Jose",
}
```

The useful distinction here is:

- `session_state` is short-term memory
- `user_profile` is long-term memory

Short-term memory helps the current workflow stay coherent. Long-term memory stores information that remains useful across sessions. That is why memory design is usually not just "use a vector database." The first question is whether the information belongs to the current task or to the user's persistent profile.

### How to judge short-term vs long-term

A reliable memory system usually uses a **hybrid approach**: LLM + Rule

**Step 1**: Use the LLM for understanding and extraction

- The LLM should only do one thing: extract candidate memories from natural language

- For example:
  - User says: “I usually prefer concise answers”

  - LLM output:
```json
{
  "type": "preference",
  "content": "user prefers concise answers"
}
```

**Step 2**: Use rules for the final decision

- You control this:

```python
def should_store(memory):
    if memory["type"] in {"tool_result", "plan", "scratchpad"}:
        return False
    
    if memory["type"] in {"preference", "goal", "profile"}:
        return True
    
    return False
```

- Rules decide:

  - what can enter long-term memory
  - what should always be excluded


## 3. Cost, Latency, and Quality

### Key answer

Agent and RAG systems usually cannot optimize cost, latency, and quality at the same time. 
- Cost comes from model usage, tokens, retrieval, and tool calls. 
- Latency comes from retrieval time, inference time, and serial execution chains. 
- Quality depends on recall, reasoning quality, and final answer usefulness. 

The practical goal is to define the minimum acceptable quality first, and then optimize the other two around that constraint.

### Follow-up

If the next question is how to reduce cost or latency without breaking quality, a good answer is to mention smaller routing models, tighter context windows, lower retrieval depth, caching, or selective tool usage, but only after stating that any optimization still has to be checked against answer quality and task success.

### Best practice

Pick the minimum acceptable quality bar first. Then optimize cost and latency around that bar instead of optimizing all three dimensions blindly at the same time.

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

The important point is that tradeoffs usually appear in ordinary parameters like retrieval depth, context size, model choice, or number of tool calls. They are not abstract principles floating above the system.

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

## 4. RAG Evaluation

### Key answer

RAG evaluation can be separated into retrieval quality and answer quality. Retrieval quality asks whether the right information was actually brought back. Answer quality asks whether the final response is correct, grounded in evidence, and useful for the task. Offline metrics help during development, but online validation is still needed once the system is exposed to real usage.

### Follow-up

If the next question is how to validate RAG online, a good answer is to mention trace review, sampled human evaluation, failure analysis, and observing how often the system retrieves the right evidence but still answers poorly, or answers confidently without sufficient grounding. The important point is that retrieval and answering should not be treated as the same failure.

### Best practice

Separate retrieval quality from answer quality in both offline and online evaluation. A system can retrieve the right evidence and still answer badly, or retrieve weak evidence and answer confidently. Those failure modes should not be treated as the same problem.

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

That is why evaluation questions are really asking whether you know how to isolate failure modes instead of collapsing retrieval and answer quality into one vague score.

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

This is usually a stronger project narrative than starting with the model name or the framework name. The real difference in these interviews is often not API familiarity. It is whether you can explain why the system was designed that way and how you knew it was effective.

### Key answer

When I present a project, I try to structure it as problem, design, and validation. I start with the business or user need, then explain why I chose this particular architecture, and finally show how I measured whether it worked. That is usually much clearer than starting with model names or framework names.

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

- strong agent and RAG discussions usually test systems thinking as much as AI concepts
- architecture answers should focus on responsibility boundaries, not just frameworks
- memory answers should separate short-term context from long-term reusable information
- tradeoff answers should show that cost, latency, and quality are design constraints, not afterthoughts
- evaluation answers should distinguish retrieval quality from final answer quality
- the clearest project explanations usually follow the sequence: problem, design, validation

## References

- OpenAI Help Center, *Function Calling in the OpenAI API*: [OpenAI Help](https://help.openai.com/en/articles/8555517-function-calling-in-the-openai-api)
- Yao et al., *ReAct: Synergizing Reasoning and Acting in Language Models*: [arXiv 2210.03629](https://arxiv.org/abs/2210.03629)
- Lewis et al., *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*: [NeurIPS 2020](https://papers.nips.cc/paper/2020/hash/6b493230205f780e1bc26945df7481e5-Abstract.html)
- LangMem, *Core Concepts*: [LangMem Core Concepts](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/)
- LangMem, *Memory API Reference*: [LangMem Memory API](https://langchain-ai.github.io/langmem/reference/memory/)
- OpenAI, *Agent evals*: [OpenAI Agent Evals](https://platform.openai.com/docs/guides/agent-evals)
