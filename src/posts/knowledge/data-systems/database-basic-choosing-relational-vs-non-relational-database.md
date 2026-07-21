---
layout: layouts/post.njk
title: "Database Basic: Choosing Relational vs Non-relational Databases"
description: "A practical database selection note explaining when to use relational databases, when to use non-relational databases, and why the decision should be based on workload and guarantees rather than only data relationships."
excerpt: "A practical note on choosing relational vs non-relational databases based on query patterns, transactions, consistency, scale, and access model rather than only data relationships."
date: 2026-05-12T15:00:00-07:00
category: Knowledge
subcategory: Data Systems
topic: Database Basics
kind: Note
tags:
  - posts
image: /assets/sketches/database-choice-framework.svg
imageFit: contain
permalink: /posts/database-basic-choosing-relational-vs-non-relational-database/index.html
---

Choosing a database is not mainly a question of whether the data has relationships.

That was the part I used to over-simplify:

```text
If data has relationships -> use relational database.
If data has fewer relationships -> use non-relational database.
```

That framing is incomplete. Almost all real systems have relationships somewhere. Users relate to orders, posts relate to comments, devices relate to events, products relate to inventory, and documents relate to owners. The better question is not whether relationships exist. The better question is:

```text
What does the application need the database to guarantee,
and how will the application query and write the data?
```

中文记忆：

```text
不是“有没有关系”决定 SQL / NoSQL。
是查询模式、一致性、事务、规模和访问路径决定数据库选择。
```

![Database Choice Framework](/assets/sketches/database-choice-framework.svg)

## The Core Decision

A relational database is usually the safest default when the system needs:

- strong transactions
- constraints such as foreign keys, uniqueness, and not-null rules
- flexible queries
- joins across entities
- reporting or ad-hoc analysis
- correctness around core business data

A non-relational database can be a better fit when the system has:

- a very specific access pattern
- huge scale on a small set of queries
- low-latency key-based lookups
- flexible or nested document shape
- append-heavy time-series or event data
- graph traversal requirements
- a need to distribute or partition data in a particular way

The key is workload, not labels.

```text
Relational database: choose when correctness and flexible querying dominate.
Non-relational database: choose when access pattern, scale, latency, or data shape dominates.
```

## What Relational Databases Are Good At

Relational databases store data in tables with rows and columns. The important part is not only the table shape. The important part is that relational databases are good at enforcing rules and querying relationships.

Common examples:

```text
users
orders
payments
invoices
inventory
subscriptions
bank transfers
booking systems
```

These systems usually care about correctness. For example:

```text
An order should not point to a non-existing user.
A payment should not be counted twice.
An inventory update should not oversell stock.
An invoice number should be unique.
```

Relational databases give you tools for those rules:

```sql
PRIMARY KEY
FOREIGN KEY
UNIQUE
NOT NULL
CHECK
TRANSACTION
JOIN
```

That is why relational databases are often the default for core business systems.

## When Relational Is the Right Choice

Use a relational database when the system has many of these traits:

| Requirement | Why relational helps |
|---|---|
| Strong consistency | Transactions protect multi-step writes |
| Data integrity | Constraints move rules into the database |
| Complex querying | SQL handles filtering, grouping, joins, and aggregation |
| Changing product questions | Ad-hoc queries are easier |
| Reporting | Structured schema and SQL are strong for analytics-style reads |
| Many entity relationships | Joins are a first-class feature |

Example: an e-commerce order system.

```text
users
orders
order_items
products
payments
shipments
```

This data has relationships, but the stronger reason to choose a relational database is correctness:

```text
create order
reserve inventory
record payment
update order status
```

These writes need to stay consistent. If one step fails, the system needs a clear transaction boundary.

## What Non-relational Databases Are Good At

`Non-relational database` is not one thing. It is a broad category.

Different types solve different problems:

| Type | Typical use case | Example access pattern |
|---|---|---|
| Key-value | Cache, sessions, counters | Get value by key |
| Document | Nested objects, flexible schema | Get document by id or indexed fields |
| Wide-column | Massive write/read scale by partition key | Query rows by partition key and time |
| Graph | Relationship traversal | Find neighbors or paths |
| Time-series | Metrics, logs, events | Query by metric and time range |
| Search engine | Text search and ranking | Search by terms, filters, relevance |

This is why saying “NoSQL is for unrelated data” is misleading. Some non-relational databases are specifically about relationships. A graph database is built for relationship traversal.

中文记忆：

```text
NoSQL 不是“没有关系”的数据库。
NoSQL 是为了特定访问模式、扩展方式、数据形状或查询能力做取舍。
```

## When Non-relational Is the Right Choice

Use a non-relational database when the system has a dominant access pattern that a specialized database serves better.

Examples:

| Scenario | Good fit | Why |
|---|---|---|
| Session storage | Key-value | Read/write by session id |
| Product catalog with flexible attributes | Document database | Different products can have different fields |
| User activity events | Wide-column or time-series | Append-heavy, partitioned by user/time |
| Metrics and monitoring | Time-series | Time-window queries and retention |
| Social graph traversal | Graph database | Relationship traversal is the main query |
| Full-text search | Search engine | Ranking, tokenization, fuzzy matching |
| Cache for expensive reads | Key-value | Fast lookup, TTL, simple access |

The decision is not:

```text
Does this data have relationships?
```

The decision is:

```text
What query must be extremely fast?
What write pattern must the database absorb?
What guarantees can the system relax?
```

## The Common Mistake

The common mistake is to choose based on data shape alone.

For example:

```text
This data is nested, so use a document database.
```

Maybe. But not always.

If the application frequently needs to join that data with payments, permissions, audit logs, and reporting tables, a relational database may still be better. Postgres can store structured relational data and also handle flexible `jsonb` fields when needed.

Another example:

```text
This data has relationships, so use relational.
```

Usually reasonable, but not always enough. If the main query is “find all nearby nodes connected by relationship depth 3,” a graph database may be more natural than writing recursive joins for everything.

Better framing:

```text
Data model matters.
But query pattern and guarantees matter more.
```

## A Practical Decision Framework

When choosing a database, ask these questions in order.

## 1. What Are the Query Patterns?

Start with reads:

```text
Do we query by primary key?
Do we query by time range?
Do we need joins?
Do we need full-text search?
Do we need graph traversal?
Do we need aggregation and reporting?
```

Then writes:

```text
Are writes single-row updates?
Are writes append-only events?
Are writes multi-step transactions?
Are writes extremely high volume?
```

If the query pattern is unknown or likely to change, relational databases are often safer because SQL is flexible.

If the query pattern is narrow and stable, a specialized non-relational database may be better.

## 2. What Consistency Does the System Need?

Some data must be correct immediately:

```text
payments
inventory
orders
account balance
booking availability
permission changes
```

These usually fit relational databases well because transactions and constraints are central.

Some data can tolerate eventual consistency:

```text
view counts
analytics events
recommendation signals
activity feeds
logs
metrics
```

These may fit non-relational or distributed stores better.

## 3. Do We Need Transactions?

If a write must update multiple records together, think carefully before leaving the relational model.

Example:

```text
create order
insert order items
decrease inventory
record payment intent
```

A relational database can wrap this in a transaction.

```sql
BEGIN;

-- write order
-- write order_items
-- update inventory
-- write payment record

COMMIT;
```

Some non-relational databases support transactions too, but the model may be more limited or operationally different. Do not assume the trade-off is free.

## 4. How Will the Data Scale?

Relational databases can scale far, especially with good indexing, read replicas, partitioning, and caching. Do not move to NoSQL just because the system might grow.

But at very large scale, some workloads become easier with specialized stores:

```text
millions of events per second
very large time-series retention
global low-latency key-value access
large graph traversal
search ranking over huge text corpora
```

Scale is not only data size. It includes:

```text
read throughput
write throughput
latency target
geographic distribution
partitioning strategy
hot key risk
operational cost
```

## 5. How Stable Is the Schema?

Relational databases prefer explicit schema. That is a strength when correctness matters.

Document databases are useful when records in the same collection naturally have different fields.

Example:

```text
Product A has color and size.
Product B has voltage and wattage.
Product C has expiration date and ingredients.
```

A document model can store those variations naturally.

But schema flexibility has a cost:

```text
Validation moves into application code.
Reporting can become harder.
Data quality can drift over time.
Migration discipline still matters.
```

## 6. What Does the Team Know How to Operate?

Database choice is also an operations decision.

A theoretically perfect database can be a bad choice if the team cannot run it safely.

Consider:

```text
backup and restore
monitoring
index tuning
schema migration
incident response
data repair
local development
cloud cost
```

For many systems, Postgres is a strong default because it covers a wide range of use cases:

```text
relational tables
transactions
indexes
jsonb
full-text search
extensions
read replicas
partitioning
```

## Recommended Defaults

For most application backends:

```text
Start with Postgres unless there is a clear reason not to.
```

This is not because relational is always better. It is because Postgres gives a good balance:

- strong correctness model
- flexible SQL
- good indexing
- useful `jsonb`
- mature operations
- enough scalability for many products

Add specialized databases when the workload proves it needs them.

Common combination:

```text
Postgres -> source of truth
Redis    -> cache / sessions / counters
Search   -> full-text search
Kafka    -> event pipeline
Time-series DB -> metrics
```

This is often better than forcing one database to solve every problem.

## Decision Table

| Requirement | Better default |
|---|---|
| Core business records | Relational |
| Strong transactions | Relational |
| Flexible joins and reporting | Relational |
| Unknown future queries | Relational |
| Simple key lookup at very low latency | Key-value |
| Flexible nested documents | Document database |
| Massive append-only events | Wide-column or event store |
| Metrics by time range | Time-series |
| Relationship traversal | Graph database |
| Full-text ranking | Search engine |
| Cache with TTL | Key-value |

## Interview Answer Template

If asked “How do you choose between SQL and NoSQL?”, I would answer:

> I would not choose only based on whether the data has relationships. Most real data has relationships. I would start from the workload: query patterns, write patterns, transaction needs, consistency requirements, scale, and operational cost. If the system needs strong consistency, transactions, joins, and flexible queries, I would usually start with a relational database like Postgres. If the access pattern is narrow and dominated by scale, latency, document shape, graph traversal, time-series writes, or search ranking, I would consider a specialized non-relational database.

Shorter version:

```text
SQL is usually the default for correctness and flexible queries.
NoSQL is useful when a specialized access pattern or scale requirement dominates.
```

中文版本：

```text
不要只看数据有没有关系。
先看查询模式，再看一致性和事务要求，再看规模和运维成本。
关系型数据库适合强一致、事务、join 和灵活查询。
非关系型数据库适合特定访问模式、低延迟、大规模写入、文档形状、图遍历、全文搜索等场景。
```

## Final Memory Hook

```text
Data relationship is one signal.
Workload and guarantees make the decision.
```

中文记忆：

```text
关系不是唯一判断标准。
查询怎么查、写入怎么写、错了会怎样，才是数据库选择的核心。
```
