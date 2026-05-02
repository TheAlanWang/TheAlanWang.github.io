---
layout: layouts/post.njk
title: "Agentic Workflow: Reason, Act, Observe"
description: A compact sketch of a tool-first agentic workflow, showing how reasoning, tool use, observation, memory, and human review fit together in one loop.
excerpt: A compact sketch of a tool-first agentic workflow, showing how reasoning, tool use, observation, memory, and human review fit together in one loop.
date: 2026-04-10
type: Sketch
topic: AI
tags:
  - posts
image: /assets/sketches/agentic-workflow-reason-act-observe.svg
imageFit: contain
permalink: /posts/agentic-workflow/index.html
---
This sketch is a compact overview of an agentic workflow built around a reason-act-observe loop. The goal is not to present a full framework tutorial, but to make the control flow visible: where reasoning happens, how tools are invoked, how observations feed back into the next step, and where memory or human review fits in.

![Agentic Workflow: Reason, Act, Observe](/assets/sketches/agentic-workflow-reason-act-observe.svg)

One useful distinction here is that not every multi-step LLM system is really an agent. Anthropic offers a clear engineering framing for this: workflows are predefined code paths around LLM calls and tools, while agents are systems where the model dynamically decides what to do next. That distinction matters because the loop in this sketch becomes more valuable when the path cannot be hardcoded cleanly in advance.

## Why This Loop Matters

Reasoning-only systems can explain what they want to do, but they stay limited to the model's context and training data. Tool-only systems can execute actions, but they often lack a coherent way to decide what should happen next. The reason-act-observe loop is useful because it keeps those two pieces connected: the model decides on an action, the tool produces a real result, and the next reasoning step is grounded in that result instead of a guess.

That loop is closer in spirit to the ReAct line of work than to any one company's branding. ReAct made the interleaving of reasoning and acting explicit in LLM-based systems, and the observation step is effectively what closes the loop: the environment returns new information, the model updates its reasoning, and the next action becomes grounded rather than speculative.

That is the part I wanted this sketch to make obvious. Once an AI application needs search, APIs, code execution, retrieval, or external state, the workflow stops being a single prompt problem. It becomes a control-flow problem.

## What It Covers

- a tool-first view of agentic systems
- the plan-act-observe loop as the core control pattern
- memory as shared context across steps
- human-in-the-loop checkpoints for oversight or approval
- how orchestration connects reasoning, action, and feedback

## Reading The Diagram

The diagram treats memory as a persistent context layer rather than a side feature. That can mean short-term working state, tool outputs, previous observations, or longer-lived conversation history. Without that state, the loop resets too often and the system starts to feel stateless and brittle.

The human-in-the-loop step is there for the same reason. In practical systems, full autonomy is often the wrong default. Sensitive tool calls, high-cost actions, or ambiguous decisions usually benefit from a review or approval checkpoint. LangGraph's human-in-the-loop docs describe this as pausing execution, persisting state, and then resuming after human input. Conceptually, that is exactly what this sketch is trying to show.

OpenAI's description of ChatGPT agent adds another useful product lens here: an effective agent is not just "a model with tools," but a system that can shift between reasoning and action while preserving task context across multiple interfaces. In their framing, the agent may browse visually, query the web in text form, run code in a terminal, and then return to the browser, all within one task. That makes the loop in this sketch feel less abstract. The important part is not any one tool, but the orchestration layer that keeps state, picks the next action, and lets the user step in when the task reaches a consequential decision.

## When This Pattern Fits

I think this pattern becomes useful when the task is open-ended enough that a fixed sequence is too rigid, but still structured enough that progress can be checked from the environment. Coding agents, research workflows, retrieval-heavy assistants, and operational copilots fit that shape well because they can act, inspect the result, and iterate.

It is less useful when a simpler workflow is enough. That is also a point Anthropic makes clearly: the right first step is usually not to build the most autonomous system possible, but to use the simplest pattern that actually improves outcomes.

## Notes

- workflows are usually better when the task can be decomposed into fixed steps
- agents are more useful when the next step depends on what just happened
- memory helps the system avoid restarting from scratch on every loop
- observation is what turns tool use into grounded iteration
- human review is often part of reliability, not a sign that the system failed

## References

- [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629)
- [Anthropic: Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- [LangGraph: human-in-the-loop](https://langchain-ai.lang.chat/langgraph/agents/human-in-the-loop/)
- [OpenAI: Introducing ChatGPT agent](https://openai.com/index/introducing-chatgpt-agent/?utm_source=chatgpt.com)

It is the kind of note I want nearby when thinking about how an AI application moves beyond a single prompt into a more structured workflow.
