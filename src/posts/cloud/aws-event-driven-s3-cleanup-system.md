---
layout: layouts/post.njk
title: AWS Event-Driven S3 Cleanup System
description: A serverless workflow that tracks S3 bucket size over time, triggers cleanup when thresholds are reached, and generates a final plot from workflow history.
excerpt: A serverless workflow that tracks S3 bucket size over time, triggers cleanup when thresholds are reached, and generates a final plot from workflow history.
date: 2026-03-29
category: Cloud
subcategory: AWS
kind: Project
tags:
  - posts
image: /assets/projects/aws-cleanup-architecture.svg
imageFit: contain
permalink: /posts/aws-event-driven-s3-cleanup-system/index.html
---
This project is an event-driven serverless system that monitors bucket growth in S3, removes the largest object when a threshold is crossed, and generates a final plot showing how total bucket size changes over time.

![AWS Event-Driven S3 Cleanup System architecture](/assets/projects/aws-cleanup-architecture.svg)

## What It Covers

- S3 events fanned out through SNS and SQS
- state tracking in DynamoDB
- CloudWatch-based monitoring and alarm-driven cleanup
- a plotting step that turns workflow history into a visual output

The useful part of this project is the combination of asynchronous event flow, state tracking, and monitoring-driven remediation in one small but realistic system.
