---
layout: layouts/post.njk
title: "Relational vs Non-relational Databases"
description: "A practical database selection note explaining when to use relational databases, when to use non-relational databases, and why the decision should be based on workload and guarantees rather than only data relationships."
excerpt: "A practical note on choosing relational vs non-relational databases based on query patterns, transactions, consistency, scale, and access model rather than only data relationships."
date: 2026-05-12T15:00:00-07:00
category: Knowledge
subcategory: Data Systems
topic: Database Basics
kind: Note
tags:
  - posts
permalink: /posts/database-basic-choosing-relational-vs-non-relational-database/index.html
---
## Overview

> I would start with the application's requirements: the data structure, query patterns, and consistency needs.
> 
> I'd choose a relational database, like PostgreSQL, when we need **joins, constraints, or transactions (ACID)**. For example, in an online shopping system, creating an order and updating inventory should happen together, so a relational database would be a strong choice.
> 
> I'd consider a non-relational database when **one access pattern dominates**, or when its data model fits the workload better. For example, a document database can work well for flexible product information, a key-value store can support fast cache lookups, and a wide-column store like Cassandra fits chat messages at scale.
> 
> I would also consider scalability, maintenance, and the team's experience. I wouldn't assume that NoSQL is always faster or that SQL cannot scale. My default would usually be relational, unless there's a specific requirement that makes another database a better fit. In practice, many systems use both: relational as the source of truth, with specialized stores for specific parts.

**One access pattern dominates**: almost every request on that data is the same kind of query. For example, chat messages are almost all "append + read latest". Orders are queried many different ways, so no single pattern dominates, and relational fits better.

## Relational

Tables with an explicit schema, plus tools to enforce rules: `PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `NOT NULL`, `CHECK`, transactions, `JOIN`.

Choose it when correctness and flexible querying matter most:
- Multi-step writes that must succeed or fail together (create order → reserve inventory → record payment)
- Data integrity enforced by the database, not app code
- Joins, aggregation, reporting, ad-hoc queries
- Query patterns that are unknown or likely to change

Typical: orders, payments, inventory, accounts, bookings, permissions.

### ACID

Relational databases guarantee ACID on every transaction:

|                 | Meaning                                          | Example                                              |
| --------------- | ------------------------------------------------ | ---------------------------------------------------- |
| **Atomicity**   | All steps succeed, or none do                    | Create order and reduce inventory together           |
| **Consistency** | Data always follows the rules (constraints)      | An order can't point to a user that doesn't exist    |
| **Isolation**   | Concurrent transactions don't step on each other | Two people buy the last seat, only one succeeds      |
| **Durability**  | Once committed, data survives a crash            | Payment is saved even if the server dies right after |

## Non-relational

It's not one thing. It's a family of specialized stores, each built for one access pattern:

| Type | Use case | Access pattern |
|---|---|---|
| Key-value | Cache, sessions, counters | Get by key, TTL |
| Document | Nested / varying fields (product catalog) | Get by id or indexed field |
| Wide-column | Massive append-heavy writes | Partition key + time |
| Time-series | Metrics, monitoring | Metric + time range |
| Graph | Social graph, recommendations | Neighbors, paths |
| Search engine | Full-text search | Terms, filters, relevance |

Choose it when one narrow, stable access pattern dominates and the data can tolerate eventual consistency (view counts, feeds, logs, events).

**Access pattern**: one specific way the app reads or writes a piece of data. It's not just "read vs write". It's the exact shape of the query. Common ones:

| Access pattern | Example | Good fit |
|---|---|---|
| Get by key | Get session by session id | Key-value |
| Get one object by id | Get product with all its fields | Document |
| Append + read latest by partition | Add a message to a channel, read the latest 50 | Wide-column |
| Range by time | CPU usage in the last hour | Time-series |
| Traverse relationships | Friends of friends | Graph |
| Full-text search | Search "wireless headphones" | Search engine |
| Joins, filters, aggregation, ad-hoc | Revenue by region last month | Relational |

## How to Choose

1. How will the data be **queried**?
	- By key, by time range, with joins, full-text search, or graph traversal?
	- Only a few fixed queries: use a store built for them. Many queries, or likely to change: use relational.
2. Must the data be **correct immediately**?
	- Payments and inventory must be. Use relational.
	- View counts, feeds, and analytics can be a little behind. Non-relational is fine.
3. Do writes need to **update multiple records together**?
	- If yes, use relational. Transactions are its core strength.
4. How much will it **scale**?
	- Relational scales far with indexes, replicas, partitioning, and caching.
	- Don't switch to NoSQL just because you *might* grow.
5. Do records have **different fields**?
	- A flexible schema is convenient, but validation moves into app code and data quality can drift.
6. Can the team **operate** it?
	- Backups, monitoring, migrations, incident response. A database the team can't run safely is the wrong choice.

## Cases

Most systems use more than one database: relational for the core records, plus specialized stores for the hot paths.

| System                               | Relational                | Non-relational                              | Why                                               |
| ------------------------------------ | ------------------------- | ------------------------------------------- | ------------------------------------------------- |
| URL shortener                        |                           | Key-value (DynamoDB), Redis cache           | Lookup by short code only, very read-heavy        |
| Chat (WhatsApp, Discord)             | Postgres: users, channels | Wide-column (Cassandra): messages           | Messages: append, then read latest by channel     |
| News feed (Twitter)                  | Postgres: users, follows  | Cassandra: posts. Redis: feed cache         | Feed is precomputed per user and read by key      |
| E-commerce orders                    | Postgres                  |                                             | Orders, payments, inventory need transactions     |
| Payment system                       | Postgres                  |                                             | Strong consistency, no double charge, audit trail |
| Ticketing / hotel booking            | Postgres                  |                                             | No double booking, row locks on seats or rooms    |
| Product catalog                      | Postgres `jsonb`          | or MongoDB                                  | Products have different fields                    |
| Leaderboard                          | Postgres: score history   | Redis sorted set: live ranking              | Fast rank updates and top-N reads                 |
| Rate limiter                         |                           | Redis                                       | Counters with TTL, very fast                      |
| Metrics monitoring                   |                           | Time-series (Prometheus, InfluxDB)          | Query by time range, old data expires             |
| Search / autocomplete                | Postgres: source of truth | Elasticsearch: synced copy for search       | Full-text search, fuzzy matching, ranking         |
| Nearby places (Yelp, Uber)           | Postgres + PostGIS        | or Redis geo                                | Query by location radius                          |
| File storage (Dropbox)               | Postgres: file metadata   | S3 for the files (object storage, not a DB) | Files are large blobs, metadata needs queries     |
| Social graph ("People you may know") | Postgres: users           | Graph (Neo4j): friendships                  | Multi-hop friend traversal                        |

## Postgres vs MongoDB

When people say "SQL vs NoSQL", they usually mean these two. MongoDB is a document database, one type of NoSQL.

*Checked 2026-10: PostgreSQL 18 (19 in beta), MongoDB 8.3. The gap keeps shrinking, so recheck when versions change.*

| | Postgres | MongoDB |
|---|---|---|
| Data shape | Tables, rows, fixed schema | JSON documents, fields can differ |
| Related data | Separate tables, joined at query time | Nested in one document, read in one go |
| Transactions | Strong, multi-table is core | Multi-document since 4.0, but not its main strength |
| Flexible fields | `jsonb` (since 9.4) | Native |
| Scaling out | Read replicas, partitioning. Sharding needs an extension like Citus | Built-in sharding |

Default to Postgres. Consider MongoDB when the data is naturally one object read and written as a whole, with fields that vary a lot (product catalog, CMS content), or when you need built-in horizontal sharding.
