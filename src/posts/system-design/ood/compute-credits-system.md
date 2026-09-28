---
layout: layouts/post.njk
title: Compute Credits System
description: A four-level OOD coding question for a cloud compute credits system, covering balances, transaction ranking, pending transfers with expiration, workspace merges, and historical balance queries.
excerpt: A four-level OOD coding question covering balances, transaction ranking, pending transfers with expiration, workspace merges, and historical balance queries.
date: 2026-09-27T12:00:00-07:00
category: System Design
subcategory: OOD
topic: OOD Questions
kind: Note
tags:
  - posts
permalink: /posts/compute-credits-system/index.html
---

## Question

这道题要求实现一个云计算 credits 管理系统，分成 4 个 Level。

### Level 1

Level 1 需要实现三个基础功能：

```python
create_workspace(timestamp, workspace_id) -> bool
top_up(timestamp, workspace_id, amount) -> int | None
consume(timestamp, workspace_id, amount) -> int | None
```

- `create_workspace`：创建一个新的 workspace。已经存在则 `False`；否则余额设为 0，返回 `True`。
- `top_up`：给 workspace 增加 credits。不存在则 `None`；否则增加余额并返回新余额。
- `consume`：消费 credits。workspace 不存在或余额不足时返回 `None`；否则扣款并返回新余额。

### Level 2

Level 2 增加：`top_consumers(timestamp, n) -> list[str]`。这里排的不是当前余额，也不是单纯充值金额，而是 workspace 的 **历史成功交易总额**。例如：

```text
A:
top_up 1000
consume 200
```

余额：`1000 - 200 = 800`。交易总额：`1000 + 200 = 1200`。所以：

```text
balance = 800
transactions = 1200
```

### Level 3

Level 3 增加 workspace 之间的 credits transfer：

```python
transfer_credits(timestamp, source_workspace_id, target_workspace_id, amount) -> str | None
accept_credits(timestamp, workspace_id, transfer_id) -> bool
```

关键机制：

> transfer 不是立即到账，而是先冻结，等 target 接受。

### Level 4
Level 4 增加：
```python
merge_workspaces(timestamp, workspace_id_1, workspace_id_2) -> bool
get_credits(timestamp, workspace_id, time_at) -> int | None
```

#### `merge_workspaces` 题目含义

`merge_workspaces(timestamp, workspace_id_1, workspace_id_2)`，表示把 `workspace_id_2` 合并进 `workspace_id_1`。例如：

```text
A balance = 1000
B balance = 500
```

merge(A, B) 后：
```text
A = 1500
B = 不存在
```

## 数据结构

核心对象是 `workspace`。每个 workspace 有：当前余额、历史累计交易额、transfer 状态、历史余额记录。推荐的数据结构：

```python
self.workspaces = {}      # 当前余额
self.transactions = {}    # 历史累计交易额
self.transfers = {}       # transfer 信息
self.transfer_no = 0      # transfer ID 编号器
self.history = {}         # 历史余额
```

可以理解成：

```text
workspaces     = 现在有多少钱
transactions   = 历史上一共发生了多少交易金额
transfers      = pending / accepted / expired 的转账
history        = 过去每个时间点余额是多少
```

## Level 1 做法

Level 1 只需要一个 dictionary：`self.workspaces = {}`。示例：

```python
{
    "workspace1": 100,
    "workspace2": 250
}
```

实现：

```python
def __init__(self):
    self.workspaces = {}

def create_workspace(self, timestamp, workspace_id):
    if workspace_id in self.workspaces:
        return False
    self.workspaces[workspace_id] = 0
    return True

def top_up(self, timestamp, workspace_id, amount):
    if workspace_id not in self.workspaces:
        return None
    self.workspaces[workspace_id] += amount
    return self.workspaces[workspace_id]

def consume(self, timestamp, workspace_id, amount):
    if workspace_id not in self.workspaces:
        return None
    if self.workspaces[workspace_id] < amount:
        return None
    self.workspaces[workspace_id] -= amount
    return self.workspaces[workspace_id]
```

### Level 1 常见错误

如果直接：`self.workspaces[workspace_id] -= amount`，但不检查余额，就可能出现负数。例如余额 1000，消费 1001，会变成 -1。正确做法：

```python
if self.workspaces[workspace_id] < amount:
    return None
```

注意是 `<`，不是 `<=`。余额刚好等于 amount 时允许消费到 0。

## Level 2 做法

### 为什么不能直接用 `self.workspaces`

因为 `self.workspaces` 只记录当前余额，历史已经被覆盖。例如：

```text
A: top_up 1000, consume 900 -> balance = 100
B: top_up 200              -> balance = 200
```

看余额是 B > A，但交易总额：

```text
A = 1900
B = 200
```

所以需要：`self.transactions = {}`

### 做法

初始化：

```python
def __init__(self):
    self.workspaces = {}
    self.transactions = {}
```

创建 workspace：

```python
self.workspaces[workspace_id] = 0
self.transactions[workspace_id] = 0
```

充值成功：

```python
self.workspaces[workspace_id] += amount
self.transactions[workspace_id] += amount
```

消费成功：

```python
self.workspaces[workspace_id] -= amount
self.transactions[workspace_id] += amount
```

记住：

```text
balance 有加有减
transaction 永远累计，所以都是 +=
```

#### `top_consumers`

```python
def top_consumers(self, timestamp, n):
    ordered = sorted(
        self.transactions.items(),
        key=lambda x: (-x[1], x[0])
    )

    result = []
    for workspace_id, total in ordered[:n]:
        result.append(f"{workspace_id}({total})")

    return result
```

排序逻辑：`key=lambda x: (-x[1], x[0])`。表示：

1. 交易额从大到小
2. 交易额相同时 workspace_id 按字母升序

## Level 3 做法

### Transfer 流程

假设：

```text
A = 1000
B = 500
```

执行：`transfer_credits(10, "A", "B", 300)`。此时：

```text
A = 700
B = 500
300 pending
```

然后：`accept_credits(20, "B", "transfer1")`。之后：

```text
A = 700
B = 800
```

### transfer 对 transactions 的影响

发起 transfer 时：

```text
source balance -= amount
transactions 不增加
```

accept 成功时：

```text
target balance += amount
source transactions += amount
target transactions += amount
```

也就是说 transfer 只有成功 accepted 后，才算双方的 transaction activity。

### transfer ID

题目要求：

```text
transfer1
transfer2
transfer3
```

所以需要：`self.transfer_no = 0`。成功创建 transfer 后：

```python
self.transfer_no += 1
transfer_id = f"transfer{self.transfer_no}"
```

`transfer_no` 只负责生成唯一 ID，不参与余额计算。

### transfer 数据结构

```python
self.transfers[transfer_id] = {
    "source": source_workspace_id,
    "target": target_workspace_id,
    "amount": amount,
    "time": timestamp,
    "status": "pending"
}
```

### `transfer_credits` 做法

```python
def transfer_credits(self, timestamp, source_workspace_id, target_workspace_id, amount):
    if source_workspace_id == target_workspace_id:
        return None
    if source_workspace_id not in self.workspaces:
        return None
    if target_workspace_id not in self.workspaces:
        return None
    if self.workspaces[source_workspace_id] < amount:
        return None

    self.workspaces[source_workspace_id] -= amount

    self.transfer_no += 1
    transfer_id = f"transfer{self.transfer_no}"

    self.transfers[transfer_id] = {
        "source": source_workspace_id,
        "target": target_workspace_id,
        "amount": amount,
        "time": timestamp,
        "status": "pending"
    }

    return transfer_id
```

### `accept_credits` 做法

需要检查：
1. transfer 是否存在
2. 是否还是 pending
3. workspace_id 是否是 target
4. 是否过期

```python
def accept_credits(self, timestamp, workspace_id, transfer_id) -> bool:
    if transfer_id not in self.transfers:
        return False

    transfer = self.transfers[transfer_id]
    source = transfer["source"]
    target = transfer["target"]
    amount = transfer["amount"]

    if transfer["status"] != "pending":
        return False
    if workspace_id != target:
        return False

    if timestamp > transfer["time"] + self.PERIOD:
        self.workspaces[source] += amount
        transfer["status"] = "expired"
        return False

    self.workspaces[target] += amount
    self.transactions[source] += amount
    self.transactions[target] += amount
    transfer["status"] = "accepted"
    return True
```

### 24 小时过期边界

24 小时：`PERIOD = 86400000`，写成 class 常量。如果 transfer 创建时间是 5，那么：`5 + 86400000 = 86400005`。题目说 expiration period 结束后的下一个 millisecond 才过期，所以：

```text
86400005 还能 accept
86400006 才 expired
```

因此判断是：`if timestamp > transfer["time"] + 86400000:`，不是 `>=`。

### 自动处理过期 transfer

如果 transfer 过期后没人调用 `accept_credits`，冻结的钱也应该自动退回。因此最好写 helper：

```python
def _expire_transfers(self, timestamp):
    for transfer in self.transfers.values():
        if transfer["status"] != "pending":
            continue

        expire_time = transfer["time"] + self.PERIOD + 1

        if timestamp >= expire_time:
            source = transfer["source"]
            amount = transfer["amount"]
            self.workspaces[source] += amount
            transfer["status"] = "expired"
```

然后每个 query 开头调用：`self._expire_transfers(timestamp)`

### Level 3 Debug 记录

- `transfer.status` 错，dictionary 应该写 `transfer["status"]`
- `self.workspace` 错，应该是 `self.workspaces`
- `expirted` 拼错，应该是 `expired`
- `transfer[1]` 格式错，应该是 `transfer1`
- `accept_credits` 不能缩进在 `transfer_credits` 里面，两者必须是 class 下同一级方法

## Level 4 做法 - History

### 为什么需要 history

`self.workspaces` 只记录当前余额。例如：

```text
time 1: A = 0
time 5: top_up 1000   -> A = 1000
time 10: consume 300  -> A = 700
time 20: top_up 500   -> A = 1200
```

最后只剩：`self.workspaces["A"] == 1200`。但如果问：`get_credits(30, "A", 7)`。答案应该是 1000，所以需要：`self.history = {}`。例如：

```python
self.history["A"] = [
    (1, 0),
    (5, 1000),
    (10, 700),
    (20, 1200)
]
```

### history 初始化

`self.history = {}`。创建 workspace：`self.history[workspace_id] = [(timestamp, 0)]`

### 记录余额 helper

```python
def _record_balance(self, timestamp, workspace_id):
    self.history[workspace_id].append(
        (timestamp, self.workspaces[workspace_id])
    )
```

只要余额发生变化，就记录。

### `get_credits` 普通扫描版本

```python
def get_credits(self, timestamp, workspace_id, time_at):
    if workspace_id not in self.history:
        return None

    ans = None

    for time, balance in self.history[workspace_id]:
        if time <= time_at:
            ans = balance
        else:
            break

    return ans
```

目标是找最后一个：`time <= time_at`

### Binary Search 优化

因为题目保证 query timestamp 严格递增，history 天然有序，所以可以二分：

```python
def get_credits(self, timestamp, workspace_id, time_at):
    if workspace_id not in self.history:
        return None

    history = self.history[workspace_id]

    left = 0
    right = len(history) - 1
    ans = None

    while left <= right:
        mid = (left + right) // 2
        time, balance = history[mid]

        if time <= time_at:
            ans = balance
            left = mid + 1
        else:
            right = mid - 1

    return ans
```

这里是在找：`rightmost time <= time_at`。复杂度：

```text
普通扫描 O(n)
Binary Search O(log n)
```

### 时间顺序

题目保证所有 query timestamp 严格递增，所以 history 一直 append 就能保持有序。transfer expire time：`expire_time = transfer["time"] + 86400000 + 1`，也不会往前跳。

## Level 4 做法 - Merge

### balance 合并

`self.workspaces[workspace_id_1] += self.workspaces[workspace_id_2]`

### transactions 合并

`self.transactions[workspace_id_1] += self.transactions[workspace_id_2]`，注意不要把 balance 加到 transaction 里。

### pending transfer 的三种情况

假设：`merge(A, B)`

1. **A -> B**：取消，钱退给 A。
2. **B -> anyone**：所有从 B 发出去的 pending transfer 都取消，钱退给 B，然后 B 的余额再 merge 到 A。
3. **anyone -> B**：不取消，把 target 从 B 改成 A。例如：`C -> B` 变成：`C -> A`

### 为什么遍历所有 transfer

`for transfer in self.transfers.values():`，只是逐笔检查，不是 cancel 所有。是否处理由后面的 `if` 决定。例如：

```text
A -> B   cancel
B -> C   cancel
C -> B   redirect to C -> A
C -> D   不动
```

### 为什么需要 `continue`

一笔 transfer 命中某个处理规则后，已经处理完，就应该直接进入下一轮，避免后面的 `if` 再次处理同一笔 transfer。

### merge 实现

```python
def merge_workspaces(self, timestamp, workspace_id_1, workspace_id_2) -> bool:
    self._expire_transfers(timestamp)

    if workspace_id_1 == workspace_id_2:
        return False
    if workspace_id_1 not in self.workspaces:
        return False
    if workspace_id_2 not in self.workspaces:
        return False

    for transfer in self.transfers.values():
        if transfer["status"] != "pending":
            continue

        source = transfer["source"]
        target = transfer["target"]
        amount = transfer["amount"]

        # A -> B
        if source == workspace_id_1 and target == workspace_id_2:
            self.workspaces[workspace_id_1] += amount
            transfer["status"] = "expired"
            continue

        # B -> anyone
        if source == workspace_id_2:
            self.workspaces[workspace_id_2] += amount
            transfer["status"] = "expired"
            continue

        # anyone -> B
        if target == workspace_id_2:
            transfer["target"] = workspace_id_1

    self.workspaces[workspace_id_1] += self.workspaces[workspace_id_2]
    self.transactions[workspace_id_1] += self.transactions[workspace_id_2]

    self._record_balance(timestamp, workspace_id_1)
    self.history[workspace_id_2].append((timestamp, None))

    del self.workspaces[workspace_id_2]
    del self.transactions[workspace_id_2]

    return True
```

### merge 常见错误

```python
if workspace_id_1 == workspace_id_2:
    return False
```

- `.values` 少括号：错误：`for transfer in self.transfers.values:`，正确：`for transfer in self.transfers.values():`
- 删除元素：错误：`def self.workspaces[workspace_id_2]`，正确：`del self.workspaces[workspace_id_2]`
- transaction 拼错：错误：`self.transaction`，正确：`self.transactions`

## 一句话总结四个 Level

```text
Level 1 = 当前余额
Level 2 = 累计交易额 + 排名
Level 3 = pending transfer + accept + expire
Level 4 = merge + 历史余额查询
```

最核心的数据结构：

```text
self.workspaces   -> 当前余额
self.transactions -> 累计交易额
self.transfers    -> 转账状态
self.history      -> 历史余额
```

这道题最容易错的地方：

- balance 和 transaction total 混淆
- pending transfer 什么时候算 transaction
- transfer expiration 边界
- merge 时不同 pending transfer 的处理
- workspace 删除以后历史仍要保留
- `get_credits` 查的是过去，不是现在

## 完整代码

余额每次变化都调用 `_record_balance`，过期的 transfer 由 `_expire_transfers` 自动退款。

```python
from compute_credits_system import ComputeCreditsSystem


class ComputeCreditsSystemImpl(ComputeCreditsSystem):

    # transfer 过期时间：24 小时（毫秒）
    PERIOD = 86400000

    def __init__(self):
        # 当前余额
        self.workspaces = {}

        # 累计交易额
        self.transactions = {}

        # 所有 transfer
        self.transfers = {}

        # transfer 编号
        self.transfer_no = 0

        # 历史余额
        self.history = {}

    # 记录余额历史
    def _record_balance(self, timestamp, workspace_id):
        self.history[workspace_id].append(
            (timestamp, self.workspaces[workspace_id])
        )

    # 自动处理已经过期的 transfer
    def _expire_transfers(self, timestamp):
        for transfer in self.transfers.values():

            if transfer["status"] != "pending":
                continue

            expire_time = transfer["time"] + self.PERIOD + 1

            if timestamp >= expire_time:
                source = transfer["source"]
                amount = transfer["amount"]

                self.workspaces[source] += amount
                transfer["status"] = "expired"

                self._record_balance(expire_time, source)

    # -----------------------
    # Level 1
    # -----------------------

    def create_workspace(self, timestamp: int, workspace_id: str) -> bool:
        if workspace_id in self.workspaces:
            return False

        self.workspaces[workspace_id] = 0
        self.transactions[workspace_id] = 0
        self.history[workspace_id] = [(timestamp, 0)]

        return True

    def top_up(
        self,
        timestamp: int,
        workspace_id: str,
        amount: int
    ) -> int | None:

        self._expire_transfers(timestamp)

        if workspace_id not in self.workspaces:
            return None

        self.workspaces[workspace_id] += amount
        self.transactions[workspace_id] += amount

        self._record_balance(timestamp, workspace_id)

        return self.workspaces[workspace_id]

    def consume(
        self,
        timestamp: int,
        workspace_id: str,
        amount: int
    ) -> int | None:

        self._expire_transfers(timestamp)

        if workspace_id not in self.workspaces:
            return None

        if self.workspaces[workspace_id] < amount:
            return None

        self.workspaces[workspace_id] -= amount
        self.transactions[workspace_id] += amount

        self._record_balance(timestamp, workspace_id)

        return self.workspaces[workspace_id]

    # -----------------------
    # Level 2
    # -----------------------

    def top_consumers(
        self,
        timestamp: int,
        n: int
    ) -> list[str]:

        self._expire_transfers(timestamp)

        order = sorted(
            self.transactions.items(),
            key=lambda x: (-x[1], x[0])
        )

        ans = []

        for workspace_id, total in order[:n]:
            ans.append(f"{workspace_id}({total})")

        return ans

    # -----------------------
    # Level 3
    # -----------------------

    def transfer_credits(
        self,
        timestamp: int,
        source_workspace_id: str,
        target_workspace_id: str,
        amount: int
    ) -> str | None:

        self._expire_transfers(timestamp)

        if source_workspace_id == target_workspace_id:
            return None

        if source_workspace_id not in self.workspaces:
            return None

        if target_workspace_id not in self.workspaces:
            return None

        if self.workspaces[source_workspace_id] < amount:
            return None

        # 先冻结 source 的钱
        self.workspaces[source_workspace_id] -= amount
        self._record_balance(timestamp, source_workspace_id)

        # 生成 transfer id
        self.transfer_no += 1
        transfer_id = f"transfer{self.transfer_no}"

        self.transfers[transfer_id] = {
            "source": source_workspace_id,
            "target": target_workspace_id,
            "amount": amount,
            "time": timestamp,
            "status": "pending"
        }

        return transfer_id

    def accept_credits(
        self,
        timestamp: int,
        workspace_id: str,
        transfer_id: str
    ) -> bool:

        self._expire_transfers(timestamp)

        if transfer_id not in self.transfers:
            return False

        transfer = self.transfers[transfer_id]

        if transfer["status"] != "pending":
            return False

        source = transfer["source"]
        target = transfer["target"]
        amount = transfer["amount"]

        if workspace_id != target:
            return False

        # target 收到钱
        self.workspaces[target] += amount

        # transfer 成功后才算交易额
        self.transactions[source] += amount
        self.transactions[target] += amount

        self._record_balance(timestamp, target)

        transfer["status"] = "accepted"

        return True

    # -----------------------
    # Level 4
    # -----------------------

    def merge_workspaces(
        self,
        timestamp: int,
        workspace_id_1: str,
        workspace_id_2: str
    ) -> bool:

        self._expire_transfers(timestamp)

        if workspace_id_1 == workspace_id_2:
            return False

        if workspace_id_1 not in self.workspaces:
            return False

        if workspace_id_2 not in self.workspaces:
            return False

        for transfer in self.transfers.values():

            if transfer["status"] != "pending":
                continue

            source = transfer["source"]
            target = transfer["target"]
            amount = transfer["amount"]

            # workspace1 -> workspace2
            # cancel，钱退给 workspace1
            if source == workspace_id_1 and target == workspace_id_2:
                self.workspaces[workspace_id_1] += amount
                transfer["status"] = "expired"
                continue

            # workspace2 -> anyone
            # cancel，钱退给 workspace2
            if source == workspace_id_2:
                self.workspaces[workspace_id_2] += amount
                transfer["status"] = "expired"
                continue

            # anyone -> workspace2
            # redirect 到 workspace1
            if target == workspace_id_2:
                transfer["target"] = workspace_id_1

        # 合并余额
        self.workspaces[workspace_id_1] += self.workspaces[workspace_id_2]

        # 合并累计交易额
        self.transactions[workspace_id_1] += self.transactions[workspace_id_2]

        # 记录 workspace1 合并后的余额
        self._record_balance(timestamp, workspace_id_1)

        # workspace2 从这个时间点开始不存在
        self.history[workspace_id_2].append(
            (timestamp, None)
        )

        # 删除 workspace2 当前状态
        del self.workspaces[workspace_id_2]
        del self.transactions[workspace_id_2]

        return True

    def get_credits(
        self,
        timestamp: int,
        workspace_id: str,
        time_at: int
    ) -> int | None:

        self._expire_transfers(timestamp)

        if workspace_id not in self.history:
            return None

        history = self.history[workspace_id]

        left = 0
        right = len(history) - 1
        ans = None

        while left <= right:
            mid = (left + right) // 2

            time, balance = history[mid]

            if time <= time_at:
                ans = balance
                left = mid + 1
            else:
                right = mid - 1

        return ans
```
