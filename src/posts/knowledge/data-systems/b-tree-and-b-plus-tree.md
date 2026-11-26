---
layout: layouts/post.njk
title: "B-Tree and B+ Tree"
description: Why database indexes use B+ trees instead of B-trees or binary search trees, with the page-size math behind a 3-level index.
excerpt: Why database indexes use B+ trees instead of B-trees or binary search trees, with the page-size math behind a 3-level index.
date: 2026-11-25T12:00:00-07:00
category: Knowledge
subcategory: Data Systems
topic: Database Basics
kind: Note
tags:
  - posts
permalink: /posts/b-tree-and-b-plus-tree/index.html
series: databases
seriesOrder: 3
---

## Overview

> B-trees and B+ trees are used to store **database indexes**. Compared to binary trees, they can have **fewer levels**.
>
> In a B-tree, each node stores **keys and values**. In a B+ tree, internal nodes store **only keys**, and leaf nodes store keys and values, so a B+ tree can store **more keys per page** than a B-tree. It has fewer levels and requires **fewer disk reads**.
>
> The leaf layer of a B+ tree is a **linked list**, so it is better for **range searches**.

## 1. The Database Reads One Page at a Time

Think of a database file as a book. It is split into fixed-size **pages**, by default 16 KB in MySQL InnoDB, 8 KB in Postgres, 4 KB in SQLite. A SQLite table with 100,000 short rows (an id and a name) is a 1,896,448-byte file, exactly 463 pages × 4,096 bytes.

The database never reads a single row from disk. It reads the **whole page** that holds the row, because the cost is in getting to the page, not in the bytes: one page read takes roughly 0.1 ms on an SSD, while following a pointer in memory takes nanoseconds.

So the cost of an index lookup is **how many pages it reads**. If each tree node is one page, that is the number of levels in the tree.

Running example for the rest of this post: **20 million rows**, about 1 KB each, a `BIGINT` primary key, InnoDB's 16 KB pages.

## 2. Binary Search Tree: Too Tall

A binary search tree node has 1 key and 2 children:

```text
2²⁴ = 16.8 M  <  20 M  <  2²⁵ = 33.5 M   ← 25 levels
```

**25 levels means up to 25 page reads per lookup**, and each read uses only one node of the 16 KB page it loaded.

The fix: since a read always brings in a whole page, fill that page with keys.

## 3. B-Tree: Fill the Page with Keys

One node is one page. Its keys are sorted, and each key carries its row:

```text
                [ 20 | 40 ]               ← keys + rows
               /     |     \
        [ 5 | 10 ]  [ 30 ]  [ 50 | 60 ]   ← keys + rows
```

A lookup reads one page, binary-searches the keys in memory, and goes down to one child. With k keys, a node has k + 1 children.

But the rows take up the page. With 1 KB rows, a 16 KB node fits only about 16 keys, so 17 children:

```text
17⁵ - 1 = 1.4 M   <  20 M   ← 5 levels: not enough
17⁶ - 1 = 24.1 M  ≥  20 M   ← 6 levels
```

**6 levels: much better than 25, but the rows still take up most of each internal page.**

## 4. B+ Tree: Move the Rows to the Leaves

Internal nodes keep **only keys**, as signposts. Rows live **only in the leaves**:

```text
                    [ 20 | 40 ]                     ← keys only
                   /     |     \
     [ 5 | 10 ] → [ 20 | 30 ] → [ 40 | 50 | 60 ]   ← keys + rows, linked
```

20 and 40 appear twice: once in the root as a signpost, once in a leaf with the row. Books differ on where a key equal to the signpost goes: some put it in the child on its left, some in the child on its right. Either works as long as search and insert follow the same rule. This post uses the right side, which is why 20 is the first key of the middle leaf.

Without rows, an internal entry is just a key and a child pointer ("for keys in this range, go to page N"):

```text
one page   = 16 KB = 16 × 1,024 = 16,384 bytes
one entry  = key + child pointer
           = 8 bytes (BIGINT) + 6 bytes (page number)   ← the commonly quoted estimate
           = 14 bytes
children   = 16,384 / 14 ≈ 1,170
```

**One internal page points to about 1,170 child pages.**

```text
16 KB / 1 KB per row ≈ 16 rows
```

**One leaf page holds about 16 rows.**

```text
level 1 (root):    1 page        → points to 1,170 pages
level 2:           1,170 pages   → each points to 1,170 pages
level 3 (leaves):  1,170 × 1,170 = 1,368,900 pages
                   1,368,900 × 16 rows = 21,902,400 rows
```

**3 levels hold about 21.9 million rows, enough for 20 million.** 2 levels hold only 1,170 × 16 = 18,720 rows.

Real pages also store headers, so the real number of children is a bit lower, but it is still **about 3 levels for 20 million rows**. The top two levels are 1 + 1,170 = 1,171 pages, about 1,171 × 16 KB ≈ 18 MB, small enough to stay in memory. So a lookup usually reads **1 page from disk**: the leaf.

| | Binary tree | B-Tree | B+ Tree |
|---|---|---|---|
| Children per node | 2 | ~17 | ~1,170 |
| Levels for 20 M rows | 25 | 6 | 3 |

## 5. Link the Leaves: Range Queries

Databases often ask for a range, like `WHERE id BETWEEN 10 AND 45` or `ORDER BY id`. On the two small trees above:

- **B-tree**: 10 is in a leaf, 20 is in the root, 30 is back down in a child, 40 is back in the root. The scan keeps going up and down the tree.
- **B+ tree**: go down once to the leaf holding 10, then follow the links: 10, 20, 30, 40, stop at 50. The leaves are already sorted.

Switch between the two trees and the two queries. Each step reads one node.

<div class="qkv-demo bt-demo" data-btree-demo="search"></div>

## 6. Stay Balanced: Insert and Split

A new key goes into a leaf. If the leaf is full, it splits in half and sends a key up to the parent. If the parent is full too, it splits as well, up to the root. A root split creates a new root, so **the tree grows from the top** and every leaf stays at the same depth, so in a B+ tree every lookup reads the same number of pages.

Each node below holds at most 3 keys (a real page holds hundreds).

<div class="qkv-demo bt-demo" data-btree-demo="split"></div>
<script src="/assets/notes/btree-demo.js" defer></script>

## B-Tree vs B+ Tree

| | B-Tree | B+ Tree |
|---|---|---|
| Rows stored in | Every node | Leaves only |
| Children per node | Fewer (rows take space) | More (internal nodes hold only keys) |
| Tree height | Taller | Shorter |
| Point lookup | Can stop early at an internal node | Always goes to a leaf (same cost every time) |
| Range query | Go up and down the tree | Find the first leaf, walk right |

## In MySQL and Postgres

The sections above say "rows live in the leaves". Real databases do this in two ways.

- **MySQL InnoDB**: the table itself is a B+ tree sorted by the primary key, and its leaves hold the **whole row** (a clustered index). Every other index is a separate B+ tree whose leaves hold only the **primary key**. A lookup by such an index finds the primary key first, then searches the primary key tree for the row, so it goes through **two trees**.
- **Postgres**: rows are stored unsorted in separate pages called the **heap**. Every index, including the primary key, is a B+ tree (Postgres calls it `btree`) whose leaves hold the row's **address in the heap**: a page number and a position in that page. A lookup goes down the index, then reads that one heap page.
