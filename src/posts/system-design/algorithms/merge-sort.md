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

| Step        | Explain                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------- |
| **Divide**  | Split the array in half until each part has one number.<br>一直对半拆，拆到每段只剩一个数                     |
| **Conquer** | Sort each half recursively.<br>递归排好左右两半                                                        |
| **Merge**   | Merge two sorted halves by repeatedly taking the smaller front number.<br>两个有序段，每次取较小的队头，合并成一段 |

## Time Complexity and Space Complexity

| Sorting        | Best       | Average    | Worst      | Space |
| -------------- | ---------- | ---------- | ---------- | ----- |
| **Merge Sort** | Θ(n log n) | Θ(n log n) | Θ(n log n) | Θ(n)  |

- Halving gives log n levels; merging each level costs n in total.<br>对半拆共 log n 层，每层合并总共 n
- Stable: `<=` keeps equal numbers in their original order.<br>稳定：用 `<=`，相等的数保持原顺序

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

    mid = len(nums) // 2

    left = merge_sort(nums[:mid])
    right = merge_sort(nums[mid:])

    return merge(left, right)
```
