---
layout: layouts/post.njk
title: A Practical AWS Migration Path for Mature Stateful Monoliths
description: A practical migration note for mature stateful monoliths, using a classic RuoYi-style Spring Boot system as the concrete example.
excerpt: A practical migration note for mature stateful monoliths, using a classic RuoYi-style Spring Boot system as the concrete example.
date: 2026-04-19
type: Note
topic: Cloud
tags:
  - posts
image: /assets/projects/aws-migration-stateful-monoliths.svg
imageFit: contain
permalink: /posts/aws-migration-for-stateful-monoliths/index.html
---

When people talk about moving a monolith to AWS, the conversation often jumps too quickly to microservices or a full cloud-native rewrite. For mature stateful systems, that is usually the wrong first move. The better question is not how to maximize architecture change, but how to reduce migration risk while improving operations step by step.

A classic RuoYi-style Spring Boot system is a good example of this problem: useful, mature, and operationally sticky. It tends to combine application logic, database state, local file handling, scheduled jobs, and deployment assumptions that were built around a small number of long-lived hosts.

![AWS Migration Path for Mature Stateful Monoliths](/assets/projects/aws-migration-stateful-monoliths.svg)

## AWS 7 Rs Migration Strategies

AWS often frames migration decisions through the 7 Rs. For a mature system, this is useful less as a checklist and more as a way to decide how much change the application actually needs.

| Strategy | Meaning | Typical Effort |
| --- | --- | --- |
| `Retire` | Remove the application because it is no longer needed | Lowest |
| `Retain` | Keep the system where it is for now and revisit later | Low |
| `Relocate` | Move the virtualization layer with minimal application change, such as VMware-based relocation | Low |
| `Rehost` | Lift-and-shift migration: move the application to AWS with minimal code or architecture changes | Low |
| `Replatform` | Move the system while replacing selected infrastructure with managed services such as `RDS`, `S3`, or `CloudWatch` | Medium |
| `Repurchase` | Replace the application with a SaaS product instead of continuing to run it yourself | High organizational change |
| `Refactor` | Redesign the system into a more cloud-native architecture | Highest |

That is a useful decision framework, but not every path is equally realistic for a mature stateful monolith. In practice, the most relevant choices are usually `Rehost`, `Replatform`, and selective `Refactor`.

## Why These Systems Are Hard To Move

The difficulty is not just that the application is a monolith. It is that the application is usually tied to operational state:

- a relational database that cannot be treated casually
- uploaded files living on local disk
- scheduled jobs and batch work running inside the same application process
- logging and recovery procedures built around a single host
- deployment and rollback habits that assume state and application live close together

That is why migration needs to be sequenced carefully. The problem is not only code structure. It is also data durability, operational assumptions, and rollback safety.

## A Classic RuoYi System As The Working Example

Classic RuoYi is a good representative case for this category. A typical deployment includes:

- a Spring Boot application
- MyBatis for data access
- Shiro for authentication and authorization
- MySQL as the main state store
- server-rendered admin pages
- local uploads, logs, scheduled jobs, and export workflows

Even if your exact stack is different, the migration lessons usually transfer well to other mature Java back-office systems with the same stateful characteristics.

## Which AWS Paths Actually Make Sense

### Rehost

Rehosting is the fastest path. You move the application to AWS with as few changes as possible, often by running the monolith on `EC2` and keeping most of the surrounding infrastructure familiar.

This can be a valid first step if speed matters most, but it mostly relocates the maintenance burden. It gets the system onto AWS, but it does not solve much of the operational fragility.

### Replatform

For most mature stateful monoliths, this is the strongest first move.

The application structure stays mostly intact, but the most operationally sensitive parts move to managed services:

- Spring Boot application on `EC2` or `ECS`
- MySQL on `RDS MySQL`
- uploaded files on `S3`
- logs and metrics in `CloudWatch`
- ingress, TLS, and DNS handled through `ALB`, `ACM`, and `Route 53`

This path keeps the migration realistic. It improves durability, backups, and operational clarity without forcing a full redesign.

### Selective Refactor

Refactoring still has a place, just not as the default first step.

Once the system is stable on AWS, some modules may justify separation:

- file processing
- export or report generation
- async notifications
- scheduled jobs or long-running background work

Those parts may later move to `SQS`, `Lambda`, or separate services on `ECS`, but only when the operational payoff is clear.

## What Should Move First

The migration order matters more than the architecture diagram.

My recommended sequence is:

1. stabilize deployment and rollback first
2. move the database to managed storage
3. move uploaded files off local disk
4. centralize logs, monitoring, and backups
5. only then evaluate whether any modules should be split out

That order is less exciting than a rewrite plan, but it is usually what makes the migration survivable.

## What Not To Refactor Too Early

The common mistake is treating AWS migration as a reason to immediately decompose the system. Mature stateful monoliths already carry enough migration risk through data, operations, and deployment. Adding distributed-system complexity too early usually makes the program harder, not better.

The better pattern is to migrate the monolith first, reduce operational risk, and then refactor only where the payoff is concrete. For a classic RuoYi-style system, that usually means replatform first and selective refactor later, not the other way around.
