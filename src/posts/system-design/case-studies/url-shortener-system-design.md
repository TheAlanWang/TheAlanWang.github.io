---
layout: layouts/post.njk
title: "URL Shortener"
description: "Interview notes on a Bit.ly-style URL shortener: requirements, short code generation strategies, caching, and scaling reads and writes."
excerpt: "Requirements, short code generation strategies, caching, and scaling reads and writes with separate read/write services."
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

## Q:

Bit.ly is a URL shortening service that converts long URLs into shorter, manageable links.

ie. `www.mylongurl.com/long/is/annoying` -> `www.bit.ly/GHJ23`

## A:

### Functional Requirements

- Users can **create** a short url from a long url
  - optionally support custom alias
  - optionally support an expiration time
- Users can be **redirected** to the original url from the short url

### Non-Functional Requirements

- Low latency on redirects (~200ms)
- Scale to support 100M DAU and 1B urls
- Ensure uniqueness of short code
- High Availability: redirects remain accessible (CAP)

### Core Entities

- Original url
- Short url
- User

### API

```text
// shorten a url
POST /urls -> shortUrl
{
  originalUrl,
  alias?,
  expirationTime?
}

// redirection
GET /{shortUrl} -> Redirect to OriginalUrl
```

### High-level Design

![URL shortener system design: primary server with Redis and database, split read/write services, and a global counter for write scaling](/assets/sketches/url-shortener-system-design.png)

### Dive Deep

#### Functional

- fast
- unique
- short (5-7)

System-generated short code

1. prefix of the long url
   - two different long URLs commonly share a prefix
2. random number generate (1B url, 1,000,000,000)
   - base62 encoding, characters: 0-9, A-Z, a-z
   - 62^6 = 56B
   - collision happen
   - -> we need to check for **collision** first
3. Hash the long url
   - hash function: MD5 (long URL)
   - 128-bit hash (32 hex characters), characters: 0-9, a-f
   - base62(hash), characters: 0-9, A-Z, a-z
   - `[:6]`
   - -> we need to check for **collision** first
4. Counter
   - incrementing a counter -> base62
   - predictability which is bad for security
     - "Warning, shorten private urls"
     - rate liming

#### Non-functional

Low latency

- add cache (redis)

Scale

- DAU 10^8 / 10^5 = 10^3 pre second
  - peak: `*10 or *100` = 10k - 100k rps
- Scale horizontally
  - read need to scale
- Microservice
  - **read service** talks to Redis first, falling through to the database on a cache miss
  - **write service** owns short-code creation.
- Database scale

```text
URL Table:
  - shortCode / customAlias (PK): ~8 bytes
  - longUrl: ~100 bytes
  - expirationTime: ~8 bytes
  - creationTime: ~8 bytes
  - userId: ~8 bytes
```

~ 500bytes * 1B = 500 bytes * 10^9 url = 500 GB

High Availability

- replication + failover + redundancy
- The database has a **replica** for read availability
