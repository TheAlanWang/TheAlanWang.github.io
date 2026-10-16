---
layout: layouts/post.njk
title: Cache Stampede Outage
description: How a cache stampede on the YouDescribe homepage endpoint took the whole API down for about 9 hours, how I traced and reproduced it, and the single-flight guard that cut 40 concurrent rebuilds to 1.
excerpt: A 9-hour API outage caused by a cache stampede, and the single-flight guard that cut 40 concurrent rebuilds to 1.
date: 2026-10-15T12:00:00-07:00
category: Projects
subcategory: YouDescribe
topic: Concurrency
kind: Project
tags:
  - posts
permalink: /posts/cache-stampede-outage/index.html
---
## Overview
> **[What it is](#how-the-homepage-endpoint-works).** The YouDescribe homepage asks the API for a list of videos. The API keeps that list in an **in-memory cache** for 5 minutes, because building it is slow: a big MongoDB query with three joins, plus YouTube data for 50 videos.
>
> **[What happened](#the-outage-a-cache-stampede).** The whole API stopped answering for about **9 hours**, until the server was rebooted. CPU jumped from 1% to 70% and stayed there.
>
> **[How I found it](#the-outage-a-cache-stampede).** The last logs before the server went silent were **16 homepage cache misses** in the same second. That's a cache stampede: when the cache expired, every request that came in at that moment missed, and each one rebuilt the list on its own. Node runs the code on one thread, so all those rebuilds blocked it, and nothing else got through, not even health checks.
>
> **[Proof](#the-outage-a-cache-stampede).** I reproduced it on dev. 40 requests at once gave 40 rebuilds and one CPU core at 101%. 80 at once froze the dev server, just like production.
>
> **[The fix](#the-fix-single-flight-guard).** A single-flight guard. The first request that misses starts the rebuild and saves it in a map as a **[promise](#the-fix-single-flight-guard)**. Other requests for the same page wait on that promise instead of starting their own. In a [test](#verification-unit-tests), 30 requests at once ran the rebuild only once. It was merged to main as a hotfix the same day.
>
> **After.** I also set up **CloudWatch** alarms that email the team when CPU stays high or the health check fails, so next time the team knows in minutes, not hours.

## ① How the homepage endpoint works
`getHomePageVideos(page)` returns the video list for the homepage. Every visitor to the YouDescribe homepage calls it.

```
request ──→ check the cache (cacheKey = page number)
              ├─ hit  → return it (fast)
              └─ miss → rebuild (slow):
                    ① MongoDB aggregation: getAllVideos(page)
                    ② fetch YouTube metadata: getYoutubeDataFromCache()
                    ③ write it back to the cache, TTL 5 minutes
```

**Cache**: `src/utils/cacheService.ts`, an **in-process LRU cache** (`lru-cache`), not Redis
- `max: 500` entries, `maxSize: 50MB`, default `ttl: 5 minutes`
- `sizeCalculation` runs `JSON.stringify` on every value written to estimate its size, which costs CPU too

**Why a rebuild is expensive**: the order of the `getAllVideos` aggregation is
```
$lookup audio_descriptions → $lookup audio_clips → $lookup users → $match → $sort → $skip → $limit 50
```
**The 3 `$lookup`s happen before pagination**: it joins the whole videos collection with three tables first, then keeps only 50.

---

## ② The outage: a cache stampede
### Timeline
```
t=0      the cache is valid; every request hits; all is well
t=5min   the cache expires
t=5min+  N requests come in at the same moment
         → all N requests miss
         → each of the N requests starts a full rebuild (N aggregations + N YouTube calls)
         → Node's single-threaded event loop fills up with these rebuilds
         → every request waits in line: login, playback, wishlist, not just the homepage
         → the rebuilds take too long, the cache never gets written back → new requests keep missing → a vicious cycle
```
**Result: the whole production API stopped responding for about 9 hours**

### Why one endpoint took down the server
- Node runs JavaScript on **one thread**. I/O (database, network) is async, but **handling the results is not**: deserializing the aggregation results, building the JSON, and the `JSON.stringify` size estimate all run on that one thread
- N rebuilds return a lot of data at once → the main thread is busy processing it → every other request's callback waits behind it
- On top of that, MongoDB gets N heavy aggregations at once, so the database slows down too → each rebuild takes longer → more pile up
- So **one endpoint brought down the whole process**. A multi-threaded server like Java would run out of threads in its pool instead, with the same result

### Root-cause investigation
1. **Symptom**: in AWS, the production EC2's CPU **went from 1% to 70% and stayed there**, and the API stopped responding
	- 70% is enough to take the service down: Node runs JavaScript on **one core**, that core was full, and the other cores can't help
2. **Investigation**: digging in led to the homepage endpoint. When the 5-minute cache expired, the concurrent requests all missed, and each ran a full rebuild
	- The code logs `Cache miss for home page videos: <key>` on every miss. The last logs before the server stopped responding were **16 homepage cache misses in the same second**, which is direct evidence of a stampede
3. **Reproduction**: simulated the scenario on dev to confirm the root cause (see [Reproduction](#the-outage-a-cache-stampede))
4. **Fix and rollout**: wrote the single-flight guard and hotfixed it to main the same day

**Chain of reasoning**
```
In AWS, CPU goes from 1% to 70% and stays there; the API doesn't respond
  → what is using the CPU? check the process and the logs
  → the last logs before it went silent: 16 "Cache miss for home page videos" in the same second
  → hypothesis: after the cache expired, concurrent requests all rebuilt at once (stampede)
  → test: send 40 concurrent cold requests on dev → 40 rebuilds, CPU 101%, fully reproduced ✅
  → fix: single-flight → the rebuild runs only once
```
- Production CPU stuck at 70% and the "one core at 101%" reproduced on dev **are the same thing** (Node uses one core; when that core is full, the machine-wide reading stays around 70%). That's what shows the reproduction worked
- Why the CPU fills up: Node's one thread has to process dozens of rebuild results (deserializing, building JSON, the `JSON.stringify` size estimate). That is all CPU work, so it fills one core

### Reproduction
- On dev: **40 concurrent cold requests → 40 cache misses, one CPU core at 101%**
- At **80 concurrent requests, the dev server froze completely**, just like production
- A cold request is one sent while the cache is empty, so every request is sure to miss

## ③ The fix: single-flight guard
### Background: promises
A promise is a **placeholder** for the result of an async operation. When you call an async function, you get a promise right away, and the real result is filled in later. It has three states: pending (still running) → fulfilled (succeeded, has a value) or rejected (failed, has an error), and it can change only once.

**Example**: two requests share one promise
```ts
// Simulate a database query that takes 1 second
function slowQuery() {
  return new Promise((save) => {   // save: the "store the result" function the Promise gives you (usually named resolve)
    setTimeout(() => {
      save("videos");              // after 1 second: store "videos" in this Promise
    }, 1000);
  });
}

const work = slowQuery();          // get the Promise right away (pending); the query runs in the background

work.then((r) => console.log("A got", r));   // A waits on work; r = the stored "videos"
work.then((r) => console.log("B got", r));   // B waits on the same work
// After 1 second, both print: A got videos / B got videos
// slowQuery ran only once; both are waiting on the same result
```
**This is the core of single-flight**: put `work` in a Map, and later requests just `await` it instead of running the query again. If the query fails, everyone waiting on it gets the same error **at the same time**.

**Why store a promise, not a flag like `isBuilding = true`?** With a flag, later requests can only check back every so often to see if it's done (polling), which wastes CPU, and they can't tell if the other request failed. With a promise, they just `await` it, and the result or the error is delivered to them.

### Approach
**For each key, only one rebuild can run at a time. Other concurrent requests wait for that one's result.**
```
Before: request 1 → rebuild | request 2 → rebuild | request 3 → rebuild | … 40 times
After:  request 1 → rebuild ─────────────→ result
        request 2 ────→ waits on request 1's promise ─→ same result
        request 3 ────→ waits on request 1's promise ─→ same result
```

### Implementation
```ts
// Lines 33-36: in-process Map, key → the rebuild promise in progress
private inflightHomeVideos = new Map<string, Promise<any>>();

// 1) Check the cache; on a hit, return it
const cachedResult = await cacheService.get(cacheKey);
if (cachedResult) return cachedResult;

// 2) Is someone already rebuilding this key? Reuse their promise; don't start another rebuild
const existing = this.inflightHomeVideos.get(cacheKey);
if (existing) return existing;

// 3) I'm the first to miss: wrap the whole rebuild in a promise (async IIFE)
const work = (async () => {
  const videos = await this.getAllVideos(page);                         // expensive #1
  const youtubeData = await this.getYoutubeDataFromCache(youtubeIds, `home-${page}`); // expensive #2
  const combinedResponse = { videos, youtubeData: youtubeData.result };
  await cacheService.set(cacheKey, combinedResponse, 5 * 60 * 1000);
  return combinedResponse;
})();

// 4) Register first, then await; always delete in finally
this.inflightHomeVideos.set(cacheKey, work);
try {
  return await work;
} catch (error) {
  logger.error(`Error fetching home page videos: ${error}`);
  throw error;
} finally {
  this.inflightHomeVideos.delete(cacheKey);
}
```

### Walkthrough: three concurrent requests
**cacheKey is computed from the page number**: `` `home_videos_page_${page}` ``. Nobody "creates" it. Requests for the same page compute the same key.
`inflightHomeVideos` is **the name of the Map**. The key is the page string; the value is the rebuild promise in progress.

```
A comes in (page 1)
  ① key = home_videos_page_1
  ② check the cache → miss
  ③ inflightHomeVideos.get(key) → nothing
  ④ I'm first: start the rebuild, get promise work
  ⑤ inflightHomeVideos.set(key, work)      ← only A writes to the Map
  ⑥ await work

B comes in (page 1, A isn't done yet)
  ① key = home_videos_page_1              ← same as A
  ② check the cache → miss (A hasn't written it back yet)
  ③ inflightHomeVideos.get(key) → found: A's work
  ④ return work                            ← no Map write, no rebuild; just wait for A's result

A's rebuild finishes
  → writes to the cache → work becomes fulfilled → A and B get the same result at the same time
  → finally: inflightHomeVideos.delete(key)

C comes in later
  ② check the cache → hit, return it (fast path; never touches the Map)
```
- **Whether someone is rebuilding is decided by whether the key is in the Map**: if it is, a rebuild is running; if not, nobody is rebuilding
- A request for page 2 computes a different key, so each page rebuilds on its own without blocking the other
- On failure: work becomes rejected, and A and B both get the same error; finally still deletes the key, so the next request rebuilds

### Design details
| Detail | Why |
|---|---|
| Store the **promise**, not the result | A promise stands for "a result that isn't done yet". Many callers can `await` the same promise and all get the same value when it finishes |
| **No race** between steps 2 and 4 | There's no `await` between `get` and `set`, so single-threaded JS runs them in one go and no other request can cut in. **Here the single thread is actually an advantage**: no lock needed |
| Wrap the rebuild in an **async IIFE** | You get a promise right away and can put it in the Map immediately, so later requests can find it |
| **Delete in `finally`** | ① Success: the cache is written, so later requests use the cache; ② failure: without the delete, every later request would get the failed promise and the key would be **broken for good**. After the delete, the next request tries again |
| Keys split by **page number** | Rebuilds for different pages don't block each other |
| **No change** to the query logic | Only concurrency protection was added, so the risk is as small as it gets |

## ④ Verification: unit tests
**Test 1: concurrent requests are merged**
- Mock the cache so it always misses; `getAllVideos` simulates a slow query with a 50ms delay
- Send **30 requests at once** with `Promise.all`
- Assert: `getAllVideos` is **called only once**, and all 30 requests get exactly the same result

**Test 2: the lock is released after a failure**
- The first rebuild throws `boom`; the second returns normally
- Assert: the first request fails; **the second request rebuilds and succeeds**; `getAllVideos` is called 2 times in total
- This shows the delete in `finally` works; without it, the second request would get the failed promise

## ⑤ Future improvements
| Option | How | Notes |
|---|---|---|
| **Redis + distributed lock** | Share the cache in Redis; on a miss, grab a lock with `SET NX PX`; whoever gets it rebuilds | Only one rebuild across all backend servers; adds a service, and the lock needs an expiry |
| **stale-while-revalidate** | After expiry, return the old data first and rebuild in the background | Still needs single-flight; the difference is that nobody has to wait |
| **Refresh ahead of time** | A scheduled job rebuilds before the cache expires | The cache is normally never empty, so requests don't trigger rebuilds; right after a restart, single-flight still covers it |
| **Query and index tuning** | Start from the descriptions table, pick the 50 videos first, then join; add a `{status: 1, updated_at: -1}` index on the descriptions table | Makes the rebuild itself cheaper; you can't simply "paginate first, then join", because filtering and sorting need the descriptions data |
| **App-level monitoring** | Add metrics and alerts for cache hit rate and event loop lag | The current CloudWatch alarms only watch server CPU and the health check |

**Why single-flight at the time**:
- Production was down, so we needed the **smallest, safest** fix
- It runs as a single instance, so an in-process fix is enough
- No change to the query logic and no new dependency, so it could be merged as a hotfix the same day

---

## Follow-up questions
1. Tell me about this outage. (STAR)
	- **Situation**
		- The YouDescribe production API stopped responding, all of it, not just one page
		- It stayed down for about 9 hours, until the server was rebooted
	- **Task**
		- Find out why one server stopped answering everything, and fix it
	- **Action**
		- **Symptom**: in AWS, CPU went from 1% to 70% and stayed there. Node runs JavaScript on one core, so 70% machine-wide meant that one core was full
		- **Evidence**: the last logs before the server went silent were 16 homepage cache misses in the same second
		- **Cause**: the homepage cached its video list for 5 minutes with no concurrency protection. When it expired, every request missed and rebuilt on its own, and each rebuild was expensive. That's a cache stampede
		- **Reproduction**: on dev, 40 concurrent cold requests gave 40 rebuilds and one core at 101%; 80 froze the dev server, just like production
		- **Fix**: a single-flight guard. A Map from cache key → the rebuild promise in progress; the first miss starts the rebuild, later requests `await` the same promise; the key is deleted in `finally`, so a failed rebuild can't break that key
		- **Tests**: 30 concurrent requests ran the rebuild only once; after a failed rebuild, the next request rebuilt and succeeded
	- **Result**
		- Rebuilds went from 40 to exactly 1; merged and hotfixed to production the same day
		- I also set up CloudWatch alarms on CPU and the health check, so the team now finds out in minutes, not hours
2. How can **one endpoint** take down the whole service?
	- Node is single-threaded. The rebuilds filled the event loop and the database, so every request waited in line; the slower the rebuilds, the more piled up, a vicious cycle
3. How do you implement **single-flight**?
	- A Map from key → the promise in progress; concurrent requests reuse that promise; delete it in `finally`
4. Is there a **race** between the Map's get and set?
	- No. There's no `await` between them, so single-threaded JS runs them back to back
5. Why must it be **`finally`**?
	- If a rebuild fails and the key isn't deleted, that key returns the failed promise forever
6. Does single-flight still help with **multiple instances**?
	- Each instance still rebuilds only once. N instances means at most N rebuilds, far better than unlimited; to get exactly 1 across all of them, you need a distributed lock
7. How did you **verify** the fix?
	- Two unit tests: 30 concurrent requests rebuild only once; the lock is released after a failure. Plus a before/after comparison of the reproduction on dev
8. Why is the **rebuild** so slow?
	- The 3 `$lookup`s run before pagination, so it joins the whole database before keeping 50
	- You can't simply paginate first, because filtering and sorting need the joined data; instead, start from the descriptions table, pick the 50 videos first, and run the heavy joins only on them, or store redundant fields on videos
9. What other **options** are there?
	- Three kinds: stop everyone rebuilding at once (single-flight, distributed lock), keep the cache from going empty (stale-while-revalidate, refresh ahead of time), make the rebuild cheaper (start from the descriptions table, indexes, redundant fields), plus monitoring (see [⑤ Future improvements](#future-improvements))
10. Why did it last **9 hours**?
	- There were no alerts, so the team didn't know the service was down; and traffic kept coming, so the rebuilds never got written back to the cache, and it couldn't recover on its own
	- **Afterward I set up CloudWatch alarms**: when CPU stays high or the health check fails, they email the team, so it's caught within minutes

## References
- [PR #111](https://github.com/youdescribe-sfsu/YouDescribeX-api/pull/111): single-flight guard for `getHomePageVideos`, merged to `dev` (2026-06-25)
- [PR #112](https://github.com/youdescribe-sfsu/YouDescribeX-api/pull/112): the same fix as a hotfix to `main` (2026-06-25)
- Related: [PR #142](https://github.com/youdescribe-sfsu/YouDescribeX-api/pull/142): health monitor for the **AI service** (2026-08-27), separate from the API outage
