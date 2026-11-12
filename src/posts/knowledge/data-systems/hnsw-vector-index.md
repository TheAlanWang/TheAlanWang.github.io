---
layout: layouts/post.njk
title: HNSW (Hierarchical Navigable Small World)
description: "HNSW (Hierarchical Navigable Small World) in short: a layered graph searched from the top down, the three parameters that matter (M, ef_construction, ef_search), and how it compares with IVFFlat."
excerpt: "HNSW puts vectors into a layered graph and searches it from the sparse top layer down. It is much faster than checking every vector, but it can stop at a local nearest result."
date: 2026-11-11T16:00:00-08:00
category: Knowledge
subcategory: Data Systems
topic: Deep Dives
kind: Note
tags:
  - posts
permalink: /posts/hnsw-vector-index/index.html
---
## Overview

> HNSW is an **algorithm** for approximate nearest neighbor (**ANN**) search.
> It puts the vectors into several layers. The top layer is **sparse**, and the lower layers are more **dense**.
> We start from the top, and in each layer we move to a closer point. Then we go down to the next layer and do the same thing.
> It is much faster than checking every vector, but sometimes it only finds a **local nearest result**.

**Layers**: each vector draws a random level when it is inserted. Higher layers have fewer vectors, and nobody sets the number of layers by hand.

**Local nearest result**: the search only moves to a neighbor that is closer to the query, so it can stop at a point whose neighbors are all farther away, even if a closer point exists beyond them (a **local optimum**).

## Parameters

- **M** controls the number of neighbor **connections** in the graph. (default 16)
- **ef_construction** controls the search **width** during index building, affecting index quality and build time. (default 64)
- **ef_search** controls the search width during **querying**, trading off recall against latency. (default 40)

M and ef_construction are fixed when the index is built. ef_search can be changed for each query (`SET hnsw.ef_search = 100`) without rebuilding the index.

## In pgvector

```sql
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

SET hnsw.ef_search = 100;

SELECT id FROM chunks ORDER BY embedding <=> $1 LIMIT 10;
```

- The query must be `ORDER BY distance LIMIT k`, and the operator must match the operator class (`vector_cosine_ops` goes with `<=>`). Otherwise Postgres falls back to a full scan.
- `WHERE` filters run after the nearest neighbors are found, so you can get fewer than k rows.

## Q&A

**Q: Why does a larger ef_search give higher recall? What does it cost?**

A: Increasing **ef_search** improves recall by exploring more candidates, but increases query latency and computational cost. The number of returned results is still controlled by Top K.

**Q: HNSW vs IVFFlat?**

A: Both are **ANN** algorithms. HNSW uses a hierarchical graph, while IVFFlat partitions vectors into clusters. HNSW generally provides better recall and query latency, but requires more memory and takes longer to build.

| | HNSW | IVFFlat |
|---|---|---|
| Structure | a **hierarchical** graph | **partitions** vectors into clusters |
| Strength | better recall and query latency | faster to build, less memory |
| Cost | more memory, takes longer to build | needs data to train the clusters; recall depends on `probes` |

## Try It

The same 220 points drawn on each layer. Click a layer to place a query and watch the search go from the top layer down. Set `ef_search` to 1 and try a few spots: sometimes it stops at a local optimum. Raise it and the same spot finds the true nearest point.

<div class="hnsw-demo" data-hnsw-demo></div>
<script src="/assets/notes/hnsw-demo.js" defer></script>
