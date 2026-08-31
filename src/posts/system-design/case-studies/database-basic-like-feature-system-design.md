---
layout: layouts/post.njk
title: "Designing a Like Feature"
description: A practical system design note for a post like feature, covering data modeling, idempotency, indexing, capacity estimation, sharding, CDC, Kafka, counters, and consistency.
excerpt: A practical system design note for a post like feature, from database modeling to large-scale asynchronous like-count aggregation.
date: 2026-08-31T12:00:00-07:00
category: System Design
subcategory: Case Studies
topic: Database Basics
kind: Note
tags:
  - posts
image: /assets/sketches/database-basic-like-feature-system-design.png
imageFit: contain
permalink: /posts/database-basic-like-feature-system-design/index.html
---

A like feature looks simple, but it is a useful system design example because it touches several common engineering problems:

```text
Data modeling:
How should likes be represented?

Consistency:
How do we prevent duplicate likes?

Performance:
How do we answer common queries quickly?

Scalability:
What happens when there are billions of likes?

Aggregation:
How do we efficiently maintain like counts?

Distributed systems:
How do sharding, CDC, Kafka, and replication fit together?
```

![Like feature system design: capacity estimates, table schema, and the full request/CDC/Kafka flow](/assets/sketches/database-basic-like-feature-system-design.png)

The end-to-end flow drawn above:

```text
Client
↓
Load Balancer
↓
Application Servers
↓
Likes DB
↓
Debezium
↓
Kafka Topic
↓
Consumer Group
↓
PostLikesCount DB
```

## 1. Data Modeling

A like is a relationship between a user and a post.

```text
User X likes Post Y
```

So the basic table should represent that relationship directly:

```sql
CREATE TABLE post_likes (
  user_id UUID NOT NULL REFERENCES users(id),
  post_id UUID NOT NULL REFERENCES posts(id),
  created_at TIMESTAMP DEFAULT now(),

  PRIMARY KEY (user_id, post_id)
);
```

Each row means:

```text
(user_id = U1, post_id = P10)
→ user U1 liked post P10
```

Adding a row means **like**.

Removing a row means **unlike**.

```sql
DELETE FROM post_likes
WHERE user_id = :user_id
  AND post_id = :post_id;
```

Do not store an array like this inside `posts`:

```text
posts
- id
- content
- liked_user_ids
```

That makes uniqueness, querying, indexing, and scaling harder.

## 2. Why the Composite Primary Key Matters

The important part is:

```sql
PRIMARY KEY (user_id, post_id)
```

The table is not automatically deduplicated just because it is a separate table.

The **composite primary key** enforces uniqueness:

```text
(U1, P1) ✅
(U1, P2) ✅
(U2, P1) ✅
(U1, P1) ❌ duplicate
```

So one user can like one post only once.

The entire pair:

```text
(user_id, post_id)
```

is the primary key.

`user_id` is not one primary key and `post_id` another. Together they form one composite primary key.

## 3. Idempotent Like and Unlike

Do not rely only on application-level check-then-insert logic:

```python
if not exists_like(user_id, post_id):
    insert_like(user_id, post_id)
```

Concurrent requests can create a race condition:

```text
Request A checks → no like
Request B checks → no like
Request A inserts
Request B inserts
```

The database should enforce the rule.

In PostgreSQL:

```sql
INSERT INTO post_likes (user_id, post_id)
VALUES (:user_id, :post_id)
ON CONFLICT (user_id, post_id) DO NOTHING;
```

The placeholders:

```text
:user_id
:post_id
```

are values supplied by the backend at execution time.

For example:

```text
:user_id → U1
:post_id → P100
```

`ON CONFLICT ... DO NOTHING` means:

```text
First like  → insert row
Second like → do nothing
Third like  → do nothing
```

So repeated requests result in the same final state.

That makes the operation **idempotent**.

Unlike can also be idempotent:

```sql
DELETE FROM post_likes
WHERE user_id = :user_id
  AND post_id = :post_id;
```

Deleting a row that does not exist simply changes nothing.

## 4. Indexes Follow Query Patterns

Typical queries include:

```text
1. Did this user like this post?
2. Which posts did this user like?
3. Who liked this post?
4. How many likes does this post have?
```

The composite primary key:

```sql
PRIMARY KEY (user_id, post_id)
```

also gives an index ordered by:

```text
user_id → post_id
```

It works well for:

```sql
WHERE user_id = ?
```

and:

```sql
WHERE user_id = ?
  AND post_id = ?
```

For example:

```sql
SELECT 1
FROM post_likes
WHERE user_id = :user_id
  AND post_id = :post_id;
```

or:

```sql
SELECT post_id
FROM post_likes
WHERE user_id = :user_id;
```

### Leftmost Prefix Rule

For an index:

```text
(user_id, post_id)
```

the database can efficiently use the leftmost part:

```text
user_id
```

or:

```text
user_id + post_id
```

but not usually `post_id` alone.

So this query needs another index if it is common:

```sql
SELECT user_id
FROM post_likes
WHERE post_id = :post_id;
```

Create:

```sql
CREATE INDEX idx_post_likes_post_id
ON post_likes(post_id);
```

Its job is simple:

> Create a separate index on `post_id` in the `post_likes` table to make queries that look up likes by post faster.

You normally do **not** mention the index name in normal queries.

Write:

```sql
SELECT user_id
FROM post_likes
WHERE post_id = :post_id;
```

and let the query optimizer decide which index to use.

The index name is mainly for administration:

```sql
DROP INDEX idx_post_likes_post_id;
```

### Important

Indexes are not free.

Every additional index:

- consumes storage
- increases insert cost
- increases delete cost
- increases update cost

So the rule is:

> Design indexes around real query patterns, not around every column.

## 5. Counting Likes

At small or medium scale:

```sql
SELECT COUNT(*)
FROM post_likes
WHERE post_id = :post_id;
```

can be perfectly reasonable, especially with:

```sql
INDEX(post_id)
```

The index prevents a full-table scan.

However, an index only helps the database **find the matching rows**.

It does not automatically make counting millions of matching rows free.

For example:

```text
post P100 has 50,000,000 likes
```

The index can quickly locate the relevant range, but `COUNT(*)` may still need to process a huge number of matching entries.

This distinction is important:

```text
INDEX(post_id)
→ quickly find likes for a post

precomputed like_count
→ directly read the total number of likes
```

## 6. Precomputed Like Count

For read-heavy systems, maintain a separate counter:

```text
post_like_counts

post_id | like_count
--------|-----------
P10     | 50,000,000
```

or optionally:

```text
posts
- id
- content
- like_count
```

Then reads become:

```sql
SELECT like_count
FROM post_like_counts
WHERE post_id = :post_id;
```

instead of counting raw rows every time.

The tradeoff is consistency.

The source of truth is still:

```text
post_likes
```

while:

```text
like_count
```

is derived data.

Possible inconsistency:

```text
post_likes contains 1001 likes
like_count temporarily shows 1000
```

## 7. Synchronous vs Asynchronous Counter Updates

A simpler design updates both synchronously:

```text
User likes post
↓
Insert into post_likes
↓
Increment like_count
↓
Return success
```

At larger scale, this adds more work to the request path.

A more scalable design moves count aggregation to the background:

```text
User likes post
↓
Likes DB
↓
CDC
↓
Kafka
↓
Consumer Group
↓
PostLikesCount DB
```

This introduces eventual consistency, but removes counter maintenance from the main request path.

## 8. Capacity Estimation

Suppose the system handles:

```text
500M posts/day
5B likes/day
```

Average like write QPS:

```text
5,000,000,000 / 86,400
≈ 57,870
≈ 60,000 likes/sec
```

So:

```text
Average write QPS ≈ 60K likes/sec
```

The hottest post cannot be derived exactly from total posts and likes, so we need an assumption.

For example, assume the hottest post gets about 1% of all daily likes:

```text
5B × 1%
= 50M likes/day
```

Average QPS on that one post:

```text
50,000,000 / 86,400
≈ 579
≈ 600 likes/sec
```

If we assume peak traffic is 5× average:

```text
600 × 5
≈ 3,000 likes/sec
```

So:

```text
Total traffic:
5B likes/day
→ ~60K likes/sec average

Hot post:
50M likes/day
→ ~600 likes/sec average on one post_id

Peak assumption:
600 × 5
→ ~3,000 likes/sec
```

Capacity estimation numbers are often assumptions, not exact predictions.

The point is to understand the order of magnitude.

## 9. Storage Estimation

One like corresponds to one database row.

For rough system design math, assume:

```text
1 like row ≈ 100 bytes
```

Then:

```text
5B likes/day × 100 bytes
= 500B bytes/day
≈ 500 GB/day
```

This is a back-of-the-envelope storage estimate.

## 10. Sharding the Likes Database

At very large scale, a single MySQL instance is not enough.

One possible design is:

```text
Application
↓
Vitess
↓
MySQL shards
```

### MySQL

MySQL stores the actual data.

### Vitess

Vitess is an open-source system that manages sharded MySQL clusters.

A useful mental model:

```text
MySQL = stores the data
Vitess = manages and routes across many MySQL shards
```

For checking:

```text
Has user X liked post Y?
```

we may shard by:

```text
user_id
```

Then:

```text
user_id
↓
find the correct shard
↓
local index (user_id, post_id)
↓
find the exact like row
```

The distinction is:

> Shard key tells us **which database** to query.

> Index tells that database **where inside the database** to find the row.

### Example

```text
Shard key:
user_id

Local index:
(user_id, post_id)
```

This is efficient for:

```text
Has user U liked post P?
Which posts has user U liked?
```

But a query by `post_id` alone may require a scatter-gather query across shards.

This is the shard-key tradeoff.

## 11. Single Leader and Asynchronous Replication

A database shard may use:

```text
Single leader
+
asynchronous replication
```

Single leader means:

```text
Writes → Leader
Reads  → Leader or Replicas
```

The leader accepts writes and then replicates them to followers.

With asynchronous replication:

```text
Client writes
↓
Leader commits
↓
Client may receive success
↓
Replicas catch up later
```

This can create replication lag.

For example:

```text
Leader:
U1 liked P10 ✅

Replica:
not updated yet ❌
```

If the system immediately reads from the stale replica, it may temporarily return the wrong result.

That is a **read-after-write consistency** issue.

## 12. CDC with Debezium

**CDC** means:

```text
Change Data Capture
```

Debezium is a CDC tool.

It monitors database changes, often through the database transaction log.

For MySQL, this commonly means reading the binlog.

Example:

```text
MySQL INSERT:
(U1, P10)
```

Debezium detects the change and converts it into an event.

The flow is:

```text
Likes DB
↓
Debezium
↓
Kafka Topic
```

Important distinction:

> Debezium detects database changes.

> Kafka stores and distributes the resulting events.

Kafka itself does not detect MySQL changes.

## 13. Kafka and the Consumer Group

Picking up the flow shown at the top of this post:

The Likes DB stores:

```text
(user_id, post_id)
```

The PostLikesCount DB stores:

```text
(post_id, like_count)
```

The consumer reads like/unlike events and updates the aggregate count.

Example:

```text
Kafka event:
U1 liked P10

Consumer:
P10.like_count += 1
```

A consumer group allows multiple consumers to process different Kafka partitions in parallel.

The consumers can remain stateless because the durable state lives in the database.

## 14. Why Use a Separate Count Database?

The two databases optimize different access patterns.

### Likes DB

```text
Schema:
(user_id, post_id)

Main questions:
- Has user X liked post Y?
- Which posts has user X liked?
```

A relational database such as MySQL works naturally here.

### PostLikesCount DB

```text
Schema:
(post_id, like_count)

Main question:
- How many likes does post Y have?
```

The data model is simple and lookup-oriented.

A document/key-value style store such as MongoDB can be reasonable.

For example:

```json
{
  "post_id": "P10",
  "like_count": 50000000
}
```

MySQL could also handle this.

MongoDB is a design choice, not a requirement.

The bigger idea is:

> Different access patterns may justify different storage models.

## 15. Kafka Partition Key

The source Likes DB may be sharded by:

```text
user_id
```

but the Kafka topic does not necessarily need the same partition key.

Suppose Kafka is also partitioned by `user_id`:

```text
U1 likes P100 → Partition A
U2 likes P100 → Partition B
U3 likes P100 → Partition C
```

Different consumers may process those events in parallel.

But all of them eventually try to update:

```text
P100.like_count
```

at the same time.

That can create:

```text
lock contention
hot row contention
```

A better Kafka partition key for count aggregation is often:

```text
post_id
```

Then:

```text
U1 likes P100
U2 likes P100
U3 likes P100
```

all go to the same Kafka partition.

That preserves ordering for one post and avoids multiple consumers simultaneously updating the same post counter.

General rule:

> Partition events by the entity whose state is being updated.

This also shows:

> Source DB shard key and Kafka partition key do not have to be the same.

## 16. Exactly-Once and Duplicate Processing

Kafka consumers can retry or receive events again.

Suppose:

```text
offset 200 → Like
offset 201 → Unlike
offset 202 → Like
offset 203 → Like
```

If the consumer processes offset 200, crashes, and later sees it again, blindly doing:

```text
like_count += 1
```

would double-count the event.

One approach is to store the last processed Kafka offset together with the counter:

```text
post_id | like_count | latest_offset
```

For example:

```text
P100 | 5000 | 200
```

Then the consumer knows offset 200 has already been processed.

After processing through offset 203:

```text
P100 | new_count | 203
```

The key idea is:

> Kafka may redeliver events, so the consumer needs a strategy to avoid double-counting.

The count update and offset update should ideally be atomic.

For a high-level interview answer, understanding the duplicate-processing problem is usually enough. The internal details of Kafka exactly-once semantics can be treated as a deeper follow-up topic.

## 17. Component Responsibilities

Putting a name on what each piece in that flow is actually responsible for:

```text
Likes DB
→ source of truth for like relationships

Debezium
→ captures database changes

Kafka
→ stores and distributes change events

Consumer Group
→ aggregates like/unlike events

PostLikesCount DB
→ read-optimized count store
```

## 18. Design Progression

It is useful to think about the design in levels.

### Level 1 — Simple

```text
post_likes
+
INDEX(post_id)
+
COUNT(*) when needed
```

Good for small and medium systems.

### Level 2 — Precomputed Counter

```text
post_likes
+
post_like_counts
```

Reads become cheap, but the counter must stay synchronized.

### Level 3 — Async Aggregation

```text
post_likes
↓
CDC
↓
Kafka
↓
Consumers
↓
post_like_counts
```

Better for very large write volume and read-heavy workloads.

The tradeoff is eventual consistency.

## 19. Key Takeaways

- Model a like as a relationship: `(user_id, post_id)`.
- Use a composite primary key to enforce one like per user per post.
- Make like and unlike idempotent.
- Design indexes around query patterns.
- `(user_id, post_id)` is good for user-first queries.
- Add `INDEX(post_id)` for post-first queries.
- Indexes help locate rows, but do not eliminate the cost of counting millions of rows.
- At large scale, precompute `like_count`.
- Use sharding when one database is no longer enough.
- Shard keys and indexes solve different problems.
- CDC tools such as Debezium capture database changes.
- Kafka distributes those change events.
- Consumer groups asynchronously maintain aggregate counters.
- Kafka partitioning by `post_id` helps preserve per-post ordering and reduce write contention.
- Asynchronous aggregation introduces eventual consistency.
- Duplicate event processing must be handled so counters are not incremented twice.

## Interview Summary

```text
I would model likes in a separate post_likes table using
(user_id, post_id) as a composite primary key.

This directly represents the many-to-many relationship and
prevents the same user from liking the same post more than once.

For consistency, I would use an idempotent insert such as
INSERT ... ON CONFLICT DO NOTHING instead of relying on a
check-then-insert pattern.

For performance, I would design indexes around access patterns.
The composite primary key supports user-first queries, while an
additional index on post_id supports post-first queries.

At smaller scale, COUNT(*) with an index may be sufficient.
At larger scale, I would maintain a precomputed like_count.

For very large traffic, I would shard the source likes database,
for example by user_id, and asynchronously propagate changes
through CDC and Kafka to a count store keyed by post_id.

The source likes table remains the source of truth, while the
count store is a read-optimized derived view and can be eventually
consistent.
```
