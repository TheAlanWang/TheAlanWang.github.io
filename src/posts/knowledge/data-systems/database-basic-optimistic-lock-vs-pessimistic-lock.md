---
layout: layouts/post.njk
title: "Optimistic Lock vs Pessimistic Lock"
description: A short database concurrency note on when to use optimistic locking, pessimistic locking, and database constraints.
excerpt: A short database concurrency note on when to use optimistic locking, pessimistic locking, and database constraints.
date: 2026-11-17T12:00:00-07:00
category: Knowledge
subcategory: Data Systems
topic: Database Basics
kind: Note
tags:
  - posts
image: /assets/sketches/database-basics.svg
imageFit: contain
permalink: /posts/database-basic-optimistic-lock-vs-pessimistic-lock/index.html
series: databases
seriesOrder: 7
order: 5
---

## Overview

> Both locks solve **concurrency** problems in **read-modify-write** operations: two requests read the same value, and one update can get lost.
>
> **Optimistic locking** is used in **read-heavy** scenarios. **Pessimistic locking** is used in **write-heavy** scenarios on the same rows.
>
> A common way to implement optimistic locking is to add a **`version`** column. If the version changed, someone else updated it first, so it **retries**. Pessimistic locking uses a **row lock**. Other requests **wait** until it commits.
>
> The trade-off: optimistic has overhead from **retries** when conflicts are frequent. Pessimistic makes requests **wait**, and it may cause **deadlock**.

## Optimistic vs Pessimistic

| | Optimistic lock | Pessimistic lock |
|---|---|---|
| How | No lock; check a `version` column on `UPDATE` | Lock the row first: `SELECT ... FOR UPDATE` |
| On conflict | The `UPDATE` affects **0 rows**; retry or return an error | The other transaction **waits** |
| Cost | Retries when conflicts do happen | Lock held until `COMMIT`; others block |
| Use when | Conflicts are rare | Conflicts are frequent |
| Examples | Profile, document, settings editing | Inventory, bank balance, ticket booking |

If the problem is "no duplicates", neither lock is the answer: use a **UNIQUE** or **PRIMARY KEY** constraint.

## Low Conflict Favors Optimistic, High Conflict Favors Pessimistic

- **Low conflict**: retries almost never happen, so optimistic locking costs little more than a `version` column. A pessimistic lock is still taken on every request and held until `COMMIT`.
- **High conflict**: most optimistic updates fail and retry, and the retries can fail again. Waiting for the row lock is cheaper than redoing the work over and over.

`SELECT ... FOR UPDATE` locks only the **rows** it reads, not the whole table, so only requests that touch the same row wait.

Edit forms add a second reason: a user may keep a form open for minutes. Holding a database lock that long would block everyone else, so optimistic locking is the practical choice there.

## Demo

Each demo replays two transactions, Transaction 1 (T1) and Transaction 2 (T2), interleaved in time. Each one could be a different user's request, or the same user clicking twice. Switch the mode to compare the same requests without and with the lock.

### Optimistic Lock: Two Edits to One Profile

<div class="qkv-demo lk-demo" data-lock-demo="optimistic"></div>

### Pessimistic Lock: Selling the Last Item

<div class="qkv-demo lk-demo" data-lock-demo="pessimistic"></div>
<script src="/assets/notes/lock-demo.js" defer></script>
