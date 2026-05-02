---
layout: layouts/post.njk
title: AWS S3 Object Backup and Delayed Cleanup System
description: An event-driven AWS backup system that creates timestamped S3 copies, tracks lifecycle metadata in DynamoDB, and removes stale backups through a scheduled cleanup path.
excerpt: An event-driven AWS backup system that creates timestamped S3 copies, tracks lifecycle metadata in DynamoDB, and removes stale backups through a scheduled cleanup path.
date: 2026-03-30
type: Project
topic: Cloud
tags:
  - posts
image: /assets/projects/object-backup-system-architecture.svg
imageFit: contain
permalink: /posts/aws-s3-object-backup-and-delayed-cleanup-system/index.html
---
This project is a compact event-driven backup system built on AWS. It listens to S3 object events, creates timestamped backups, stores lifecycle metadata in DynamoDB, and removes stale copies through a scheduled cleanup workflow instead of deleting them immediately.

![AWS S3 Object Backup and Delayed Cleanup System architecture](/assets/projects/object-backup-system-architecture.svg)

## What It Covers

- event-driven replication from a source bucket to a destination bucket
- metadata-driven lifecycle management in DynamoDB
- delayed cleanup with EventBridge instead of immediate destructive deletion
- explicit query patterns for backup ownership and stale-copy removal

What I like about this project is that it shows more than service familiarity. The harder design problem is managing object lifecycle clearly after source files change or disappear.
