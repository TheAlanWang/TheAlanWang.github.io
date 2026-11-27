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

### Basics

1. [Relational vs Non-relational Databases](/posts/database-basic-choosing-relational-vs-non-relational-database/): which database fits my workload?
2. [SQL Basics](/posts/sql-basics/): how do I create tables and query them?
3. [Transactions and ACID](/posts/transactions-and-acid/): what does a transaction guarantee?

### Indexes

4. [B-Tree and B+ Tree](/posts/b-tree-and-b-plus-tree/): why are indexes B+ trees?
5. Composite and Covering Indexes *(coming soon)*: which column goes first, and when can a query skip the table?
6. [Postgres Indexes](/posts/postgres-indexing-review-btree-bplus-gin/): when to use B-tree, GIN, or an expression index?
7. [HNSW](/posts/hnsw-vector-index/): how do I index vectors?

### Concurrency

8. Isolation Levels and MVCC *(coming soon)*: what goes wrong when transactions overlap?
9. [Optimistic Lock vs Pessimistic Lock](/posts/database-basic-optimistic-lock-vs-pessimistic-lock/): how do I stop lost updates?

### Scale Out

10. [Distributed Database Basics](/posts/distributed-databases-why-we-distribute/): what gets harder across machines?
11. Replication *(coming soon)*: how do copies stay in sync?
12. [Redis Overview](/posts/redis-overview/): how do I cache in front of the database?
13. Cache and Database Consistency *(coming soon)*: how do I avoid stale cache?
