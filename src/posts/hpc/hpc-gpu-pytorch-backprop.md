---
layout: layouts/post.njk
title: HPC + GPU + PyTorch Practical Guide
description: A practical note for running PyTorch on Northeastern Explorer GPU nodes, from login and CUDA setup to forward compute and backpropagation.
excerpt: A practical note for the full HPC to GPU to CUDA to PyTorch to backpropagation workflow on Northeastern Explorer.
date: 2026-04-30
category: HPC
subcategory: GPU / PyTorch
kind: Guide
tags:
  - posts
image: /assets/notes/hpc-gpu-pytorch-backprop.svg
imageFit: contain
permalink: /posts/hpc-gpu-pytorch-backprop/index.html
---
This note captures the full workflow for running PyTorch on Northeastern's Explorer Cluster: login, request an interactive GPU session, load the system modules, create a Conda environment, install the CUDA-enabled PyTorch wheel, run a GPU forward pass, and call `loss.backward()`.

![HPC + GPU + PyTorch Practical Guide](/assets/notes/hpc-gpu-pytorch-backprop.svg)

## Goal

Run the complete path:

```text
Login -> Request GPU -> Setup Environment -> Run PyTorch -> Backpropagation
```

## 1. Login

```bash
ssh your_netid@login.explorer.northeastern.edu
```

Check the current environment:

```bash
hostname
pwd
whoami
```

## 2. Check Cluster Resources

```bash
sinfo
```

Key fields:

| Field | Meaning |
| --- | --- |
| `PARTITION` | Queue, such as `cpu` or `gpu` |
| `STATE` | Node state, such as `idle`, `mix`, `alloc`, or `drain` |
| `NODELIST` | Node names |

## 3. Request An Interactive GPU

```bash
srun --partition=gpu-interactive \
  --gres=gpu:1 \
  --time=00:30:00 \
  --mem=8G \
  --pty bash
```

Check job status:

```bash
squeue -u your_netid
```

`PD` means pending. `R` means running.

## 4. Enter The Compute Node

After the allocation starts, confirm that the shell is running on a compute node:

```bash
hostname
```

Check the GPU:

```bash
nvidia-smi
```

Example GPU:

```text
Tesla V100-SXM2-32GB
```

## 5. Load System Modules

```bash
module load miniconda3/25.9.1
module load cuda/12.3.0
```

Verify:

```bash
which conda
nvcc --version
```

`module load` exposes software already installed on the cluster. It does not install packages into your personal directory.

## 6. Create A Conda Environment

If this is the first time using Anaconda channels, accept the Terms of Service:

```bash
conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/main
conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/r
```

Create the environment:

```bash
conda create -n gpu-test python=3.10 -y
```

Activate it:

```bash
source $(conda info --base)/etc/profile.d/conda.sh
conda activate gpu-test
```

The environment is stored under:

```text
~/.conda/envs/gpu-test
```

That path is persistent; it does not disappear when the GPU node session ends.

## 7. Install PyTorch

```bash
pip install torch torchvision torchaudio \
  --index-url https://download.pytorch.org/whl/cu121
```

## 8. Test GPU Access

```bash
python -c "import torch; print(torch.__version__); print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0))"
```

Expected shape of the output:

```text
2.5.1+cu121
True
Tesla V100-SXM2-32GB
```

## 9. Matrix Multiplication Forward Pass

```python
import torch
import time

x = torch.randn(8000, 8000, device="cuda")
y = torch.randn(8000, 8000, device="cuda")

torch.cuda.synchronize()
start = time.time()

z = x @ y

torch.cuda.synchronize()
print("Time:", time.time() - start)
```

Matrix multiplication is a GPU-friendly parallel workload. In this example, `x @ y` performs a large matrix multiply directly on CUDA.

## 10. Backpropagation

```python
import torch

device = "cuda"

x = torch.randn(4096, 4096, device=device)
w = torch.randn(4096, 4096, device=device, requires_grad=True)

y = x @ w
loss = y.pow(2).mean()

loss.backward()
```

The core training loop is:

```text
forward -> loss -> backward -> update
```

Important details:

- `x @ w` means matrix multiplication: input times weights produces output.
- `loss = y.pow(2).mean()` squares each element, averages the result, and produces one scalar.
- `loss.backward()` computes gradients automatically.
- Gradients for `w` are stored in `w.grad`.
- CUDA is NVIDIA's GPU computing platform, and PyTorch uses it to run tensor operations on the GPU.

## HPC Mental Model

| Concept | Meaning |
| --- | --- |
| Login Node | Where you log in and submit jobs |
| Compute Node | Where the actual CPU/GPU workload runs |
| `/home` | Persistent storage |
| Compute node local storage | Temporary |
| Conda environment | Persistent when stored under `~/.conda/envs/` |

## Exit

```bash
exit
```

This returns from the GPU compute node back to the login environment.

## Next Time

```bash
module load miniconda3/25.9.1
module load cuda/12.3.0

source $(conda info --base)/etc/profile.d/conda.sh
conda activate gpu-test

srun --partition=gpu-interactive --gres=gpu:1 --pty bash
```

The complete loop is:

```text
HPC -> GPU -> CUDA -> PyTorch -> Forward -> Backprop
```
