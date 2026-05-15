---
layout: layouts/post.njk
title: "Optimistic Lock vs Pessimistic Lock"
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

Some database problems are **read-modify-write** problems.

这类问题不是“写一条 SQL”这么简单，而是先 **read** 当前状态，再 **decide/modify**，最后 **write** 回去。并发风险通常就出现在这个中间窗口。

Example:

```text
Read current stock.
Check if stock is enough.
Reduce stock.
Save new stock.
```

If multiple requests do this at the same time, data can become incorrect because they may all read the same old value.

Two common strategies are:

```text
Pessimistic lock
Optimistic lock
```

The main decision is not “relational vs non-relational database.” The main decision is **how likely conflicts are** and **how expensive a wrong update would be**.

选乐观锁还是悲观锁，核心不是看数据有没有关系，而是看 **冲突概率** 和 **错误成本**。

## Pessimistic Lock

**Pessimistic locking** means:

```text
I assume conflicts may happen, so I lock the row before modifying it.
```

**悲观锁 = 先锁住，再修改**。它适合“大家都可能抢同一行”的场景。

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

`SELECT ... FOR UPDATE` **locks the selected row**.

Other transactions cannot update the same row until the first transaction **commits**.

Use cases:

```text
inventory
bank balance
ticket booking
limited capacity
```

For inventory, we should also check that stock does not become negative. A lock prevents concurrent modification, but the business rule still needs to be enforced.

锁解决的是 **并发写冲突**，不是自动解决所有业务规则。库存不能小于 0 仍然要写进条件里。

```sql
UPDATE products
SET stock = stock - 1
WHERE id = :product_id
  AND stock > 0;
```

## Optimistic Lock

**Optimistic locking** means:

```text
I assume conflicts are rare, so I do not lock first.
Instead, I check whether the row changed when I update it.
```

**乐观锁 = 不先锁，更新时检查版本**。它适合“通常没人同时改同一行”的场景。

Usually we add a **`version` column**:

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

If another transaction already updated the row, the **version will not match**.

Then the update affects **zero rows**.

The application can:

```text
retry
return a conflict error
ask the user to refresh
```

乐观锁的关键不是 `version` 字段本身，而是 `WHERE version = :old_version` 这个条件。它让数据库帮你判断“我读到的数据还是不是最新的”。

## When to Use Each

Use **pessimistic locking** when conflicts are likely or the cost of a conflict is high:

```text
inventory
bank balance
ticket booking
```

Use **optimistic locking** when conflicts are rare:

```text
profile editing
document editing
settings update
```

For **duplicate prevention**, use a **constraint** instead:

```text
UNIQUE constraint
PRIMARY KEY constraint
```

That is why the like feature should use a **composite primary key**, not a lock.

如果问题是“不能重复”，优先想到 **unique constraint / primary key**；如果问题是“同一份状态会被并发读改写”，才进入锁的选择。

## Simple Rule

```text
Duplicate prevention:
Use UNIQUE or PRIMARY KEY constraints.

High-conflict read-modify-write:
Use pessimistic locking.

Low-conflict read-modify-write:
Use optimistic locking with a version column.
```

Memory hook:

**Duplicate? Constraint. High conflict? Pessimistic lock. Low conflict? Optimistic lock.**

**防重复靠约束，高冲突用悲观，低冲突用乐观。**

## Interview Sentence

For **high-conflict read-modify-write** scenarios such as inventory or balance updates, I would use **pessimistic locking** with **`SELECT ... FOR UPDATE`**.

For **low-conflict** scenarios such as profile or settings updates, I would use **optimistic locking** with a **version column**.

The update only succeeds if the **version has not changed**, and if **affected rows is zero**, the application can **retry** or return a **conflict error**.
