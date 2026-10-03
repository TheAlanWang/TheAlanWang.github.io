---
layout: layouts/post.njk
title: Insertion Sort, Selection Sort and Bubble Sort
description: A side-by-side comparison of insertion sort, selection sort, and bubble sort, covering how each one works, their time complexity, and Python implementations.
excerpt: How insertion, selection, and bubble sort each work, their time complexity, and Python implementations.
date: 2026-10-03T12:00:00-07:00
category: System Design & Algorithms
subcategory: Algorithms
topic: Sorting
kind: Note
tags:
  - posts
permalink: /posts/insertion-selection-bubble-sort/index.html
---

## Overview

| Sorting            | Explain |
| ------------------ | ------- |
| **Insertion Sort** | Insert the current number into the sorted left part.<br>当前数往左插，找到合适位置 |
| **Selection Sort** | Select the smallest remaining number and put it in front.<br>从剩余数里选最小的，放前面 |
| **Bubble Sort**    | Compare neighbors and swap; the largest bubbles to the end.<br>相邻比较交换，最大的浮到末尾 |

## Time Complexity and Space Complexity

| Sorting            | Best  | Average | Worst |
| ------------------ | ----- | ------- | ----- |
| **Insertion Sort** | Θ(n)  | Θ(n²) | Θ(n²) |
| **Selection Sort** | Θ(n²) | Θ(n²) | Θ(n²) |
| **Bubble Sort**    | Θ(n)* | Θ(n²) | Θ(n²) |

\* Bubble sort is Θ(n) in the best case only with an early exit: if a full pass makes no swaps, the array is already sorted and it can stop. The code below has no early exit, so it is Θ(n²) even on sorted input.<br>
只有加了提前退出才是 Θ(n)：某一轮没有发生任何交换，说明已经有序，可以直接停止。下面的代码没有这个优化，所以已排好序的输入也是 Θ(n²)。

## Code

### Insertion Sort

```python
def insertion_sort(nums):
    for i in range(1, len(nums)):
        j = i
        while j > 0 and nums[j] < nums[j - 1]:
            nums[j], nums[j - 1] = nums[j - 1], nums[j]
            j -= 1
    return nums
```

### Selection Sort

```python
def selection_sort(nums):
    for i in range(len(nums) - 1):
        min_idx = i

        for j in range(i + 1, len(nums)):
            if nums[j] < nums[min_idx]:
                min_idx = j

        if min_idx != i:
            nums[i], nums[min_idx] = nums[min_idx], nums[i]

    return nums
```

### Bubble Sort

```python
def bubble_sort(nums):
    n = len(nums)

    for i in range(n - 1):
        for j in range(n - 1 - i):
            if nums[j] > nums[j + 1]:
                nums[j], nums[j + 1] = nums[j + 1], nums[j]

    return nums
```
