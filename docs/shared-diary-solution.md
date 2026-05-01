# 共享日记本功能设计方案

## 一、 需求概述
为满足情侣、闺蜜、家人、夫妻等密友间的互动记录需求，推出「共享日记本」功能。核心定位为**两人专属的私密/半私密记录空间**。通过极简的邀请机制和严格的权限控制，在保证数据隐私和降低纠纷风险的前提下，提供温暖的共享记录体验。

---

## 二、 核心规则与业务逻辑

### 1. 基础限制（人数控制）
- **容量上限**：每个共享日记本**最多且仅限 2 人**参与。
- **目的**：控制系统复杂度，规避多人群组化带来的社交合规风险（如类微信群/贴吧的审查压力），同时增强「专属感」。

### 2. 创建与绑定流程（入本规则）
- **发起邀请**：
  - 用户在新建日记本时，可选择类型为「共享日记本」。
  - 创建后，界面出现「邀请共享人」按钮，通过输入对方的**手机号**（或用户 ID）发起邀请。
- **接收邀请**：
  - 被邀请方会在系统消息/首页收到邀请通知。
  - **同意**：自动绑定两人的共享关系，该日记本出现在双方的日记本列表中。
  - **拒绝/忽略**：邀请失效，发起方日记本保持「待绑定」状态（此时发起方可重新邀请他人）。

### 3. 内容权限与互动（共享本内规则）
当状态为「已绑定共享（Active）」时：
- **可见性**：双方均可查看该日记本内的所有日记（除单独设为私密的日记外）。
- **内容创作**：双方都可以随时新增日记。
- **内容修改**：只能编辑、删除**自己**发布的日记，**绝对不可删除或修改对方的日记**（保护数据，减少纠纷）。
- **社交互动**：可以对对方的日记进行点赞、评论。

### 4. 退出与解绑规则
- **主动退出**：任意一方可随时主动选择「退出/解除共享」。
- **退出后状态（核心隔离逻辑）**：
  - 该日记本状态变更为「已解绑（Unbound）」。
  - **数据保留**：双方各自保留自己在这个本子里写的日记。
  - **权限隔离**：双方再也看不到对方的任何内容（相当于变成两个独立的单人本）。
  - **不可逆性**：退出后，该日记本**不能再重新邀请或加入任何人**，永久固化为个人的「半私密本」。

### 5. 隐私兜底（高级体验）
- 即使在共享日记本中，发布单篇日记时，依然可以单独勾选**「仅自己可见」**。
- 设置后，该篇日记对共享伴侣隐藏。满足用户在亲密关系中依然需要保留一点个人树洞的诉求。

---

## 三、 数据模型设计 (TCB 集合设计)

### 1. Notebooks 集合 (日记本)
需要增加/修改以下字段以支持共享：
```typescript
interface Notebook {
  _id: string;
  name: string;
  cover: string;
  type: 'private' | 'shared'; // 日记本类型
  creatorId: string; // 创建者 ID
  partnerId?: string; // 绑定的伴侣 ID
  status: 'pending' | 'active' | 'unbound'; 
  // pending: 邀请中，未绑定
  // active: 正常共享中
  // unbound: 已解除共享（不可再加人）
  createdAt: number; // TCB 通常使用时间戳
  updatedAt: number;
}
```

### 2. Invitations 集合 (邀请记录)
用于记录和管理邀请状态：
```typescript
interface Invitation {
  _id: string;
  notebookId: string; // 关联的日记本
  inviterId: string; // 邀请人
  inviteePhone: string; // 被邀请人手机号（或 ID）
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
  expiresAt: number; // 邀请有效期（如 7 天时间戳）
}
```

### 3. Diaries 集合 (日记)
现有模型基本满足，需强调利用 `isPrivate` 字段：
```typescript
interface Diary {
  // ... 其他字段
  notebookId: string; 
  userId: string; // 作者
  isPrivate?: boolean; // 隐私兜底：为 true 时，即使是 shared 伴侣也不可见
}
```

---

## 四、 云函数与核心逻辑设计 (TCB Cloud Functions)

为了保证数据一致性和安全性，共享逻辑应尽可能收敛到 TCB 云函数处理，而不是完全在端侧直接操作数据库。

### 1. 新建共享日记本及发起邀请 (`cloudFunction: createSharedNotebook`)
- **入参**：`{ name, cover, inviteePhone }`
- **逻辑**：
  1. 开启 TCB 事务 (Transaction) 确保原子性。
  2. 在 `Notebooks` 集合中插入 `type='shared'`, `status='pending'` 的记录。
  3. 在 `Invitations` 集合中生成对应的邀请记录。
  4. 提交事务，返回新日记本 ID。

### 2. 处理邀请 (`cloudFunction: respondInvitation`)
- **入参**：`{ invitationId, action: 'accept' | 'reject' }`
- **逻辑 (以 accept 为例)**：
  1. 开启事务。
  2. 将 `Invitations` 记录状态更新为 `accepted`。
  3. 将对应 `Notebooks` 的 `partnerId` 更新为当前用户 ID，`status` 更新为 `active`。
  4. 提交事务。

### 3. 获取日记列表的权限过滤 (`cloudFunction: getDiaries` 或端侧查询)
如果使用端侧直连查询（假设在 `getDiaries` 逻辑中）：
```javascript
const db = wx.cloud.database();
const _ = db.command;

// 先查询当前日记本的状态
const notebook = await db.collection('Notebooks').doc(notebookId).get();

let queryCondition = { notebookId: notebookId };

if (notebook.data.status === 'active') {
  // 共享状态：自己写的，或者是对方写且非私密的
  queryCondition = _.or([
    { userId: currentUser },
    { 
      userId: notebook.data.partnerId, 
      isPrivate: _.neq(true) // 过滤掉对方设置仅自己可见的日记
    }
  ]);
} else if (notebook.data.status === 'unbound') {
  // 解绑状态：只能看自己的
  queryCondition.userId = currentUser;
} else {
  // 私密本或其他状态：默认只能看自己的
  queryCondition.userId = currentUser;
}

const diaries = await db.collection('Diaries').where(queryCondition).get();
```

### 4. 退出共享 (`cloudFunction: unbindSharedNotebook`)
- **入参**：`{ notebookId }`
- **逻辑**：
  1. 校验当前用户是否为 `creatorId` 或 `partnerId`。
  2. 将 `Notebooks` 的 `status` 更新为 `unbound`。
  3. （可选）触发触发器或消息推送给另一方，通知共享已解除。

---

## 五、 UI/UX 交互规划 (Phase 1 必做)

### 1. 新建日记本
- 增加类型选择 Toggle：[私密日记本] / [共享日记本]。
- 选中共享后，弹出输入框「输入对方手机号/用户ID 邀请共写」。

### 2. 消息与通知中心
- 增加「收到日记本共享邀请」的卡片，包含【同意】/【拒绝】按钮。

### 3. 日记本列表 & 详情页
- **共享标识**：日记本封面上增加「👥 共享」Tag。
- **头像展示**：日记本详情页顶部，展示两人的头像（如：头像A 🔗 头像B）。
- **待绑定状态**：若对方未同意，展示占位头像及「等待对方加入...」提示。

### 4. 日记列表与详情
- 列表页：日记卡片需明确显示作者头像/昵称，以区分是谁写的。
- 日记发布页：增加 `Switch` 选项「仅自己可见」。

### 5. 设置页 (日记本管理)
- 增加「解除共享」红色危险按钮。
- 弹窗二次确认警告：「解除后，你将无法再看到对方的日记，且该日记本无法再邀请其他人加入，确定解除吗？」。

---

## 六、 一期上线 Checklist (必做清单)

- [ ] **DB/后端**：
  - 更新 `Notebook` 模型，新增 `type`, `partnerId`, `status` 字段。
  - 新增 `Invitation` 邀请表及相关 API（发起、同意、拒绝）。
  - 重构日记列表查询接口，加入 `active` 与 `unbound` 的权限过滤逻辑。
  - 新增解除共享接口。
- [ ] **前端界面**：
  - 日记本创建/编辑表单支持选择共享及输入邀请手机号。
  - 全局消息/通知弹窗处理邀请的接收与操作。
  - 日记本列表与详情页的共享 UI 适配（Tag、双头像展示）。
  - 日记列表展示作者信息，支持互相点赞/评论。
  - 退出共享操作的 UI 与二次确认弹窗。
- [ ] **安全与测试**：
  - 测试防越权删除：确保前端和后端均拦截「删除/编辑对方日记」的操作。
  - 测试解绑逻辑：确保解绑后对方数据严格不可见。
  - 测试隐私兜底：确保 `isPrivate` 默认值为 `false`（共享可见），但当用户手动设置为 `true` 时，伴侣无法通过任何接口获取该日记。