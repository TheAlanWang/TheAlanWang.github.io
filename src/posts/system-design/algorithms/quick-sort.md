---
layout: layouts/post.njk
title: Quick Sort
description: How quick sort picks a pivot, partitions with Lomuto, why it runs in Θ(n log n) expected and Θ(n²) worst case, how it compares with merge sort, and Python implementations.
excerpt: How quick sort partitions around a pivot, its time complexity, and Python implementations.
date: 2026-10-08T12:00:00-07:00
category: System Design & Algorithms
subcategory: Algorithms
topic: Sorting
kind: Note
tags:
  - posts
permalink: /posts/quick-sort/index.html
---

## Overview

| Step          | Explain                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------- |
| **Pick**      | Pick a **pivot** at random.                                                               |
| **Partition** | L = numbers smaller than the pivot<br>R = numbers larger than the pivot<br>Takes O(n)     |
| **Recurse**   | Sort L and R recursively; the answer is L + [pivot] + R.<br>递归排好 L 和 R，结果就是 L + pivot + R |

## Lomuto Partition

- Choose a random pivot first (in Lomuto, the pivot is the last element), then move it to the last position.
- `j` scans left to right; `i` marks the end of the "≤ pivot" region.<br>`j` 从左往右扫，`i` 是"≤ pivot 区"的右边界
- `j` moves one step every time; `i` moves only when `j` finds a number ≤ pivot, then swap `nums[i]` and `nums[j]`.<br>`j` 每步都走；只有 `j` 找到 ≤ pivot 的数时，`i` 才前进一格，然后交换

```text
[ p ... i ]   [ i+1 ... j-1 ]   [ j ... r-1 ]   [ r ]
  ≤ pivot        > pivot          unchecked       pivot
```

### Example 1

`nums = [7, 6, 3, 5, 1, 2, 4]`, random pivot = 5

```text
Move pivot 5 to the last position:
        [ 7   6   3   4   1   2 | 5 ]

j = 0:  7 > 5, i stays
        [ 7   6   3   4   1   2 | 5 ]
      ↑   ↑
      i   j

j = 1:  6 > 5, i stays
        [ 7   6   3   4   1   2 | 5 ]
      ↑       ↑
      i       j

j = 2:  3 ≤ 5, i moves to 0, swap 7 ↔ 3
        [ 3   6   7   4   1   2 | 5 ]
          ↑       ↑
          i       j

j = 3:  4 ≤ 5, i moves to 1, swap 6 ↔ 4
        [ 3   4   7   6   1   2 | 5 ]
              ↑       ↑
              i       j

j = 4:  1 ≤ 5, i moves to 2, swap 7 ↔ 1
        [ 3   4   1   6   7   2 | 5 ]
                  ↑       ↑
                  i       j

j = 5:  2 ≤ 5, i moves to 3, swap 6 ↔ 2
        [ 3   4   1   2   7   6 | 5 ]
                      ↑       ↑
                      i       j

Put pivot in the middle: swap nums[i+1] ↔ pivot (7 ↔ 5)
        [ 3   4   1   2 | 5 | 6   7 ]
           ≤ 5          pivot   > 5
```

- After `i` moves, it always lands on the first number **> pivot**, so the swap sends a small number left and a large number right.
- Then recurse on `[3, 4, 1, 2]` and `[6, 7]` the same way, with a new random pivot each time.

### Example 2: Recursion

`nums = [2, 8, 7, 1, 3, 5, 6, 4]` (CLRS Figure 7.1), pivot = last element of each subarray

```text
Level 0   [2, 8, 7, 1, 3, 5, 6, 4]       pivot 4
          [2, 1, 3]   4   [7, 5, 6, 8]

Level 1   [2, 1, 3]                      pivot 3   →   [2, 1]   3   []
          [7, 5, 6, 8]                   pivot 8   →   [7, 5, 6]   8   []

Level 2   [2, 1]                         pivot 1   →   []   1   [2]
          [7, 5, 6]                      pivot 6   →   [5]   6   [7]

Result    [1, 2, 3, 4, 5, 6, 7, 8]
```

- Each subarray picks its own new pivot; once placed, a pivot never moves again.
- Stop when a subarray has 0 or 1 element. (left >= right)
- Level 1 picks the largest number twice (3 and 8): each split removes only one number, the start of the worst case.

## Time Complexity and Space Complexity

| Sorting        | Best       | Expected   | Worst     | Space             |
| -------------- | ---------- | ---------- | --------- | ----------------- |
| **Quick Sort** | Θ(n log n) | Θ(n log n) | **Θ(n²)** | Θ(log n) expected |

- Best: the pivot splits evenly, so `T(n) = 2T(n/2) + Θ(n) = Θ(n log n)`.
- Worst: see Worst Case below. 每次都抽到最小或最大，Θ(n²)
- Random pivot makes the worst case very unlikely, so the expected time is Θ(n log n) on any input.<br>随机选 pivot，最坏情况几乎不会发生，任何输入的期望都是 Θ(n log n)
- In-place: only the recursion stack uses extra space.

### Worst Case

- Running time depends on how well the **pivot** splits the array.
- Worst pivot: the smallest or the largest element. Then one side has n−1 and the other side has 0.<br>最坏的 pivot 是最小或最大的数，一边 n−1 个，另一边 0 个

```text
T(n) = T(n-1) + T(0) + Θ(n)
```

```text
T(n) = T(n-1) + n
     = T(n-2) + (n-1) + n
     = T(n-3) + (n-2) + (n-1) + n
       ⋮
     = T(1) + 2 + ... + n
     = 1 + 2 + ... + n = n(n+1)/2 = Θ(n²)
```

- Unroll until the argument reaches 1 (n − k = 1, so k = n − 1); T(1) = 1 is the base case.

## Comparison

| Sorting        | Worst          | Expected   | Space    | Stable |
| -------------- | -------------- | ---------- | -------- | ------ |
| Insertion Sort | Θ(n²)          | Θ(n²)      | Θ(1)     | Yes    |
| Selection Sort | Θ(n²)          | Θ(n²)      | Θ(1)     | No     |
| Bubble Sort    | Θ(n²)          | Θ(n²)      | Θ(1)     | Yes    |
| Merge Sort     | **Θ(n log n)** | Θ(n log n) | Θ(n)     | Yes    |
| **Quick Sort** | **Θ(n²)**      | Θ(n log n) | Θ(log n) | No     |

- Merge sort does its work in **merge** (after recursion); quick sort does its work in **partition** (before recursion).<br>merge sort 的工作在递归之后的合并，quick sort 的工作在递归之前的划分
- **Not stable**: Lomuto swaps numbers over long distances.

### Quick Sort vs Merge Sort

Both are Θ(n log n) on average, but quick sort is usually faster in practice: Θ ignores constant factors.<br>平均都是 Θ(n log n)，但 Θ 不看常数，实际上 quick sort 通常更快

|                 | Quick Sort                                                           | Merge Sort                                                               |
| --------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Extra space     | **In-place** swaps; only the recursion stack, Θ(log n)<br>原地交换，只用递归栈 | Needs an auxiliary array, Θ(n)<br>要开一个辅助数组                               |
| Data movement   | Only swaps numbers that need to move<br>只交换需要换的数                     | Copies every number to a new array at every level<br>每一层都把所有数复制到新数组再复制回来 |
| Memory access   | `i` and `j` scan sequentially; cache-friendly<br>i、j 顺序扫描，对 CPU 缓存友好 | Reads and writes between two arrays<br>在两个数组之间来回读写                       |
| Constant factor | Small<br>较小                                                          | Larger<br>较大                                                             |
| Worst case      | Θ(n²), rare with a random pivot                                      | Guaranteed Θ(n log n)<br>保证 Θ(n log n)                                   |
| **Stable**      | No                                                                   | Yes                                                                      |

- Quick sort wins on real-world **speed** and **memory**
- Merge sort wins on guaranteed **worst case** and **stability**

## Code

### Standard (CLRS, random pivot)

```python
import random


def partition(nums, p, r):
    # nums[p..r]: the current subarray (p = left end, r = right end, both inclusive)

    # pick: move a random pivot to the last position
    k = random.randint(p, r)
    nums[k], nums[r] = nums[r], nums[k]
    pivot = nums[r]

    # nums[p..i] <= pivot, nums[i+1..j-1] > pivot
    i = p - 1
    for j in range(p, r):
        if nums[j] <= pivot:
            i += 1
            nums[i], nums[j] = nums[j], nums[i]

    # put pivot in the middle
    nums[i + 1], nums[r] = nums[r], nums[i + 1]

    return i + 1


def quick_sort(nums, p=0, r=None):
    if r is None:
        r = len(nums) - 1
    if p >= r:
        return nums

    # partition
    q = partition(nums, p, r)

    # recurse
    quick_sort(nums, p, q - 1)
    quick_sort(nums, q + 1, r)

    return nums
```

### My Version
- `i` points to the next free slot (starts at `l`), so swap first, then `i += 1`; the pivot goes to `arr[i]`.
- Pivot is always the last element (no random pick).

```python
def partition(arr, l, r):
    # arr[l..r]: the current subarray (both ends inclusive)

    # pick: the last element is the pivot
    pivot = arr[r]

    # arr[l..i-1] < pivot, arr[i..j-1] >= pivot
    i = l
    for j in range(l, r):
        if arr[j] < pivot:
            arr[i], arr[j] = arr[j], arr[i]
            i += 1

    # put pivot in the middle
    arr[i], arr[r] = arr[r], arr[i]

    return i


def quick_sort(arr, l, r):
    # 0 or 1 element: already sorted
    if l >= r:
        return

    # partition
    p_idx = partition(arr, l, r)

    # recurse (the pivot at p_idx is already in place)
    quick_sort(arr, l, p_idx - 1)
    quick_sort(arr, p_idx + 1, r)


quick_sort(nums, 0, len(nums) - 1)
```
