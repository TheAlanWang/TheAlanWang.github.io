---
layout: layouts/post.njk
title: "Distributed Databases: Why We Distribute, and What Gets Hard"
description: A systems note on why databases get distributed, how scaling paths differ, and why partitioning, joins, and consistency become harder once data leaves a single machine.
excerpt: A systems note on why databases get distributed, how scaling paths differ, and why partitioning, joins, and consistency become harder once data leaves a single machine.
date: 2026-04-21
category: Systems
subcategory: Databases
tags:
  - posts
image: /assets/projects/distributed-databases-scaling-paths.svg
imageFit: contain
permalink: /posts/distributed-databases-why-we-distribute/index.html
---

Distributed databases are easy to describe and much harder to build. At a high level, the idea is simple: store and serve data across multiple machines instead of one. The reason that gets hard so quickly is that a database is not only a storage engine. It is also a correctness system, a query system, and a failure-handling system.

That is why I think the most useful way to understand distributed databases is not to start with product names or definitions, but with the practical question: what changes once a database is no longer confined to one machine?

![Distributed database scaling paths](/assets/projects/distributed-databases-scaling-paths.svg)

## Why Distribute a Database

Single-machine databases remain attractive for good reasons: they are simpler to operate, queries stay local, and correctness is easier to reason about. The move to distribution usually comes from pressure, not preference.

The main drivers are familiar:

- the dataset no longer fits comfortably on one machine
- throughput exceeds what one machine can handle
- users are geographically far from a single region
- commodity clusters become cheaper than scaling one very large server
- some applications care more about availability and speed than perfect immediacy

The important point is that distribution is usually a response to scale, latency, or resilience constraints. It is not automatically the more elegant design.

## Three Ways Databases Scale

Before a database becomes truly distributed, there are usually two simpler steps worth considering first.

### Scale Up

The first option is vertical scaling: more CPU, more RAM, faster disks, better hardware. This keeps the application model simple because the database still behaves like one machine.

The tradeoff is also simple:

- hardware cost rises quickly
- there is still a hardware ceiling
- the system remains a single point of failure
- global latency is not improved

Scale-up delays the problem. It does not remove it.

### Read Replicas

The next step is often read replication. A primary handles writes, while secondary replicas absorb read traffic. This is useful for read-heavy workloads and can also help with geographic read latency.

But it is not full scale-out. The primary still bottlenecks writes, and asynchronous replication can introduce stale reads. Read replicas improve one part of the problem without changing the underlying write architecture.

### Partitioning

Partitioning is where the system starts to change fundamentally. Instead of copying the same dataset across nodes, the database splits the data itself across nodes.

There are two common forms:

- horizontal partitioning, where rows are split by key, range, or hash
- vertical partitioning, where columns with different access patterns are separated

Once data is partitioned, the database is no longer just a larger single node. It becomes a distributed system with routing, placement, skew, and rebalance concerns.

## What Partitioning Changes

Partitioning is the real turning point because the shard key starts to shape the entire system. Queries now depend on how data is placed. If the partitioning key is good, access stays efficient. If it is wrong, the system spends too much time moving data or hitting hot partitions.

That creates several new concerns:

- queries need routing instead of automatic locality
- hotspots appear when one partition receives disproportionate load
- rebalance becomes expensive when data distribution changes
- cross-partition work is far slower than local work

The main lesson is that data placement becomes part of schema design and application behavior, not just infrastructure.

## Why Relational Systems Get Harder

Relational databases bring structure, expressive queries, and joins. Those strengths become more expensive once the data is spread across nodes.

Distributed joins are hard because data must move or coordinate across machines. That raises latency, increases network traffic, and makes ad-hoc query behavior much less predictable. The problem is not that SQL becomes invalid. The problem is that the cost model changes once locality disappears.

This is one reason distributed relational systems are difficult to scale cleanly. The database now has to minimize both data movement and coordination while still preserving a relational interface.

## Why NoSQL Emerged

NoSQL systems gained traction because many internet-scale workloads cared more about horizontal scaling and predictable access paths than about rich relational flexibility.

The common pattern was:

- simplify the data model
- reduce or avoid joins
- denormalize for expected queries
- scale on shared-nothing commodity hardware

That is why query-first design shows up so often in NoSQL discussions. At scale, it is often better to pre-shape data for the query you know you need than to rely on expensive distributed joins later.

This does not make NoSQL universally better. It reflects a different tradeoff: less general query flexibility in exchange for cheaper scale-out and more predictable performance.

## What Gets Hard Later

Once a database is distributed, the hard problems shift toward coordination:

- replication
- consistency
- quorums
- leader election
- failure recovery

At that point, the database is not just answering queries. It is constantly deciding how replicas agree, how stale reads are tolerated, and what happens when the network or a node misbehaves.

That is the real mental shift I take from distributed databases. A distributed database is not just a bigger database. It is a system that trades simpler queries and simpler correctness for more scale, more availability, and broader reach.

## Key Takeaways

- scaling up delays the problem, but does not remove single-machine limits
- read replicas help with read-heavy workloads, but they do not solve write bottlenecks
- partitioning is the real architectural shift because data placement starts shaping queries and operations
- distributed joins are hard because cross-node coordination and data movement are expensive
- NoSQL systems gained traction partly by simplifying data models and avoiding the cost of distributed joins
- once a database is distributed, correctness and coordination become just as important as storage and query speed
