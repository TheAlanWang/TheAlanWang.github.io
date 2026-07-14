---
layout: layouts/post.njk
title: "Pub/Sub + Cloud Run: Async Pipeline"
description: A practical note on GCP Pub/Sub, Cloud Run, ack/retry semantics, DLQ, idempotent consumers, and the AWS SNS/SQS/Lambda mapping.
excerpt: A practical note on GCP Pub/Sub, Cloud Run, ack/retry semantics, DLQ, idempotent consumers, and the AWS SNS/SQS/Lambda mapping.
date: 2026-05-19
category: Cloud
subcategory: GCP
topic: Pub/Sub Async Pipeline
kind: Note
tags:
  - posts
image: /assets/sketches/pubsub-cloud-run-async-pipeline.svg
imageFit: contain
permalink: /posts/gcp-pubsub-cloud-run-async-pipeline/index.html
---

**Pub/Sub** is an **asynchronous messaging middleware**. It lets producers avoid calling consumers directly: producers publish work to a **Topic**, and a **Subscription** controls how that message is delivered to a **Consumer**.

The core shift is:

```text
System A -> Topic -> Subscription -> System B
```

This makes systems more **decoupled**, more resilient, and easier to scale. For a backend engineer, the important part is not memorizing one API. The important part is understanding **async architecture**, **retry semantics**, **idempotency**, **DLQ**, and **eventual consistency**.

![Pub/Sub and Cloud Run async pipeline overview](/assets/sketches/pubsub-cloud-run-async-pipeline.svg)

## RAG Pipeline Mental Model

A typical asynchronous RAG pipeline can be split like this:

```text
PDF Upload
    ↓
Chunk Function
    ↓ publish
Pub/Sub Topic
    ↓ push delivery
Vectorizer Cloud Run / Function
    ↓
Vertex AI Embedding
    ↓
Supabase pgvector
```

The responsibilities are:

| Component | Role |
| --- | --- |
| Chunk Function | Splits the PDF into chunks and creates vectorization tasks |
| Topic | Receives and stores messages temporarily |
| Subscription | Defines delivery mode, push/pull, retry, **DLQ**, and **ack deadline** |
| Vectorizer | Processes messages, calls Vertex AI, and writes to pgvector |
| pgvector | Stores embeddings for semantic retrieval |

## Topic, Subscription, Consumer

`Topic` is the message entry point. After a producer calls `publisher.publish(topic, data)`, it has handed the message to Pub/Sub. **The Topic itself does not run business logic**.

`Subscription` defines how messages are consumed, including who receives them, whether delivery is push or pull, and rules such as **ack deadline**, **retry policy**, and **DLQ**. One Topic can have multiple Subscriptions, so the same event can be consumed independently by multiple downstream systems.

`Consumer` is the service that actually does the work. In this example, the Vectorizer Consumer receives a chunk message, calls Vertex AI to generate an embedding, and writes the result into Supabase `pgvector`.

## Push vs Pull

In pull mode, the Consumer actively pulls messages:

```python
while True:
    msg = subscriber.pull()
```

The mental model is picking up a package yourself. The main benefit is that **the consumer controls pacing**, which is useful for complex workers. The cost is that you must maintain the polling loop and worker infrastructure.

In push mode, Pub/Sub sends an HTTP POST to Cloud Run or Cloud Functions:

```text
Pub/Sub -> HTTP POST -> Cloud Run
```

The mental model is delivery to your door. **Push is more serverless-friendly** because Cloud Run only needs to expose an endpoint, while Pub/Sub handles delivery.

## Ack, Ack Deadline, Retry

**Ack** means: "I processed this successfully."

In a Push Subscription:

| HTTP result | Pub/Sub interpretation |
| --- | --- |
| `2xx` | ack, message processed successfully |
| `4xx` / `5xx` / timeout | nack or no ack, message may be redelivered |

So a Cloud Run handler often has this basic shape:

```python
try:
    process()
    return "ok", 200
except Exception:
    raise
```

**`ack-deadline`** is the time window Pub/Sub waits for an ack. For example, `--ack-deadline=60` means the consumer must confirm within 60 seconds. If processing is too slow or the network breaks, Pub/Sub may assume the consumer failed and redeliver the message.

This leads to the most important production fact: Pub/Sub defaults to **`at-least-once delivery`**. A message is delivered at least once, but it may be delivered multiple times.

## Why Idempotency Matters

**Consumers must be idempotent** because duplicate delivery is normal, not a bug.

For example:

```sql
UPDATE documents
SET status = 'done'
WHERE id = 1;
```

Running this multiple times leaves the same final state. This is an **idempotent operation**.

But this operation is **not idempotent**:

```sql
UPDATE wallet
SET balance = balance + 100;
```

If the same message is processed twice, the amount is added twice.

A common duplicate-delivery scenario is:

1. the consumer already wrote to the database
2. the network failed before it returned `200`
3. Pub/Sub did not receive the ack
4. Pub/Sub redelivered the same message

Therefore, the application layer should use tools like **`event_id`**, **unique constraints**, **state machines**, **upserts**, or **deduplication tables** to make duplicate processing harmless.

## Delivery Guarantee vs Business Semantics

This relationship is critical: **delivery guarantee is not the same as business semantics**.

```text
Pub/Sub gives you: at-least-once delivery
                   it may deliver 1 time or N times
              ↓
Your code must be: idempotent
                   processing N times must equal processing 1 time
              ↓
Together:          end-to-end exactly-once business semantics
```

Pub/Sub can provide reliable delivery, but it **cannot automatically make your business code idempotent**. **Idempotency must be implemented in the application layer**.

The more precise statement is: **`at-least-once delivery + idempotent consumer = exactly-once business effect`**.

```text
at-least-once delivery + idempotent consumer
= exactly-once business effect
```

In other words, **the messaging layer may duplicate delivery, but the business effect must not be duplicated**.

## DLQ: Dead Letter Queue

**DLQ** is a poison-message isolation area. Some messages can never be processed, such as bad PDFs, malformed payloads, missing fields, or corrupted data.

Without a **DLQ**, Pub/Sub may keep retrying forever, wasting quota, creating noisy logs, and slowing down healthy work.

A typical production configuration is:

```bash
gcloud pubsub subscriptions create pdf-vectorizer-sub \
  --topic=pdf-chunks-topic \
  --push-endpoint=https://vectorizer.run.app \
  --ack-deadline=60 \
  --max-delivery-attempts=5 \
  --dead-letter-topic=pdf-chunks-dlq
```

The workflow is:

```text
normal message
    ↓
failure
    ↓
retry 5 times
    ↓
still fails
    ↓
move to DLQ
```

## Why Not Rely On Exactly Once

In production, the common choice is **`at-least-once + idempotent consumer`**, rather than relying only on message-system-level exactly-once.

The reason is that **exactly-once is more complex**, may reduce throughput, and often comes with more constraints. Even if the message system provides exactly-once delivery, the application still has to handle **idempotency** when writing to a database, calling external APIs, or updating business state.

The practical engineering rule is:

- the messaging system handles **reliable delivery and retries**
- the consumer handles **idempotent processing**
- **DLQ** isolates messages that keep failing
- monitoring catches **backlog, failure rate, retry storms, and DLQ growth**

## GCP And AWS Mapping

GCP and AWS solve the same class of cloud-native backend problems. The product names are different, but the architecture is similar.

| Concept | GCP | AWS |
| --- | --- | --- |
| Serverless compute | Cloud Run / Cloud Functions | Lambda / ECS Fargate / App Runner |
| Message queue / pub-sub | Pub/Sub | SNS + SQS |
| Object storage | Cloud Storage | S3 |
| Machine identity | Service Account | IAM Role |
| Secrets | Secret Manager | Secrets Manager / SSM |
| Logs | Cloud Logging | CloudWatch |

A common GCP flow is:

```text
Pub/Sub Topic -> Push Subscription -> Cloud Run
```

In AWS, the equivalent is often:

```text
SNS Topic -> SQS Queue -> Lambda / ECS Worker
```

Or:

```text
S3 Event -> SNS -> SQS -> Lambda
```

The difference is that GCP Pub/Sub combines **Topic and Subscription** more tightly, while AWS usually separates **fanout and queue buffering** into SNS + SQS. The underlying idea is the same: **the producer does not call the consumer directly**. It hands work to a messaging system, the consumer processes asynchronously, failures retry automatically, and poison messages go to a **DLQ**.

## Interview Takeaways

- Why Pub/Sub: **decoupling, async processing, higher throughput, and better reliability**.
- Why DLQ: **prevent poison messages from retrying forever** and protect quota, logs, and healthy work.
- Why consumers must be idempotent: **message duplication is normal** in distributed systems.
- How to get exactly-once business effect: the messaging system provides **`at-least-once delivery`**, while application code provides **`idempotency`**.
- What happens if **`ack-deadline` is too short**: slow requests may be misclassified as failures, causing duplicate processing.
- **Push vs Pull**: Push fits Cloud Run-style serverless endpoints; Pull fits workers that need their own pacing.
- The production model: **`at-least-once delivery + idempotent consumer + retry policy + DLQ + monitoring`**.
