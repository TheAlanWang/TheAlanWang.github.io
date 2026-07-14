---
layout: layouts/post.njk
title: Python Backend Concurrency Model
description: "A Python backend concurrency note covering processes, threads, coroutines, sync and async execution, the GIL, and I/O-bound versus CPU-bound workload choices."
excerpt: "A Python backend concurrency cheat sheet: processes, threads, coroutines, sync versus async, the GIL, and how to choose between threads, async, and processes."
date: 2026-05-08T12:00:00-07:00
category: Knowledge
subcategory: Backend
topic: Concurrency
kind: Note
tags:
  - posts
image: /assets/notes/python-backend-concurrency-model.svg
imageFit: contain
permalink: /posts/python-backend-concurrency-model/index.html
---
This note summarizes the general concurrency model used in Python backend systems: ownership of terms, execution units, sync versus async execution, the GIL, and how to reason about I/O-bound versus CPU-bound workloads. For FastAPI-specific behavior, read [FastAPI Concurrency Implementation](/posts/fastapi-concurrency-implementation/).

![Python Backend Concurrency Model](/assets/notes/python-backend-concurrency-model.svg)

## 0. Terms and Ownership

### OS-level concepts

- Process and thread
- Sync / async execution
- I/O-bound versus CPU-bound work

### Cross-language concepts

- Coroutine
- `async` / `await` syntax

### CPython-specific concept

- GIL, the Global Interpreter Lock
- Java, Go, C#, Rust, and JavaScript do not have this concept

| Term | English | Created by |
| --- | --- | --- |
| Process | Process | Operating system |
| Thread | Thread | Operating system |
| Coroutine | Coroutine | Python runtime, scheduled by the event loop |

## 1. Three Execution Units: Process / Thread / Coroutine

Containment model:

```text
Process
├── Main thread / event-loop thread
│     └── Coroutine x N (async def runs here)
└── Worker thread pool, expands as needed
      └── Thread x N (def runs here, commonly one thread per blocking request)
```

Comparison:

| Dimension | Process | Thread | Coroutine |
| --- | --- | --- | --- |
| Created by | OS | OS | Python |
| Memory per unit | MB-level | about 8 MB stack | a few KB |
| Switching cost | Highest | microseconds, OS kernel | nanoseconds, user space |
| Memory sharing | Not shared | Shared | Shared |
| GIL relationship | Each process has its own GIL | Threads share one GIL | No GIL contention on one thread |
| True parallelism | Yes | Not for Python bytecode under the GIL | No, single-threaded |

The switching mechanism is the key difference:

- Thread switching is preemptive. The OS may interrupt a thread at almost any instruction boundary, which makes race conditions easier to create.
- Coroutine switching is cooperative. A coroutine gives up control only at an `await`. Synchronous code between two `await` points is not switched away by the coroutine scheduler.

## 2. Sync vs Async

Sync means the function occupies a thread from start to `return`. When it hits I/O, the operating system parks that thread.

Async means the coroutine voluntarily yields at I/O via `await`. The event loop can then run another coroutine on the same thread.

```python
# Sync
def get_post():
    return db.query(...).all()

# Async
async def get_post():
    return await db.execute(...)
```

Two parallel tracks:

```text
Request arrives -> inspect route signature
                  |
      def         |   async def
       ↓          |      ↓
   thread pool    |   event loop
  one blocking    |  shared by many
 thread per req   |   coroutines
```

Core conclusions:

- A `def` route enters the thread pool and does not create a coroutine.
- An `async def` route enters the event loop and does not enter the thread pool.
- One request follows one track. The two tracks are parallel, not nested.

Both models try to avoid wasting CPU while waiting on I/O. The difference is where suspension and wakeup happen:

- Threads: the OS kernel parks and wakes the thread.
- Coroutines: the event loop parks and resumes the coroutine.

## 3. GIL: Global Interpreter Lock

The GIL is a CPython interpreter-level lock. Inside one process, only one thread can execute Python bytecode at a time.

For a focused explanation of why this is a threading issue rather than an `async` issue, read [Python GIL: Why Multiple Threads Do Not Mean Parallel Python](/posts/python-gil-threading-vs-async/).

| What the thread is doing | Needs the GIL? |
| --- | --- |
| Executing Python bytecode | Yes, mutually exclusive |
| Waiting on I/O such as DB, network, or files | Usually released |
| Calling a C extension such as NumPy | May be released, depends on the implementation |

How the GIL affects common scenarios:

| Scenario | Impact | Reason |
| --- | --- | --- |
| Single-threaded program | None | No contention |
| Multiple threads doing I/O | Almost none | Most threads are waiting, not running bytecode |
| Multiple threads doing CPU-heavy Python work | Severe serialization | Threads compete for bytecode execution |
| One event loop with many coroutines | None | It is already one thread |
| Multiple processes | None | Each process has its own GIL |

Who has a GIL:

- CPython, the Python implementation used most often, has the GIL.
- PyPy also has a GIL.
- Jython on the JVM and IronPython on .NET do not.
- Java, Go, C#, Rust, and JavaScript do not have this concept.
- Python 3.13+ includes an experimental no-GIL mode based on PEP 703.

Ways around the GIL:

- Multiple processes: `multiprocessing` or `uvicorn --workers N`; each process has an independent GIL.
- C extensions: native code may explicitly release the GIL, which is common in NumPy and pandas for large array operations.
- Future no-GIL Python builds.

Common misconceptions:

| Claim | Correct? |
| --- | --- |
| "The GIL is why coroutines run one at a time." | No. That is because the event loop is single-threaded. |
| "Python threads are useless." | No. Threads are useful for I/O-bound work. |
| "Python threads do not speed up CPU-heavy Python code." | Yes, generally correct under CPython. |
| "The GIL is part of the Python language design." | No. It is a CPython implementation detail. |

## 4. I/O-bound vs CPU-bound

I/O-bound work spends most of its time waiting on external resources: databases, network calls, disk, or external APIs.

CPU-bound work spends most of its time computing in memory: encryption, compression, image processing, or numerical computation.

How to diagnose:

- CPU is idle, for example below 30%, but the program is slow: likely I/O-bound or blocked on locks.
- CPU is near 100% for a sustained period: likely CPU-bound.

| Dimension | I/O-bound | CPU-bound |
| --- | --- | --- |
| Bottleneck | Waiting time | Compute time |
| Threads help? | Yes, waiting threads yield CPU | Usually no, Python bytecode is serialized by the GIL |
| Coroutines help? | Yes, `await` yields during I/O | No, pure computation has no yield point |
| Processes help? | Yes, but overhead can be high | Yes, this gives true parallelism |

Decision tree:

```text
What is the bottleneck?
|
├─ I/O-bound
|   ├─ Small concurrency, under dozens  -> sync + thread pool
|   ├─ Large concurrency, thousands     -> async coroutines
|   └─ Long-lived connections           -> async coroutines
|      such as WebSocket or SSE
|
└─ CPU-bound
    └─ multiple processes:
       multiprocessing or worker count close to CPU core count
```

Why async does not save CPU-bound workloads:

`await` means "I am waiting on I/O; let someone else use the CPU." A CPU-bound task is not waiting. The CPU is busy the whole time, so there is no natural point to yield. Even if you force coroutine switching, total computation does not shrink. If one CPU core can perform X operations per second, splitting the work across 100 coroutines still gives X operations per second. To speed it up, multiple cores must compute at the same time, which means multiple processes.

## 5. Quick Insights

"Only one thing runs at a time" can mean different things:

- Multiple threads executing Python bytecode in one process: limited by the GIL.
- Multiple coroutines in one thread: limited by the physical fact that one thread executes one thing at a time. JavaScript has the same property.

The selling point of coroutines is not true parallelism. It is low cost:

- Threads can also handle concurrent I/O.
- A thread may cost megabytes of stack memory.
- A coroutine usually costs only a few KB.
- Thousands or tens of thousands of concurrent waiting tasks are much better suited to coroutines than threads.

`async def` is not a stronger version of `def`; it is a different execution track:

- Calling blocking sync functions such as `requests.get()` or `time.sleep()` inside `async def` blocks the entire event loop.
- This can perform worse than plain synchronous code.

Diagnosis cheat sheet:

- CPU full + slow: CPU-bound, use multiple processes.
- CPU idle + slow: I/O-bound or lock contention, increase concurrency with more threads or async.

Production heuristics:

- CPU-bound: worker count close to CPU core count.
- I/O-bound: 2-4 workers are often enough; more may only waste memory.
- Inside one worker: a thread pool commonly defaults around 40 threads, while coroutine count is usually not the first memory bottleneck.
