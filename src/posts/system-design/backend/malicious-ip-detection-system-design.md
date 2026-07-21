---
layout: layouts/post.njk
title: "System Design: Malicious IP Detection"
description: "An interview-style walkthrough of a malicious IP detection system: hot-path filtering with a Bloom filter and Redis blacklist, and a Kafka/Flink cold path that feeds detections back."
excerpt: "Requirements, QPS estimation, a hot/cold path split, and three deep dives: Bloom filter sizing, blacklist propagation, and layered detection."
date: 2026-07-20T12:00:00-07:00
category: System Design
subcategory: Backend
topic: Security
kind: Guide
tags:
  - posts
image: /assets/sketches/malicious-ip-detection.png
imageFit: contain
permalink: /posts/malicious-ip-detection-system-design/index.html
---

"Design a system that detects and blocks malicious IPs" is a compact interview question that touches request-path latency, streaming pipelines, and probabilistic data structures in one design. This post walks through it the way I would answer it live.

![Malicious IP detection: hot path with Bloom filter and Redis blacklist, cold path with Kafka, Flink, and offline ML](/assets/sketches/malicious-ip-detection.png)

## Requirements

**Functional**

1. Filter malicious IPs, escalating in sophistication:
   - **Blacklist check** — block IPs already known to be bad.
   - **Repeated failed attempts** — detect brute force (many failed logins from one IP in a window).
   - **Behavior detection** — catch patterns no single rule expresses: scraping cadence, unusual URI sequences, odd user agents.
2. Store IP request information for analysis and audit.

**Non-functional**

1. **Latency** — the check sits in front of every request, so its budget is a few milliseconds at most.
2. **Scalability** — it must survive the traffic it is protecting against, including spikes.
3. **Availability** — the filter failing must not take the product down with it.

## Estimation

With 10M DAU making ~100 requests each:

```text
10M × 100        = 1B requests/day
1B / 86,400      ≈ 11.6k QPS average
peak ≈ 3–5×      ≈ 50k QPS
```

Two conclusions fall out of the numbers. First, 50k QPS means the blocking decision cannot involve a database or any per-request fan-out — it has to be answered from memory. Second, 1B request logs per day means the analysis workload is a streaming problem, not something you bolt onto the request path.

Those two conclusions *are* the architecture: a **hot path** that only reads, and a **cold path** that does all the thinking.

## High-level design

**Hot path (low latency).** The API gateway runs a Bloom filter, auth, and rate limiting in-process. On each request it checks the client IP against the Bloom filter; only on a hit does it confirm against the Redis blacklist. Allowed traffic proceeds to the service. The blocking decision costs a local memory lookup in the common case.

**Cold path (all the analysis).** The gateway and service asynchronously emit request metadata — IP, URI, User-Agent, status code — to Kafka. From there the stream splits:

- **Flink** consumes in real time and evaluates windowed rules (failed-attempt counting, request-rate anomalies), writing offenders straight into the Redis blacklist within seconds.
- A **log DB** stores the raw stream for **offline analysis and ML training**, which discovers slower patterns and periodically refreshes the blacklist with model-driven detections.

The design's core trade is explicit: the hot path is dumb and fast, the cold path is smart and slow, and the Redis blacklist is the only meeting point between them.

## Deep dive 1: why a Bloom filter in front of Redis

At 50k QPS, even a 1ms Redis round-trip per request is 50 network calls per millisecond of aggregate budget — and the overwhelming majority of traffic is innocent. A Bloom filter answers "definitely not blacklisted" from gateway-local memory in nanoseconds.

The false-positive direction is what makes it safe here. A Bloom filter never says "no" incorrectly, so a clean verdict is trustworthy and skips Redis entirely. A "maybe" (false-positive rate ~1%) just costs one confirming Redis lookup — a wrong answer is never served, only occasionally a slightly slower one.

Sizing is cheap: 10M blacklisted IPs at 1% false-positive rate needs about 10 bits per entry — roughly **12 MB** — trivially replicated to every gateway instance. The filter is rebuilt on the periodic refresh cycle; because Bloom filters don't support deletion, unbanning an IP takes effect at the next rebuild, which is an acceptable staleness for this direction (slightly over-checking, never under-blocking).

## Deep dive 2: blacklist propagation

New detections must reach the hot path. Two mechanisms cover the two urgency classes:

- **Write-through for real-time detections.** Flink writes offenders directly into Redis. The next confirming lookup sees them immediately — the Bloom filter may miss until rebuild, so gateways treat filter *and* recent-writes correctly by letting Flink also publish a small "recent bans" delta the gateways poll or subscribe to.
- **Periodic refresh for the bulk set.** Gateways rebuild the Bloom filter (and warm local caches) from the full Redis set on an interval — say every 1–5 minutes.

The consistency question an interviewer will probe: *how long between attack and block?* Failed-attempt rules take effect in seconds via the write-through path; ML-driven detections take effect on the refresh interval. Both are eventual, and that's fine — the requirement is protecting the aggregate, not blocking request #1.

Entries should carry TTLs. Permanent bans accumulate stale IPs (addresses get reassigned), inflate the Bloom filter, and raise the false-positive rate for innocent users who inherit a banned address.

## Deep dive 3: layered detection

The three functional requirements map onto three timescales, and each lives where its latency budget allows:

| Layer | Where | Reaction time | Example |
|---|---|---|---|
| Known-bad lookup | Hot path (Bloom + Redis) | per request | blacklisted IP |
| Windowed rules | Flink | seconds | 20 failed logins / 60s from one IP |
| Learned behavior | Offline ML on log DB | hours | scraping disguised as browsing |

The layering also fixes each layer's weakness: rules catch what the blacklist hasn't seen, ML catches what rules can't express, and everything ML learns is distilled back into the cheap layers — a model score becomes a blacklist entry, a discovered pattern becomes a new Flink rule. Detection intelligence flows down; per-request cost stays flat.

## Availability: fail open or fail closed?

The classic probe: Redis is down — do you block everyone or admit everyone?

For this system, **fail open**: the gateway skips the confirming lookup and serves traffic using the last-built Bloom filter and rate limiting alone. A few minutes of degraded filtering is strictly better than a self-inflicted outage — the filter exists to protect availability, so it must not become the availability risk itself. The mitigations are already in the design: the Bloom filter keeps working from local memory with no dependency, per-IP rate limiting still bounds abuse, and Kafka retains the stream so the cold path replays and catches up once Redis returns.

The opposite choice is defensible for high-stakes surfaces (payments, admin endpoints) — which is exactly the nuance worth saying out loud in an interview: fail-open vs fail-closed is a per-endpoint policy, not a global constant.
