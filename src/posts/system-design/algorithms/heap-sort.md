---
layout: layouts/post.njk
title: Heap Sort
description: How heap sort builds a max-heap, repeatedly swaps the root to the end and heapifies, why build is Θ(n) and the sort is Θ(n log n) in place, how it compares with other sorts, Python implementations, and a full trace.
excerpt: How heap sort builds a max-heap and sorts in place, its time complexity, Python implementations, and a full trace.
date: 2026-10-31T12:00:00-07:00
category: System Design & Algorithms
subcategory: Algorithms
topic: Sorting
kind: Note
tags:
  - posts
permalink: /posts/heap-sort/index.html
---

## Overview

| Step        | Explain                                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Build**   | Turn the array into a **max-heap**: every parent ≥ its children.                                           |
| **Swap**    | The root is the largest; swap it with the last number of the heap.                                                    |
| **Shrink**  | heap size − 1: the last slot is now sorted and leaves the heap.                                                 |
| **Heapify** | The new root may be too small; sink it down to fix the heap. Repeat Swap → Heapify until the heap size is 1.  |

## Heap in an Array

- A heap is a **complete binary tree** stored level by level in an array.
- 0-indexed: for node `i`, left = `2i + 1`, right = `2i + 2`, parent = `(i − 1) // 2`. CLRS is 1-indexed: left = `2i`, right = `2i + 1`.
- Leaves are `n//2 .. n−1`, so only `0 .. n//2 − 1` need heapify.
- A max-heap is **not sorted**: it only guarantees parent ≥ children, not left vs right.

```text
index:   0   1   2   3   4   5
nums = [ 9,  5,  8,  1,  2,  3 ]

             9 (0)
           /       \
       5 (1)       8 (2)
       /   \       /
    1 (3) 2 (4)  3 (5)
```

## Three Functions

| Function            | What it does                                                                                                      | Time       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------- |
| **max_heapify**     | Sink `nums[i]` down **one path**: swap with the larger child, repeat until it's ≥ both children.  | Θ(log n)   |
| **build_max_heap**  | Call max_heapify for `i = n//2 − 1` **down to 0** (bottom-up).                          | **Θ(n)**   |
| **heap_sort**       | build once, then n − 1 times: swap root ↔ last, size − 1, max_heapify(0).                                         | Θ(n log n) |

- The outer loop of build goes **bottom-up**, but each max_heapify sinks **top-down**.
- Why bottom-up: max_heapify(i) assumes both subtrees of `i` are already heaps.
- Why build is Θ(n), not Θ(n log n): most nodes are near the bottom and sink only a little. About n/2 nodes sink 0, n/4 sink 1, n/8 sink 2, … ⇒ Σ h · n/2^(h+1) = O(n).

## Time Complexity and Space Complexity

| Sorting       | Best       | Average    | Worst      | Space |
| ------------- | ---------- | ---------- | ---------- | ----- |
| **Heap Sort** | Θ(n log n) | Θ(n log n) | Θ(n log n) | Θ(1)  |

- Build Θ(n) + (n − 1) × max_heapify Θ(log n) = Θ(n log n).
- In-place: only swaps inside the array (the iterative heapify uses no stack).
- **Not stable**: the root ↔ last swap jumps over equal numbers.

## Comparison

| Sorting        | Worst          | Expected   | Space    | Stable |
| -------------- | -------------- | ---------- | -------- | ------ |
| Insertion Sort | Θ(n²)          | Θ(n²)      | Θ(1)     | Yes    |
| Selection Sort | Θ(n²)          | Θ(n²)      | Θ(1)     | No     |
| Bubble Sort    | Θ(n²)          | Θ(n²)      | Θ(1)     | Yes    |
| Merge Sort     | **Θ(n log n)** | Θ(n log n) | Θ(n)     | Yes    |
| Quick Sort     | Θ(n²)          | Θ(n log n) | Θ(log n) | No     |
| **Heap Sort**  | **Θ(n log n)** | Θ(n log n) | **Θ(1)** | No     |

- Heap sort = merge sort's guaranteed Θ(n log n) worst case + quick sort's in-place space.
- In practice it is usually slower than quick sort: jumping between `i` and `2i + 1` is not cache-friendly.
- Heap sort is like **selection sort** with a heap: each round picks the max, but in Θ(log n) instead of Θ(n).

## Code

### Standard (CLRS, recursive heapify)

```python
def max_heapify(nums, i, size):
    # nums[0..size-1] is the heap; sink nums[i] down
    l, r = 2 * i + 1, 2 * i + 2

    # find the largest of i and its children
    largest = i
    if l < size and nums[l] > nums[largest]:
        largest = l
    if r < size and nums[r] > nums[largest]:
        largest = r

    # swap with the larger child and keep sinking
    if largest != i:
        nums[i], nums[largest] = nums[largest], nums[i]
        max_heapify(nums, largest, size)


def build_max_heap(nums):
    # leaves are already heaps; start from the last non-leaf
    for i in range(len(nums) // 2 - 1, -1, -1):
        max_heapify(nums, i, len(nums))


def heap_sort(nums):
    build_max_heap(nums)

    for end in range(len(nums) - 1, 0, -1):
        # move the max to the end; nums[end..] is sorted
        nums[0], nums[end] = nums[end], nums[0]

        # heap size = end; fix the new root
        max_heapify(nums, 0, end)

    return nums
```

### Iterative Heapify
- Same logic, but a `while` loop instead of recursion, so the space is truly Θ(1).
- The recursion in `max_heapify` is a tail call (swap, then recurse once), so it turns into a loop directly.

```python
def max_heapify(nums, i, size):
    while True:
        l, r = 2 * i + 1, 2 * i + 2
        largest = i
        if l < size and nums[l] > nums[largest]:
            largest = l
        if r < size and nums[r] > nums[largest]:
            largest = r

        # nums[i] is >= both children: done
        if largest == i:
            break

        nums[i], nums[largest] = nums[largest], nums[i]
        i = largest
```

### Python heapq
- `heapq` is a **min-heap**; `heapify` is Θ(n), each `heappop` is Θ(log n).
- Not in-place: it builds a new list, so the space is Θ(n).

```python
import heapq


def heap_sort(nums):
    heapq.heapify(nums)
    return [heapq.heappop(nums) for _ in range(len(nums))]
```

## Trace

`A = [8, 3, 10, 1, 6, 14, 4, 7]`, n = 8 (Practice Quiz 2, Q2). The tree has 4 levels (index 7 is alone on the last level).

- `|` separates the heap (left) from the sorted part (right).
- In the trees, `[x]` is a sorted number: it has left the heap and is never touched again.
- Heapify compares the current number with its children and swaps with the **larger** one. If it swapped, the number now sits one level lower and must be **checked again** against its new children, all the way down until it is ≥ both children or reaches a leaf.

### Phase 1: Build Max-Heap

Leaves are indexes 4..7 (`n//2 .. n−1`), already heaps on their own. Heapify `i = 3, 2, 1, 0` (bottom-up).

```text
Start (not a heap yet)

index:  0  1  2   3  4  5   6  7
A    = [8, 3, 10, 1, 6, 14, 4, 7]

              8
          /      \
       3             10
     /  \          /  \
    1     6       14    4
   /
  7
```

**i = 3 (value 1)**

```text
1 vs child 7 → larger is 7 → swap 1 ↔ 7
1 now at index 7, a leaf → stop

              8
          /      \
       3             10
     /  \          /  \
    7     6       14    4     ← 7 moved up
   /
  1                           ← 1 sank

A = [8, 3, 10, 7, 6, 14, 4, 1]
```

**i = 2 (value 10)**

```text
10 vs children 14, 4 → larger is 14 → swap 10 ↔ 14
10 now at index 5, a leaf → stop

              8
          /      \
       3             14       ← 14 moved up
     /  \          /  \
    7     6       10    4     ← 10 sank
   /
  1

A = [8, 3, 14, 7, 6, 10, 4, 1]
```

**i = 1 (value 3): checks two levels**

```text
Level 1: 3 vs children 7, 6 → larger is 7 → swap 3 ↔ 7

              8
          /      \
       7             14
     /  \          /  \
    3     6       10    4     ← 3 is here now
   /
  1

Level 2: 3 vs child 1 → 3 is larger → stop

A = [8, 7, 14, 3, 6, 10, 4, 1]
```

- After one swap, heapify still checks 3 against its new child 1. Here 3 ≥ 1, so it stops; it does not have to reach a leaf.

**i = 0 (value 8): sinks two levels**

```text
Level 0: 8 vs children 7, 14 → larger is 14 → swap 8 ↔ 14

              14              ← root is fixed
          /      \
       7             8        ← 8 is above 10: broken
     /  \          /  \
    3     6       10    4
   /
  1

A = [14, 7, 8, 3, 6, 10, 4, 1]
```

```text
Level 1: 8 vs children 10, 4 → larger is 10 → swap 8 ↔ 10
8 now at index 5, a leaf → stop

              14
          /      \
       7             10
     /  \          /  \
    3     6       8     4     ← 8 settles here
   /
  1

A = [14, 7, 10, 3, 6, 8, 4, 1]
```

- Swapping 14 to the top fixes the root but **breaks the right subtree** (8 is now above 10). So heapify follows 8 down and swaps again.
- Heapify only follows **one path** (index 0 → 2 → 5). The left subtree (7, 3, 6, 1) is never touched, because it was already a heap.
- Bottom-up matters: when we heapify i = 0, both subtrees are already heaps, so fixing the one path that 8 travels is enough.
- The max-heap is `[14, 7, 10, 3, 6, 8, 4, 1]` (Q2a answer). Every parent ≥ its children, but the array is **not sorted** (`7, 10` and `3, 6, 8` are out of order).

### Phase 2: Swap → Shrink → Heapify

Repeat n − 1 = 7 rounds. Each round:
1. **Swap** the root (the max) with the last number of the heap.
2. **Shrink**: heap size − 1; that last slot is now sorted.
3. **Heapify** from the root: the new root came from the bottom, so it is usually too small and sinks.


**Round 1** (heap size 8 → 7)

```text
Swap 14 ↔ 1        [1, 7, 10, 3, 6, 8, 4 | 14]

              1               ← too small for the root
          /      \
       7             10
     /  \          /  \
    3     6       8     4
   /
 [14]

Heapify(0)
  1 vs 7, 10 → larger is 10 → swap 1 ↔ 10   [10, 7, 1, 3, 6, 8, 4 | 14]
  1 vs 8, 4 → larger is 8 → swap 1 ↔ 8      [10, 7, 8, 3, 6, 1, 4 | 14]
  1 at index 5, a leaf of the heap → stop

              10
          /      \
       7             8
     /  \          /  \
    3     6       1     4
   /
 [14]

A = [10, 7, 8, 3, 6, 1, 4 | 14]
```

- This is the first iteration of heapsort (Q2b): `[10, 7, 8, 3, 6, 1, 4, 14]`. Swap and heapify count as one iteration.

**Round 2** (heap size 7 → 6)

```text
Swap 10 ↔ 4        [4, 7, 8, 3, 6, 1 | 10, 14]

              4               ← too small for the root
          /      \
       7             8
     /  \          /  \
    3     6       1    [10]
   /
 [14]

Heapify(0)
  4 vs 7, 8 → larger is 8 → swap 4 ↔ 8      [8, 7, 4, 3, 6, 1 | 10, 14]
  4 vs 1 → 4 is larger → stop

              8
          /      \
       7             4
     /  \          /  \
    3     6       1    [10]
   /
 [14]

A = [8, 7, 4, 3, 6, 1 | 10, 14]
```

- 4 vs child 1 → 4 is already larger, so heapify stops after one swap.

**Round 3** (heap size 6 → 5)

```text
Swap 8 ↔ 1        [1, 7, 4, 3, 6 | 8, 10, 14]

              1               ← too small for the root
          /      \
       7             4
     /  \          /  \
    3     6      [8]   [10]
   /
 [14]

Heapify(0)
  1 vs 7, 4 → larger is 7 → swap 1 ↔ 7      [7, 1, 4, 3, 6 | 8, 10, 14]
  1 vs 3, 6 → larger is 6 → swap 1 ↔ 6      [7, 6, 4, 3, 1 | 8, 10, 14]
  1 at index 4, a leaf of the heap → stop

              7
          /      \
       6             4
     /  \          /  \
    3     1      [8]   [10]
   /
 [14]

A = [7, 6, 4, 3, 1 | 8, 10, 14]
```

- 1 went **right** at level 1 (to 6, not 3): always pick the larger child.

**Round 4** (heap size 5 → 4)

```text
Swap 7 ↔ 1        [1, 6, 4, 3 | 7, 8, 10, 14]

Heapify(0)
  1 vs 6, 4 → larger is 6 → swap 1 ↔ 6      [6, 1, 4, 3 | 7, 8, 10, 14]
  1 vs 3 → larger is 3 → swap 1 ↔ 3         [6, 3, 4, 1 | 7, 8, 10, 14]
  1 at index 3, a leaf of the heap → stop

              6
          /      \
       3             4
     /  \          /  \
    1    [7]     [8]   [10]
   /
 [14]

A = [6, 3, 4, 1 | 7, 8, 10, 14]
```

**Round 5** (heap size 4 → 3)

```text
Swap 6 ↔ 1        [1, 3, 4 | 6, 7, 8, 10, 14]

Heapify(0)
  1 vs 3, 4 → larger is 4 → swap 1 ↔ 4      [4, 3, 1 | 6, 7, 8, 10, 14]
  1 at index 2, a leaf of the heap → stop

              4
          /      \
       3             1
     /  \          /  \
   [6]   [7]     [8]   [10]
   /
 [14]

A = [4, 3, 1 | 6, 7, 8, 10, 14]
```

**Round 6** (heap size 3 → 2)

```text
Swap 4 ↔ 1        [1, 3 | 4, 6, 7, 8, 10, 14]

Heapify(0)
  1 vs 3 → larger is 3 → swap 1 ↔ 3         [3, 1 | 4, 6, 7, 8, 10, 14]
  1 at index 1, a leaf of the heap → stop

              3
          /      \
       1            [4]
     /  \          /  \
   [6]   [7]     [8]   [10]
   /
 [14]

A = [3, 1 | 4, 6, 7, 8, 10, 14]
```

**Round 7** (heap size 2 → 1)

```text
Swap 3 ↔ 1        [1 | 3, 4, 6, 7, 8, 10, 14]

Heap size 1 → nothing to heapify → done

A = [1 | 3, 4, 6, 7, 8, 10, 14]
```

Result: `[1, 3, 4, 6, 7, 8, 10, 14]`

### Summary

| Round | Swap | After swap | Heapify path | After heapify |
| ----- | ---- | ---------- | ------------ | ------------- |
| 1 | 14 ↔ 1 | [1, 7, 10, 3, 6, 8, 4 \| 14] | 1 ↔ 10, then 1 ↔ 8 | [10, 7, 8, 3, 6, 1, 4 \| 14] |
| 2 | 10 ↔ 4 | [4, 7, 8, 3, 6, 1 \| 10, 14] | 4 ↔ 8 | [8, 7, 4, 3, 6, 1 \| 10, 14] |
| 3 | 8 ↔ 1 | [1, 7, 4, 3, 6 \| 8, 10, 14] | 1 ↔ 7, then 1 ↔ 6 | [7, 6, 4, 3, 1 \| 8, 10, 14] |
| 4 | 7 ↔ 1 | [1, 6, 4, 3 \| 7, 8, 10, 14] | 1 ↔ 6, then 1 ↔ 3 | [6, 3, 4, 1 \| 7, 8, 10, 14] |
| 5 | 6 ↔ 1 | [1, 3, 4 \| 6, 7, 8, 10, 14] | 1 ↔ 4 | [4, 3, 1 \| 6, 7, 8, 10, 14] |
| 6 | 4 ↔ 1 | [1, 3 \| 4, 6, 7, 8, 10, 14] | 1 ↔ 3 | [3, 1 \| 4, 6, 7, 8, 10, 14] |
| 7 | 3 ↔ 1 | [1 \| 3, 4, 6, 7, 8, 10, 14] | — (size 1) | [1, 3, 4, 6, 7, 8, 10, 14] |

- Each round puts the current max at the end, so the sorted part grows from the right.
- Heapify sinks 2 levels in rounds 1, 3, 4 and fewer later, because the heap gets smaller. Each heapify is at most the tree height, log n.
- The heap part is a **max-heap** after every round; it never becomes a min-heap. The final ascending array happens to satisfy the min-heap rule, but that is a side effect.
- One round = swap + heapify, written as one step. Heapify itself can swap several times, always down **one path**.
