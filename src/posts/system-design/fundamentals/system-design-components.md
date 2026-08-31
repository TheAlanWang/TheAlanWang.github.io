---
layout: layouts/post.njk
title: "System Design Components"
description: Nine components that show up in nearly every system design interview, what each one actually solves, and the one trade-off worth knowing for each.
excerpt: Nine components that show up in nearly every system design interview, what each one actually solves, and the one trade-off worth knowing for each.
date: 2026-08-30T12:00:00-07:00
category: System Design
subcategory: Fundamentals
topic: Components
kind: Guide
tags:
  - posts
image: /assets/sketches/system-design-components.svg
imageFit: contain
permalink: /posts/system-design-components/index.html
---

![Nine system design components and the one thing each one solves](/assets/sketches/system-design-components.svg)

## 1. DNS

DNS (Domain Name System) translates a human-readable domain name into an IP address, so clients have a stable name to reach a service whose actual servers can change (scaling, failover, migrations) without anyone needing to update a hardcoded address.

The trade-off is TTL, set by whoever owns the DNS record, controlling how long a client caches an answer before asking again:

- **Long TTL** (e.g. 1 hour): fewer repeat queries, less load on the DNS servers, but a failover can take up to an hour to reach clients still holding a cached, dead IP.
- **Short TTL** (e.g. 10 seconds): failover reaches clients almost immediately, but now the DNS servers see far more repeat queries for the same number of clients.

**Interview line**: DNS gets a client to the right region or datacenter; the load balancer decides which server within it.

## 2. Load Balancer

A load balancer spreads incoming traffic across multiple backend instances and removes unhealthy ones from rotation via health checks, so no single instance is a bottleneck or a single point of failure.

Two [network layers](/posts/network-layer-model/) matter here:

- **L4** (transport layer): balances on just the IP and port, fast and protocol-agnostic.
- **L7** (application layer): balances on the actual HTTP request (path, headers, cookies), enabling smarter routing at the cost of more overhead per request.

The algorithm is its own trade-off:

- **Round robin**: simple, but ignores actual load.
- **Least-connections**: adapts to load, but needs the balancer to track state.
- **Consistent hashing**: buys sticky sessions and cache locality (a client keeps landing on the same server, so its cached data stays useful), at the cost of uneven distribution if not tuned.

**Interview line**: put a load balancer in front of the stateless web servers for traffic distribution and failover.

## 3. API Gateway

API Gateway is a centralized middleware in front of backend services, especially useful in microservice architectures. It can handle shared concerns such as authentication, rate limiting, TLS termination, IP filtering, and routing so that individual services do not need to implement them repeatedly.

```text
Client
  ↓
API Gateway
  ├── Authentication
  ├── Rate Limiting
  ├── TLS / SSL termination
  ├── IP filtering
  └── Routing
       ↓
Backend services
```

The trade-off:

- The gateway itself becomes a critical shared dependency and must be scaled and made highly available.
- It also adds an extra processing/network hop.

**Interview line**: use an API Gateway to centralize cross-cutting concerns and route requests to backend services.

## 4. Application Server

This is where the actual business logic runs: it receives a request (usually after the gateway and load balancer), talks to the database, cache, and queue as needed, and returns a response. It's the layer you scale horizontally by just adding more instances behind the load balancer.

That only works cleanly if the server is stateless, meaning it keeps no request-specific data in its own memory between requests. The trade-off shows up the moment you want state, like a login session:

- Keep it in the server's memory: a user's second request can fail the moment it lands on a different instance.
- Push it out to something shared instead (Redis, a database, or a signed client-side token like a JWT): any instance can serve any request.

**Interview line**: say explicitly that the app servers are stateless and name where the state actually lives instead, that's usually the detail that shows you understand horizontal scaling rather than just naming the box.

## 5. Database

The database is the source of truth:

- **SQL**: relational model, joins, transactions; usually a good default when relationships matter.
- **NoSQL**: alternative data models and access patterns; useful for cases such as massive scale, unstructured data, or specific latency/scalability requirements.

Once one instance can't hold or handle the load, sharding splits data across multiple instances by a key (user ID, region, tenant). The cost is that cross-shard queries and joins become expensive or impossible. The key thing is choosing a shard key that spreads traffic evenly and avoids hot spots.

During a network partition, a distributed system must choose between consistency and availability, this is the CAP theorem:

```text
Network partition occurs
        ↓
P has already happened, must be handled
        ↓
       choose
      /      \
Consistency  Availability
    (C)          (A)
```

**Interview line**:

- Justify SQL vs NoSQL based on the data model and access patterns, whether the data has strong relationships and needs transactions or joins.
- If the database is distributed and consistency during failures matters, discuss the relevant consistency/availability trade-off and CAP.

## 6. Cache

A cache is a fast, temporary data layer that stores frequently accessed data or expensive query results, usually in memory. The application checks the cache before querying the database. On a cache hit, the result is returned immediately; on a cache miss, the application reads from the database, stores the result in the cache, and then returns it. This reduces database load and improves response time.

Caching works best for data that is read frequently but modified infrequently. The main trade-offs are expiration and consistency: a TTL that is too short causes frequent database reloads, while a TTL that is too long can leave stale data in the cache. Cache failures and eviction also need to be considered; common eviction policies include LRU, LFU, and FIFO.

**Interview line**: cache read-heavy, infrequently changing data to reduce latency and database load; be ready to explain your TTL and how you handle stale data.

## 7. Message Queue

A message queue enables asynchronous communication between producers and consumers. The producer publishes a message to the queue and can move on without waiting for the consumer to finish. Consumers pull messages from the queue and process them independently, so the two sides do not need to be available or operate at the same speed.

The queue also acts as a buffer when work arrives faster than it can be processed. For example, a web server can enqueue image-processing jobs, while workers process them in the background. If the queue grows, more workers can be added; if it stays mostly empty, workers can be reduced. This lets producers and consumers scale independently.

**Interview line**: use a message queue when work can be asynchronous and you want to decouple producers from consumers, buffer traffic spikes, or scale consumers independently.

## 8. CDN

A CDN is a geographically distributed network of servers that caches content close to users. Instead of every user fetching static assets from the origin server, the CDN serves them from a nearby edge location, reducing latency and origin load. It is commonly used for static content such as images, videos, CSS, and JavaScript files.

When the CDN does not already have an object, it fetches it from the origin, caches it, and serves it to the user. The object stays cached until its TTL expires. Choosing the TTL is a trade-off: if it is too long, content may become stale; if it is too short, the CDN repeatedly fetches from the origin.

**Interview line**: use a CDN for static content that can be cached close to users, and be ready to explain the TTL and how you invalidate or version stale content.

## 9. Object / Blob Storage

Object storage stores large binary objects such as videos, images, and uploaded files. Instead of storing the file contents in the application database, a common design keeps the actual file in object storage and stores its metadata and storage location in the database.

For large uploads, the API server can authorize the upload by issuing a pre-signed URL, allowing the client to upload the file directly to object storage instead of sending all the file bytes through the application server.

**Interview line**: store large files in object storage and metadata in the database; for large uploads, consider direct client-to-storage uploads using a pre-signed URL.
