---
layout: layouts/post.njk
title: Redis Overview
description: A compact Redis sketch covering data types, commands, cache patterns, and configuration notes.
excerpt: A compact Redis sketch covering data types, commands, cache patterns, and configuration notes.
date: 2026-04-08
type: Sketch
topic: Systems
tags:
  - posts
image: /assets/sketches/redis-overview.svg
imageFit: contain
permalink: /posts/redis-overview/index.html
---
This sketch is a compact Redis reference that I use as a structural overview rather than a full tutorial. It pulls together the parts that are easy to forget in practice: core data types, common commands, cache patterns, persistence choices, and a few operational notes.

![Redis Overview](/assets/sketches/redis-overview.svg)

## What It Covers

- the Redis data types I reach for most often
- common commands for strings, lists, sets, hashes, and sorted sets
- cache patterns such as cache-aside and write-through
- persistence and configuration tradeoffs at a high level
- a quick mental model for when Redis is being used as a cache versus a data structure store

It is the kind of note I want nearby before designing a feature that depends on fast lookups, counters, queues, or short-lived state.
