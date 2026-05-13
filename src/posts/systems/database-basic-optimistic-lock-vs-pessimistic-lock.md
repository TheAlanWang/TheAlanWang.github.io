---
layout: layouts/post.njk
title: "Database Basic: Optimistic Lock vs Pessimistic Lock"
description: A short database concurrency note on when to use pessimistic locking, optimistic locking, and database constraints.
excerpt: A short database concurrency note on when to use pessimistic locking, optimistic locking, and database constraints.
date: 2026-05-11
category: Data Systems
subcategory: Database Basics
topic: Concurrency Control
kind: Note
tags:
  - posts
image: /assets/sketches/database-basics.svg
imageFit: contain
permalink: /posts/database-basic-optimistic-lock-vs-pessimistic-lock/index.html
---

Some database problems are read-modify-write problems.

Example:

```text
Read current stock.
Check if stock is enough.
Reduce stock.
Save new stock.
```

If multiple requests do this at the same time, data can become incorrect.

Two common strategies are:

```text
Pessimistic lock
Optimistic lock
```

## Pessimistic Lock

Pessimistic locking means:

```text
I assume conflicts may happen, so I lock the row before modifying it.
```

Example:

```sql
BEGIN;

SELECT stock
FROM products
WHERE id = :product_id
FOR UPDATE;

UPDATE products
SET stock = stock - 1
WHERE id = :product_id;

COMMIT;
```

`SELECT ... FOR UPDATE` locks the selected row.

Other transactions cannot update the same row until the first transaction commits.

Use cases:

```text
inventory
bank balance
ticket booking
limited capacity
```

For inventory, we should also check that stock does not become negative.

```sql
UPDATE products
SET stock = stock - 1
WHERE id = :product_id
  AND stock > 0;
```

## Optimistic Lock

Optimistic locking means:

```text
I assume conflicts are rare, so I do not lock first.
Instead, I check whether the row changed when I update it.
```

Usually we add a `version` column:

```sql
ALTER TABLE products
ADD COLUMN version INT DEFAULT 0;
```

Update example:

```sql
UPDATE products
SET stock = stock - 1,
    version = version + 1
WHERE id = :product_id
  AND version = :old_version;
```

If another transaction already updated the row, the version will not match.

Then the update affects zero rows.

The application can:

```text
retry
return a conflict error
ask the user to refresh
```

## When to Use Each

Use pessimistic locking when conflicts are likely or the cost of a conflict is high:

```text
inventory
bank balance
ticket booking
```

Use optimistic locking when conflicts are rare:

```text
profile editing
document editing
settings update
```

For duplicate prevention, use a constraint instead:

```text
UNIQUE constraint
PRIMARY KEY constraint
```

That is why the like feature should use a composite primary key, not a lock.

## Simple Rule

```text
Duplicate prevention:
Use UNIQUE or PRIMARY KEY constraints.

High-conflict read-modify-write:
Use pessimistic locking.

Low-conflict read-modify-write:
Use optimistic locking with a version column.
```

## Interview Sentence

```text
For high-conflict read-modify-write scenarios such as inventory or balance updates, I would use pessimistic locking with SELECT ... FOR UPDATE.
For low-conflict scenarios such as profile or settings updates, I would use optimistic locking with a version column.
The update only succeeds if the version has not changed, and if affected rows is zero, the application can retry or return a conflict error.
```
