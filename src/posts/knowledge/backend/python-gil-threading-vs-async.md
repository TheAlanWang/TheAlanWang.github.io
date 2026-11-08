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

The GIL is a lock in CPython. In the same process, threads share the same memory, so the GIL exists to stop multiple threads from writing the interpreter's memory at the same time and corrupting it. Because of that, only one **thread** in a **process** can run Python **bytecode** at a time.

For **I/O tasks**, threads still work well: when one thread waits on I/O, it releases the GIL and another thread can run.

For **CPU tasks**, threads don't help. They just take turns holding the GIL, so there's no real parallelism. For CPU-heavy work, I'd use multiple processes, because each process has its own memory and its own GIL.

## What the GIL Is

GIL means `Global Interpreter Lock`.

In CPython, the most common Python implementation, the GIL is an interpreter-level lock. Before a thread can execute Python bytecode, it must hold the GIL.

This means:

```text
One process
├── Thread A wants to run Python bytecode
├── Thread B wants to run Python bytecode
└── GIL allows only one of them to run Python bytecode at a time
```

The key phrase is:

```text
execute Python bytecode
```

Threads can still exist. They can still be scheduled by the operating system. They can still wait on I/O. But if they are doing CPU-heavy Python work, they compete for one interpreter lock.

## Processes, Threads, and Coroutines

<div class="gil-anim" data-gil-diagram></div>
<script src="/assets/notes/gil-diagram.js" defer></script>

```text
Process     own memory, own interpreter, own GIL
└── Thread      shares the process memory and its one GIL
    └── Coroutine   an async def function, run by the event loop on that thread
```

A thread is under a process. A thread can have `async` functions and `await`, and uses the event loop to control them.

## How the GIL Works

### Why CPython Has a GIL

Threads in one process share the same memory. If two threads wrote the interpreter's internal data at the same time, they could corrupt it.

For example, Python keeps a count on every object of how many variables are using it. If two threads change the same count at the same time, it can come out wrong. One lock for the whole interpreter prevents this. That lock is the GIL.

### When the GIL Switches

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

## Working Around the GIL

### Threads Still Work for I/O

When a thread waits on I/O, it usually does not need to hold the GIL. The interpreter can let another thread run Python bytecode while the first thread is waiting.

| Workload | Do threads help? | Why |
|---|---|---|
| I/O-bound | Often yes | Waiting threads can release the GIL |
| CPU-bound Python | Usually no | Threads compete for Python bytecode execution |

### Multiple Processes

| | Thread | Process |
|---|---|---|
| Memory | Shared | One copy each, uses more |
| Passing data | Read the same variable | Pickle and send across processes (IPC) |
| Startup | Fast | Slow |
| Parallel CPU work | No, limited by the GIL | Yes |

Because the GIL is per process, CPU-bound Python work needs multiple processes, not multiple threads: `multiprocessing`, `ProcessPoolExecutor`, Celery workers, or Uvicorn workers.

```bash
uvicorn app.main:app --workers 4   # 4 worker processes, 4 GILs
```

### C Extensions

Some native libraries, such as NumPy, can release the GIL while doing heavy work in C, so threads may run in parallel there. This depends on the library. Do not assume all C extensions do it.

### Free-Threaded Python

PEP 703 lets CPython be built without the GIL ("free-threaded"). Python 3.13 shipped it as an experimental build (`python3.13t`), and 3.14 made it officially supported, but still not the default. The standard CPython you install today still has a GIL.

## GIL vs Async

The GIL decides which **thread** runs. Async decides which **coroutine** runs inside one thread. They work at different levels.

| | GIL | Async |
|---|---|---|
| Decides | Which thread runs Python | Which coroutine runs on the event-loop thread |
| Switches | About every 5 ms, or when a thread waits on I/O | Only at `await` |

Async runs one coroutine at a time because it has only one thread, not because of the GIL. The two only meet in one place: coroutines run only while their thread holds the GIL (see the animation above).

A common mistake is blocking inside `async def`:

```python
@app.get("/user")
async def get_user():
    time.sleep(2)      # blocking, not await
    return {"ok": True}
```

`time.sleep` releases the GIL, but the event loop still freezes for 2 seconds, because the code never reaches an `await`. Use `await asyncio.sleep(2)` instead.

## Cheat Sheet

### Interview Q&A

**Q: Can Python have multiple threads?**

Yes. The GIL only stops them from running Python bytecode in parallel.

**Q: Does the GIL mean a server can handle only one request at a time?**

No. I/O-bound servers can handle many requests concurrently, because waiting threads release the GIL.

**Q: Does async bypass the GIL?**

No. Async schedules coroutines on one thread, so there is nothing to bypass.

**Q: Will more threads speed up CPU-bound Python?**

No. Use multiple processes, or native code that releases the GIL.

**Q: Does the GIL make my code thread-safe?**

No. It only protects the interpreter. Use locks for your own shared variables.

**Q: Is `time.sleep` inside `async def` fine, since it releases the GIL?**

No. It still blocks the event loop. Use `await asyncio.sleep`.

### Decision Table

| Situation | Better tool |
|---|---|
| Many network/database waits | Async or threads |
| Blocking library in a web route | Thread pool |
| Many WebSocket connections | Async |
| Pure Python CPU-heavy computation | Multiple processes |
| CPU-heavy native library that releases GIL | Threads may help, verify |
