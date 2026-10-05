---
layout: layouts/post.njk
title: Merge Sort
description: How merge sort divides an array, merges sorted halves, why it runs in Θ(n log n), and a Python implementation.
excerpt: How merge sort divides and merges, its time complexity, and a Python implementation.
date: 2026-10-04T12:00:00-07:00
category: System Design & Algorithms
subcategory: Algorithms
topic: Sorting
kind: Note
tags:
  - posts
permalink: /posts/merge-sort/index.html
---

## Overview

| Step       | Explain                                                                                        |
| ---------- | ---------------------------------------------------------------------------------------------- |
| **Divide** | Split the array in half until each part has **one** number.<br>一直对半拆，拆到每段只剩一个数                 |
| **Conquer** | Sort each half recursively.<br>递归排好左右两半                                                        |
| **Merge**   | Merge two sorted halves by repeatedly taking the smaller front number.<br>两个有序段，每次取较小的队头，合并成一段 |

## Time Complexity and Space Complexity

| Sorting    | Best       | Average    | Worst      | Space |
| ---------- | ---------- | ---------- | ---------- | ----- |
| **Merge Sort** | Θ(n log n) | Θ(n log n) | Θ(n log n) | Θ(n)  |

- Halving gives log n levels; merging each level costs n in total.<br>对半拆共 log n 层，每层合并总共 n
- Stable: `<=` keeps equal numbers in their original order.<br>稳定：用 `<=`，相等的数保持原顺序

## Merge Sort Process

`nums = [5, 2, 4, 7, 1, 3, 2, 6]`

```text
Divide ↓
Level 0              [5, 2, 4, 7, 1, 3, 2, 6]
Level 1        [5, 2, 4, 7]            [1, 3, 2, 6]
Level 2     [5, 2]      [4, 7]      [1, 3]      [2, 6]
Level 3   [5]   [2]   [4]   [7]   [1]   [3]   [2]   [6]

Merge ↑
Level 2     [2, 5]      [4, 7]      [1, 3]      [2, 6]
Level 1        [2, 4, 5, 7]            [1, 2, 3, 6]
Level 0              [1, 2, 2, 3, 4, 5, 6, 7]
```

- 8 numbers → log₂ 8 = 3 levels of merging; each level merges 8 numbers in total.<br>8 个数拆 3 层，每层合并总共 8 个数

## Comparison

| Sorting            | Worst      | Space | Stable |
| ------------------ | ---------- | ----- | ------ |
| **Insertion Sort** | Θ(n²)      | Θ(1)  | Yes    |
| **Selection Sort** | Θ(n²)      | Θ(1)  | No     |
| **Bubble Sort**    | Θ(n²)      | Θ(1)  | Yes    |
| **Merge Sort**     | Θ(n log n) | Θ(n)  | Yes    |

## Code

```python
def merge(left, right):
    i = j = 0
    merged = []
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            merged.append(left[i])
            i += 1
        else:
            merged.append(right[j])
            j += 1

    merged.extend(left[i:])
    merged.extend(right[j:])

    return merged


def merge_sort(nums):
    if len(nums) == 1:
        return nums

    # divide
    mid = len(nums) // 2

    # conquer
    left = merge_sort(nums[:mid])
    right = merge_sort(nums[mid:])

    # merge
    return merge(left, right)
```
