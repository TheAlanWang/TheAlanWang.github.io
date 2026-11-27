---
layout: layouts/post.njk
title: "事务与 ACID"
description: 数据库事务的四个承诺：ACID 每个字母是什么意思，以及为什么很多非关系型数据库承诺得更少。
excerpt: ACID 每个字母承诺了什么，以及为什么很多非关系型数据库承诺得更少。
date: 2026-11-27T12:00:00-08:00
category: Knowledge
subcategory: Data Systems
topic: Database Basics
kind: Note
tags:
  - posts
permalink: /posts/transactions-and-acid/zh/index.html
lang: zh
eleventyExcludeFromCollections: true
---
## 概览

> **事务**是一组写操作，**要么一起成功，要么一起失败**。ACID 描述的是事务的承诺。
> - **Atomicity**：所有步骤一起成功，或者都不做。
> - **Consistency**：数据始终符合规则，它更像一个**目标**：数据库负责检查**约束**，业务规则靠**应用代码**保证。
> - **Isolation**：事务提交之前，别的事务看不到它**做了一半的改动**。
> - **Durability**：一旦提交，数据**宕机也不会丢**。

## 事务

**事务**（transaction）是一组写操作，要么一起成功，要么一起失败；**ACID** 是事务的四个承诺。比如从账户 A 转 100 美元到账户 B：

```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 'A';
UPDATE accounts SET balance = balance + 100 WHERE id = 'B';
COMMIT;
```

### Commit 和 Rollback

一个事务最后只会执行两条命令中的一条：`COMMIT` 保留从 `BEGIN` 开始的所有写入，`ROLLBACK` 撤销从 `BEGIN` 开始的所有写入。发哪一条由后端决定：

```python
try:
    conn.execute("BEGIN")
    conn.execute("UPDATE accounts SET balance = balance - 100 WHERE id = 'A'")
    conn.execute("UPDATE accounts SET balance = balance + 100 WHERE id = 'B'")
    conn.execute("COMMIT")
except Exception:              # 数据库报错，或者后端自己检查没通过
    conn.execute("ROLLBACK")
```

- 第一个 `UPDATE` 成功、第二个失败时，`ROLLBACK` 会撤销第一个。失败的那个本来就没留下任何改动。
- 在 `COMMIT` 之前，所有写入都是暂时的：别的连接看不到，宕机后也会被撤销。

框架一般会把这个模式包好，比如 Spring 的 `@Transactional`、Django 的 `transaction.atomic()`：函数正常返回就提交，抛异常就回滚。

## 四个字母

| | 含义 | 没有它，转账会怎样 |
|---|---|---|
| **Atomicity**（原子性） | 所有步骤要么都成功，要么都不做 | 第一个 `UPDATE` 之后宕机：A 少了 100，B 什么也没收到 |
| **Consistency**（一致性） | 数据始终符合规则 | A 的余额变成负数，而银行不允许 |
| **Isolation**（隔离性） | 并发的事务看不到彼此做了一半的改动 | 一个统计所有余额的查询正好在两个 `UPDATE` 之间执行，发现少了 100 |
| **Durability**（持久性） | 一旦提交，宕机也不会丢 | `COMMIT` 刚返回服务器就宕机，转账没了 |

面试常问的两点：

- **Consistency 和另外三个不一样。** Atomicity、Isolation、Durability 是数据库提供的机制，Consistency 是要达到的目标。数据库会检查 `CHECK (balance >= 0)` 这类约束，但"转账不能改变钱的总数"这种规则要靠应用代码保证。
- **ACID 的 C 不是 CAP 的 C。** CAP 里的一致性指每次读取都返回最新的写入，不管是哪个副本响应；ACID 里的一致性指数据符合规则。

## 为什么很多非关系型数据库承诺得更少

真正的分界线是**一台机器还是多台机器**，不是关系型还是非关系型。单机上做 ACID 很便宜；跨机器时，一个事务要所有相关机器都同意才能提交（两阶段提交），这需要额外的网络往返，而且只要有一台机器没响应，事务就会卡住。

- **关系型数据库默认是单机**，所以分片之前，每个事务都是完整的 ACID。分片之后，它们面临同样的成本：只碰一个分片的事务仍然是 ACID，跨分片的事务就需要两阶段提交，所以团队会选一个能把相关数据放在一起的分片键（比如一个用户的所有订单都在同一个分片上）。读副本不算：它们复制的是全部数据，所有写入仍然只进一个主库。
- **很多非关系型数据库一开始就是分片的**，所以它们的保证围绕单个分片来设计。它们的数据模型也帮了忙：一个 MongoDB 文档可以装下一个订单和它的所有订单项，保存订单就是一次原子写入。

所以它们很多一开始**只保证单个 key、单个文档或单个分区内**的原子性，没有 `BEGIN … COMMIT` 这样的东西。后来大多加上了多记录事务，但形式各不相同，也都有限制：

| 数据库 | 事务写法 | 限制 |
|---|---|---|
| MongoDB | `startTransaction()` … `commitTransaction()` / `abortTransaction()` | 4.0 起支持 replica set（所有数据都在一个主节点上），4.2 起支持跨分片。官方仍建议把相关数据放进一个文档 |
| DynamoDB | 一次 `TransactWriteItems` 请求带上所有写操作 | 没有单独的 begin 和 commit 两步；最多 100 个操作，只限同一个区域 |
| Redis | `MULTI` … `EXEC` | 不支持回滚：某条命令运行时失败，其他命令照样生效 |

所以 ACID 是事务的性质，不是关系模型的专利。能拿到多少，要看具体的数据库。
