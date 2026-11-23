---
layout: layouts/post.njk
title: Python GIL
description: "A Python backend concurrency note explaining the Global Interpreter Lock, why only one thread can run Python bytecode at a time in one CPython process, and why this is separate from async/await."
excerpt: "The GIL means one CPython process can run only one Python-bytecode thread at a time. This is a threading issue, not an async/await issue."
date: 2026-05-12T16:00:00-07:00
category: Knowledge
subcategory: Backend
topic: Concurrency
kind: Note
tags:
  - posts
permalink: /posts/python-gil-threading-vs-async/index.html
---

## Overview

> The GIL is a lock in CPython that allows only one **thread** in the same **process** to run **Python bytecode** at a time. Because the threads share the same memory, the GIL stops them from changing it at the same time.
>
> But threads still work well for **I/O tasks**, because a waiting thread releases the GIL. For **CPU tasks**, threads don't help: they just take turns. I'd use **multiple processes**, each with its own GIL, on multiple cores.

## Processes and Threads

```text
Process     own memory, own interpreter, own GIL
└── Thread      shares the process memory and its one GIL
    └── Coroutine   an async def function, run by the event loop on that thread
```

A thread is under a process. Threads in one process share the same memory. A thread can have `async` functions and `await`, and uses the event loop to control them.

## Why CPython Has a GIL

GIL means `Global Interpreter Lock`. CPython is the most common Python implementation. Before a thread can execute Python bytecode, it must hold the GIL.

Threads share the same memory, so if two threads wrote the interpreter's internal data at the same time, they could corrupt it. For example, Python keeps a count on every object of how many variables are using it. If two threads change the same count at the same time, it can come out wrong. One lock for the whole interpreter prevents this. That lock is the GIL.

Threads can still exist, be scheduled by the operating system, and wait on I/O. Only running Python bytecode needs the lock.

## What the GIL Doesn't Protect

Python first compiles your code into **bytecode**: small instructions the interpreter runs one at a time. The GIL can switch threads between any two of them.

`count += 1` looks like one step, but it is several instructions:

```python
import dis

count = 0
def add():
    global count
    count += 1

dis.dis(add)
# LOAD_GLOBAL   count    read count
# LOAD_CONST    1
# BINARY_OP     +=       add 1
# STORE_GLOBAL  count    write count back
```

If the GIL switches after Thread A reads `count` (0) but before it writes back, Thread B also reads 0 and writes 1. Then A writes 1 too. Two adds, but `count` is 1.

The GIL protects the interpreter's own data, not your variables. Use `threading.Lock` for those.

## When the GIL Switches

| Case | Who triggers it | Example |
|---|---|---|
| Voluntary release | The thread itself | It is about to wait on I/O: network, file, `time.sleep` |
| Forced release | A thread waiting for the GIL | It has waited about 5 ms and asks the holder to drop the lock |

```python
import sys
sys.getswitchinterval()   # 0.005, in seconds = 5 ms
```

- 5 ms is an upper bound, not a fixed tick. If no other thread is waiting, nothing switches.
- Which waiting thread gets the GIL next is up to the OS.

## Multiple Processes

| | Thread | Process |
|---|---|---|
| Memory | Shared | One copy each, uses more |
| Passing data | Read the same variable | Pickle and send across processes (IPC) |
| Startup | Fast | Slow |
| Parallel CPU work | No, limited by the GIL | Yes |

Each process has its own GIL, for example `uvicorn --workers 4` or `ProcessPoolExecutor`. But processes only run in parallel on multiple cores; on one core they take turns. Taking turns is **concurrency**; running at the same moment is **parallelism**.

## Why Not Remove the GIL?

- **Faster single-threaded code:** one lock instead of a small lock on every object.
- **Simpler C extensions:** libraries like NumPy assume no other thread changes their data.
- **A simpler interpreter:** one lock can't deadlock with itself.

Python 3.13 added an optional free-threaded build without the GIL (PEP 703). 3.14 supports it officially, but it is not the default.

## GIL vs Async

The GIL decides which **thread** runs. Async decides which **coroutine** runs inside one thread. They work at different levels.

| | GIL | Async |
|---|---|---|
| Decides | Which thread runs Python | Which coroutine runs on the event-loop thread |
| Switches | About every 5 ms, or when a thread waits on I/O | Only at `await` |

In FastAPI, an `async def` route runs on the event loop in MainThread, and a `def` route runs in a thread pool (40 threads by default). The animation shows both in one process, plus a second process with its own GIL.

<div class="gil-anim" data-gil-diagram></div>
<script src="/assets/notes/gil-diagram.js" defer></script>

Async runs one coroutine at a time because it has only one thread, not because of the GIL. The two only meet in one place: coroutines run only while their thread holds the GIL (steps 1 and 2 above).

A common mistake is blocking inside `async def`:

```python
@app.get("/user")
async def get_user():
    time.sleep(2)      # blocking, not await
    return {"ok": True}
```

`time.sleep` releases the GIL, but the event loop still freezes for 2 seconds, because the code never reaches an `await`. Use `await asyncio.sleep(2)` instead.

## Q&A

**Q: Can Python have multiple threads?**

Yes. The GIL only stops them from running Python bytecode in parallel.

**Q: Does the GIL mean a server can handle only one request at a time?**

No. I/O-bound servers can handle many requests concurrently, because waiting threads release the GIL.

**Q: Does async bypass the GIL?**

No. Async schedules coroutines on one thread, so there is nothing to bypass.

**Q: Will more threads speed up CPU-bound Python?**

No. Use multiple processes, or native code that releases the GIL, such as NumPy.

**Q: Does the GIL make my code thread-safe?**

No. It only protects the interpreter. Use locks for your own shared variables.

**Q: Is `time.sleep` inside `async def` fine, since it releases the GIL?**

No. It still blocks the event loop. Use `await asyncio.sleep`.
