---
layout: layouts/post.njk
title: "Distributed Data Parallel Poster"
description: "A visual poster explaining PyTorch DDP, all-reduce, NCCL, Forge usage, and the DDP versus FSDP decision."
excerpt: "A compact visual guide to DDP: full model copies, per-GPU batches, gradient all-reduce, NCCL, and when Forge should use DDP versus FSDP."
date: 2026-05-01
type: Poster
topic: HPC
tags:
  - posts
image: /assets/sketches/ddp-poster.svg
imageFit: contain
permalink: /posts/distributed-data-parallel-ddp-poster/index.html
---
This poster summarizes Distributed Data Parallel as a multi-GPU training pattern: every GPU keeps a full model copy, processes different data, computes local gradients, and uses all-reduce so every process applies the same averaged update.

![Distributed Data Parallel Poster](/assets/sketches/ddp-poster.png)

## 1. What is DDP?

Distributed Data Parallel (DDP) is a multi-GPU training strategy.

Each GPU keeps a full copy of the model, processes a different mini-batch, computes gradients locally, and synchronizes gradients across GPUs using all-reduce.

> Each GPU trains on different data, but all GPUs keep the same model parameters via gradient synchronization.

## 2. Single-GPU Training Flow

```text
1. Initialize
   Initialize weights (w) and bias (b)

2. Forward pass
   z = wx + b

3. Compute loss
   loss = Loss(z, y)

4. Backward pass
   Compute gradients:
   dLoss/dw
   dLoss/db

5. Optimizer step
   w = w - lr * dLoss/dw
   b = b - lr * dLoss/db

6. Repeat
   Repeat for steps and epochs
```

Key points:

- Backpropagation only computes gradients
- Optimizer updates parameters
- 1 epoch = one full pass through dataset

## 3. DDP Training Flow

```text
1. Initialize
   Each GPU has a full model copy

2. Data split
   Each GPU gets a different mini-batch

3. Forward pass (per GPU)

4. Compute loss (per GPU)

5. Backward pass (per GPU)
   Compute local gradients

6. Gradient synchronization
   All-reduce gradients

7. Optimizer step
   Use averaged gradients

8. Repeat
```

> DDP synchronizes gradients, not loss or weights.

## 4. What is All-reduce?

All-reduce aggregates values from all GPUs and returns the result to every GPU.

Example:

```text
g_avg = (g0 + g1 + g2 + g3) / 4
```

Each GPU gets the same gradient -> same model update

## 5. All-reduce Implementations

### 5.1 Ring All-reduce

```text
GPU0 -> GPU1 -> GPU2 -> GPU3 -> GPU0
```

- Pass gradient chunks around
- Accumulate while passing

Good for:

- Large gradient tensors
- High bandwidth efficiency
- No central bottleneck

### 5.2 Tree All-reduce

```text
        GPU0
       /    \
    GPU1    GPU2
```

Steps:

```text
1. Reduce (bottom -> top)
2. Broadcast (top -> bottom)
```

Good for:

- Fewer communication rounds
- Smaller messages / multi-node

### 5.3 Summary

```text
Ring -> circle communication
Tree -> hierarchical communication
```

No single best choice -> depends on hardware & data size

## 6. NCCL in DDP

NCCL = NVIDIA Collective Communications Library

Used by PyTorch DDP for GPU communication.

```text
DDP -> uses NCCL
NCCL -> executes all-reduce
```

You do NOT implement ring/tree manually.

## 7. Why DDP > DataParallel

DataParallel:

```text
main GPU handles everything -> bottleneck
```

DDP:

```text
one process per GPU
local compute + all-reduce
```

Advantages:

```text
- no single-process bottleneck
- lower Python overhead
- faster GPU communication
- overlap communication with backward
```

## 8. How Forge Uses DDP

Forge does NOT manually write:

```python
torch.nn.parallel.DistributedDataParallel(...)
```

Instead:

```text
torchrun / SLURM
    ↓
multiple processes
    ↓
Hugging Face Trainer
    ↓
automatic DDP
    ↓
NCCL all-reduce
```

### Single-node multi-GPU

```bash
torchrun --nproc_per_node=4 forge.py
```

-> 4 GPUs = 4 processes

### Multi-node multi-GPU

```text
multiple machines
each runs torchrun
all processes connect
```

### LOCAL_RANK

Each process uses its own GPU:

```text
LOCAL_RANK=0 -> cuda:0
LOCAL_RANK=1 -> cuda:1
...
```

## 9. DDP vs FSDP (Forge)

Strategy:

```text
1 GPU -> off
fit in memory -> DDP
too large -> FSDP
```

Difference:

```text
DDP -> full model on each GPU
FSDP -> model sharded across GPUs
```
