---
layout: layouts/post.njk
title: "Transactions and ACID"
description: The four promises of a database transaction, what each letter of ACID means, and why many non-relational databases promise less.
excerpt: What each letter of ACID promises, and why many non-relational databases promise less.
date: 2026-11-27T12:00:00-08:00
category: Knowledge
subcategory: Data Systems
topic: Database Basics
kind: Note
tags:
  - posts
permalink: /posts/transactions-and-acid/index.html
series: databases
seriesOrder: 3
order: 3
zh: true
---

## Overview

> A **transaction** is a group of writes that **succeed or fail as one unit**. ACID describes what a transaction promises.
> - **Atomicity**: all steps succeed together, or none do.
> - **Consistency**: the data always follows its rules. It is more of a **goal**: the database enforces **constraints**, and the **application code** enforces business rules.
> - **Isolation**: other transactions don't see its **half-done work** before it commits.
> - **Durability**: once committed, the data **survives a crash**.

## Transactions

A **transaction** is a group of writes that succeed or fail as one unit, and **ACID** is the four promises it makes. For example, moving $100 from account A to account B:

```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 'A';
UPDATE accounts SET balance = balance + 100 WHERE id = 'B';
COMMIT;
```

### Commit and Rollback

A transaction ends with exactly one of two commands: `COMMIT` keeps every write since `BEGIN`, and `ROLLBACK` undoes every write since `BEGIN`. The backend decides which one to send:

```python
try:
    conn.execute("BEGIN")
    conn.execute("UPDATE accounts SET balance = balance - 100 WHERE id = 'A'")
    conn.execute("UPDATE accounts SET balance = balance + 100 WHERE id = 'B'")
    conn.execute("COMMIT")
except Exception:              # a database error, or a check the backend failed
    conn.execute("ROLLBACK")
```

- If the first `UPDATE` succeeds and the second fails, `ROLLBACK` undoes the first. The failed one left nothing to undo.
- Before `COMMIT`, every write is provisional: other connections do not see it, and a crash undoes it.

Frameworks wrap this pattern for you, like Spring's `@Transactional` or Django's `transaction.atomic()`: return normally and it commits, raise an exception and it rolls back.

## The Four Letters

| | Meaning | Without it, in the transfer |
|---|---|---|
| **Atomicity** | All steps succeed, or none do | A crash after the first `UPDATE`: A lost $100, B got nothing |
| **Consistency** | Data always follows the rules | A goes below zero, which the bank does not allow |
| **Isolation** | Concurrent transactions don't see each other's half-done work | A query summing all balances runs between the two `UPDATE`s and finds $100 missing |
| **Durability** | Once committed, data survives a crash | The server crashes right after `COMMIT`, and the transfer is gone |

Two points interviews often ask about:

- **Consistency is the odd one out.** Atomicity, Isolation, and Durability are what the database provides. Consistency is the goal: the database checks constraints like `CHECK (balance >= 0)`, but a rule like "a transfer must not change the total amount of money" is up to the application code.
- **The C in ACID is not the C in CAP.** In CAP, consistency means every read returns the latest write, no matter which replica answers. In ACID, it means the data follows the rules.

## Why Many Non-relational Databases Promise Less

The real dividing line is **one machine vs many machines**, not relational vs non-relational. On one machine, ACID is cheap. Across machines, a transaction needs every machine involved to agree before it commits (two-phase commit), which costs network round trips and stalls when one machine stops responding.

- **Relational databases start on one machine**, so every transaction is full ACID until you shard. After sharding, they pay the same cost: a transaction within one shard is still ACID, but a cross-shard one needs two-phase commit, so teams pick a shard key that keeps related data together (for example, all of a user's orders on one shard). Read replicas don't count: they copy all the data, and every write still goes to one primary.
- **Many non-relational databases are sharded from day one**, so they build their guarantees around one shard. Their data models help: a MongoDB document can hold an order and all its items, so saving the order is one atomic write.

So many of them started with atomicity only **within one key, document, or partition**, with nothing like `BEGIN … COMMIT`. Most have added multi-record transactions since, each in its own form and with limits:

| Database | Transaction | Limits |
|---|---|---|
| MongoDB | `startTransaction()` … `commitTransaction()` / `abortTransaction()` | Since 4.0 for a replica set, where all data sits on one primary; since 4.2 across shards. The docs still recommend keeping related data in one document |
| DynamoDB | One `TransactWriteItems` request carrying all the writes | No separate begin and commit steps; up to 100 actions, within one region |
| Redis | `MULTI` … `EXEC` | No rollback: if one command fails at runtime, the others still apply |

So ACID is a property of transactions, not of the relational model. How much of it you get depends on the database.
