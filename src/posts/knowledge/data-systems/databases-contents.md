---
layout: layouts/post.njk
title: "Contents: Databases"
description: "A reading map for databases: choosing and querying one, making queries fast with indexes, keeping concurrent writes correct, and scaling out."
excerpt: "The order to read the database posts, from choosing a database to B+ tree indexes to scaling out."
date: 2026-11-25T12:00:00-08:00
category: Knowledge
subcategory: Data Systems
topic: "Overviews"
kind: Note
tags:
  - posts
permalink: /posts/databases-contents/index.html
series: databases
seriesOrder: 0
order: 2
---
## Contents

### Choose and Query

1. [Relational vs Non-relational Databases](/posts/database-basic-choosing-relational-vs-non-relational-database/): which database fits my workload?
2. [SQL Basics](/posts/sql-basics/): how do I create tables and query them?

### Make Queries Fast

3. [B-Tree and B+ Tree](/posts/b-tree-and-b-plus-tree/): why are database indexes B+ trees?
4. Composite and Covering Indexes *(coming soon)*: which column order should a multi-column index use, and when can a query skip the table?
5. [Postgres Indexes](/posts/postgres-indexing-review-btree-bplus-gin/): which index fits which query: B-tree, GIN, or an expression index?
6. [HNSW (Hierarchical Navigable Small World)](/posts/hnsw-vector-index/): how do I index vectors for nearest-neighbor search?

### Keep Writes Correct

7. Transactions and Isolation Levels *(coming soon)*: what do ACID, isolation levels, and MVCC guarantee?
8. [Optimistic Lock vs Pessimistic Lock](/posts/database-basic-optimistic-lock-vs-pessimistic-lock/): how do I stop two updates to one row from overwriting each other?

### Scale Out

9. [Distributed Database Basics](/posts/distributed-databases-why-we-distribute/): what gets harder when data leaves one machine?
10. Replication *(coming soon)*: how do copies of the data stay in sync, and what happens when the primary fails?
11. [Redis Overview](/posts/redis-overview/): how do I put a cache in front of the database?
12. Cache and Database Consistency *(coming soon)*: how do I keep the cache from serving stale data?
