---
layout: layouts/post.njk
title: "Database Basic: Designing a Like Feature"
description: A compact database system design note covering table modeling, consistency, query performance, and scalability for a like feature.
excerpt: A compact database system design note covering table modeling, consistency, query performance, and scalability for a like feature.
date: 2026-05-11
category: System Design
subcategory: Data Systems
topic: Database Basics
kind: Note
tags:
  - posts
image: /assets/sketches/database-basics.svg
imageFit: contain
permalink: /posts/database-basic-like-feature-system-design/index.html
---

A like feature looks simple, but it is a good database design example because it touches four common questions:

```text
Data modeling: How should the tables be designed?
Consistency: How do we prevent duplicate or incorrect data?
Performance: How do common queries stay fast?
Scalability: What happens when the data gets huge?
```

## 1. Data Modeling

Do not store likes as an array inside the `posts` table.

```sql
posts
- id
- content
- liked_user_ids
```

This looks convenient, but it creates problems:

```text
Hard to enforce uniqueness
Hard to query by user
Hard to index efficiently
Hard to scale when likes become large
```

A like is a relationship between a user and a post.

```text
One user can like many posts.
One post can be liked by many users.
```

That is a many-to-many relationship, so we should model it with a separate table:

```sql
CREATE TABLE post_likes (
  user_id UUID NOT NULL REFERENCES users(id),
  post_id UUID NOT NULL REFERENCES posts(id),
  created_at TIMESTAMP DEFAULT now(),

  PRIMARY KEY (user_id, post_id)
);
```

The composite primary key means:

```text
The same user can like the same post only once.
```

The database now understands the business rule directly.

## 2. Consistency

Do not rely only on application-level checks to prevent duplicate likes.

Unsafe way:

```python
existing = query_like(user_id, post_id)

if not existing:
    insert_like(user_id, post_id)
```

This is not safe under concurrent requests:

```text
Request A checks: no like
Request B checks: no like
Request A inserts
Request B inserts
```

Now the same user may like the same post twice.

The safer approach is to insert directly and let the database constraint handle duplicates:

```sql
INSERT INTO post_likes (user_id, post_id)
VALUES (:user_id, :post_id)
ON CONFLICT (user_id, post_id) DO NOTHING;
```

This makes the like API idempotent:

```text
Calling like once creates the like.
Calling like multiple times still results in only one like.
```

Unlike can also be idempotent:

```sql
DELETE FROM post_likes
WHERE user_id = :user_id
  AND post_id = :post_id;
```

If the like does not exist, nothing happens.

`ON CONFLICT` is PostgreSQL syntax. In MySQL, similar patterns include `INSERT IGNORE` or `INSERT ... ON DUPLICATE KEY UPDATE`.

## 3. Performance

Indexes should follow query patterns.

For a like feature, common queries are:

```text
1. Did this user like this post?
2. Which posts did this user like?
3. How many likes does this post have?
4. Who liked this post?
```

The primary key supports user-first queries:

```sql
PRIMARY KEY (user_id, post_id)
```

For example:

```sql
SELECT 1
FROM post_likes
WHERE user_id = :user_id
  AND post_id = :post_id;
```

And:

```sql
SELECT post_id
FROM post_likes
WHERE user_id = :user_id;
```

But post-first queries need another index:

```sql
CREATE INDEX idx_post_likes_post_id
ON post_likes(post_id);
```

This helps queries like:

```sql
SELECT COUNT(*)
FROM post_likes
WHERE post_id = :post_id;
```

And:

```sql
SELECT user_id
FROM post_likes
WHERE post_id = :post_id;
```

For small or medium systems, counting from `post_likes` may be acceptable. For read-heavy systems, we may cache the count in `posts.like_count`.

```sql
SELECT like_count
FROM posts
WHERE id = :post_id;
```

The tradeoff is consistency. The source of truth is still `post_likes`, so if we maintain `posts.like_count`, we need to keep it synchronized.

## 4. Scalability

At large scale, the `post_likes` table can become huge:

```text
100 million users
1 billion posts
tens of billions of likes
```

The first step is still good indexing and clear query patterns. After that, the system may need partitioning or sharding.

For example, the logical `post_likes` table can be partitioned into multiple physical partitions:

```text
post_likes_p0
post_likes_p1
post_likes_p2
...
```

If most queries are post-based, partitioning or sharding by `post_id` can help:

```text
Get likes for a post
Count likes for a post
List users who liked a post
```

If the main query is finding posts liked by a user, then `user_id` may be a better shard key.

The shard key depends on the access pattern.

## Hot Posts

Some posts may become extremely popular:

```text
A celebrity post
A viral news post
A trending video
```

Millions of users may like the same post in a short time. This creates a hot key problem.

For high-read systems, we often avoid counting from `post_likes` on every request.

One common design is:

```text
User likes post
Write to post_likes
Publish like event
Worker updates like_count
Cache stores latest like_count
```

This improves performance, but the count may be slightly delayed. That is eventual consistency.

For social counters, this is often acceptable. For money, inventory, or ticket booking, delayed correctness is usually not acceptable.

## Interview Summary

```text
For a like feature, I would model likes as a separate post_likes table because it is a many-to-many relationship between users and posts.
I would use a composite primary key on (user_id, post_id) so the database guarantees that one user can like one post only once.

For consistency, I would avoid check-then-insert logic and use INSERT ... ON CONFLICT DO NOTHING to make the like API idempotent.

For performance, I would design indexes based on query patterns.
The primary key supports user-first queries, and an additional index on post_id supports counting likes or listing users by post.

For scalability, I would consider partitioning or sharding based on the main access pattern.
For hot posts and high read traffic, I would use cache and async aggregation for like_count if eventual consistency is acceptable.
```
