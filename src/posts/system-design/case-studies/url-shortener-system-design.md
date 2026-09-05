---
layout: layouts/post.njk
title: "URL Shortener"
description: "An interview-style walkthrough of a URL shortener (Bit.ly-style): short code generation strategies, a cache-aside read path, and scaling the write path with a counter service."
excerpt: "Requirements, capacity estimation, three ways to generate a short code, and how caching and a global counter keep reads fast and writes unique at scale."
date: 2026-09-05T12:00:00-07:00
category: System Design
subcategory: Case Studies
topic: URL Shortener
kind: Guide
tags:
  - posts
image: /assets/sketches/url-shortener-system-design.png
imageFit: contain
permalink: /posts/url-shortener-system-design/index.html
---

Bit.ly is a URL shortening service that converts long URLs into short, manageable links — `www.mylongurl.com/long/is/annoying` becomes `bit.ly/GHJ23`. It is a small surface area with a surprisingly deep set of follow-ups: how do you generate a short code, how do you keep it unique without a global lock, and how do you make redirects fast at scale.

![URL shortener system design: primary server with Redis and database, split read/write services, and a global counter for write scaling](/assets/sketches/url-shortener-system-design.png)

## Requirements

**Functional**

1. Users can **create** a short URL from a long URL.
   - Optionally support a custom alias.
   - Optionally support an expiration time.
2. Users can be **redirected** to the original URL from the short URL.

**Non-functional**

1. **Low latency** on redirects — around 200ms.
2. **Scale** to support 100M DAU and 1B URLs.
3. **Uniqueness** of every short code.
4. **High availability** — redirects must stay accessible even under partial failure.

## Core Entities

- **Original URL**
- **Short URL**
- **User**

## API

```text
// shorten a url
POST /urls -> shortUrl
{
  originalUrl,
  alias?,
  expirationTime?
}

// redirection
GET /{shortUrl} -> redirect to originalUrl
```

The redirect endpoint is the one that matters for the latency requirement — a `GET` is on the hot path for every click on a shortened link, while `POST /urls` only runs once per link created.

## High-level Design

A primary server handles both writes (create a short URL) and reads (look up the long URL for a redirect), backed by a database for the durable mapping and a Redis cache in front of it. This is enough to satisfy the functional requirements; the deep dives below are what turn it into something that survives 100M DAU.

One design detail worth calling out up front: whether the redirect is a 301 (permanent) or 302 (temporary) matters beyond HTTP semantics. A 301 tells the client's browser to cache the redirect and skip the server entirely on the next click — great for load, bad if you ever want to change or expire that mapping, or track click analytics. A 302 keeps every redirect flowing through the server. For a service that supports expiration times and wants click data, **302 is the safer default**, even though it costs more requests.

## Deep Dive 1: generating the short code

The constraints on the code itself are simple to state and easy to get wrong under load: it needs to be **fast** to generate, **unique**, and **short** (5-7 characters). Four strategies, in roughly the order an interview conversation would rule them out:

1. **Prefix of the long URL.** Rejected immediately — two different long URLs commonly share a prefix (`https://www.`), so this doesn't come close to unique.
2. **Random generation.** Generate a random Base62 string (`0-9A-Za-z`, 62 characters). At 6 characters, the space is 62⁶ ≈ 56 billion — far more than the 1B URLs the system needs to hold. The catch is that "random" doesn't mean "collision-free": two requests can still generate the same code. The fix isn't a smarter random function, it's accepting collisions can happen and checking for one before committing the write (and regenerating on a hit).
3. **Hash the long URL.** Run the long URL through MD5 (a 128-bit hash, 32 hex characters), Base62-encode that hash, and truncate to the first 6 characters. This is deterministic — the same long URL always maps to the same code, which is either a feature (idempotent creation) or a bug (no two users can get different short codes for the same destination) depending on the product requirement. Truncating a 128-bit hash down to 6 Base62 characters also reintroduces the same collision risk as option 2, just via a different source of randomness.
4. **Incrementing counter, encoded as Base62.** A monotonically increasing counter guarantees uniqueness by construction — no collision checks needed. The tradeoff is predictability: codes are issued in a knowable sequence, which leaks information (roughly how many URLs exist, when a given one was created) and makes it easy to enumerate other users' shortened links by walking the sequence. That's a real problem if anyone shortens a private URL. Mitigations are policy, not architecture — rate limiting on redirect lookups, and a warning that this service isn't meant for links that need to stay unguessable.

None of these four are strictly better than the others; they trade uniqueness guarantees against predictability and implementation complexity, and the "right" answer depends on which failure mode the product cares about more.

## Deep Dive 2: low latency reads

A cache sits in front of the database on the read path: **cache-aside** with an **LRU eviction policy**, keyed by `shortCode` with the long URL as the value. On a redirect, the server checks Redis first; only on a miss does it fall through to the database, and the result is written back into the cache for next time.

The database schema behind it:

```text
URL Table
  shortCode / customAlias (PK)   ~8 bytes
  longUrl                        ~100 bytes
  expirationTime                 ~8 bytes
  creationTime                   ~8 bytes
  userId                         ~8 bytes

User Table
  userId
  ...
```

At roughly 500 bytes per row and 1B URLs, that's **500 bytes × 10⁹ ≈ 500GB** — well within a single well-indexed relational database, no sharding required purely on size. The 200ms latency target is met almost entirely by the cache hit rate, not by database tuning: popular links stay hot in Redis, and the long tail of rarely-clicked links is the only traffic that pays the database round-trip.

## Deep Dive 3: scaling reads and writes independently

At 100M DAU, a rough traffic estimate: 10⁸ DAU / 10⁵ seconds/day ≈ 10³ requests/second average, with peaks of 10-100x that — **10k to 100k RPS**. Redirects (reads) vastly outnumber URL creations (writes) in a service like this, so the two paths scale differently and shouldn't be forced through the same bottleneck.

The design splits them behind an API gateway into a **read service** and a **write service**, each scaled horizontally and independently:

- The **read service** talks to Redis first, falling through to the database on a cache miss — this is the path from Deep Dive 2, now running on however many read replicas the traffic needs.
- The **write service** owns short-code creation. If code generation uses the counter strategy from Deep Dive 1, every write-service instance incrementing a single shared counter directly would serialize all writes on that counter — the opposite of horizontal scaling. The fix is a **global counter service** that hands out counter values in batches (the diagram notes "may request 1k at a time"): each write-service instance requests a block of 1,000 values up front and issues short codes from its local block without contacting the counter again until the block is exhausted. This bounds the counter's request rate to writes/1000 instead of writes, at the cost of some values going unused if an instance restarts mid-block — an acceptable tradeoff since the code space is large relative to 1B URLs.

## Availability

The database has a **replica** for read availability — if the primary is unavailable, reads can still be served (writes are the harder problem, and typically fail over to the replica being promoted, with the usual replication-lag caveats). Combined with the cache absorbing most read traffic, the system degrades gracefully: even a database blip mostly affects cache misses and new URL creation, not the redirects that make up the bulk of traffic.

## Key Takeaways

- Short-code generation is a tradeoff between uniqueness guarantees, predictability, and implementation complexity — not a single "correct" answer.
- The read path (redirects) and write path (URL creation) have very different traffic shapes and scale independently: cache-aside Redis in front of the database for reads, a batched global counter for writes.
- 301 vs 302 redirects is a real product decision, not a technicality — it trades server load against the ability to expire or track a link.
