---
layout: layouts/post.njk
title: "Python GIL: Why Multiple Threads Do Not Mean Parallel Python"
description: "A Python backend concurrency note explaining the Global Interpreter Lock, why only one thread can run Python bytecode at a time in one CPython process, and why this is separate from async/await."
excerpt: "The GIL means one CPython process can run only one Python-bytecode thread at a time. This is a threading issue, not an async/await issue."
date: 2026-05-12T16:00:00-07:00
category: Backend
subcategory: Concurrency
topic: Python Runtime
kind: Note
tags:
  - posts
image: /assets/notes/python-gil-threading-vs-async.svg
imageFit: contain
permalink: /posts/python-gil-threading-vs-async/index.html
---

The GIL is one of the most misunderstood parts of Python backend concurrency.

The short version:

```text
Inside one CPython process,
multiple threads can exist,
but only one thread can execute Python bytecode at a time.
```

That is a thread-level constraint. It is not the reason `async` code runs one coroutine at a time.

中文记忆：

```text
GIL 管的是“多线程谁能执行 Python bytecode”。
async/await 管的是“协程什么时候让出 event loop”。
它们不是同一层问题。
```

![Python GIL: Threads vs Async](/assets/notes/python-gil-threading-vs-async.svg)

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

## The Most Important Rule

Inside one CPython process:

```text
many threads can be alive
many threads can be waiting
but only one thread can be running Python bytecode
```

中文记忆：

```text
多线程不是不能创建。
是同一个 CPython 进程里，同一时刻只有一个线程能真正跑 Python bytecode。
```

That is why CPU-heavy Python code does not become faster just because you add more threads.

Example:

```python
def cpu_work():
    total = 0
    for i in range(50_000_000):
        total += i
    return total
```

Running this in two Python threads does not make two CPU cores execute Python bytecode in parallel inside the same process. The threads take turns holding the GIL.

## What the GIL Does Not Mean

The GIL does not mean:

```text
Python cannot do concurrency.
Python cannot have multiple threads.
Python async is caused by the GIL.
One Python process cannot handle multiple I/O requests.
```

Those are different claims.

The GIL specifically limits parallel execution of Python bytecode across threads in one CPython process.

## Why I/O Threads Still Work

Threads are still useful for I/O-bound work.

For example:

```text
call database
call external API
read file
wait for network
```

When a thread waits on I/O, it usually does not need to hold the GIL. The interpreter can let another thread run Python bytecode while the first thread is waiting.

That is why this distinction matters:

| Workload | Do threads help? | Why |
|---|---|---|
| I/O-bound | Often yes | Waiting threads can release the GIL |
| CPU-bound Python | Usually no | Threads compete for Python bytecode execution |

中文记忆：

```text
I/O-bound: 线程大部分时间在等，GIL 影响小。
CPU-bound: 线程都想跑 Python，GIL 影响大。
```

## Why Async Has Nothing to Do with Bypassing the GIL

`async` and `await` are about coroutine scheduling.

An async program usually has one event loop running on one thread:

```text
one process
└── one event-loop thread
    ├── coroutine A
    ├── coroutine B
    └── coroutine C
```

Only one coroutine runs at a time on that event-loop thread. A coroutine gives up control when it reaches an `await`.

That behavior is not caused by the GIL. It is caused by the event loop model.

```text
GIL:
  controls which OS thread can execute Python bytecode

async/await:
  controls when a coroutine yields back to the event loop
```

So this statement is wrong:

```text
Async runs one task at a time because of the GIL.
```

Better statement:

```text
Async runs one coroutine at a time because the event loop is single-threaded.
The GIL is about Python threads, not coroutine scheduling.
```

## Thread Switching vs Coroutine Switching

Threads are scheduled by the operating system.

```text
Thread switching = preemptive
The OS can interrupt a thread and run another one.
```

Coroutines are scheduled by the event loop.

```text
Coroutine switching = cooperative
A coroutine yields only at await.
```

This is why async code is easier to reason about in some I/O-heavy paths:

```python
async def handler():
    step_1()
    step_2()
    await call_database()
    step_3()
```

Between `step_1()` and `await call_database()`, another coroutine will not run unless this code explicitly awaits.

The GIL is not the mechanism doing that. The event loop is.

## Multiple Processes Bypass the GIL

The GIL is per process.

```text
process 1 -> its own GIL
process 2 -> its own GIL
process 3 -> its own GIL
```

That is why CPU-bound Python work usually needs multiple processes, not multiple threads.

Examples:

```text
multiprocessing
process pool
Uvicorn workers
Celery workers
separate service workers
```

For FastAPI/Uvicorn:

```bash
uvicorn app.main:app --workers 4
```

This starts multiple worker processes. Each worker has its own interpreter and its own GIL. That can use multiple CPU cores for Python bytecode execution.

But remember:

```text
workers are processes, not threads
```

## C Extensions Can Release the GIL

Some native extensions can release the GIL while doing heavy work outside the Python interpreter.

Examples often include numerical or data libraries when operating in native code:

```text
NumPy
pandas
some compression libraries
some crypto libraries
```

But this depends on the implementation. Do not assume all C extensions release the GIL.

The safe mental model:

```text
Pure Python CPU-heavy code: GIL serializes threads.
Native code may release the GIL, but verify the library.
```

## Common Interview Traps

| Wrong statement | Better answer |
|---|---|
| Python cannot have multiple threads | Python can have multiple threads; the GIL limits parallel Python bytecode execution |
| The GIL means only one request can be handled | I/O-bound servers can handle many concurrent requests |
| Async bypasses the GIL | Async is coroutine scheduling, not a GIL bypass |
| The GIL is why async tasks switch | Async tasks switch at `await` because of the event loop |
| Threads always improve performance | Threads help I/O-bound work, not CPU-heavy Python bytecode |
| More threads fix CPU-bound Python | Use processes or native code that releases the GIL |

## Decision Table

| Situation | Better tool |
|---|---|
| Many network/database waits | Async or threads |
| Blocking library in a web route | Thread pool |
| Many WebSocket connections | Async |
| Pure Python CPU-heavy computation | Multiple processes |
| CPU-heavy native library that releases GIL | Threads may help, verify |
| Need parallelism across cores for Python code | Processes |

## How to Explain It in an Interview

Use this:

> The GIL is a CPython interpreter lock. In one process, only one thread can execute Python bytecode at a time. That means Python threads do not give true parallelism for CPU-bound Python code. But threads can still help I/O-bound work because waiting on I/O usually releases the GIL. Async is a different concept: it is cooperative coroutine scheduling on an event loop, and coroutine switching happens at `await`, not because of the GIL. For CPU-bound Python work, use multiple processes or native code that releases the GIL.

Short version:

```text
GIL limits Python bytecode across threads.
async controls coroutine scheduling.
For CPU-bound Python, use processes.
For I/O-bound work, threads or async can both help.
```

中文版本：

```text
GIL 解决的是 CPython 解释器内部线程执行 bytecode 的互斥问题。
async/await 解决的是协程在 I/O 等待时如何让出 event loop。
CPU-bound Python 多线程会被 GIL 串行化。
I/O-bound 多线程影响小，因为等待 I/O 时通常会释放 GIL。
```
