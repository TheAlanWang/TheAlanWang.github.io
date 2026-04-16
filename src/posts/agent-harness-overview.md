---
layout: layouts/post.njk
title: Agent Harness Overview
description: A sketch of how agent systems split responsibilities between the model and the harness around it.
excerpt: A sketch of how agent systems split responsibilities between the model and the harness around it.
date: 2026-04-14
type: Sketch
topic: AI
tags:
  - posts
image: /assets/sketches/agent-harness-overview.svg
imageFit: contain
permalink: /posts/agent-harness-overview/index.html
---
This sketch is a compact view of how I think about agent systems: the model is only one part of the system, and the harness around it is what makes the agent usable, reliable, and operational in practice.

![Agent Harness Overview](/assets/sketches/agent-harness-overview.svg)

## What It Covers

- the distinction between the model itself and the surrounding harness
- how planning, memory, tools, and execution fit around a model
- why orchestration matters once an agent has to do real work
- where evaluation, observability, and validation sit in the stack
- a systems view of what turns a raw model into an operational agent

It is the kind of note I want nearby when thinking about agent architecture as a full system rather than just a prompting problem.
